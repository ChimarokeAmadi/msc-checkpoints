# MongoDB and Mongoose: Person CRUD

In this checkpoint I used **Mongoose** to work with a MongoDB database: I defined a `Person` model, then created, searched, updated and deleted people. All the code is in **`myApp.js`**, with a comment explaining each step.

## Setup

```bash
npm install
cp .env.example .env
```

Then open `.env` and paste your MongoDB Atlas connection string, in quotes and with no spaces around the `=`, as the checkpoint asks:

```
MONGO_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/mongoose-checkpoint?retryWrites=true&w=majority"
```

`.env` is in `.gitignore`, because the URI contains your database password. I read it with `process.loadEnvFile()`, which is built into Node 20.12+, so the `dotenv` package isn't needed.

Running it:

```bash
npm start        # runs every exercise on your Atlas database and prints the results
npm run local    # same, but on a temporary in-memory MongoDB (no Atlas account needed)
npm test         # 13 tests, also on an in-memory MongoDB
```

## The Person model

| Field | Type | Rules |
|---|---|---|
| `name` | String | **required**, trimmed |
| `age` | Number | between 0 and 150 |
| `favoriteFoods` | `[String]` | default `[]` |

I also turned on `timestamps`, which adds `createdAt` and `updatedAt` automatically.

I declared `favoriteFoods` as `[String]` and not just `Array`. With a plain `Array`, Mongoose treats it as "Mixed" and doesn't notice when you `push()` into it. You'd have to call `markModified('favoriteFoods')` before saving, which the instructions warn about. With `[String]`, Mongoose tracks the change by itself, and it also turns values into strings (`42` becomes `"42"`).

## The exercises

| Function | What it does |
|---|---|
| `createAndSavePerson(done)` | `new Person({...})`, then `.save()` |
| `createManyPeople(arrayOfPeople, done)` | `Person.create(array)` saves them all at once |
| `findPeopleByName(personName, done)` | `Person.find({ name })` gives an **array** (empty if nobody matches) |
| `findOneByFood(food, done)` | `Person.findOne({ favoriteFoods: food })` gives **one** person or `null`. Searching an array field for a value matches documents whose array *contains* it |
| `findPersonById(personId, done)` | `Person.findById(id)` |
| `findEditThenSave(personId, done)` | find by id, `push('hamburger')`, then `save()` inside the find step |
| `findAndUpdate(personName, done)` | `findOneAndUpdate` sets age to 20 and returns the **updated** document |
| `removeById(personId, done)` | deletes one person and returns them |
| `removeManyPeople(done)` | deletes every "Mary" and returns `{ acknowledged, deletedCount }` |
| `queryChain(done)` | burrito lovers: `.find().sort({ name: 1 }).limit(2).select({ age: 0 }).exec()` |

Every function takes a `done(err, data)` callback, like the instructions show: the error comes first (or `null`), then the result.

## Why some code is different from the instructions

The instructions were written for an older Mongoose (version 5 or 6). I used the current one, **Mongoose 9**, and I tested what happens if you copy the old code:

| Instructions say | What happens in Mongoose 9 | What I did |
|---|---|---|
| `mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })` | error: *"options usenewurlparser, useunifiedtopology are not supported"* | `mongoose.connect(uri)`. These options have been on by default since Mongoose 6 |
| `person.save(function (err, data) {...})` | error: *"save() no longer accepts a callback"* | Mongoose methods return Promises now, so I call `done` myself: `.then(data => done(null, data)).catch(done)` |
| `findOneAndUpdate(..., { new: true })` | still works, but the new name is `returnDocument: 'after'` | used `returnDocument: 'after'` |
| `Model.findByIdAndRemove()` | removed in Mongoose 8 | `findByIdAndDelete()`, which works the same way and returns the deleted document |
| `Model.remove()` | removed in Mongoose 7 | `deleteMany()`, which also returns an outcome object (`{ acknowledged: true, deletedCount: 2 }`) instead of the documents |

So the *ideas* are exactly the ones from the checkpoint, and every function keeps the `done(err, data)` shape. Only the method names and the way the callback is called are updated. I left comments at each of these places in `myApp.js`.

## What the demo shows

`npm run local` creates me plus 6 people, then runs every exercise:

- **Find "Mary":** finds 2 people.
- **Find by food:** "suya" finds me.
- **Find, edit, save:** adds "hamburger" to my foods.
- **Find and update:** sets Tunde's age to 20 and shows the new value.
- **Delete by ID:** deletes Kemi and shows her document.
- **Delete many:** deletes both Marys with `deletedCount: 2`.
- **Query chain:** returns only **Amina and Bola**, the first 2 burrito lovers in alphabetical order, without their age.

The tests check the same things automatically. They also check that `name` is required and that the hamburger is *really* saved in the database, not just changed in memory.
