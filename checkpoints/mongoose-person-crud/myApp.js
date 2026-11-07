// =====================================================================
// MongoDB and Mongoose checkpoint
// =====================================================================
//
// Every exercise is a function that takes a `done(err, data)` callback,
// following the Node.js convention: the first argument is the error (or
// null if everything went well), the second is the result.
//
// A note on versions: the instructions were written for an older Mongoose
// (version 5/6). This project uses the current Mongoose (9), where a few
// things changed. Each change is explained where it happens:
//   - Mongoose methods no longer accept callbacks: they return Promises.
//     So we call the method, then pass the result to done() ourselves with
//     .then(data => done(null, data)).catch(err => done(err)).
//   - findByIdAndRemove()  -> was removed, replaced by findByIdAndDelete()
//   - Model.remove()       -> was removed, replaced by deleteMany()
//   - { new: true }        -> still works, but the new name is { returnDocument: 'after' }

const mongoose = require('mongoose');

// ---------------------------------------------------------------------
// Installing and setting up Mongoose
// ---------------------------------------------------------------------

// Read MONGO_URI from the private .env file (built into Node 20.12+, so the
// "dotenv" package isn't needed). The .env file is listed in .gitignore.
try {
  process.loadEnvFile();
} catch {
  // no .env file: connect() below explains what to do
}

// The instructions use this syntax:
//   mongoose.connect(<Your URI>, { useNewUrlParser: true, useUnifiedTopology: true });
// Those two options were needed in old versions. Since Mongoose 6 they are
// always on, and the current MongoDB driver REJECTS them with the error
// "options usenewurlparser, useunifiedtopology are not supported".
// So we connect with just the URI.
function connect(uri = process.env.MONGO_URI) {
  if (!uri) {
    throw new Error('MONGO_URI is missing. Copy .env.example to .env and paste your MongoDB Atlas URI in it.');
  }
  return mongoose.connect(uri);
}

// ---------------------------------------------------------------------
// Create a Model
// ---------------------------------------------------------------------

// The Person prototype:
//   name: string [required]
//   age: number
//   favoriteFoods: array of strings
const personSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A person needs a name'], // validator: name is required
      trim: true, // removes spaces around the name
    },
    age: {
      type: Number,
      min: [0, 'Age cannot be negative'], // simple validators
      max: [150, 'Age looks wrong'],
    },
    // [String] (and not just Array) so Mongoose knows it's a list of strings.
    // With a plain Array, it would be "Mixed" and we'd have to call
    // markModified('favoriteFoods') after changing it.
    favoriteFoods: {
      type: [String],
      default: [], // a new person starts with an empty list
    },
  },
  { timestamps: true }, // adds createdAt and updatedAt automatically
);

// The model: Mongoose saves Person documents in the "people" collection
const Person = mongoose.models.Person || mongoose.model('Person', personSchema);

// Small helper: turns a Promise into the done(err, data) callback style
const toCallback = (promise, done) =>
  promise.then((data) => done(null, data)).catch((err) => done(err));

// ---------------------------------------------------------------------
// Create and Save a Record of a Model
// ---------------------------------------------------------------------
const createAndSavePerson = (done) => {
  // Create a document instance with the Person constructor
  const person = new Person({
    name: 'Chimaroke Amadi',
    age: 28,
    favoriteFoods: ['jollof rice', 'suya', 'plantain'],
  });

  // document.save() returns a Promise in Mongoose 9 (no callback argument),
  // so we hand the result to the Node-style callback ourselves
  toCallback(person.save(), done);
};

// ---------------------------------------------------------------------
// Create Many Records with Model.create()
// ---------------------------------------------------------------------
const createManyPeople = (arrayOfPeople, done) => {
  // Model.create() with an array saves every person in it
  toCallback(Person.create(arrayOfPeople), done);
};

// ---------------------------------------------------------------------
// Use Model.find() to Search Your Database
// ---------------------------------------------------------------------
const findPeopleByName = (personName, done) => {
  // find() always returns an array (empty if nobody has that name)
  toCallback(Person.find({ name: personName }), done);
};

// ---------------------------------------------------------------------
// Use Model.findOne() to Return a Single Matching Document
// ---------------------------------------------------------------------
const findOneByFood = (food, done) => {
  // Searching an array field for one value: MongoDB matches the documents
  // whose favoriteFoods array CONTAINS that food.
  // findOne() returns just the first match (or null), not an array.
  toCallback(Person.findOne({ favoriteFoods: food }), done);
};

// ---------------------------------------------------------------------
// Use Model.findById() to Search Your Database By _id
// ---------------------------------------------------------------------
const findPersonById = (personId, done) => {
  // _id is unique, so there is only ever one result (or null)
  toCallback(Person.findById(personId), done);
};

// ---------------------------------------------------------------------
// Perform Classic Updates by Running Find, Edit, then Save
// ---------------------------------------------------------------------
const findEditThenSave = (personId, done) => {
  const foodToAdd = 'hamburger';

  // 1. Find the person
  Person.findById(personId)
    .then((person) => {
      if (!person) return done(new Error(`No person with _id ${personId}`));

      // 2. Edit: add hamburger to their favorite foods
      person.favoriteFoods.push(foodToAdd);
      // Because favoriteFoods is declared as [String], Mongoose tracks the
      // push automatically. With a plain Array (Mixed type) we would need:
      //   person.markModified('favoriteFoods');

      // 3. Save, inside the "find" step
      return person.save().then((updated) => done(null, updated));
    })
    .catch((err) => done(err));
};

// ---------------------------------------------------------------------
// Perform New Updates on a Document Using Model.findOneAndUpdate()
// ---------------------------------------------------------------------
const findAndUpdate = (personName, done) => {
  const ageToSet = 20;

  toCallback(
    Person.findOneAndUpdate(
      { name: personName }, // 1st: the search
      { age: ageToSet }, // 2nd: the change
      // 3rd: options. The instructions use { new: true } to get the UPDATED
      // document back (by default you get the old one). In Mongoose 9 the
      // new name for this option is returnDocument: 'after'.
      { returnDocument: 'after', runValidators: true },
    ),
    done,
  );
};

// ---------------------------------------------------------------------
// Delete One Document Using Model.findByIdAndRemove
// ---------------------------------------------------------------------
const removeById = (personId, done) => {
  // findByIdAndRemove() was removed in Mongoose 8. Its replacement,
  // findByIdAndDelete(), works the same way: it deletes the person and
  // gives back the removed document.
  toCallback(Person.findByIdAndDelete(personId), done);
};

// ---------------------------------------------------------------------
// Delete Many Documents with Model.remove()
// ---------------------------------------------------------------------
const removeManyPeople = (done) => {
  const nameToRemove = 'Mary';

  // Model.remove() was removed in Mongoose 7. deleteMany() is its
  // replacement. Like remove(), it doesn't return the deleted documents,
  // but an outcome object: { acknowledged: true, deletedCount: n }.
  // We pass that object to done().
  toCallback(Person.deleteMany({ name: nameToRemove }), done);
};

// ---------------------------------------------------------------------
// Chain Search Query Helpers to Narrow Search Results
// ---------------------------------------------------------------------
const queryChain = (done) => {
  const foodToSearch = 'burrito';

  // Nothing runs until exec(): each helper just adds to the query
  Person.find({ favoriteFoods: foodToSearch }) // people who like burritos
    .sort({ name: 1 }) // sorted by name, A to Z
    .limit(2) // only the first two
    .select({ age: 0 }) // hide their age (0 = exclude this field)
    .exec() // run the query (returns a Promise in Mongoose 9)
    .then((data) => done(null, data))
    .catch((err) => done(err));
};

module.exports = {
  mongoose,
  connect,
  Person,
  PersonModel: Person,
  createAndSavePerson,
  createManyPeople,
  findPeopleByName,
  findOneByFood,
  findPersonById,
  findEditThenSave,
  findAndUpdate,
  removeById,
  removeManyPeople,
  queryChain,
};
