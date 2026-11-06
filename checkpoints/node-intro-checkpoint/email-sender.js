// Task 5: send yourself an email with nodemailer
// Install first: npm install nodemailer
// Run with: node email-sender.js         -> real email with your Gmail (settings in .env)
//           node email-sender.js --test  -> fake inbox (Ethereal), no Gmail needed
//
// Your email and password are NOT written here: they live in .env, which is in
// .gitignore, so no personal information gets uploaded to GitHub.

const nodemailer = require('nodemailer');

try {
  process.loadEnvFile(); // built into Node 20.12+, reads the .env file
} catch {
  // no .env file yet: the check below explains what to do
}

const TEST_MODE = process.argv.includes('--test');

async function main() {
  let transporter;
  let myEmail;

  if (TEST_MODE) {
    const testAccount = await nodemailer.createTestAccount();
    myEmail = testAccount.user;
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  } else {
    const { EMAIL_USER, EMAIL_PASS } = process.env;
    if (!EMAIL_USER || !EMAIL_PASS) {
      console.error('Missing EMAIL_USER or EMAIL_PASS.');
      console.error('Copy .env.example to .env and fill it in (see README.md),');
      console.error('or run "node email-sender.js --test" to try it without Gmail.');
      process.exit(1);
    }
    myEmail = EMAIL_USER;
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS.replace(/\s/g, '') },
    });
  }

  const mailOptions = {
    from: myEmail,
    to: myEmail, // sending the email to myself
    subject: 'Sending Email using Node.js',
    text: 'That was easy! This email was sent to myself from a Node.js script.',
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    if (TEST_MODE) console.log('See it here: ' + nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('The email could not be sent.');
    if (error.code === 'EAUTH') {
      console.error('Gmail refused the login: EMAIL_PASS must be an App Password, not your normal password.');
    }
    console.error('Details: ' + error.message);
    process.exitCode = 1;
  }
}

main();
