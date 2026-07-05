import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildGraphFromResults, layoutGraph } from '../utils/graphLayout.js';
import { latencyColor } from '../utils/latencyColor.js';
import { getJourneyState, scanningTimeFromPhase } from '../utils/journeyAnimator.js';
import PacketAnimator from './PacketAnimator.jsx';
import EncryptedTunnel from './EncryptedTunnel.jsx';

function NodeGlyph({ type }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (type) {
    case 'laptop':
      return (
        <g {...common}>
          <rect x="-8" y="-7" width="16" height="11" rx="1.5" />
          <path d="M -11 7 L 11 7" />
        </g>
      );
    case 'router':
      return (
        <g {...common}>
          <rect x="-9" y="1" width="18" height="6" rx="1.6" />
          <circle cx="-5.5" cy="4" r="0.8" fill="currentColor" stroke="none" />
          <path d="M -4 -2 A 5.5 5.5 0 0 1 4 -2" />
          <path d="M -7 -5 A 10 10 0 0 1 7 -5" />
        </g>
      );
    case 'hop':
      return (
        <g {...common}>
          <path d="M 0 -7 L 7 0 L 0 7 L -7 0 Z" />
          <circle cx="0" cy="0" r="1.4" fill="currentColor" stroke="none" />
        </g>
      );
    case 'dns':
      return (
        <g {...common}>
          <circle cx="0" cy="0" r="7.5" />
          <path d="M 0 -7.5 L 0 7.5" />
          <path d="M -7.5 0 L 7.5 0" />
          <path d="M 0 -7.5 A 4 7.5 0 0 0 0 7.5 A 4 7.5 0 0 0 0 -7.5" />
        </g>
      );
    case 'cdn':
      return (
        <g {...common}>
          <path d="M 1.5 -8 L -5 1 L -0.5 1 L -1.5 8 L 5.5 -1.5 L 1 -1.5 Z" />
        </g>
      );
    case 'server':
    default:
      return (
        <g {...common}>
          <rect x="-8" y="-7.5" width="16" height="6.5" rx="1.5" />
          <rect x="-8" y="1" width="16" height="6.5" rx="1.5" />
          <circle cx="-5" cy="-4.2" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="-5" cy="4.3" r="0.9" fill="currentColor" stroke="none" />
        </g>
      );
  }
}

function shortLabel(text, max = 14) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export default function NetworkJourney({
  mode,
  results,
  partialResults,
  activePhase,
  animationEvents,
  replayTime,
}) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 900, height: 420 });

  const data = results || partialResults;
  const isHttps = data?.target?.protocol === 'https:' || !data?.target?.protocol;
  const isAnimating = mode === 'replay' || mode === 'scanning';

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({
        width: Math.max(320, width),
        height: Math.max(280, height - 8),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graph = useMemo(() => buildGraphFromResults(data), [data]);

  const layout = useMemo(
    () => layoutGraph(graph, size.width, size.height),
    [graph, size.width, size.height],
  );

  const edgePaths = useMemo(
    () => layout.edges.map((e) => e.pathD).filter(Boolean),
    [layout.edges],
  );

  const timelineMs = useMemo(() => {
    if (!animationEvents?.length) return 0;
    if (replayTime !== undefined) return replayTime;
    if (mode === 'scanning') return scanningTimeFromPhase(animationEvents, activePhase);
    return animationEvents[animationEvents.length - 1]?.at ?? 0;
  }, [animationEvents, replayTime, mode, activePhase]);

  const journey = useMemo(
    () => getJourneyState(animationEvents, timelineMs, {
      edgeCount: edgePaths.length,
    }),
    [animationEvents, timelineMs, edgePaths.length],
  );

  const showLabels = useCallback((node) => {
    if (!isAnimating) return true;
    if (node.id === 'laptop' || node.type === 'dns') return true;
    if (node.type === 'server' || node.id === 'origin') {
      return journey.reachedNodeIds.has(node.id) || journey.phase === 'done';
    }
    return journey.reachedNodeIds.has(node.id);
  }, [isAnimating, journey.reachedNodeIds, journey.phase]);

  const tunnelPathD = layout.tunnelEdge?.pathD || '';
  const dnsPathD = layout.dnsEdge?.pathD || '';

  return (
    <div className="network-journey-minimal" ref={containerRef}>
      <svg
        width={size.width}
        height={size.height}
        className="journey-svg"
        viewBox={`0 0 ${size.width} ${size.height}`}
      >
        <defs>
          <filter id="dotGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="edgeGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {layout.dnsEdge && (
          <path
            d={layout.dnsEdge.pathD}
            className={`journey-edge journey-edge-dns ${journey.reachedNodeIds.has('dns-resolver') ? 'journey-edge-lit' : ''}`}
            fill="none"
          />
        )}

        {layout.edges.map((edge, index) => {
          const lit = journey.activeEdgeIndices.has(index) || !isAnimating;
          const dormant = edge.dormant && !lit;
          return (
            <path
              key={edge.id}
              d={edge.pathD}
              className={`journey-edge ${dormant ? 'journey-edge-dormant' : ''} ${lit ? 'journey-edge-lit' : 'journey-edge-pending'}`}
              fill="none"
              stroke={dormant ? 'rgba(132,232,255,0.12)' : latencyColor(edge.cumulativeRtt)}
              strokeWidth={lit ? 2.5 : 1.5}
              strokeDasharray={lit ? undefined : '5 7'}
              opacity={lit ? 1 : 0.35}
              filter={lit ? 'url(#edgeGlow)' : undefined}
            />
          );
        })}

        <EncryptedTunnel
          active={journey.tunnel}
          pathD={tunnelPathD}
          tlsVersion={data?.tls?.version}
          isHttps={isHttps}
        />

        <PacketAnimator
          activePackets={journey.packets}
          edgePaths={edgePaths}
          tunnelPathD={tunnelPathD}
          dnsPathD={dnsPathD}
          insideTunnel={journey.tunnel}
        />

        {layout.nodes.map((node) => {
          const reached = journey.reachedNodeIds.has(node.id) || !isAnimating;
          const isCurrent = journey.packets.some((p) => {
            if (p.phase === 'dns' && node.type === 'dns') return true;
            if (p.edgeIndex >= 0 && node.id === `hop-${p.edgeIndex}`) return true;
            if (p.edgeIndex >= 0 && p.edgeIndex === layout.edges.length - 1 && node.type === 'server') return true;
            return false;
          });
          const labelsVisible = showLabels(node);

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className={[
                'journey-node',
                `journey-node-${node.type}`,
                node.dormant && !reached ? 'journey-node-dormant' : '',
                reached ? 'journey-node-reached' : 'journey-node-pending',
                isCurrent ? 'journey-node-current' : '',
              ].filter(Boolean).join(' ')}
            >
              <circle r={node.id === 'laptop' ? 22 : 16} className="journey-node-ring" />
              <g className="journey-node-glyph">
                <NodeGlyph type={node.type} />
              </g>
              {labelsVisible && (
                <>
                  <text className="journey-node-label" textAnchor="middle" y={32}>
                    {shortLabel(node.label, node.type === 'hop' ? 18 : 22)}
                  </text>
                  <text className="journey-node-detail" textAnchor="middle" y={46}>
                    {node.cdnProvider ? `${node.cdnProvider} edge` : shortLabel(node.detail, 16)}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {journey.handshakeLabels.map((label, i) => (
          <text
            key={`${label}-${i}`}
            x={size.width / 2}
            y={size.height * 0.35 + i * 16}
            className="handshake-label"
            textAnchor="middle"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}
