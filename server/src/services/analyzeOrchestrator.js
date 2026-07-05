import { analyzeDns } from './dns.js';
import { runTraceroute } from './traceroute.js';
import { analyzeTls } from './tls.js';
import { fetchWithDetails } from './http.js';
import { geolocateIps } from './geolocation.js';
import { buildTargetMeta, finalizeResults, normalizeTarget } from '../lib/analysisHelpers.js';

const SKIPPED_TLS = {
  skipped: true,
  version: null,
  cipher: null,
  certificate: null,
  handshakeTime: null,
  error: null,
};

async function safeProbe(fn) {
  try {
    return await fn();
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Run all probes in parallel (fast JSON endpoint).
 */
export async function runParallelAnalysis(rawUrl) {
  const target = normalizeTarget(rawUrl);
  const shouldAnalyzeTls = target.shouldAnalyzeTls;

  const [dns, route, tls, http] = await Promise.all([
    safeProbe(() => analyzeDns(target.hostname)),
    safeProbe(() => runTraceroute(target.hostname)),
    shouldAnalyzeTls
      ? safeProbe(() => analyzeTls(target.hostname, target.port || 443))
      : Promise.resolve(SKIPPED_TLS),
    safeProbe(() => fetchWithDetails(target.normalized)),
  ]);

  const results = finalizeResults({
    target: buildTargetMeta(rawUrl),
    dns,
    route,
    tls,
    http,
  });

  results.geo = await safeProbe(() => geolocateIps(collectIps(results)));
  return results;
}

/**
 * Run probes sequentially, emitting SSE events via sendEvent.
 */
export async function runSequentialAnalysis(rawUrl, sendEvent) {
  const target = normalizeTarget(rawUrl);
  const partial = {
    target: buildTargetMeta(rawUrl),
    dns: null,
    route: null,
    tls: null,
    http: null,
    geo: null,
  };

  const phases = ['dns', 'route', 'tcp', 'tls', 'http'];

  for (const phase of phases) {
    sendEvent('phase:start', { phase });

    if (phase === 'dns') {
      partial.dns = await safeProbe(() => analyzeDns(target.hostname));
      sendEvent('phase:complete', { phase, data: partial.dns });
    }

    if (phase === 'route') {
      partial.route = await safeProbe(() => runTraceroute(target.hostname));
      sendEvent('phase:complete', { phase, data: partial.route });
    }

    if (phase === 'tcp') {
      sendEvent('phase:complete', {
        phase,
        data: { synthetic: true, note: 'TCP three-way handshake' },
      });
    }

    if (phase === 'tls') {
      if (target.shouldAnalyzeTls) {
        partial.tls = await safeProbe(() => analyzeTls(target.hostname, target.port || 443));
      } else {
        partial.tls = SKIPPED_TLS;
      }
      sendEvent('phase:complete', { phase, data: partial.tls });
    }

    if (phase === 'http') {
      partial.http = await safeProbe(() => fetchWithDetails(target.normalized));
      sendEvent('phase:complete', { phase, data: partial.http });
    }
  }

  partial.geo = await safeProbe(() => geolocateIps(collectIps(partial)));
  sendEvent('geo:complete', { data: partial.geo });

  const results = finalizeResults(partial);
  sendEvent('analysis:done', { data: results });
  return results;
}

function collectIps(results) {
  const ips = new Set();
  if (results.dns?.resolvedIp) ips.add(results.dns.resolvedIp);
  if (results.route?.hops) {
    for (const hop of results.route.hops) {
      if (hop.ip && hop.ip !== '*') ips.add(hop.ip);
    }
  }
  return [...ips];
}
