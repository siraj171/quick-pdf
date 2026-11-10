// Vercel Serverless Function: receives the contact form and emails it to the site owner.
// The owner's email address is NOT in this file and is never sent to the browser.
//
// Set these in Vercel -> Project -> Settings -> Environment Variables:
//   RESEND_API_KEY  (required) API key from https://resend.com
//   CONTACT_TO      (required) the inbox that should receive messages
//   CONTACT_FROM    (optional) e.g. "Quick PDF <contact@your-verified-domain.com>"
//                   Without a verified domain, leave it unset: Resend's test sender is used,
//                   which delivers to the email address of the Resend account owner.

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();   // best-effort limit per IP (resets when the function restarts)

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  return false;
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KINDS = ['Feedback', 'Question', 'Problem', 'Other'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return send(res, 400, { error: 'Invalid request.' });

  // Honeypot: real visitors never fill this hidden field. Pretend success for bots.
  if (body.website) return send(res, 200, { message: 'Thank you! Your message has been sent.' });

  const message = String(body.message || '').trim();
  if (message.length < 10 || message.length > 3000) {
    return send(res, 400, { error: 'Please write between 10 and 3000 characters.' });
  }
  const email = String(body.email || '').trim().slice(0, 200);
  if (email && !EMAIL_RE.test(email)) {
    return send(res, 400, { error: 'Please enter a valid email or leave it empty.' });
  }
  const name = String(body.name || '').trim().slice(0, 100);
  const kind = KINDS.includes(body.kind) ? body.kind : 'Other';
  const page = String(body.page || '').slice(0, 300);

  const ip = String((req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || (req.socket && req.socket.remoteAddress) || 'unknown');
  if (rateLimited(ip)) {
    return send(res, 429, { error: 'Too many messages. Please try again in a few minutes.' });
  }

  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_TO) {
    return send(res, 500, { error: 'Contact is not set up yet. Please try again later.' });
  }

  const text = [
    'New message from Quick PDF',
    '',
    'Type: ' + kind,
    'Name: ' + (name || 'not given'),
    'Reply-to email: ' + (email || 'not given'),
    'Page: ' + (page || 'unknown'),
    'Time (UTC): ' + new Date().toISOString(),
    '',
    'Message:',
    message
  ].join('\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || 'Quick PDF <onboarding@resend.dev>',
        to: [process.env.CONTACT_TO],
        reply_to: email || undefined,
        subject: 'Quick PDF: ' + kind + (name ? ' from ' + name : ''),
        text: text
      })
    });
    if (!r.ok) return send(res, 502, { error: 'Could not send your message right now. Please try again later.' });
  } catch (err) {
    return send(res, 502, { error: 'Could not send your message right now. Please try again later.' });
  }

  return send(res, 200, { message: 'Thank you! Your message has been sent.' });
};
