import { useEffect, useState } from 'react';

const SECURITY_HEADERS = [
  { key: 'strict-transport-security', label: 'HSTS' },
  { key: 'content-security-policy', label: 'CSP' },
  { key: 'x-frame-options', label: 'Frame Guard' },
  { key: 'x-content-type-options', label: 'NoSniff' },
  { key: 'referrer-policy', label: 'Referrer Policy' },
  { key: 'permissions-policy', label: 'Permissions Policy' },
];

function formatMs(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Hidden';
  }

  if (value < 10) {
    return `${value.toFixed(1)} ms`;
  }

  return `${Math.round(value)} ms`;
}

function formatBytes(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Unknown';
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function shortName(value) {
  if (!value) {
    return 'Unavailable';
  }

  const commonName = value.split(', ').find((part) => part.startsWith('CN='));
  return commonName ? commonName.slice(3) : value;
}

function isPrivateIp(ipAddress) {
  if (!ipAddress || ipAddress.includes(':')) {
    return false;
  }

  if (ipAddress.startsWith('10.') || ipAddress.startsWith('192.168.')) {
    return true;
  }

  const octets = ipAddress.split('.').map(Number);
  return octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31;
}

function getSpeedProfile(totalTime) {
  if (typeof totalTime !== 'number') {
    return 'Partial';
  }

  if (totalTime <= 250) {
    return 'Rapid';
  }

  if (totalTime <= 700) {
    return 'Fast';
  }

  if (totalTime <= 1400) {
    return 'Measured';
  }

  return 'Heavy';
}

function buildSecurityModel(tls, headers, httpStatus) {
  let score = 20;

  if (tls?.version === 'TLSv1.3') {
    score += 25;
  } else if (tls?.version === 'TLSv1.2') {
    score += 18;
  } else if (tls?.version) {
    score += 10;
  }

  if (typeof httpStatus === 'number' && httpStatus < 400) {
    score += 8;
  }

  for (const item of SECURITY_HEADERS) {
    if (headers?.[item.key]) {
      score += 8;
    }
  }

  const boundedScore = Math.min(score, 100);

  if (boundedScore >= 80) {
    return { score: boundedScore, label: 'Fortified' };
  }

  if (boundedScore >= 60) {
    return { score: boundedScore, label: 'Solid' };
  }

  if (boundedScore >= 40) {
    return { score: boundedScore, label: 'Thin' };
  }

  return { score: boundedScore, label: 'Exposed' };
}

function summarizeRecords(records) {
  const entries = Object.entries(records || {});
  if (entries.length === 0) {
    return [];
  }

  return entries.map(([type, record]) => ({
    type,
    label: record.label,
    values: (record.values || []).slice(0, 3),
    total: (record.values || []).length,
  }));
}

function buildMissionModel(results) {
  const { target, dns, route, tls, http, insights = [] } = results;
  const headers = http.headers || {};
  const visibleHops = (route.hops || []).filter((hop) => !hop.timedOut);
  const firstHop = visibleHops[0] || null;
  const firstExternalHop = visibleHops.find((hop) => !isPrivateIp(hop.ip)) || null;
  const lastHop = visibleHops[visibleHops.length - 1] || null;
  const dnsRecords = summarizeRecords(dns.records);
  const totalTime =
    typeof dns.queryTime === 'number' && typeof http.totalTime === 'number'
      ? parseFloat((dns.queryTime + http.totalTime).toFixed(1))
      : null;
  const responseCode = http.status ? `${http.status} ${http.statusText}` : 'No status';
  const security = buildSecurityModel(tls, headers, http.status);
  const securityItems = SECURITY_HEADERS.map((item) => ({
    ...item,
    present: Boolean(headers[item.key]),
  }));
  const notes = insights.slice(0, 3);
  const tlsLabel =
    target.protocol === 'https:'
      ? tls.version || (tls.error ? 'Handshake blocked' : 'Handshake hidden')
      : 'Plain HTTP';
  const pathNodes = [
    {
      label: 'DEVICE',
      value: 'Browser armed',
      detail: `${target.protocol.replace(':', '').toUpperCase()} request on port ${target.port}`,
    },
    {
      label: 'DNS',
      value: dns.resolvedIp || 'Lookup hidden',
      detail: dns.error ? dns.error : `${formatMs(dns.queryTime)} to resolve`,
    },
    {
      label: 'TRANSIT',
      value: visibleHops.length ? `${visibleHops.length} visible hops` : 'Route obscured',
      detail: firstExternalHop?.hostname || firstHop?.ip || 'Upstream networks',
    },
    {
      label: 'SESSION',
      value: tlsLabel,
      detail:
        target.protocol === 'https:'
          ? (tls.handshakeTime ? `${formatMs(tls.handshakeTime)} handshake` : 'Secure tunnel check')
          : 'No TLS layer requested',
    },
    {
      label: 'ORIGIN',
      value: responseCode,
      detail: http.httpVersion || 'Protocol unavailable',
    },
  ];
  const storySteps = [
    {
      id: 'launch',
      stage: '01',
      tone: 'clean',
      eyebrow: 'Launch',
      title: 'The browser set a destination and opened the mission.',
      copy: `Your laptop targeted ${target.hostname} on port ${target.port}. That is the moment a normal URL stops being text and becomes an outbound network request.`,
      facts: [
        `Target ${target.hostname}`,
        `Protocol ${target.protocol.replace(':', '').toUpperCase()}`,
        `Port ${target.port}`,
      ],
    },
    {
      id: 'dns',
      stage: '02',
      tone: dns.error ? 'warn' : 'clean',
      eyebrow: 'Name Resolution',
      title: dns.error
        ? 'DNS did not resolve cleanly.'
        : 'DNS translated the domain into a real network address.',
      copy: dns.error
        ? dns.error
        : `${target.hostname} resolved to ${dns.resolvedIp}. Before anything else can happen, the browser needs that address so it knows where the request should actually go.`,
      facts: [
        dns.resolvedIp ? `Resolved IP ${dns.resolvedIp}` : 'IP unavailable',
        `Lookup ${formatMs(dns.queryTime)}`,
        dnsRecords.length ? `${dnsRecords.length} record groups inspected` : 'No extra record groups returned',
      ],
    },
    {
      id: 'transit',
      stage: '03',
      tone: visibleHops.length ? 'clean' : 'warn',
      eyebrow: 'Transit Path',
      title: visibleHops.length
        ? 'The request crossed upstream networks toward the target.'
        : 'The route stayed mostly hidden, which is common on the public internet.',
      copy: visibleHops.length
        ? `Traceroute surfaced ${visibleHops.length} visible hops between your machine and the destination path. The first hop is usually local, then the request moves into provider and backbone networks.`
        : (route.error || 'Some networks refuse traceroute probes, so the path can be partially opaque even when the site works perfectly.'),
      facts: [
        visibleHops.length ? `${visibleHops.length} visible hops` : 'No hop visibility',
        firstHop?.ip ? `Entry hop ${firstHop.ip}` : 'Entry hop hidden',
        lastHop?.ip ? `Last visible hop ${lastHop.ip}` : 'Destination hop not exposed',
      ],
    },
    {
      id: 'tls',
      stage: '04',
      tone: target.protocol === 'https:' && !tls.version ? 'warn' : 'clean',
      eyebrow: 'Secure Session',
      title:
        target.protocol === 'https:'
          ? (tls.version ? 'TLS locked the channel before payload moved.' : 'The secure handshake was not fully visible.')
          : 'This target responded over plain HTTP with no TLS tunnel.',
      copy:
        target.protocol === 'https:'
          ? (tls.version
            ? `The browser and server negotiated ${tls.version}${tls.cipher ? ` using ${tls.cipher}` : ''}. This is the encryption step that protects the request before the actual web data starts flowing.`
            : (tls.error || 'The site answered, but the TLS layer did not report a clean handshake summary.'))
          : 'Because the target is using HTTP, there is no certificate exchange or encrypted tunnel for this request.',
      facts: [
        tls.version ? `Protocol ${tls.version}` : 'Protocol unavailable',
        tls.handshakeTime ? `Handshake ${formatMs(tls.handshakeTime)}` : 'Handshake timing hidden',
        tls.certificate?.issuer ? `Issuer ${shortName(tls.certificate.issuer)}` : 'Issuer unavailable',
      ],
    },
    {
      id: 'http',
      stage: '05',
      tone:
        http.error || (typeof http.status === 'number' && http.status >= 400)
          ? 'warn'
          : 'clean',
      eyebrow: 'Server Reply',
      title: http.error
        ? 'The web response did not complete cleanly.'
        : 'The target server finally answered the request.',
      copy: http.error
        ? http.error
        : `${target.hostname} replied with ${responseCode} over ${http.httpVersion || 'HTTP'}. The first-byte and download timings show the moment the remote server turned the request back into visible data.`,
      facts: [
        responseCode,
        `First byte ${formatMs(http.timing?.ttfb)}`,
        `Payload ${formatBytes(http.bodySize)}`,
      ],
    },
    {
      id: 'security',
      stage: '06',
      tone: security.score >= 60 ? 'clean' : 'warn',
      eyebrow: 'Posture',
      title: `${security.label} security posture detected at the web edge.`,
      copy: `BrowserTrail checked the defensive headers and transport layer around the response. This is the fast demo answer to "is the site only fast, or is it also reasonably hardened?"`,
      facts: [
        `${security.score}/100 posture score`,
        `${securityItems.filter((item) => item.present).length}/${securityItems.length} key headers present`,
        http.redirectedTo ? `Redirected to ${http.redirectedTo}` : 'No redirect observed',
      ],
    },
  ];
  const telemetry = [
    {
      label: 'Total trip',
      value: totalTime ? formatMs(totalTime) : 'Partial',
      detail: getSpeedProfile(totalTime),
    },
    {
      label: 'DNS lookup',
      value: formatMs(dns.queryTime),
      detail: dns.resolvedIp || 'No IP captured',
    },
    {
      label: 'First byte',
      value: formatMs(http.timing?.ttfb),
      detail: http.httpVersion || 'Protocol hidden',
    },
    {
      label: 'Visible hops',
      value: String(visibleHops.length),
      detail: route.error ? 'Path partial' : 'Transit exposed',
    },
    {
      label: 'TLS',
      value: tls.version || (target.protocol === 'https:' ? 'Hidden' : 'Not used'),
      detail: tls.handshakeTime ? formatMs(tls.handshakeTime) : 'No handshake timer',
    },
    {
      label: 'Security',
      value: `${security.score}/100`,
      detail: security.label,
    },
  ];

  return {
    target,
    dns,
    http,
    route,
    tls,
    notes,
    pathNodes,
    storySteps,
    telemetry,
    dnsRecords,
    securityItems,
    totalTime,
    security,
  };
}

function nodeIsActive(index, totalNodes, revealedCount, totalSteps) {
  const threshold = Math.ceil(((index + 1) * totalSteps) / totalNodes);
  return revealedCount >= threshold;
}

export default function MissionControl({ results }) {
  const model = buildMissionModel(results);
  const [revealedCount, setRevealedCount] = useState(1);

  useEffect(() => {
    setRevealedCount(1);

    const intervalId = window.setInterval(() => {
      setRevealedCount((current) => {
        if (current >= model.storySteps.length) {
          window.clearInterval(intervalId);
          return current;
        }

        return current + 1;
      });
    }, 320);

    return () => window.clearInterval(intervalId);
  }, [results.target.analyzedAt, model.storySteps.length]);

  return (
    <section className="mission-control">
      <div className="mission-header panel">
        <div className="mission-header-copy">
          <p className="section-kicker">MISSION REPORT</p>
          <h2>{results.target.hostname} mapped in live network context.</h2>
          <p className="section-body">
            The scan below is simplified for storytelling, but every step is
            grounded in real runtime signals collected just now.
          </p>

          <div className="mission-badges">
            <span className="mission-badge">{results.target.normalized}</span>
            <span className="mission-badge">
              {model.totalTime ? `${formatMs(model.totalTime)} end to end` : 'Partial timing only'}
            </span>
            <span className="mission-badge">
              {model.security.label} security posture
            </span>
          </div>
        </div>

        <div className="mission-score">
          <span className="mission-score-label">Security</span>
          <span className="mission-score-value">{model.security.score}</span>
          <span className="mission-score-caption">{model.security.label}</span>
        </div>
      </div>

      <div className="telemetry-grid">
        {model.telemetry.map((item) => (
          <article key={item.label} className="telemetry-card panel">
            <p className="telemetry-label">{item.label}</p>
            <p className="telemetry-value">{item.value}</p>
            <p className="telemetry-detail">{item.detail}</p>
          </article>
        ))}
      </div>

      <section className="path-panel panel">
        <div className="section-heading">
          <p className="section-kicker">SEQUENCE MAP</p>
          <h2>How the request moved</h2>
        </div>

        <div className="path-strip">
          {model.pathNodes.map((node, index) => {
            const active = nodeIsActive(
              index,
              model.pathNodes.length,
              revealedCount,
              model.storySteps.length
            );

            return (
              <div
                key={node.label}
                className={`path-node ${active ? 'path-node-active' : ''}`}
              >
                <span className="path-node-dot"></span>
                <p className="path-node-label">{node.label}</p>
                <p className="path-node-value">{node.value}</p>
                <p className="path-node-detail">{node.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="story-panel">
        <div className="section-heading">
          <p className="section-kicker">GUIDED BREAKDOWN</p>
          <h2>What happened, in order</h2>
        </div>

        <div className="story-grid">
          {model.storySteps.map((step, index) => (
            <article
              key={step.id}
              className={`story-card story-${step.tone} ${index < revealedCount ? 'story-visible' : ''}`}
            >
              <div className="story-card-top">
                <span className="story-stage">{step.stage}</span>
                <span className="story-eyebrow">{step.eyebrow}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
              <div className="story-facts">
                {step.facts.map((fact) => (
                  <span key={fact} className="story-fact">
                    {fact}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {model.notes.length > 0 ? (
        <section className="notes-panel panel">
          <div className="section-heading">
            <p className="section-kicker">FAST NOTES</p>
            <h2>Quick takeaways</h2>
          </div>

          <div className="notes-list">
            {model.notes.map((note) => (
              <article
                key={`${note.topic}-${note.message}`}
                className={`note-pill note-${note.severity}`}
              >
                <span className="note-topic">{note.topic}</span>
                <span className="note-message">{note.message}</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <details className="evidence-shell">
        <summary>Open technical evidence</summary>

        <div className="evidence-grid">
          <article className="evidence-card panel">
            <p className="evidence-title">DNS records</p>
            {model.dnsRecords.length > 0 ? (
              model.dnsRecords.map((record) => (
                <div key={record.type} className="evidence-block">
                  <p className="evidence-label">
                    {record.type} / {record.label}
                  </p>
                  <p className="evidence-body">
                    {record.values.join(' | ')}
                    {record.total > record.values.length ? ' | ...' : ''}
                  </p>
                </div>
              ))
            ) : (
              <p className="evidence-body">No extra DNS record groups were returned.</p>
            )}
          </article>

          <article className="evidence-card panel">
            <p className="evidence-title">Route visibility</p>
            {(model.route.hops || []).length > 0 ? (
              (model.route.hops || []).slice(0, 6).map((hop) => (
                <div key={hop.hop} className="evidence-block">
                  <p className="evidence-label">Hop {hop.hop}</p>
                  <p className="evidence-body">
                    {hop.timedOut
                      ? 'Timed out'
                      : `${hop.hostname || hop.ip} / ${hop.ip} / ${formatMs(hop.rtt)}`}
                  </p>
                </div>
              ))
            ) : (
              <p className="evidence-body">{model.route.error || 'No hop data captured.'}</p>
            )}
          </article>

          <article className="evidence-card panel">
            <p className="evidence-title">Certificate and session</p>
            {model.tls.certificate ? (
              <>
                <div className="evidence-block">
                  <p className="evidence-label">Subject</p>
                  <p className="evidence-body">{shortName(model.tls.certificate.subject)}</p>
                </div>
                <div className="evidence-block">
                  <p className="evidence-label">Issuer</p>
                  <p className="evidence-body">{shortName(model.tls.certificate.issuer)}</p>
                </div>
                <div className="evidence-block">
                  <p className="evidence-label">Validity</p>
                  <p className="evidence-body">
                    {model.tls.certificate.validFrom} to {model.tls.certificate.validTo}
                  </p>
                </div>
              </>
            ) : (
              <p className="evidence-body">
                {model.tls.error || 'No certificate summary was captured for this target.'}
              </p>
            )}
          </article>

          <article className="evidence-card panel">
            <p className="evidence-title">Security headers</p>
            <div className="header-status-grid">
              {model.securityItems.map((item) => (
                <span
                  key={item.key}
                  className={`header-status ${item.present ? 'header-status-on' : 'header-status-off'}`}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </article>
        </div>
      </details>
    </section>
  );
}
