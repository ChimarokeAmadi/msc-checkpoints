// Task 3: using a THIRD-PARTY module (nodemailer)
// Third-party modules are installed from npm first:  npm install nodemailer
//
// Run with:  node emailSender.js           -> sends a real email with your Gmail (settings in .env)
//            node emailSender.js --test    -> sends to a free fake inbox (Ethereal), no Gmail needed

const nodemailer = require('nodemailer');

// Read the settings from the .env file (built into Node 20.12+), so the
// password is never written in the code. The .env file is in .gitignore.
try {
  process.loadEnvFile();
} catch {
  // no .env file: the check below explains what to do
}

const TEST_MODE = process.argv.includes('--test');

async function createTransporter() {
  if (TEST_MODE) {
    // Ethereal is a fake SMTP service made by the nodemailer team for testing:
    // the email is "sent" but only visible on a preview web page.
    const testAccount = await nodemailer.createTestAccount();
    console.log('Test mode: using a temporary Ethereal account');
    return {
      from: testAccount.user,
      to: testAccount.user,
      transporter: nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass },
      }),
    };
  }

  const { EMAIL_USER, EMAIL_PASS, EMAIL_TO } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.error('Missing EMAIL_USER or EMAIL_PASS.');
    console.error('Copy .env.example to .env and fill in your Gmail address and app password (see README.md),');
    console.error('or run "node emailSender.js --test" to try it without Gmail.');
    process.exit(1);
  }

  return {
    from: EMAIL_USER,
    to: EMAIL_TO || EMAIL_USER, // send to yourself if no recipient is set
    // 1. The transporter: HOW the email is sent (Gmail's SMTP server)
    transporter: nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS.replace(/\s/g, ''), // Google shows the app password with spaces
      },
    }),
  };
}

async function sendEmail() {
  const { transporter, from, to } = await createTransporter();

  // 2. The mail options: WHAT is sent
  const mailOptions = {
    from: `"Node.js Checkpoint" <${from}>`,
    to,
    subject: 'Hello from Node.js and nodemailer 👋',
    text: [
      'Hi!',
      '',
      'This email was sent by a Node.js script using the nodemailer package.',
      `Sent on ${new Date().toLocaleString('en-GB')}.`,
      '',
      'Have a great day!',
    ].join('\n'),
  };

  // 3. Send it and log the result
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Server response: ${info.response}`);
    if (TEST_MODE) console.log(`   See it here: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    console.error('❌ The email could not be sent.');
    if (error.code === 'EAUTH') {
      console.error('   Gmail refused the login. Check EMAIL_USER, and make sure EMAIL_PASS is an');
      console.error('   App Password (not your normal password) with 2-Step Verification turned on.');
    } else if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS'].includes(error.code)) {
      console.error('   Could not connect to the mail server. Check your internet connection.');
    }
    console.error(`   Details: ${error.message}`);
    process.exitCode = 1;
  }
}

sendEmail();
