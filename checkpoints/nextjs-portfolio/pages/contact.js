import { useState } from 'react';
import Head from 'next/head';
import styles from '@/styles/Contact.module.css';

// Contact page -> "/contact"
// Replace these with your real details
const contactInfo = [
  { label: 'Email', value: 'your.email@example.com', href: 'mailto:your.email@example.com' },
  { label: 'GitHub', value: 'github.com/your-username', href: 'https://github.com/your-username' },
  { label: 'LinkedIn', value: 'linkedin.com/in/your-profile', href: 'https://linkedin.com/in/your-profile' },
];

const emptyForm = { name: '', email: '', message: '' };

export default function Contact() {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState(null); // null | 'sending' | 'sent' | error message

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Sends the form to our own API route (pages/api/contact.js)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || 'Something went wrong.');
        return;
      }
      setStatus('sent');
      setForm(emptyForm);
    } catch {
      setStatus('Could not send the message. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <title>Contact | Chimaroke Amadi</title>
      </Head>

      <h1>Contact</h1>
      <p>Want to work together or just say hi? Send me a message.</p>

      <div className={styles.layout}>
        <ul className={styles.info}>
          {contactInfo.map((item) => (
            <li key={item.label}>
              <strong>{item.label}</strong>
              <a href={item.href} target="_blank" rel="noreferrer">{item.value}</a>
            </li>
          ))}
        </ul>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Name
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </label>
          <label>
            Message
            <textarea name="message" rows={5} value={form.message} onChange={handleChange} required />
          </label>

          <button type="submit" className="button" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending...' : 'Send message'}
          </button>

          {status === 'sent' && <p className={styles.success}>Thanks! Your message was sent.</p>}
          {status && status !== 'sent' && status !== 'sending' && (
            <p className={styles.error}>{status}</p>
          )}
        </form>
      </div>
    </>
  );
}
