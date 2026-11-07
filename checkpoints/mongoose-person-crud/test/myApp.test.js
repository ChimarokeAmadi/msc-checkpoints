// Tests for every exercise, using a temporary in-memory MongoDB.
// Run with: npm test

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const { promisify } = require('node:util');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../myApp');

const { Person } = app;
const run = (fn, ...args) => promisify(fn)(...args);
let server;

before(async () => {
  server = await MongoMemoryServer.create();
  await app.connect(server.getUri('test'));
});
after(async () => {
  await app.mongoose.disconnect();
  await server.stop();
});
beforeEach(() => Person.deleteMany({}));

const seed = () =>
  Person.create([
    { name: 'Mary', age: 34, favoriteFoods: ['burrito', 'pasta'] },
    { name: 'Mary', age: 21, favoriteFoods: ['sushi'] },
    { name: 'Tunde', age: 25, favoriteFoods: ['burrito'] },
    { name: 'Amina', age: 30, favoriteFoods: ['burrito', 'fried rice'] },
    { name: 'Bola', age: 19, favoriteFoods: ['burrito'] },
  ]);

test('the schema: name is required, favoriteFoods is a list of strings with a default', async () => {
  await assert.rejects(Person.create({ age: 30 }), /A person needs a name/);
  await assert.rejects(Person.create({ name: 'X', age: -1 }), /cannot be negative/);
  const p = await Person.create({ name: '  Ada  ' });
  assert.equal(p.name, 'Ada');
  assert.deepEqual([...p.favoriteFoods], []);
  // favoriteFoods is [String], not a "Mixed" array: values are converted to strings
  const q = await Person.create({ name: 'Q', favoriteFoods: [42] });
  assert.deepEqual([...q.favoriteFoods], ['42']);
  await assert.rejects(Person.create({ name: 'R', favoriteFoods: [{ not: 'a string' }] }), /Cast to/);
});

test('connect() explains a missing MONGO_URI', () => {
  assert.throws(() => app.connect(''), /MONGO_URI is missing/);
});

test('createAndSavePerson saves a person', async () => {
  const p = await run(app.createAndSavePerson);
  assert.ok(p._id);
  assert.equal(p.name, 'Chimaroke Amadi');
  assert.equal(await Person.countDocuments(), 1);
});

test('createManyPeople saves the whole array', async () => {
  const people = await run(app.createManyPeople, [{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
  assert.equal(people.length, 3);
  assert.equal(await Person.countDocuments(), 3);
});

test('findPeopleByName returns an array of everyone with that name', async () => {
  await seed();
  const marys = await run(app.findPeopleByName, 'Mary');
  assert.equal(marys.length, 2);
  assert.deepEqual(await run(app.findPeopleByName, 'Nobody'), []);
});

test('findOneByFood returns ONE person who likes that food', async () => {
  await seed();
  const p = await run(app.findOneByFood, 'sushi');
  assert.equal(p.name, 'Mary');
  assert.equal(p.age, 21);
  assert.equal(await run(app.findOneByFood, 'pizza'), null);
});

test('findPersonById finds the right person', async () => {
  const [, , tunde] = await seed();
  const p = await run(app.findPersonById, tunde._id);
  assert.equal(p.name, 'Tunde');
});

test('findEditThenSave adds "hamburger" and saves it', async () => {
  const [, , tunde] = await seed();
  const updated = await run(app.findEditThenSave, tunde._id);
  assert.deepEqual([...updated.favoriteFoods], ['burrito', 'hamburger']);
  const fromDb = await Person.findById(tunde._id);
  assert.deepEqual([...fromDb.favoriteFoods], ['burrito', 'hamburger']); // really saved
});

test('findEditThenSave reports an unknown id as an error', async () => {
  await assert.rejects(run(app.findEditThenSave, new app.mongoose.Types.ObjectId()), /No person/);
});

test('findAndUpdate sets age to 20 and returns the UPDATED document', async () => {
  await seed();
  const p = await run(app.findAndUpdate, 'Tunde');
  assert.equal(p.age, 20); // the new value, not the old 25
  assert.equal((await Person.findOne({ name: 'Tunde' })).age, 20);
});

test('removeById deletes one person and returns them', async () => {
  const [, , tunde] = await seed();
  const removed = await run(app.removeById, tunde._id);
  assert.equal(removed.name, 'Tunde');
  assert.equal(await Person.findById(tunde._id), null);
  assert.equal(await Person.countDocuments(), 4);
});

test('removeManyPeople deletes every Mary and returns the outcome, not the documents', async () => {
  await seed();
  const outcome = await run(app.removeManyPeople);
  assert.deepEqual(outcome, { acknowledged: true, deletedCount: 2 });
  assert.equal(await Person.countDocuments({ name: 'Mary' }), 0);
  assert.equal(await Person.countDocuments(), 3);
});

test('queryChain: burrito lovers, sorted by name, only 2, without age', async () => {
  await seed();
  const result = await run(app.queryChain);
  // burrito: Mary(34), Tunde, Amina, Bola -> sorted: Amina, Bola, Mary, Tunde -> first 2
  assert.deepEqual(result.map((p) => p.name), ['Amina', 'Bola']);
  for (const p of result) {
    assert.equal(p.age, undefined, 'age must be hidden');
    assert.ok(p.favoriteFoods.includes('burrito'));
  }
});
