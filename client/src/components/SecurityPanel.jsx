import React from 'react';

/**
 * Analyzes HTTP security headers to assess the server's security posture.
 *
 * Security headers are HTTP response headers that instruct the browser
 * to enforce certain security policies. They protect against common
 * web vulnerabilities like XSS, clickjacking, MIME sniffing, and more.
 *
 * Headers analyzed:
 *   - Strict-Transport-Security (HSTS) — force HTTPS
 *   - Content-Security-Policy (CSP) — prevent XSS
 *   - X-Frame-Options — prevent clickjacking
 *   - X-Content-Type-Options — prevent MIME sniffing
 *   - Referrer-Policy — control referrer info leakage
 *   - Permissions-Policy — restrict API access
 */
export default function SecurityPanel({ headers }) {
  if (!headers) return null;

  const checks = [
    {
      name: 'Strict-Transport-Security',
      header: 'strict-transport-security',
      description: 'Forces browsers to only use HTTPS',
      good: true,
      critical: true,
    },
    {
      name: 'Content-Security-Policy',
      header: 'content-security-policy',
      description: 'Controls which resources can be loaded (prevents XSS)',
      good: true,
      critical: false,
    },
    {
      name: 'X-Frame-Options',
      header: 'x-frame-options',
      description: 'Prevents clickjacking by blocking iframe embedding',
      good: true,
      critical: false,
    },
    {
      name: 'X-Content-Type-Options',
      header: 'x-content-type-options',
      description: 'Prevents MIME type sniffing',
      good: 'nosniff',
      critical: false,
    },
    {
      name: 'Referrer-Policy',
      header: 'referrer-policy',
      description: 'Controls how much referrer info is sent',
      good: true,
      critical: false,
    },
    {
      name: 'Permissions-Policy',
      header: 'permissions-policy',
      description: 'Restricts browser API access (camera, mic, etc.)',
      good: true,
      critical: false,
    },
  ];

  return (
    <div className="panel panel-security">
      <div className="panel-header">
        <span className="panel-icon">🛡</span>
        <span className="panel-title">Security Headers</span>
        <span className="panel-subtitle">
          {checks.filter(c => {
            const value = headers[c.header];
            return value !== undefined && (c.good === true ? true : value === c.good);
          }).length}/{checks.length} present
        </span>
      </div>

      <div className="security-checks">
        {checks.map((check) => {
          const value = headers[check.header];
          const isPresent = value !== undefined;
          const isGood = isPresent && (check.good === true ? true : value === check.good);

          return (
            <div key={check.header} className={`security-check ${isGood ? 'check-pass' : isPresent ? 'check-info' : 'check-fail'}`}>
              <div className="security-check-header">
                <span className="check-icon">
                  {isGood ? '✓' : isPresent ? 'ℹ' : '✗'}
                </span>
                <div className="check-info">
                  <span className="check-name">{check.name}</span>
                  <span className="check-desc">{check.description}</span>
                </div>
                {isPresent ? (
                  <code className="check-value">{Array.isArray(value) ? value.join(', ') : String(value)}</code>
                ) : (
                  <span className="check-missing">Not set</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Explanation ── */}
      <div className="panel-footnote">
        <strong>Why security headers matter:</strong> Even with HTTPS, a server can be vulnerable
        to attacks if it doesn't send proper security headers. HSTS prevents downgrade attacks,
        CSP stops XSS, X-Frame-Options blocks clickjacking, and X-Content-Type-Options prevents
        MIME confusion. A well-configured server sends all of these.
      </div>
    </div>
  );
}
