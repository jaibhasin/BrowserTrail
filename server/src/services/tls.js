import * as tls from 'tls';
import { createPinnedLookup } from '../lib/targetSafety.js';

/**
 * Analyzes the TLS certificate and handshake for a given host.
 *
 * What we measure:
 *   - TLS protocol version (TLS 1.2, 1.3, etc.)
 *   - Cipher suite negotiated
 *   - Full certificate chain (leaf → intermediate → root)
 *   - Certificate validity dates and issuer details
 *   - Subject Alternative Names (SANs)
 *   - Handshake timing
 *
 * Why this matters:
 *   TLS is the security layer of the modern web. Everything from
 *   certificate trust to cipher strength determines whether your
 *   connection is truly secure. Weak ciphers, expired certs, or
 *   misconfigured chains are real-world security holes.
 */
export async function analyzeTls(hostname, port = 443, timeoutMs = 10000, pinnedAddress = null, addressFamily = null) {
  const start = performance.now();
  const results = {
    version: null,
    cipher: null,
    certificate: null,
    handshakeTime: 0,
    trusted: null,
    trustError: null,
    error: null,
  };

  return new Promise((resolve) => {
    try {
      const options = {
        host: hostname,
        port,
        servername: hostname, // SNI — tell the server which host we want
        rejectUnauthorized: false, // Accept self-signed so we can inspect them
        timeout: timeoutMs,
      };
      if (pinnedAddress) options.lookup = createPinnedLookup(pinnedAddress, addressFamily);
      const socket = tls.connect(options);

      socket.once('secureConnect', () => {
        // ── Protocol version ──
        //   e.g. TLSv1.3, TLSv1.2 — higher is better
        results.version = socket.getProtocol();
        results.trusted = socket.authorized;
        results.trustError = socket.authorizationError || null;

        // ── Cipher suite ──
        //   e.g. TLS_AES_256_GCM_SHA384 — the encryption algorithm in use
        const cipher = socket.getCipher();
        results.cipher = cipher ? `${cipher.name} (${cipher.version})` : null;

        // ── Certificate chain ──
        //   The full chain from leaf cert through intermediates to the root CA
        const peerCert = socket.getPeerCertificate(true);
        if (peerCert && Object.keys(peerCert).length > 0) {
          results.certificate = formatCertificate(peerCert);

          // Walk the issuer chain
          const chain = [];
          let current = peerCert;
          while (current && current.issuerCertificate && current.fingerprint !== current.issuerCertificate.fingerprint) {
            chain.push(formatCertificate(current.issuerCertificate));
            current = current.issuerCertificate;
          }
          results.certificateChain = chain;
        }

        results.handshakeTime = parseFloat((performance.now() - start).toFixed(1));
        socket.end();
        resolve(results);
      });

      socket.once('error', (err) => {
        results.error = `TLS handshake failed: ${err.message}`;
        resolve(results);
      });

      socket.once('timeout', () => {
        results.error = 'TLS handshake timed out';
        socket.destroy();
        resolve(results);
      });
    } catch (err) {
      results.error = `TLS analysis failed: ${err.message}`;
      resolve(results);
    }
  });
}

/**
 * Transforms the raw Node.js certificate object into a clean format.
 */
function formatCertificate(cert) {
  return {
    subject: cert.subject ? Object.entries(cert.subject).map(([k, v]) => `${k}=${v}`).join(', ') : 'N/A',
    issuer: cert.issuer ? Object.entries(cert.issuer).map(([k, v]) => `${k}=${v}`).join(', ') : 'N/A',
    serialNumber: cert.serialNumber,
    validFrom: cert.valid_from,
    validTo: cert.valid_to,
    fingerprint: cert.fingerprint,
    fingerprint256: cert.fingerprint256,
    altNames: cert.subjectaltname ? cert.subjectaltname.split(', ').map(s => s.replace(/^DNS:/, '')) : [],
    bits: cert.bits,
    pubkeyAlgorithm: cert.asn1Curve || cert.nistCurve || 'RSA',
  };
}
