/**
 * Lightweight IP geolocation for hop visualization.
 * Uses ip-api.com free tier (no key, rate-limited).
 */

const PRIVATE_RANGES = [
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^127\./,
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i,
];

function isPrivateIp(ip) {
  if (!ip) return true;
  return PRIVATE_RANGES.some((re) => re.test(ip));
}

async function lookupIp(ip) {
  if (isPrivateIp(ip)) {
    return { ip, lat: null, lon: null, city: 'Local', country: 'LAN', private: true };
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,lat,lon,city,country,query`);
    const data = await response.json();
    if (data.status !== 'success') {
      return { ip, lat: null, lon: null, city: null, country: null, error: 'lookup failed' };
    }
    return {
      ip: data.query,
      lat: data.lat,
      lon: data.lon,
      city: data.city,
      country: data.country,
      private: false,
    };
  } catch {
    return { ip, lat: null, lon: null, city: null, country: null, error: 'lookup failed' };
  }
}

/**
 * Geolocate a list of IPs (sequential to respect rate limits).
 */
export async function geolocateIps(ips) {
  const unique = [...new Set(ips.filter(Boolean))];
  const locations = {};

  for (const ip of unique.slice(0, 15)) {
    locations[ip] = await lookupIp(ip);
    await new Promise((r) => setTimeout(r, 150));
  }

  return { locations };
}
