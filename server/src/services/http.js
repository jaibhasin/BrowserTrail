import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

/**
 * Fetches a URL with detailed timing and header analysis.
 *
 * What we measure:
 *   - TCP connection time (how long to establish the TCP socket)
 *   - TLS handshake time (crypto negotiation overhead)
 *   - TTFB — Time to First Byte (server response latency)
 *   - Download time (time to receive full response body)
 *   - HTTP version (is the server modern?)
 *   - All response headers
 *
 * All timings are in milliseconds, matching browser DevTools convention.
 */
export async function fetchWithDetails(urlString, timeoutMs = 15000) {
  const start = performance.now();
  const results = {
    url: urlString,
    status: null,
    statusText: null,
    headers: null,
    httpVersion: null,
    timing: { dns: null, tcp: null, tls: null, ttfb: null, download: null },
    bodySize: null,
    totalTime: null,
    redirectedTo: null,
    error: null,
  };

  return new Promise((resolve) => {
    try {
      const url = new URL(urlString);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      let tcpStart = null;
      let tlsStart = null;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'User-Agent': 'BrowserTrail/1.0 (Network Diagnostics Tool)',
          'Accept': '*/*',
        },
        timeout: timeoutMs,
      };

      const req = lib.request(options, (res) => {
        // HTTP version detection
        results.httpVersion = `HTTP/${res.httpVersionMajor}.${res.httpVersionMinor}`;

        // Status
        results.status = res.statusCode;
        results.statusText = res.statusMessage;

        // Headers
        results.headers = res.headers;

        // TTFB — Time from request start to first response byte
        const ttfbTime = performance.now();
        results.timing.ttfb = parseFloat((ttfbTime - start).toFixed(1));

        // Collect body to measure download time
        let bodySize = 0;
        res.on('data', (chunk) => {
          bodySize += chunk.length;
        });

        res.on('end', () => {
          const end = performance.now();
          results.timing.download = parseFloat((end - ttfbTime).toFixed(1));
          results.bodySize = bodySize;
          results.totalTime = parseFloat((end - start).toFixed(1));
          results.redirectedTo = res.headers.location || null;
          resolve(results);
        });
      });

      // Track TCP/TLS connection timing via socket events
      req.on('socket', (socket) => {
        tcpStart = performance.now();

        socket.on('connect', () => {
          // TCP handshake completed (SYN → SYN-ACK → ACK)
          if (tcpStart) {
            results.timing.tcp = parseFloat((performance.now() - tcpStart).toFixed(1));
          }
          // Mark TLS start time (right after TCP connect)
          tlsStart = performance.now();
        });

        // TLS timing (HTTPS only)
        if (isHttps) {
          socket.on('secureConnect', () => {
            // TLS handshake completed (after TCP, before HTTP)
            if (tlsStart) {
              results.timing.tls = parseFloat((performance.now() - tlsStart).toFixed(1));
            }
          });
        }
      });

      req.on('error', (err) => {
        results.error = `Request failed: ${err.message}`;
        results.totalTime = parseFloat((performance.now() - start).toFixed(1));
        resolve(results);
      });

      req.on('timeout', () => {
        results.error = 'Request timed out';
        req.destroy();
        results.totalTime = parseFloat((performance.now() - start).toFixed(1));
        resolve(results);
      });

      req.end();
    } catch (err) {
      results.error = `Failed to analyze: ${err.message}`;
      results.totalTime = parseFloat((performance.now() - start).toFixed(1));
      resolve(results);
    }
  });
}
