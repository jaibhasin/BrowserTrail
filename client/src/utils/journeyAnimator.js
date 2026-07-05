/**
 * Derive journey visual state at a point in the replay timeline.
 * Packets travel one hop at a time along the matching edge path.
 */

const HANDSHAKE_DUR = 420;
const DNS_LEG_DUR = 520;
const HTTP_PKT_DUR = 380;

export function getJourneyState(events, timeMs, { edgeCount = 0 } = {}) {
  if (!events?.length) {
    return emptyState();
  }

  let phase = 'idle';
  let tunnel = false;
  let handshakeLabel = null;
  const reachedNodeIds = new Set(['laptop']);
  const activeEdgeIndices = new Set();
  const packets = [];

  // Pass 1 — completed milestones up to the playhead.
  for (const event of events) {
    if (event.at > timeMs) break;
    if (event.type === 'phase-start') phase = event.phase;
    if (event.type === 'tunnel-lock') tunnel = true;
    if (event.type === 'hop') {
      reachedNodeIds.add(`hop-${event.hopIndex}`);
      activeEdgeIndices.add(event.hopIndex);
    }
    if (event.type === 'complete') phase = 'done';
  }

  // Pass 2 — in-flight packets (may reference events still ahead of playhead).
  for (const event of events) {
    if (event.type === 'hop') {
      const dur = hopLegMs(event.hop);
      const start = event.at - dur;
      if (timeMs >= start && timeMs < event.at + 80) {
        activeEdgeIndices.add(event.hopIndex);
        packets.push({
          id: `hop-${event.hopIndex}-${event.at}`,
          phase: 'route',
          direction: 'out',
          edgeIndex: event.hopIndex,
          progress: clamp((timeMs - start) / dur, 0, 1),
          duration: dur,
          size: 5,
        });
      }
    }

    if (event.type === 'handshake') {
      const dur = HANDSHAKE_DUR;
      const start = event.at - dur;
      if (timeMs >= start && timeMs < event.at + 60) {
        handshakeLabel = event.label;
        packets.push({
          id: `hs-${event.index}-${event.at}`,
          phase: 'tcp',
          direction: event.index % 2 === 0 ? 'out' : 'in',
          edgeIndex: Math.max(0, edgeCount - 1),
          progress: clamp((timeMs - start) / dur, 0, 1),
          duration: dur,
          size: 6,
          label: event.label,
        });
      }
    }

    if (event.type === 'packet') {
      const dur = HTTP_PKT_DUR;
      const start = event.at - dur;
      if (timeMs >= start && timeMs < event.at + 60) {
        packets.push({
          id: `pkt-${event.direction}-${event.index}-${event.at}`,
          phase: event.phase || 'http',
          direction: event.direction,
          edgeIndex: Math.max(0, edgeCount - 1),
          progress: clamp((timeMs - start) / dur, 0, 1),
          duration: dur,
          size: event.direction === 'out' ? 5 : 6,
          useTunnel: event.phase === 'http' || event.phase === 'tls',
        });
      }
    }
  }

  const dnsStart = events.find((e) => e.phase === 'dns' && e.type === 'phase-start');
  const dnsEnd = events.find((e) => e.phase === 'dns' && e.type === 'phase-end');
  if (dnsStart && dnsEnd && timeMs >= dnsStart.at && timeMs < dnsEnd.at + 120) {
    phase = 'dns';
    reachedNodeIds.add('dns-resolver');
    const leg = DNS_LEG_DUR;
    const mid = dnsStart.at + (dnsEnd.at - dnsStart.at) / 2;

    if (timeMs < mid) {
      packets.push({
        id: 'dns-out',
        phase: 'dns',
        direction: 'out',
        edgeIndex: -1,
        progress: clamp((timeMs - dnsStart.at) / leg, 0, 1),
        duration: leg,
        size: 5,
      });
    } else {
      packets.push({
        id: 'dns-in',
        phase: 'dns',
        direction: 'in',
        edgeIndex: -1,
        progress: clamp((timeMs - mid) / leg, 0, 1),
        duration: leg,
        size: 5,
      });
    }
  }

  if (phase === 'tls' || phase === 'http') tunnel = true;
  if (phase === 'done') {
    const lastEdge = Math.max(0, edgeCount - 1);
    for (let i = 0; i <= lastEdge; i += 1) activeEdgeIndices.add(i);
    for (let i = 0; i < edgeCount; i += 1) reachedNodeIds.add(`hop-${i}`);
    reachedNodeIds.add('origin');
  }

  return {
    phase,
    tunnel,
    handshakeLabel,
    handshakeLabels: handshakeLabel ? [handshakeLabel] : [],
    packets: packets.slice(-2),
    reachedNodeIds,
    activeEdgeIndices,
  };
}

/** Map streaming scan phase to a partial timeline position. */
export function scanningTimeFromPhase(events, activePhase) {
  if (!events?.length || !activePhase) return 0;

  const order = ['dns', 'route', 'tcp', 'tls', 'http', 'done'];
  const idx = order.indexOf(activePhase);
  if (idx < 0) return 0;

  if (activePhase === 'done') {
    return events[events.length - 1]?.at ?? 0;
  }

  const phaseStarts = order.map((p) => events.find((e) => e.type === 'phase-start' && e.phase === p));
  const phaseEnds = order.map((p) => events.find((e) => e.type === 'phase-end' && e.phase === p));

  const start = phaseStarts[idx]?.at ?? 0;
  const end = phaseEnds[idx]?.at ?? start;
  return start + (end - start) * 0.65;
}

export function hopLegMs(hop) {
  if (typeof hop?.rtt === 'number' && hop.rtt > 0) {
    return Math.max(650, hop.rtt * 4);
  }
  return 700;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function emptyState() {
  return {
    phase: 'idle',
    tunnel: false,
    handshakeLabel: null,
    handshakeLabels: [],
    packets: [],
    reachedNodeIds: new Set(['laptop']),
    activeEdgeIndices: new Set(),
  };
}

export function pointOnQuadPath(pathD, t) {
  const m = pathD.match(/M\s*([\d.-]+)\s*([\d.-]+)\s*Q\s*([\d.-]+)\s*([\d.-]+)\s*([\d.-]+)\s*([\d.-]+)/);
  if (!m) return null;
  const [, x0, y0, cx, cy, x1, y1] = m.map(Number);
  const u = 1 - t;
  return {
    x: u * u * x0 + 2 * u * t * cx + t * t * x1,
    y: u * u * y0 + 2 * u * t * cy + t * t * y1,
  };
}
