// Custom middleware: only let requests through during working hours
// (Monday to Friday, from 9:00 to 17:00). Outside those hours it shows a
// "closed" page instead of calling next().
//
// The clock is passed in as `now` so the tests can pretend it's any day/time.

const OPEN_HOUR = 9;
const CLOSE_HOUR = 17;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isWorkingTime(date) {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = date.getHours();
  const isWeekday = day >= 1 && day <= 5;
  return isWeekday && hour >= OPEN_HOUR && hour < CLOSE_HOUR; // 17:00 is already closed
}

// Works out when we open next, to show it on the closed page
function nextOpening(date) {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  // Today is still possible if it's a weekday before 9:00
  if (!(next.getDay() >= 1 && next.getDay() <= 5 && date.getHours() < OPEN_HOUR)) {
    do {
      next.setDate(next.getDate() + 1);
    } while (next.getDay() === 0 || next.getDay() === 6);
  }
  next.setHours(OPEN_HOUR);
  return next;
}

function workingHours({ now = () => new Date() } = {}) {
  return (req, res, next) => {
    const date = now();
    if (isWorkingTime(date)) {
      return next();
    }

    const opening = nextOpening(date);
    res.status(503).render('closed', {
      title: 'Closed',
      current: null,
      openHour: OPEN_HOUR,
      closeHour: CLOSE_HOUR,
      requestTime: `${DAYS[date.getDay()]} ${date.toTimeString().slice(0, 5)}`,
      nextOpening: `${DAYS[opening.getDay()]} at ${String(OPEN_HOUR).padStart(2, '0')}:00`,
    });
  };
}

module.exports = { workingHours, isWorkingTime, nextOpening, OPEN_HOUR, CLOSE_HOUR };
