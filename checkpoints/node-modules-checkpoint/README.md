# Node.js Modules: Built-in, Local and Third-Party

In this checkpoint I practised the three kinds of modules in Node.js. **Built-in** modules come with Node (like `fs`). **Local** modules are files I write myself and export from. **Third-party** modules are packages installed from npm (like `nodemailer`). Everything uses `require()` (CommonJS), as the instructions show.

You need Node.js 20.12 or newer. Install the packages once with `npm install`.

## Task 1: built-in module (`fs`)

`message.txt` contains *Hello from the file system module!*. `readFile.js` loads the `fs` module with `require('fs')`, reads the file with `fs.readFileSync(filePath, 'utf8')` and prints the text. The `'utf8'` part turns the raw bytes into text. Without it, you'd get a Buffer. I build the path with `path.join(__dirname, 'message.txt')`, so it works no matter which folder you run it from. If the file is missing, it shows a clear "File not found" message.

```bash
node readFile.js
# Hello from the file system module!
```

## Task 2: local module (`reportGenerator.js`)

`reportGenerator.js` exports a function `generateReport(name, scores)` with `module.exports`. It calculates the average of the scores (out of 20), the highest and lowest scores, and the status: **PASS if the average is 10 or more**, otherwise FAIL. It returns everything as a formatted report. It also checks the input, so an empty name, an empty array or a score outside 0–20 throws a clear error instead of giving a wrong report.

`main.js` imports it with `require('./reportGenerator')` (the `./` tells Node it's my own file, not a package), calls it for three students, and prints the reports. One student is exactly on 10, to show that 10 counts as a pass.

```bash
node main.js
```

## Task 3: third-party module (`nodemailer`)

I installed it with `npm install nodemailer`. `emailSender.js` follows the three steps from the instructions:

1. **Create a transporter:** this is *how* the email is sent, here through Gmail's SMTP server.
2. **Define the mail options:** `from`, `to`, `subject` and `text`.
3. **Send it** with `transporter.sendMail()`, which logs a confirmation (message ID and server response) or a clear error message.

### Setting up Gmail

Gmail doesn't let apps log in with your normal password. You need an **App Password**:

1. Turn on **2-Step Verification** for your Google account.
2. Go to https://myaccount.google.com/apppasswords, create an app password (name it e.g. "Node checkpoint") and copy the 16 characters.
3. In this folder, run `cp .env.example .env`, then open `.env` and fill in `EMAIL_USER` (your Gmail address) and `EMAIL_PASS` (the app password). `EMAIL_TO` is optional: if it's empty, the email is sent to yourself.
4. Run it:

```bash
node emailSender.js
```

The password stays in `.env`, which is listed in `.gitignore`, so it never ends up on GitHub. `emailSender.js` reads it with `process.loadEnvFile()`, which is built into Node, so no extra package is needed. If Gmail refuses the login, the script explains that it needs an app password and not your normal one.

### Trying it without Gmail

```bash
node emailSender.js --test
```

This sends the same email through **Ethereal**, a free fake mail service made by the nodemailer team for testing. It prints a link where you can see the email exactly as it was sent.
