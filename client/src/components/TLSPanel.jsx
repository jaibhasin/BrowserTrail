import React from 'react';

/**
 * Displays TLS handshake and certificate analysis.
 *
 * TLS (Transport Layer Security) is what makes HTTPS secure.
 * After the TCP handshake, a TLS handshake occurs to:
 *   1. Negotiate protocol version and cipher suite
 *   2. Authenticate the server via its certificate chain
 *   3. Exchange session keys for symmetric encryption
 *
 * The certificate chain proves the server is who it claims to be,
 * signed by a trusted Certificate Authority (CA).
 */
export default function TLSPanel({ data }) {
  if (!data) return null;
  if (data.error) {
    return (
      <div className="panel panel-tls">
        <div className="panel-header">
          <span className="panel-icon">🔒</span>
          <span className="panel-title">TLS / SSL</span>
        </div>
        <div className="panel-error">{data.error}</div>
      </div>
    );
  }

  const { version, cipher, certificate, certificateChain, handshakeTime } = data;

  return (
    <div className="panel panel-tls">
      <div className="panel-header">
        <span className="panel-icon">🔒</span>
        <span className="panel-title">TLS / SSL</span>
        {handshakeTime && <span className="panel-subtitle">{handshakeTime}ms handshake</span>}
      </div>

      {/* ── Connection Security ── */}
      <div className="tls-summary">
        <div className="tls-summary-item">
          <span className="tls-summary-label">Protocol</span>
          <span className={`tls-summary-value ${version === 'TLSv1.3' ? 'tls-good' : version === 'TLSv1.2' ? 'tls-ok' : 'tls-warn'}`}>
            {version || 'N/A'}
          </span>
        </div>
        <div className="tls-summary-item">
          <span className="tls-summary-label">Cipher</span>
          <span className="tls-summary-value">{cipher || 'N/A'}</span>
        </div>
        <div className="tls-summary-item">
          <span className="tls-summary-label">Handshake Time</span>
          <span className="tls-summary-value">{handshakeTime ? `${handshakeTime}ms` : 'N/A'}</span>
        </div>
      </div>

      {/* ── Certificate Details ── */}
      {certificate && (
        <div className="tls-cert">
          <h4 className="tls-section-title">Server Certificate</h4>
          <div className="tls-cert-grid">
            <CertField label="Subject" value={certificate.subject} />
            <CertField label="Issuer" value={certificate.issuer} />
            <CertField label="Valid From" value={certificate.validFrom} />
            <CertField label="Valid Until" value={certificate.validTo} />
            <CertField label="Serial" value={certificate.serialNumber} />
            <CertField label="Key Size" value={`${certificate.bits} bits`} />
            <CertField label="SHA-256 Fingerprint" value={certificate.fingerprint256} mono />
          </div>

          {/* ── Subject Alternative Names ── */}
          {certificate.altNames && certificate.altNames.length > 0 && (
            <div className="tls-alt-names">
              <span className="tls-alt-label">Subject Alternative Names (SANs):</span>
              <div className="tls-alt-list">
                {certificate.altNames.map((name, i) => (
                  <code key={i} className="tls-alt-name">{name}</code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Certificate Chain ── */}
      {certificateChain && certificateChain.length > 0 && (
        <div className="tls-chain">
          <h4 className="tls-section-title">Certificate Chain ({certificateChain.length + 1} certificates)</h4>
          <div className="tls-chain-list">
            {/* Leaf cert */}
            <div className="chain-link">
              <div className="chain-cert chain-leaf">
                <span className="chain-type">Leaf</span>
                <span className="chain-subject">{certificate.subject}</span>
                <span className="chain-issuer">← signed by</span>
              </div>
            </div>
            {/* Intermediate / Root certs */}
            {certificateChain.map((cert, i) => (
              <div key={i} className="chain-link">
                <div className={`chain-cert ${i === certificateChain.length - 1 ? 'chain-root' : 'chain-intermediate'}`}>
                  <span className="chain-type">{i === certificateChain.length - 1 ? 'Root' : 'Intermediate'}</span>
                  <span className="chain-subject">{cert.subject}</span>
                  {cert.issuer && <span className="chain-issuer">← signed by {cert.issuer}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Explanation ── */}
      <div className="panel-footnote">
        <strong>How TLS works:</strong> After the TCP handshake (SYN → SYN-ACK → ACK), the client
        and server perform a TLS handshake. They agree on a protocol version and cipher suite,
        the server presents its certificate (signed by a trusted CA), and they exchange keys
        using asymmetric cryptography. All subsequent data is encrypted with symmetric keys.
        This entire process happens in just 1-2 round trips.
      </div>
    </div>
  );
}

function CertField({ label, value, mono }) {
  if (!value) return null;
  return (
    <div className="cert-field">
      <span className="cert-field-label">{label}</span>
      <span className={`cert-field-value ${mono ? 'cert-mono' : ''}`}>{value}</span>
    </div>
  );
}
