# Introduction to Node.js

This checkpoint is my first real look at Node.js: running JavaScript outside the browser. There are five small exercises and each one has its own file. I used Node 20 (anything from 20.12 up works). Run `npm install` once in this folder to get the two packages used in tasks 4 and 5.

## 1. Hello World

`hello-world.js` just prints `HELLO WORLD`. It's the same `console.log` as in the browser, but the output shows up in the terminal instead of the dev tools.

```bash
node hello-world.js
```

## 2. A server on port 3000

`server.js` uses Node's built-in `http` module, so nothing has to be installed. `http.createServer` takes a function that runs every time someone visits, and `server.listen(3000)` starts listening on port 3000. I set the `Content-Type` to `text/html` so the browser shows `Hello Node!!!!` as a big heading instead of printing the tags as text.

```bash
node server.js
```

Then open http://localhost:3000. The server keeps running until you stop it with `Ctrl + C`.

## 3. The file system (`fs`)

The instructions have two parts, so I made two files.

`write-file.js` uses `fs.writeFileSync` to create `welcome.txt` with the line `Hello Node`. If the file already exists, it gets replaced.

`read-file.js` uses `fs.readFile` to read `hello.txt` and log what's inside. I included a `hello.txt` in the folder so there's something to read. This version is asynchronous: Node doesn't wait for the file, it calls my function when the reading is done, and the first argument tells me if something went wrong (for example, the file doesn't exist). You can also give it another file name, which is handy for checking the file from the first part.

```bash
node write-file.js             # creates welcome.txt
node read-file.js              # prints what's in hello.txt
node read-file.js welcome.txt  # prints "Hello Node"
```

## 4. Password generator

For this one I installed a package from npm: `npm install generate-password`. In `password-generator.js` I wrapped it in my own `generatePassword` function, which asks for numbers, symbols, uppercase and lowercase letters. `strict: true` makes sure there's at least one of each, and `excludeSimilarCharacters` removes confusing ones like `l` and `1`. You get a new password every time you run it.

```bash
node password-generator.js        # one 16-character password
node password-generator.js 24 3   # three 24-character passwords
```

## 5. Sending myself an email

I installed `nodemailer` (`npm install nodemailer`) and followed the W3Schools example. You create a **transporter** (Gmail here), write the **mail options** (from, to, subject, text) and call `sendMail`. The email is sent from my address to the same address, so I send it to myself.

Gmail won't accept your normal password from a script, so you need an **App Password**:

1. Turn on 2-Step Verification for your Google account.
2. Create an app password at https://myaccount.google.com/apppasswords and copy the 16 characters.
3. In this folder, run `cp .env.example .env` and put your Gmail address and the app password in `.env`.
4. Run `node email-sender.js` and check your inbox.

To try it without a Gmail account, run `node email-sender.js --test`. It sends the email to Ethereal, a fake inbox made by the nodemailer team, and prints a link where you can see the email.

### Keeping my personal information off GitHub

The checkpoint says to delete personal information before uploading. Instead of typing my email and password into the code and deleting them later (which is easy to forget), I kept them in a `.env` file. The script reads them with `process.loadEnvFile()`, and `.env` is listed in `.gitignore`, so git never uploads it. Only `.env.example`, which has fake placeholder values, goes on GitHub. `node_modules` is ignored too, because anyone can recreate it with `npm install`.
