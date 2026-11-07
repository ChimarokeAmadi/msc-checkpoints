// MongoDB CRUD checkpoint: the commands to type in mongosh, in order.
// (You can also run the whole file with:  mongosh commands.js)

// 1. Create (switch to) the "contact" database.
//    MongoDB really creates it when the first data is saved.
use("contact");

// 2. Create the "contactlist" collection
db.createCollection("contactlist");

// 3. Insert the five contacts
db.contactlist.insertMany([
  { last_name: "Ben",    first_name: "Moris",      email: "ben@gmail.com",      age: 26 },
  { last_name: "Kefi",   first_name: "Seif",       email: "kefi@gmail.com",     age: 15 },
  { last_name: "Emilie", first_name: "brouge",     email: "emilie.b@gmail.com", age: 40 },
  { last_name: "Alex",   first_name: "brown",                                   age: 4 },
  { last_name: "Denzel", first_name: "Washington",                              age: 3 },
]);

// 4. Display all of the contacts list
db.contactlist.find();

// 5. Display all the information about only one person using his ID
//    (copy an _id from the output of step 4, e.g. Ben Moris's)
const benId = db.contactlist.findOne({ last_name: "Ben" })._id;
db.contactlist.findOne({ _id: benId });
// typed by hand it looks like: db.contactlist.findOne({ _id: ObjectId("...") })

// 6. Display all the contacts with an age > 18
db.contactlist.find({ age: { $gt: 18 } });

// 7. Display all the contacts with an age > 18 and a name containing "ah"
//    ("name" = first name or last name, case-insensitive)
db.contactlist.find({
  age: { $gt: 18 },
  $or: [{ first_name: /ah/i }, { last_name: /ah/i }],
});
// Nobody matches, so the result is empty. Counting proves it:
db.contactlist.countDocuments({
  age: { $gt: 18 },
  $or: [{ first_name: /ah/i }, { last_name: /ah/i }],
});

// 8. Change the contact's first name from "Kefi Seif" to "Kefi Anis"
db.contactlist.updateOne(
  { last_name: "Kefi", first_name: "Seif" },
  { $set: { first_name: "Anis" } },
);

// 9. Delete the contacts that are aged under 5
db.contactlist.deleteMany({ age: { $lt: 5 } });

// 10. Display all of the contacts list
db.contactlist.find();
