// Writes postman/users-api.postman_collection.json (import it in Postman:
// File -> Import). Each request has a small test script, so "Run collection"
// checks every route automatically.
const fs = require('fs');

const req = (name, method, path, body, tests) => ({
  name,
  event: [{ listen: 'test', script: { type: 'text/javascript', exec: tests } }],
  request: {
    method,
    header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
    ...(body && { body: { mode: 'raw', raw: JSON.stringify(body, null, 2) } }),
    url: { raw: `{{baseUrl}}${path}`, host: ['{{baseUrl}}'], path: path.split('/').filter(Boolean) },
  },
});

const email = 'ada.{{$timestamp}}@example.com'; // unique on every run

const collection = {
  info: { name: 'Users REST API (Mongoose)', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  variable: [{ key: 'baseUrl', value: 'http://localhost:3000' }, { key: 'userId', value: '' }],
  item: [
    req('1. POST add a user', 'POST', '/users', { name: 'Ada Lovelace', email, age: 36 }, [
      "pm.test('201 Created', () => pm.response.to.have.status(201));",
      'const user = pm.response.json();',
      "pm.test('has an _id', () => pm.expect(user._id).to.be.a('string'));",
      "pm.collectionVariables.set('userId', user._id); // used by the next requests",
    ]),
    req('2. GET all users', 'GET', '/users', null, [
      "pm.test('200 OK', () => pm.response.to.have.status(200));",
      "pm.test('the new user is in the list', () => pm.expect(pm.response.json().map(u => u._id)).to.include(pm.collectionVariables.get('userId')));",
    ]),
    req('3. PUT edit the user', 'PUT', '/users/{{userId}}', { age: 37 }, [
      "pm.test('200 OK', () => pm.response.to.have.status(200));",
      "pm.test('age was updated', () => pm.expect(pm.response.json().age).to.eql(37));",
    ]),
    req('4. DELETE remove the user', 'DELETE', '/users/{{userId}}', null, [
      "pm.test('200 OK', () => pm.response.to.have.status(200));",
      "pm.test('returns the deleted user', () => pm.expect(pm.response.json().user._id).to.eql(pm.collectionVariables.get('userId')));",
    ]),
    req('5. DELETE again -> 404', 'DELETE', '/users/{{userId}}', null, [
      "pm.test('404 Not Found', () => pm.response.to.have.status(404));",
    ]),
    req('6. POST invalid user -> 400', 'POST', '/users', { email: 'not-an-email' }, [
      "pm.test('400 Bad Request', () => pm.response.to.have.status(400));",
    ]),
  ],
};

fs.writeFileSync(`${__dirname}/users-api.postman_collection.json`, JSON.stringify(collection, null, 2) + '\n');
console.log('wrote postman/users-api.postman_collection.json');
