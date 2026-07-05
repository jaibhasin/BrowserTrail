import * as dns from 'dns/promises';

/**
 * Performs a comprehensive DNS resolution for a given hostname.
 *
 * What we measure:
 *   - All standard DNS record types (A, AAAA, CNAME, MX, NS, TXT)
 *   - The resolved IP address (the actual server we'll connect to)
 *   - Query latency (how long DNS took in ms)
 *
 * Why this matters:
 *   DNS is the phonebook of the internet. Every web request starts here.
 *   Slow DNS = slow page loads, regardless of server performance.
 */
export async function analyzeDns(hostname) {
  const start = performance.now();
  const results = { records: {}, queryTime: 0, error: null, resolvedIp: null, resolverAddress: null };

  // The recursive resolver our machine actually asks (ISP/router/public DNS).
  // This is a different address from the target's resolved IP.
  const [configuredResolver] = dns.getServers();
  results.resolverAddress = configuredResolver || null;

  try {
    // ── Resolve the primary address ──
    //   lookup() gives us a fast connectable address even for IPv6-only hosts.
    const primaryAddress = await dns.lookup(hostname);
    results.resolvedIp = primaryAddress.address;

    // ── Query all DNS record types in parallel ──
    //   Each record type reveals a different aspect of the domain:
    //     A/AAAA  → server IP addresses (IPv4/IPv6)
    //     CNAME   → domain aliases (CDN, redirects)
    //     MX      → mail server configuration
    //     NS      → authoritative name servers
    //     TXT     → verification records, SPF, DKIM
    const queries = [
      { type: 'A',     label: 'IPv4 Addresses', resolver: () => dns.resolve4(hostname) },
      { type: 'AAAA',  label: 'IPv6 Addresses', resolver: () => dns.resolve6(hostname) },
      { type: 'CNAME', label: 'Canonical Name', resolver: () => dns.resolveCname(hostname) },
      { type: 'MX',    label: 'Mail Exchange',  resolver: () => dns.resolveMx(hostname) },
      { type: 'NS',    label: 'Name Servers',   resolver: () => dns.resolveNs(hostname) },
      { type: 'TXT',   label: 'TXT Records',    resolver: () => dns.resolveTxt(hostname) },
    ];

    const settledQueries = await Promise.allSettled(
      queries.map(async ({ type, label, resolver }) => {
        const values = await resolver();

        if (!values || values.length === 0) {
          return null;
        }

        return {
          type,
          label,
          values: type === 'MX'
            ? values.filter((mx) => mx.exchange).map((mx) => `${mx.exchange} (priority ${mx.priority})`)
            : type === 'TXT'
              ? values.map((txt) => txt.join(' '))
              : values,
        };
      })
    );

    for (const queryResult of settledQueries) {
      if (queryResult.status !== 'fulfilled' || !queryResult.value) {
        continue;
      }

      results.records[queryResult.value.type] = {
        label: queryResult.value.label,
        values: queryResult.value.values,
      };
    }
  } catch (err) {
    results.error = `DNS resolution failed: ${err.message}`;
  }

  results.queryTime = parseFloat((performance.now() - start).toFixed(1));
  return results;
}
