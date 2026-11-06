// Task 2: a LOCAL module
// A local module is just a file of our own. Whatever we put in module.exports
// can be used by other files with require('./reportGenerator').

const PASS_MARK = 10; // pass if the average is 10 or more (scores out of 20)

function average(scores) {
  const total = scores.reduce((sum, score) => sum + score, 0);
  return total / scores.length;
}

function validate(name, scores) {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new TypeError('name must be a non-empty string');
  }
  if (!Array.isArray(scores) || scores.length === 0) {
    throw new TypeError('scores must be a non-empty array of numbers');
  }
  const bad = scores.filter((s) => typeof s !== 'number' || Number.isNaN(s) || s < 0 || s > 20);
  if (bad.length > 0) {
    throw new RangeError(`every score must be a number between 0 and 20 (invalid: ${bad.join(', ')})`);
  }
}

/**
 * Builds a student report.
 * @param {string} name   the student's name
 * @param {number[]} scores  their scores out of 20
 * @returns {string} the formatted report
 */
function generateReport(name, scores) {
  validate(name, scores);

  const avg = average(scores);
  const passed = avg >= PASS_MARK;
  const line = '-'.repeat(34);

  return [
    line,
    `Student report: ${name.trim()}`,
    line,
    `Scores:   ${scores.join(', ')}`,
    `Highest:  ${Math.max(...scores)}`,
    `Lowest:   ${Math.min(...scores)}`,
    `Average:  ${avg.toFixed(2)} / 20`,
    `Status:   ${passed ? 'PASS ✅' : 'FAIL ❌'} (pass mark: ${PASS_MARK})`,
    line,
  ].join('\n');
}

module.exports = { generateReport, PASS_MARK };
