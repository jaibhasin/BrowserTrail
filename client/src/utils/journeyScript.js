/**
 * Build a normalized journey script for replay from analysis results.
 * Timings are tuned for slow, hop-by-hop storytelling (scaled by replay speed).
 */
import { hopLegMs } from './journeyAnimator.js';

export function buildJourneyScript(results) {
  if (!results) return [];

  const events = [];
  let t = 0;

  events.push({ at: t, phase: 'dns', type: 'phase-start' });
  t += 900;
  events.push({ at: t, phase: 'dns', type: 'phase-end', data: results.dns });

  events.push({ at: t, phase: 'route', type: 'phase-start' });
  t += 350;
  const hops = results.route?.hops?.filter((h) => !h.timedOut) || [];
  hops.forEach((hop, i) => {
    t += hopLegMs(hop);
    events.push({ at: t, phase: 'route', type: 'hop', hopIndex: i, hop });
  });
  events.push({ at: t, phase: 'route', type: 'phase-end', data: results.route });

  events.push({ at: t, phase: 'tcp', type: 'phase-start' });
  t += 280;
  ['SYN', 'SYN-ACK', 'ACK'].forEach((label, i) => {
    t += 480;
    events.push({ at: t, phase: 'tcp', type: 'handshake', label, index: i });
  });
  events.push({ at: t, phase: 'tcp', type: 'phase-end' });

  if (results.target?.protocol === 'https:' && results.tls?.version) {
    events.push({ at: t, phase: 'tls', type: 'phase-start' });
    t += 700;
    events.push({ at: t, phase: 'tls', type: 'tunnel-lock', data: results.tls });
    events.push({ at: t, phase: 'tls', type: 'phase-end', data: results.tls });
  }

  events.push({ at: t, phase: 'http', type: 'phase-start' });
  t += 400;
  const bodySize = results.http?.bodySize || 1024;
  const outboundDots = Math.min(4, Math.max(2, Math.ceil(bodySize / 50000)));
  for (let i = 0; i < outboundDots; i += 1) {
    t += 320;
    events.push({ at: t, phase: 'http', type: 'packet', direction: 'out', index: i });
  }
  for (let i = 0; i < outboundDots; i += 1) {
    t += 320;
    events.push({ at: t, phase: 'http', type: 'packet', direction: 'in', index: i });
  }
  events.push({ at: t, phase: 'http', type: 'phase-end', data: results.http });

  events.push({ at: t, phase: 'done', type: 'complete' });
  return events;
}

export function scriptDuration(events) {
  if (!events.length) return 0;
  return events[events.length - 1].at;
}
