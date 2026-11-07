// Runs every exercise from myApp.js one after the other and prints the results.
//
//   node index.js          -> uses MONGO_URI from .env (your MongoDB Atlas database)
//   node index.js --local  -> uses a temporary in-memory MongoDB (no Atlas needed)

const util = require('util');
const app = require('./myApp');

// Turn the done(err, data) functions into async functions we can await
const run = (fn, ...args) => util.promisify(fn)(...args);

// Print a document (or list) without the noisy Mongoose internals
const show = (label, data) => {
  const plain = JSON.parse(JSON.stringify(data));
  console.log(`\n▶ ${label}`);
  console.log(util.inspect(plain, { depth: 4, colors: process.stdout.isTTY, breakLength: 110 }));
};

const arrayOfPeople = [
  { name: 'Mary', age: 34, favoriteFoods: ['burrito', 'pasta'] },
  { name: 'Mary', age: 21, favoriteFoods: ['sushi'] },
  { name: 'Tunde', age: 25, favoriteFoods: ['burrito', 'pounded yam'] },
  { name: 'Amina', age: 30, favoriteFoods: ['burrito', 'fried rice'] },
  { name: 'Bola', age: 19, favoriteFoods: ['burrito'] },
  { name: 'Kemi', age: 41, favoriteFoods: ['egusi soup', 'suya'] },
];

async function main() {
  let memoryServer;
  if (process.argv.includes('--local')) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    await app.connect(memoryServer.getUri('mongoose-checkpoint'));
    console.log('Connected to a temporary in-memory MongoDB');
  } else {
    await app.connect();
    console.log(`Connected to MongoDB (database "${app.mongoose.connection.name}")`);
  }

  try {
    await app.Person.deleteMany({}); // start from an empty collection each run

    const me = await run(app.createAndSavePerson);
    show('createAndSavePerson: new Person(...).save()', me);

    const people = await run(app.createManyPeople, arrayOfPeople);
    show(`createManyPeople: Person.create([...]) saved ${people.length} people`, people.map((p) => `${p.name} (${p.age})`));

    show('findPeopleByName("Mary"): Person.find()', await run(app.findPeopleByName, 'Mary'));

    show('findOneByFood("suya"): Person.findOne()', await run(app.findOneByFood, 'suya'));

    show(`findPersonById("${me._id}"): Person.findById()`, await run(app.findPersonById, me._id));

    show('findEditThenSave: find, push "hamburger", save()', await run(app.findEditThenSave, me._id));

    show('findAndUpdate("Tunde"): age set to 20, updated document returned', await run(app.findAndUpdate, 'Tunde'));

    const kemi = people.find((p) => p.name === 'Kemi');
    show('removeById(Kemi\'s _id): Person.findByIdAndDelete() returns the removed person', await run(app.removeById, kemi._id));

    show('removeManyPeople: delete everyone named "Mary"', await run(app.removeManyPeople));

    show('queryChain: burrito lovers, sorted by name, max 2, age hidden', await run(app.queryChain));

    const left = await app.Person.find().sort({ name: 1 });
    show('Everyone left in the database', left.map((p) => `${p.name} (${p.age}): ${p.favoriteFoods.join(', ')}`));
  } finally {
    await app.mongoose.disconnect();
    if (memoryServer) await memoryServer.stop();
  }
}

main().catch(async (err) => {
  console.error(`\n❌ ${err.message}`);
  await app.mongoose.disconnect().catch(() => {});
  process.exit(1);
});
