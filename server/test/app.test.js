import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';

async function withServer(app, run) {
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('blocks a loopback analysis before any network probe is started', async () => {
  await withServer(createApp(), async (baseUrl) => {
    for (const endpoint of ['/api/analyze', '/api/analyze/stream']) {
      const response = await fetch(`${baseUrl}${endpoint}?url=http://127.0.0.1`);
      assert.equal(response.status, 400);
      const body = await response.json();
      assert.match(body.error, /private or reserved/);
    }
  });
});

test('rate limits repeated analysis requests', async () => {
  await withServer(createApp({ rateLimit: { windowMs: 60_000, max: 2 } }), async (baseUrl) => {
    const first = await fetch(`${baseUrl}/api/analyze`);
    const second = await fetch(`${baseUrl}/api/analyze`);
    const third = await fetch(`${baseUrl}/api/analyze`);
    assert.equal(first.status, 400);
    assert.equal(second.status, 400);
    assert.equal(third.status, 429);
    assert.equal(third.headers.get('ratelimit-limit'), '2');
    assert.ok(third.headers.get('retry-after'));
  });
});
