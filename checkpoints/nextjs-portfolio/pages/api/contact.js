// API route -> POST /api/contact
// Receives the contact form, checks it, and logs it on the server.
// (A real site would send an email here, e.g. with Resend or Nodemailer.)
export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Only POST requests are allowed.' });
  }

  const { name, email, message } = req.body || {};

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Please fill in your name, email and message.' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  console.log(`New message from ${name} <${email}>: ${message}`);
  return res.status(200).json({ ok: true });
}
