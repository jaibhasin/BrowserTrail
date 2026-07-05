import { pointOnQuadPath } from '../utils/journeyAnimator.js';

const DOT_COLORS = {
  out: '#84e8ff',
  in: '#b5ff7d',
  dns: '#c9a0ff',
};

function reversePath(pathD) {
  if (!pathD) return pathD;
  const match = pathD.match(/M\s*([\d.-]+)\s*([\d.-]+)\s*Q\s*([\d.-]+)\s*([\d.-]+)\s*([\d.-]+)\s*([\d.-]+)/);
  if (!match) return pathD;
  const [, , , qx, qy, ex, ey] = match;
  return `M ${ex} ${ey} Q ${qx} ${qy} ${match[1]} ${match[2]}`;
}

function resolvePath(pkt, { edgePaths, tunnelPathD, dnsPathD, insideTunnel }) {
  if (pkt.phase === 'dns' && dnsPathD) return dnsPathD;
  if (pkt.edgeIndex >= 0 && edgePaths[pkt.edgeIndex]) return edgePaths[pkt.edgeIndex];
  if ((pkt.phase === 'http' || pkt.phase === 'tls' || pkt.useTunnel) && insideTunnel && tunnelPathD) {
    return tunnelPathD;
  }
  return edgePaths[edgePaths.length - 1] || tunnelPathD || dnsPathD || '';
}

function PacketDot({ pkt, pathD }) {
  const motionPath = pkt.direction === 'in' ? reversePath(pathD) : pathD;
  const color = pkt.phase === 'dns' ? DOT_COLORS.dns : (DOT_COLORS[pkt.direction] || DOT_COLORS.out);
  const t = pkt.direction === 'in' ? 1 - (pkt.progress ?? 0) : (pkt.progress ?? 0);
  const pos = pointOnQuadPath(motionPath, t);

  if (!pos) return null;

  return (
    <g className="packet-dot">
      <circle
        cx={pos.x}
        cy={pos.y}
        r={pkt.size || 5}
        fill={color}
        filter="url(#dotGlow)"
        className="packet-dot-circle"
      />
      {pkt.label && (
        <text x={pos.x} y={pos.y - 12} className="packet-label" textAnchor="middle">
          {pkt.label}
        </text>
      )}
    </g>
  );
}

export default function PacketAnimator({
  activePackets,
  edgePaths = [],
  tunnelPathD,
  dnsPathD,
  insideTunnel,
}) {
  return (
    <g className="packet-layer">
      {activePackets.map((pkt) => {
        const pathD = resolvePath(pkt, { edgePaths, tunnelPathD, dnsPathD, insideTunnel });
        if (!pathD) return null;

        return (
          <PacketDot
            key={pkt.id}
            pkt={pkt}
            pathD={pathD}
          />
        );
      })}
    </g>
  );
}

/** @deprecated kept for any external imports; journey now uses journeyAnimator */
export function packetsFromEvent() {
  return [];
}
