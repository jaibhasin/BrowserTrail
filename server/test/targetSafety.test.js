import test from 'node:test';
import assert from 'node:assert/strict';
import { createPinnedLookup, isPublicAddress, prepareTarget, validateTarget } from '../src/lib/targetSafety.js';

test('classifies public and non-public addresses conservatively', () => {
  assert.equal(isPublicAddress('1.1.1.1'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
  assert.equal(isPublicAddress('127.0.0.1'), false);
  assert.equal(isPublicAddress('169.254.169.254'), false);
  assert.equal(isPublicAddress('10.0.0.1'), false);
  assert.equal(isPublicAddress('::1'), false);
  assert.equal(isPublicAddress('fd00::1'), false);
  assert.equal(isPublicAddress('::ffff:127.0.0.1'), false);
});

test('rejects unsupported schemes, credentials, and non-web ports', () => {
  assert.throws(() => validateTarget('ftp://example.com'), /Only HTTP and HTTPS/);
  assert.throws(() => validateTarget('https://user:secret@example.com'), /embedded credentials/);
  assert.throws(() => validateTarget('https://example.com:8080'), /Only ports 80 and 443/);
});

test('rejects every private DNS answer and pins a public address', async () => {
  await assert.rejects(
    prepareTarget('https://example.com', async () => [
      { address: '1.1.1.1', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]),
    /private or reserved/
  );

  const target = await prepareTarget('https://example.com', async () => [
    { address: '2606:4700:4700::1111', family: 6 },
    { address: '1.1.1.1', family: 4 },
  ]);
  assert.equal(target.address, '1.1.1.1');
  assert.equal(target.addressFamily, 4);

  await new Promise((resolve, reject) => {
    createPinnedLookup(target.address, target.addressFamily)('ignored.example', {}, (error, address, family) => {
      try {
        assert.equal(error, null);
        assert.equal(address, '1.1.1.1');
        assert.equal(family, 4);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
});
