import { execFile } from 'child_process';

/**
 * Runs a traceroute to the target host to discover the network path.
 *
 * What we measure:
 *   - Every router hop between us and the target server
 *   - Latency to each hop (round-trip time in ms)
 *   - Hostnames and IPs of intermediate routers
 *
 * Why this matters:
 *   Traceroute reveals the actual path packets take across the internet.
 *   You can see which ISPs and backbone networks carry your traffic,
 *   where congestion happens, and how many routers you traverse.
 *
 * Limitations:
 *   Some routers don't respond to traceroute probes (shown as * * *).
 *   ICMP-based traceroute may be blocked by firewalls.
 *   We use a timeout of 15 seconds to avoid hanging.
 */
export async function runTraceroute(hostname, timeoutMs = 30000) {
  const results = { hops: [], error: null, totalHops: 0 };

  try {
    // ── Run system traceroute with ICMP probes (macOS) ──
    //   We keep the sweep intentionally short so the UI stays demo-friendly.
    const output = await new Promise((resolve, reject) => {
      execFile(
        'traceroute',
        ['-m', '12', '-q', '1', '-w', '1', '-I', hostname],
        { timeout: timeoutMs, encoding: 'utf-8' },
        (error, stdout, stderr) => {
          if (error && !stdout) {
            reject(new Error(stderr?.trim() || error.message));
            return;
          }

          resolve(stdout || '');
        }
      );
    });

    // ── Parse the traceroute output ──
    //   Format:
    //     traceroute to google.com (142.250.80.14), 30 hops max
    //      1  192.168.1.1 (192.168.1.1)  1.234 ms
    //      2  10.0.0.1 (10.0.0.1)  3.456 ms
    //      3  * * *
    //      4  ae-7.ear1.Dallas1 (74.125.48.85)  25.678 ms
    const lines = output.split('\n');

    for (const line of lines) {
      // Match lines like: " 1  192.168.1.1 (192.168.1.1)  1.234 ms"
      // Or: " 3  * * *"
      const hopMatch = line.match(/^\s*(\d+)\s+(.+)/);
      if (!hopMatch) continue;

      const hopNum = parseInt(hopMatch[1]);
      const hopData = hopMatch[2].trim();

      // Check for timeout (* * *)
      if (hopData.includes('* * *')) {
        results.hops.push({ hop: hopNum, ip: null, hostname: null, rtt: null, timedOut: true });
        continue;
      }

      // Parse: "hostname (ip)  rtt ms" or "ip  rtt ms"
      const detailMatch = hopData.match(/(?:([^\s(]+)\s+)?\(?([0-9a-fA-F:.]+)\)?\s+([\d.]+)\s*ms/);
      if (detailMatch) {
        results.hops.push({
          hop: hopNum,
          hostname: detailMatch[1] || detailMatch[2],
          ip: detailMatch[2],
          rtt: parseFloat(detailMatch[3]),
          timedOut: false,
        });
      }
    }

    results.totalHops = results.hops.length;
  } catch (err) {
    results.error = `Traceroute failed: ${err.message}`;
  }

  return results;
}
