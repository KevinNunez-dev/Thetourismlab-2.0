const MAX_BODY_BYTES = 20_000;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const fields = {
  name: 120,
  email: 254,
  phone: 50,
  website: 500,
  message: 5000,
};

function reply(status, message) {
  return Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readBody(request) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return reply(403, 'This request could not be accepted.');
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/x-www-form-urlencoded')) return reply(415, 'Invalid form submission.');
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_EMAIL_API_TOKEN || !env.TURNSTILE_SECRET_KEY) {
    console.error('Contact form is missing required Cloudflare configuration.');
    return reply(503, 'The contact form is not configured yet. Please email info@thetourismlab.com.');
  }

  const body = await readBody(request);
  if (body === null) return reply(413, 'Your message is too long.');
  const data = new URLSearchParams(body);
  const values = {};
  for (const [field, max] of Object.entries(fields)) {
    const value = data.get(field)?.trim() || '';
    if (value.length > max || (field !== 'message' && /[\r\n]/.test(value))) return reply(400, 'Please check the length and format of your details.');
    values[field] = value;
  }
  if (!values.name || !EMAIL.test(values.email) || !values.message) return reply(400, 'Please enter your name, a valid email address, and a message.');
  if (values.website) {
    try {
      const website = new URL(values.website);
      if (!['http:', 'https:'].includes(website.protocol)) throw new Error('Unsupported protocol');
    } catch {
      return reply(400, 'Please enter a valid website URL beginning with http:// or https://.');
    }
  }
  const token = data.get('cf-turnstile-response');
  if (!token || token.length > 2048) return reply(400, 'Please complete the security check.');

  try {
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.headers.get('CF-Connecting-IP') || undefined }),
    });
    if (!verification.ok) {
      console.error(`Turnstile verification service returned HTTP ${verification.status}.`);
      return reply(502, 'The security check is unavailable. Please try again.');
    }
    const result = await verification.json();
    if (!result.success || result.hostname !== new URL(request.url).hostname) return reply(400, 'The security check failed or expired. Please try again.');

    const emailResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/email/sending/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_EMAIL_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'noreply@thetourismlab.com',
        to: 'info@thetourismlab.com',
        reply_to: values.email,
        subject: 'New website inquiry',
        text: `Name: ${values.name}\nEmail: ${values.email}\nPhone: ${values.phone || 'Not provided'}\nWebsite: ${values.website || 'Not provided'}\n\nMessage:\n${values.message}`,
      }),
    });
    const sent = await emailResponse.json();
    if (!emailResponse.ok || sent.success !== true) {
      console.error(`Cloudflare email sending failed (HTTP ${emailResponse.status}).`, JSON.stringify(sent.errors || []));
      return reply(502, 'Your message could not be sent. Please try again or email info@thetourismlab.com.');
    }
    return reply(200, 'Thank you! Your message has been sent.');
  } catch (error) {
    console.error('Contact form service failed:', error);
    return reply(502, 'Your message could not be sent. Please try again or email info@thetourismlab.com.');
  }
}
