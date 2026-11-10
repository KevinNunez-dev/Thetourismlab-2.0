import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/contact.js';

const originalFetch = globalThis.fetch;
const env = { CLOUDFLARE_ACCOUNT_ID: 'test-account', CLOUDFLARE_EMAIL_API_TOKEN: 'test-token', TURNSTILE_SECRET_KEY: 'test-secret' };
const values = { name: 'Test Visitor', email: 'visitor@example.com', phone: '', website: '', message: 'Hello there', 'cf-turnstile-response': 'test-token' };
const request = (data = values, options = {}) => new Request('https://preview.example.com/api/contact', {
  method: 'POST',
  body: new URLSearchParams(data),
  ...options,
});
afterEach(() => { globalThis.fetch = originalFetch; });

test('sends validated inquiries to the fixed destination with reply-to', async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return Response.json(calls.length === 1 ? { success: true, hostname: 'preview.example.com' } : { success: true });
  };
  const response = await onRequestPost({ request: request(), env });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  const message = JSON.parse(calls[1].init.body);
  assert.equal(message.from, 'noreply@thetourismlab.com');
  assert.equal(message.to, 'info@thetourismlab.com');
  assert.equal(message.reply_to, 'visitor@example.com');
  assert.match(message.text, /Hello there/);
});

test('rejects invalid input without calling external services', async () => {
  globalThis.fetch = async () => { throw new Error('unexpected fetch'); };
  const response = await onRequestPost({ request: request({ ...values, email: 'invalid' }), env });
  assert.equal(response.status, 400);
});

test('rejects cross-origin submissions', async () => {
  const response = await onRequestPost({ request: request(values, { headers: { Origin: 'https://other.example', 'Content-Type': 'application/x-www-form-urlencoded' } }), env });
  assert.equal(response.status, 403);
});

test('rejects an oversized body', async () => {
  const response = await onRequestPost({ request: request({ ...values, message: 'a'.repeat(21000) }), env });
  assert.equal(response.status, 413);
});

test('fails closed when Turnstile rejects a token or hostname', async () => {
  for (const result of [{ success: false }, { success: true, hostname: 'other.example' }]) {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json(result); };
    const response = await onRequestPost({ request: request(), env });
    assert.equal(response.status, 400);
    assert.equal(calls, 1);
  }
});

test('reports missing configuration without claiming success', async () => {
  const response = await onRequestPost({ request: request(), env: {} });
  assert.equal(response.status, 503);
});

test('reports email delivery errors', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return calls === 1 ? Response.json({ success: true, hostname: 'preview.example.com' }) : Response.json({ success: false, errors: [] }, { status: 403 });
  };
  const response = await onRequestPost({ request: request(), env });
  assert.equal(response.status, 502);
  assert.match((await response.json()).message, /could not be sent/);
});
