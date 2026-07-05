/**
 * Shared analysis helpers: insights, OSI mapping, URL normalization.
 */

export function normalizeTarget(rawUrl) {
  const normalizedUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
    ? rawUrl
    : `https://${rawUrl}`;

  const url = new URL(normalizedUrl);
  const { hostname, protocol, port } = url;

  return {
    original: rawUrl,
    normalized: normalizedUrl,
    hostname,
    protocol: protocol || 'https:',
    port: port || (protocol === 'https:' ? 443 : 80),
    shouldAnalyzeTls: protocol === 'https:' || port === '443' || port === 443,
  };
}

export function buildTargetMeta(rawUrl) {
  const target = normalizeTarget(rawUrl);
  return {
    original: target.original,
    normalized: target.normalized,
    hostname: target.hostname,
    protocol: target.protocol,
    port: target.port,
    analyzedAt: new Date().toISOString(),
  };
}

export function computeInsights(results) {
  const insights = [];
  const { dns, route, tls, http } = results;

  if (dns?.queryTime) {
    const ms = parseFloat(dns.queryTime);
    if (ms > 500) insights.push({ severity: 'warning', topic: 'DNS', message: `Slow DNS resolution: ${ms}ms` });
    else if (ms < 50) insights.push({ severity: 'good', topic: 'DNS', message: `Fast DNS resolution: ${ms}ms` });
  }

  if (tls?.version) {
    if (tls.version === 'TLSv1.3') insights.push({ severity: 'good', topic: 'TLS', message: 'Using TLS 1.3 — best available' });
    else if (tls.version === 'TLSv1.2') insights.push({ severity: 'info', topic: 'TLS', message: 'Using TLS 1.2 — consider upgrading to 1.3' });
    else insights.push({ severity: 'warning', topic: 'TLS', message: `Using ${tls.version} — outdated protocol` });
  }

  if (route?.hops?.length > 0) {
    const hopCount = route.hops.filter((h) => !h.timedOut).length;
    if (hopCount > 20) insights.push({ severity: 'warning', topic: 'Route', message: `Long path: ${hopCount} hops` });
    else insights.push({ severity: 'info', topic: 'Route', message: `Path length: ${hopCount} hops` });
  }

  if (http?.status) {
    if (http.status >= 400) insights.push({ severity: 'error', topic: 'HTTP', message: `HTTP ${http.status} — error response` });
    if (http.httpVersion?.startsWith('HTTP/2')) insights.push({ severity: 'good', topic: 'HTTP', message: 'Using HTTP/2 — multiplexed, efficient' });
  }

  if (http?.headers) {
    if (!http.headers['strict-transport-security']) insights.push({ severity: 'warning', topic: 'Security', message: 'Missing HSTS header' });
    if (!http.headers['content-security-policy']) insights.push({ severity: 'info', topic: 'Security', message: 'No CSP header — consider adding one' });
    if (!http.headers['x-frame-options']) insights.push({ severity: 'info', topic: 'Security', message: 'No X-Frame-Options — clickjacking risk' });
    if (http.headers['x-content-type-options'] === 'nosniff') insights.push({ severity: 'good', topic: 'Security', message: 'X-Content-Type-Options: nosniff set' });
  }

  return insights;
}

export function mapToOsiModel(results) {
  const { dns, route, tls, http } = results;

  return [
    {
      layer: 7,
      name: 'Application',
      protocol: http?.httpVersion || 'N/A',
      data: {
        protocol: http?.httpVersion,
        status: http?.status ? `${http.status} ${http.statusText}` : null,
        headers: http?.headers ? Object.keys(http.headers).length : null,
        bodySize: http?.bodySize,
      },
    },
    {
      layer: 6,
      name: 'Presentation',
      protocol: tls?.version || 'N/A',
      data: {
        encryption: tls?.cipher,
        certificate: tls?.certificate ? tls.certificate.subject : null,
        certValid: tls?.certificate ? `${tls.certificate.validFrom} → ${tls.certificate.validTo}` : null,
      },
    },
    {
      layer: 5,
      name: 'Session',
      protocol: 'TCP/TLS',
      data: {
        tlsHandshakeTime: tls?.handshakeTime ? `${tls.handshakeTime}ms` : null,
        sessionReuse: null,
      },
    },
    {
      layer: 4,
      name: 'Transport',
      protocol: 'TCP',
      data: {
        tcpConnectTime: http?.timing?.tcp ? `${http.timing.tcp}ms` : null,
        tlsTime: http?.timing?.tls ? `${http.timing.tls}ms` : null,
        destinationPort: results.target?.port,
      },
    },
    {
      layer: 3,
      name: 'Network',
      protocol: 'IP',
      data: {
        resolvedIp: dns?.resolvedIp,
        hopCount: route?.hops?.length || 0,
        firstHop: route?.hops?.[0] || null,
        lastHop: route?.hops?.[route.hops.length - 1] || null,
      },
    },
    {
      layer: 2,
      name: 'Data Link',
      protocol: 'Ethernet',
      data: { firstHopMac: null, localInterface: null },
    },
    {
      layer: 1,
      name: 'Physical',
      protocol: 'N/A',
      data: { signalStrength: null, medium: 'Ethernet/WiFi' },
    },
  ];
}

export function finalizeResults(partial) {
  const results = { ...partial };
  results.insights = computeInsights(results);
  results.osiMapping = mapToOsiModel(results);
  return results;
}
