# Redis vs MongoDB for Trip Planning with GTFS Data

This checkpoint asks how Redis and MongoDB handle public transport data (GTFS) for trip planning, and which one I would choose. My answers to all eight sections are in **`Redis-vs-MongoDB-GTFS-Trip-Planning.pdf`**.

Instead of only answering from theory, I built a real benchmark. I took two real GTFS feeds and loaded each one into both databases:

| Feed | Stops | Trips | Stop times |
|---|---|---|---|
| Big Blue Bus (Santa Monica, California) | 901 | 3,277 | 123,699 |
| TriMet (Portland, Oregon) | 6,031 | 67,957 | 3,407,790 |

Then I ran the questions a trip planner really asks, 2,000 times each on each database:
- search a stop by name
- stops near a point
- next departures from a stop
- all stops of a trip
- direct buses from A to B

I also built a small trip-planner website that works with either database.

## What I found

- **Both databases gave the same answers.** I compared all 24,000 queries. Sometimes two stops were a few centimetres apart in distance, or two buses left in the same minute, and they came back in a different order, but nothing was actually different. The comparison also helped me find a bug in my first version: on loop routes (buses that pass the same stop twice), the two databases gave different journeys. I fixed it before measuring.
- **Redis was faster:** about 2.5× faster per query on TriMet, about 1.5× more operations per second with many users, and twice as fast to load the data. But every query was still under a millisecond (median) on both.
- **The difference grows in a real app.** One trip plan makes about 30 small database calls, so the whole plan took 2.1 ms with Redis and 9.4 ms with MongoDB (median, TriMet).
- **MongoDB needs much less space.** TriMet took 395 MB of RAM in Redis, but only 224 MB on disk in MongoDB (compressed, indexes included), and MongoDB doesn't need everything in RAM.
- **The biggest surprise:** on TriMet, the "next departures" query in Redis became 3× slower than on the small feed. The reason is that only 9% of TriMet's timetable runs on a given day (the file holds 47 schedule periods), so my keys mixed every day together. When I split the departures by service, Redis went from 0.152 to 0.045 ms. MongoDB also got faster with a matching index, and its query planner picked the new index on its own. In Redis I had to change both my keys and my code. So the data layout mattered more than the database.

My recommendation for a large trip-planning app is **MongoDB as the main database**, because it's cheaper, durable and easier to grow, **with Redis as a cache** for the busiest answers. The PDF explains why.

## How to run it

```bash
npm install
npm run data     # downloads the two GTFS feeds (about 45 MB) into data/raw/
npm test         # 20 tests with known answers, on both databases
npm run bench    # the main benchmark (takes several minutes), saves results/*.json
node --max-old-space-size=6144 bench/experiment-departures.js   # the "departures" experiment
node --max-old-space-size=6144 bench/app-plans.js               # times the whole trip planner
npm run report   # rebuilds report/report.html from the results
```

You don't need to install Redis or MongoDB: the scripts start temporary servers. The first run builds Redis from source, which takes a minute or two. `npm run report` only rebuilds the HTML. To update the PDF, open `report/report.html` in Chrome and print it to PDF.

Transit agencies publish new feeds every few months, so if you download the data again, your numbers will be a little different from mine.

## The trip planner

```bash
npm run app                 # MongoDB (my recommendation), Big Blue Bus
DB=redis npm run app        # the same app on Redis
FEED=trimet npm run app     # the big Portland feed (takes about 30 s to load)
```

Then open http://localhost:3000. You type the start and end stops (with autocomplete), a date and a time, and it shows:
- direct buses;
- journeys where you walk to a stop nearby (up to 250 m);
- journeys with one change of bus, including a short walk between two stops if needed.

It also shows the next departures from your starting stop. The timetable runs from August to December 2026 for Big Blue Bus, so pick a date in that range. Screenshots are in `screenshots/`.

## Files

```
Redis-vs-MongoDB-GTFS-Trip-Planning.pdf   my answers to the checkpoint
src/gtfs.js           reads the GTFS files, service calendar, times after midnight
src/redis-store.js    the data in Redis: keys, loading and the queries
src/mongo-store.js    the data in MongoDB: collections, indexes and the queries
src/journeys.js       small helpers shared by both (picking the best ride, name search)
bench/run.js          the main benchmark (correctness, loading, memory, latency, throughput)
bench/experiment-departures.js   normal vs service-aware layout for departures
bench/app-plans.js    times the whole trip planner on both databases
results/              the measured results (JSON)
app/                  the trip-planner website (Express + HTML)
test/                 tests on a small handmade feed with tricky cases
report/               builds the report from the results
```
