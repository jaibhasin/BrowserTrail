import { useMemo } from 'react';

const SECURITY_HEADERS = [
  { key: 'strict-transport-security', label: 'HSTS' },
  { key: 'content-security-policy', label: 'CSP' },
  { key: 'x-frame-options', label: 'Frame Guard' },
  { key: 'x-content-type-options', label: 'NoSniff' },
  { key: 'referrer-policy', label: 'Referrer Policy' },
  { key: 'permissions-policy', label: 'Permissions Policy' },
];

const STAGE_COLORS = {
  dns: '#c9a0ff',
  tcp: '#84e8ff',
  tls: '#44c8ff',
  wait: '#ffb86b',
  download: '#b5ff7d',
};

function formatMs(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  if (value < 10) return `${value.toFixed(1)} ms`;
  return `${Math.round(value)} ms`;
}

function formatBytes(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function commonName(value) {
  if (!value) return '—';
  const cn = value.split(', ').find((part) => part.startsWith('CN='));
  return cn ? cn.slice(3) : value;
}

function buildSecurity(tls, headers, status) {
  let score = 20;
  if (tls?.version === 'TLSv1.3') score += 25;
  else if (tls?.version === 'TLSv1.2') score += 18;
  else if (tls?.version) score += 10;
  if (typeof status === 'number' && status < 400) score += 8;
  const present = SECURITY_HEADERS.map((h) => ({ ...h, present: Boolean(headers?.[h.key]) }));
  score += present.filter((h) => h.present).length * 8;
  if (tls?.trusted === false) score = Math.min(score, 20);
  const bounded = Math.min(score, 100);
  const label = bounded >= 80 ? 'Fortified' : bounded >= 60 ? 'Solid' : bounded >= 40 ? 'Thin' : 'Exposed';
  return { score: bounded, label, present };
}

function buildWaterfall(dns, timing) {
  if (!timing) return { stages: [], total: 0 };
  const dnsTime = typeof dns?.queryTime === 'number' ? dns.queryTime : 0;
  const tcp = timing.tcp || 0;
  const tls = timing.tls || 0;
  const ttfb = timing.ttfb || 0;
  const download = timing.download || 0;
  // ttfb is measured from request start, so it already contains tcp + tls.
  const serverWait = Math.max(0, ttfb - tcp - tls);

  const raw = [
    { key: 'dns', label: 'DNS Lookup', dur: dnsTime },
    { key: 'tcp', label: 'TCP Connect', dur: tcp },
    { key: 'tls', label: 'TLS Handshake', dur: tls },
    { key: 'wait', label: 'Server Wait', dur: serverWait },
    { key: 'download', label: 'Download', dur: download },
  ].filter((s) => s.dur > 0);

  const total = dnsTime + ttfb + download;
  let offset = 0;
  const stages = raw.map((s) => {
    const stage = {
      ...s,
      offsetPct: total > 0 ? (offset / total) * 100 : 0,
      widthPct: total > 0 ? (s.dur / total) * 100 : 0,
      color: STAGE_COLORS[s.key],
    };
    offset += s.dur;
    return stage;
  });
  return { stages, total };
}

export default function ResultsPanel({ results }) {
  const model = useMemo(() => {
    if (!results) return null;
    const { target, dns, route, tls, http, insights = [], osiMapping = [] } = results;
    const headers = http?.headers || {};
    const security = buildSecurity(tls, headers, http?.status);
    const waterfall = buildWaterfall(dns, http?.timing);
    const visibleHops = (route?.hops || []).filter((h) => !h.timedOut);
    const isHttps = target?.protocol === 'https:';
    const dnsRecords = Object.entries(dns?.records || {}).map(([type, rec]) => ({
      type,
      label: rec.label,
      values: rec.values || [],
    }));

    return {
      target,
      dns,
      route,
      tls,
      http,
      insights,
      osiMapping: [...osiMapping].sort((a, b) => b.layer - a.layer),
      headers,
      security,
      waterfall,
      visibleHops,
      isHttps,
      dnsRecords,
    };
  }, [results]);

  if (!model) return null;

  const { target, dns, tls, http, insights, osiMapping, security, waterfall, visibleHops, isHttps, dnsRecords } = model;

  const telemetry = [
    { label: 'Total trip', value: formatMs(waterfall.total || http?.totalTime), sub: http?.httpVersion || '' },
    { label: 'DNS lookup', value: formatMs(dns?.queryTime), sub: dns?.resolvedIp || '' },
    { label: 'First byte', value: formatMs(http?.timing?.ttfb), sub: 'TTFB' },
    { label: 'TLS', value: tls?.version || (isHttps ? 'Hidden' : 'None'), sub: tls?.handshakeTime ? formatMs(tls.handshakeTime) : '' },
    { label: 'Visible hops', value: String(visibleHops.length), sub: 'traceroute' },
    { label: 'Payload', value: formatBytes(http?.bodySize), sub: http?.status ? `${http.status}` : '' },
  ];

  return (
    <section className="results">
      <div className="results-scoreline">
        <div className="results-title">
          <p className="results-kicker">TRACE REPORT</p>
          <h2>{target?.hostname}</h2>
          <p className="results-sub">
            {http?.status ? `${http.status} ${http.statusText || ''}` : 'No status'} · {http?.httpVersion || 'HTTP'} · port {target?.port}
          </p>
        </div>
        <div className={`results-score results-score-${security.label.toLowerCase()}`}>
          <span className="results-score-num">{security.score}</span>
          <span className="results-score-cap">{security.label}</span>
        </div>
      </div>

      <div className="telemetry-row">
        {telemetry.map((t) => (
          <div key={t.label} className="telemetry-card">
            <span className="telemetry-label">{t.label}</span>
            <span className="telemetry-value">{t.value}</span>
            {t.sub && <span className="telemetry-sub">{t.sub}</span>}
          </div>
        ))}
      </div>

      {insights.length > 0 && (
        <div className="insight-row">
          {insights.map((ins, i) => (
            <span key={`${ins.topic}-${i}`} className={`insight-chip insight-${ins.severity}`}>
              <span className="insight-topic">{ins.topic}</span>
              {ins.message}
            </span>
          ))}
        </div>
      )}

      {waterfall.stages.length > 0 && (
        <div className="card waterfall-card">
          <div className="card-head">
            <h3>Timing waterfall</h3>
            <span className="card-meta">{formatMs(waterfall.total)} total</span>
          </div>
          <div className="waterfall">
            {waterfall.stages.map((s) => (
              <div key={s.key} className="waterfall-row">
                <span className="waterfall-label">{s.label}</span>
                <div className="waterfall-track">
                  <div
                    className="waterfall-bar"
                    style={{ marginLeft: `${s.offsetPct}%`, width: `${Math.max(s.widthPct, 0.8)}%`, background: s.color }}
                  />
                </div>
                <span className="waterfall-time">{formatMs(s.dur)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-grid">
        <div className="card">
          <div className="card-head"><h3>DNS</h3><span className="card-meta">{formatMs(dns?.queryTime)}</span></div>
          <dl className="kv">
            <div><dt>Resolved IP</dt><dd className="mono">{dns?.resolvedIp || '—'}</dd></div>
            <div><dt>Resolver</dt><dd className="mono">{dns?.resolverAddress || '—'}</dd></div>
          </dl>
          {dnsRecords.length > 0 && (
            <div className="record-list">
              {dnsRecords.map((r) => (
                <div key={r.type} className="record">
                  <span className="record-type">{r.type}</span>
                  <span className="record-vals mono">{r.values.slice(0, 3).map(String).join('  ·  ')}{r.values.length > 3 ? ' …' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head"><h3>Route</h3><span className="card-meta">{visibleHops.length} hops</span></div>
          <div className="hop-list">
            {(model.route?.hops || []).map((hop) => (
              <div key={hop.hop} className={`hop ${hop.timedOut ? 'hop-lost' : ''}`}>
                <span className="hop-num">{hop.hop}</span>
                <span className="hop-name mono">{hop.timedOut ? '* * *' : (hop.hostname || hop.ip)}</span>
                <span className="hop-rtt">{hop.timedOut ? '—' : formatMs(hop.rtt)}</span>
              </div>
            ))}
            {(model.route?.hops || []).length === 0 && <p className="card-empty">{model.route?.error || 'No hop data.'}</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>TLS &amp; Certificate</h3><span className="card-meta">{tls?.version || (isHttps ? 'Hidden' : 'None')}</span></div>
          {tls?.certificate ? (
            <dl className="kv">
              <div><dt>Trust</dt><dd className={tls.trusted === false ? 'security-bad' : 'security-good'}>{tls.trusted === false ? `Invalid - ${tls.trustError || 'verification failed'}` : tls.trusted === true ? 'Trusted' : 'Not verified'}</dd></div>
              <div><dt>Cipher</dt><dd className="mono">{tls.cipher || '—'}</dd></div>
              <div><dt>Subject</dt><dd>{commonName(tls.certificate.subject)}</dd></div>
              <div><dt>Issuer</dt><dd>{commonName(tls.certificate.issuer)}</dd></div>
              <div><dt>Valid</dt><dd className="mono">{tls.certificate.validFrom} → {tls.certificate.validTo}</dd></div>
            </dl>
          ) : (
            <p className="card-empty">{tls?.error || (isHttps ? 'No certificate captured.' : 'Plain HTTP — no TLS layer.')}</p>
          )}
        </div>

        <div className="card">
          <div className="card-head"><h3>Security headers</h3><span className="card-meta">{security.present.filter((h) => h.present).length}/{security.present.length}</span></div>
          <div className="header-grid">
            {security.present.map((h) => (
              <span key={h.key} className={`header-pill ${h.present ? 'on' : 'off'}`}>{h.label}</span>
            ))}
          </div>
        </div>
      </div>

      {osiMapping.length > 0 && (
        <div className="card">
          <div className="card-head"><h3>OSI model</h3><span className="card-meta">7 layers</span></div>
          <div className="osi-stack">
            {osiMapping.map((layer) => (
              <div key={layer.layer} className="osi-layer">
                <span className="osi-num">L{layer.layer}</span>
                <span className="osi-name">{layer.name}</span>
                <span className="osi-proto mono">{layer.protocol || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
