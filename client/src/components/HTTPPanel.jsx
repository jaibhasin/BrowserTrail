import React from 'react';

/**
 * Displays HTTP request/response details and timing breakdown.
 *
 * HTTP (Hypertext Transfer Protocol) is the foundation of data
 * communication on the web. It follows a request-response model.
 *
 * The timing breakdown shows exactly where time was spent:
 *   - DNS: Time to resolve the domain name
 *   - TCP: Time to establish the TCP connection
 *   - TLS: Time for the TLS handshake (HTTPS only)
 *   - TTFB: Time to First Byte — server processing + network latency
 *   - Download: Time to receive the full response body
 */
export default function HTTPPanel({ data }) {
  if (!data) return null;
  if (data.error) {
    return (
      <div className="panel panel-http">
        <div className="panel-header">
          <span className="panel-icon">📡</span>
          <span className="panel-title">HTTP Request</span>
        </div>
        <div className="panel-error">{data.error}</div>
      </div>
    );
  }

  const { httpVersion, status, statusText, headers, timing, bodySize, redirectChain } = data;

  return (
    <div className="panel panel-http">
      <div className="panel-header">
        <span className="panel-icon">📡</span>
        <span className="panel-title">HTTP Request</span>
        <span className={`panel-subtitle status-badge status-${Math.floor((status || 0) / 100)}`}>
          {status} {statusText}
        </span>
      </div>

      {/* ── Overview ── */}
      <div className="http-summary">
        <div className="http-summary-item">
          <span className="http-summary-label">HTTP Version</span>
          <span className="http-summary-value">{httpVersion || 'N/A'}</span>
        </div>
        <div className="http-summary-item">
          <span className="http-summary-label">Status</span>
          <span className={`http-summary-value status-${Math.floor((status || 0) / 100)}`}>
            {status} {statusText}
          </span>
        </div>
        <div className="http-summary-item">
          <span className="http-summary-label">Body Size</span>
          <span className="http-summary-value">{bodySize !== null ? formatBytes(bodySize) : 'N/A'}</span>
        </div>
      </div>

      {/* ── Timing Breakdown ── */}
      {timing && (
        <div className="http-timing">
          <h4 className="http-section-title">Timing Breakdown</h4>
          <div className="timing-bars">
              {timing.dns !== null && <TimingBar label="DNS" value={timing.dns} max={500} color="var(--color-dns)" />}
            {timing.tcp !== null && <TimingBar label="TCP" value={timing.tcp} max={500} color="var(--color-tcp)" />}
            {timing.tls !== null && <TimingBar label="TLS" value={timing.tls} max={500} color="var(--color-tls)" />}
            {timing.ttfb !== null && <TimingBar label="TTFB" value={timing.ttfb} max={1000} color="var(--color-ttfb)" />}
            {timing.download !== null && <TimingBar label="Download" value={timing.download} max={2000} color="var(--color-download)" />}
          </div>
        </div>
      )}

      {/* ── Response Headers ── */}
      {headers && Object.keys(headers).length > 0 && (
        <div className="http-headers">
          <h4 className="http-section-title">Response Headers</h4>
          <div className="headers-list">
            {Object.entries(headers).slice(0, 20).map(([key, value]) => (
              <div key={key} className="header-row">
                <span className="header-key">{key}</span>
                <span className="header-value">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
              </div>
            ))}
            {Object.keys(headers).length > 20 && (
              <div className="header-more">
                ...and {Object.keys(headers).length - 20} more headers
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Explanation ── */}
      <div className="panel-footnote">
        <strong>What happens during an HTTP request:</strong> After DNS, TCP, and TLS are done,
        the browser sends an HTTP request (GET / POST / etc.). The server processes it and sends
        back a response with a status code, headers, and body. The timing breakdown shows
        exactly where each millisecond went during this entire process. TTFB (Time to First Byte)
        is especially critical — it measures server responsiveness.
      </div>
    </div>
  );
}

/**
 * A horizontal bar showing the time spent at each stage.
 */
function TimingBar({ label, value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="timing-bar-row">
      <span className="timing-bar-label">{label}</span>
      <div className="timing-bar-track">
        <div
          className="timing-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        ></div>
      </div>
      <span className="timing-bar-value">{value}ms</span>
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
