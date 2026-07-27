import * as dns from 'dns/promises';
import { isIP } from 'net';
import { normalizeTarget } from './analysisHelpers.js';

export class InvalidTargetError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidTargetError';
    this.statusCode = 400;
  }
}

function isPrivateIpv4(address) {
  const octets = address.split('.').map(Number);
  const [a, b] = octets;

  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 0 || b === 168))
    || (a === 198 && (b === 18 || b === 19 || b === 51))
    || (a === 203 && b === 0)
    || a >= 224;
}

/**
 * Blocks addresses that are not publicly routable.  This is deliberately
 * conservative: a diagnostics service must never become a route to local or
 * provider metadata services.
 */
export function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) return !isPrivateIpv4(address);
  if (family !== 6) return false;

  const value = address.toLowerCase();
  if (value.startsWith('::ffff:')) return isPublicAddress(value.slice(7));

  return value !== '::'
    && value !== '::1'
    && !value.startsWith('fc')
    && !value.startsWith('fd')
    && !value.startsWith('fe8')
    && !value.startsWith('fe9')
    && !value.startsWith('fea')
    && !value.startsWith('feb')
    && !value.startsWith('ff')
    && !value.startsWith('2001:db8');
}

export function validateTarget(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > 2048) {
    throw new InvalidTargetError('Enter a website URL up to 2048 characters long.');
  }

  let target;
  try {
    target = normalizeTarget(rawUrl);
  } catch {
    throw new InvalidTargetError('Enter a valid HTTP or HTTPS website URL.');
  }

  const url = new URL(target.normalized);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new InvalidTargetError('Only HTTP and HTTPS URLs can be analyzed.');
  }
  if (url.username || url.password) {
    throw new InvalidTargetError('URLs with embedded credentials cannot be analyzed.');
  }
  if (url.port && !['80', '443'].includes(url.port)) {
    throw new InvalidTargetError('Only ports 80 and 443 can be analyzed.');
  }

  return target;
}

/**
 * Resolves the target once, rejects every non-public result, and returns a
 * pinned address for all connection-making probes.  Pinning avoids DNS
 * rebinding between validation and the outbound request.
 */
export async function prepareTarget(rawUrl, lookup = dns.lookup) {
  const target = validateTarget(rawUrl);
  let addresses;

  try {
    addresses = await lookup(target.hostname, { all: true, verbatim: true });
  } catch {
    throw new InvalidTargetError('The website hostname could not be resolved.');
  }

  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new InvalidTargetError('This website resolves to a private or reserved network address.');
  }

  const preferred = addresses.find(({ family }) => family === 4) || addresses[0];
  return { ...target, address: preferred.address, addressFamily: preferred.family };
}

export function createPinnedLookup(address, family = isIP(address)) {
  return (_hostname, _options, callback) => callback(null, address, family);
}
