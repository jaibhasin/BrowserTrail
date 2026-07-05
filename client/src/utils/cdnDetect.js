const CDN_PATTERNS = [
  { name: 'Cloudflare', pattern: /cloudflare/i },
  { name: 'Akamai', pattern: /akamai|akamaiedge/i },
  { name: 'Fastly', pattern: /fastly/i },
  { name: 'Amazon CloudFront', pattern: /cloudfront/i },
  { name: 'Google', pattern: /google|1e100/i },
];

export function detectCdn(hop) {
  const text = `${hop.hostname || ''} ${hop.ip || ''}`;
  for (const cdn of CDN_PATTERNS) {
    if (cdn.pattern.test(text)) {
      return { isCdn: true, provider: cdn.name };
    }
  }
  return { isCdn: false, provider: null };
}

export function findCdnHop(hops) {
  if (!hops?.length) return null;
  for (let i = hops.length - 1; i >= 0; i -= 1) {
    const result = detectCdn(hops[i]);
    if (result.isCdn) {
      return { index: i, ...result, hop: hops[i] };
    }
  }
  return null;
}
