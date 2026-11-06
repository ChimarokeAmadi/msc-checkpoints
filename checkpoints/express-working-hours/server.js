// Starts the web server
// Run with: node server.js   then open http://localhost:3000
//
// Demo: to see the open pages outside working hours, pretend it's another time:
//   DEMO_TIME="2026-11-09T10:00" node server.js

const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;

let now; // undefined = use the real clock
if (process.env.DEMO_TIME) {
  const demo = new Date(process.env.DEMO_TIME);
  if (Number.isNaN(demo.getTime())) {
    console.error(`DEMO_TIME "${process.env.DEMO_TIME}" is not a valid date, e.g. 2026-11-09T10:00`);
    process.exit(1);
  }
  now = () => demo;
}

createApp({ now }).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Open Monday to Friday, 9:00 to 17:00 (this computer's time)");
  if (now) console.log(`Demo mode: pretending it is ${now().toString().slice(0, 21)}`);
});
