# MongoDB CRUD: Contact List

This checkpoint is about the basic MongoDB operations: **C**reate, **R**ead, **U**pdate and **D**elete. I made a `contact` database with a `contactlist` collection, added five people, and then searched, changed and deleted contacts with the MongoDB shell (`mongosh`).

The screenshots of every step are in the [`screenshots/`](screenshots) folder, and the full text of the session is in [`session.txt`](session.txt).

## The commands

All the commands are in [`commands.js`](commands.js), in order. You can type them one by one in `mongosh`, or run the whole file with `mongosh commands.js`.

**1. Create the database.** `use contact` switches to the `contact` database. MongoDB only really creates it once something is saved in it.

**2. Create the collection.** `db.createCollection("contactlist")` answers `{ ok: 1 }`.

**3. Insert the five contacts** with `insertMany`. I used `last_name`, `first_name`, `email` and `age` as field names. Alex and Denzel don't have an email, so their documents just don't have that field. That's normal in MongoDB, because documents in the same collection don't need the same fields (unlike rows in SQL). MongoDB gives each document an `_id` automatically.

**4. Display everyone:** `db.contactlist.find()`.

**5. Display one person by ID:** I copied Ben Moris's `_id` from step 4 and used `db.contactlist.findOne({ _id: ObjectId("...") })`. I used `findOne` because an `_id` is unique, so there's only ever one result.

**6. Age over 18:** `db.contactlist.find({ age: { $gt: 18 } })`. `$gt` means "greater than". Result: Ben (26) and Emilie (40). Kefi is 15, so he's not included.

**7. Age over 18 and a name containing "ah":**

```js
db.contactlist.find({ age: { $gt: 18 }, $or: [{ first_name: /ah/i }, { last_name: /ah/i }] })
```

The instructions don't say whether "name" means the first or last name, so I checked both with `$or`. `/ah/i` is a regular expression that means "contains ah", and the `i` ignores upper and lower case. **The result is empty**, because none of the names (Ben, Moris, Kefi, Seif, Emilie, brouge, Alex, brown, Denzel, Washington) contain "ah". An empty `find()` prints nothing, so I also ran `countDocuments` with the same filter to show that the answer really is 0.

**8. Change "Kefi Seif" to "Kefi Anis":**

```js
db.contactlist.updateOne({ last_name: "Kefi", first_name: "Seif" }, { $set: { first_name: "Anis" } })
```

`$set` only changes the field I name. Without it, the whole document would be replaced by `{ first_name: "Anis" }` and the other fields would be lost. The answer shows `matchedCount: 1, modifiedCount: 1`. I filtered on both names so I'm sure to change the right person.

**9. Delete everyone under 5:** `db.contactlist.deleteMany({ age: { $lt: 5 } })`. `$lt` means "less than". It answers `deletedCount: 2`, for Alex (4) and Denzel (3). I used `deleteMany` because more than one contact matches, while `deleteOne` would only delete the first one.

**10. Display everyone again:** Ben Moris, Kefi **Anis** and Emilie brouge are left.

## How I made the screenshots

`run.js` runs each step in the real `mongosh` against a real MongoDB server, saves the output in `session.txt`, and turns each step into a terminal-style picture. Everything you see in the screenshots is the real output.

```bash
npm install
npm install -D puppeteer   # only needed to make the screenshots
npm start
```

You need `mongosh` installed. You don't need a MongoDB server, because `run.js` starts a temporary one with `mongodb-memory-server`.

One thing I learned while building it: my first version used `execFileSync` to run `mongosh`, and after a few commands MongoDB stopped answering. The temporary server sends its logs through my Node process, and `execFileSync` blocks Node completely while it waits. Nobody was reading the logs, the log pipe filled up, and MongoDB froze. Running `mongosh` with the asynchronous `execFile` fixed it.
