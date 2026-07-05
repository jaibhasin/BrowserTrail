/**
 * Scripted preview nodes for idle/example demo (no API).
 */
export const PREVIEW_NODES = [
  { id: 'laptop', type: 'laptop', label: 'Your Laptop', x: 0 },
  { id: 'router', type: 'router', label: 'Local Router', x: 1 },
  { id: 'hop1', type: 'hop', label: 'ISP Gateway', x: 2, rtt: 12 },
  { id: 'hop2', type: 'hop', label: 'Backbone', x: 3, rtt: 45 },
  { id: 'origin', type: 'server', label: 'Origin Server', x: 4, rtt: 28 },
];

export const PREVIEW_DNS_NODE = { id: 'dns', type: 'dns', label: 'DNS Resolver' };

export const PREVIEW_SCRIPT = [
  { at: 0, phase: 'dns', type: 'phase-start' },
  { at: 600, phase: 'dns', type: 'packet', direction: 'out' },
  { at: 1200, phase: 'dns', type: 'packet', direction: 'in' },
  { at: 1600, phase: 'dns', type: 'phase-end' },
  { at: 1800, phase: 'route', type: 'phase-start' },
  { at: 2000, phase: 'route', type: 'hop', hopIndex: 0 },
  { at: 2300, phase: 'route', type: 'hop', hopIndex: 1 },
  { at: 2800, phase: 'route', type: 'hop', hopIndex: 2 },
  { at: 3200, phase: 'route', type: 'phase-end' },
  { at: 3400, phase: 'tcp', type: 'phase-start' },
  { at: 3600, phase: 'tcp', type: 'handshake', label: 'SYN', index: 0 },
  { at: 3800, phase: 'tcp', type: 'handshake', label: 'SYN-ACK', index: 1 },
  { at: 4000, phase: 'tcp', type: 'handshake', label: 'ACK', index: 2 },
  { at: 4200, phase: 'tcp', type: 'phase-end' },
  { at: 4400, phase: 'tls', type: 'phase-start' },
  { at: 4800, phase: 'tls', type: 'tunnel-lock' },
  { at: 5200, phase: 'tls', type: 'phase-end' },
  { at: 5400, phase: 'http', type: 'phase-start' },
  { at: 5600, phase: 'http', type: 'packet', direction: 'out', index: 0 },
  { at: 5800, phase: 'http', type: 'packet', direction: 'out', index: 1 },
  { at: 6200, phase: 'http', type: 'packet', direction: 'in', index: 0 },
  { at: 6400, phase: 'http', type: 'packet', direction: 'in', index: 1 },
  { at: 6800, phase: 'http', type: 'phase-end' },
  { at: 7200, phase: 'done', type: 'complete' },
];

export const PREVIEW_DURATION = 8000;
