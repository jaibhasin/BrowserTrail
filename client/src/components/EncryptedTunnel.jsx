import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { playTunnelLock } from '../audio/SoundManager.js';

function quadMidpoint(pathD) {
  const m = pathD.match(/M\s*([\d.-]+)\s*([\d.-]+)\s*Q\s*([\d.-]+)\s*([\d.-]+)\s*([\d.-]+)\s*([\d.-]+)/);
  if (!m) return null;
  const [, x1, y1, cx, cy, x2, y2] = m.map(Number);
  // Point at t=0.5 on a quadratic bezier.
  return { x: 0.25 * x1 + 0.5 * cx + 0.25 * x2, y: 0.25 * y1 + 0.5 * cy + 0.25 * y2 };
}

export default function EncryptedTunnel({ active, pathD, tlsVersion, isHttps }) {
  const playedRef = useRef(false);

  useEffect(() => {
    if (active && !playedRef.current) {
      playedRef.current = true;
      playTunnelLock();
    }
    if (!active) playedRef.current = false;
  }, [active]);

  if (!pathD) return null;

  if (!isHttps) {
    return (
      <path
        d={pathD}
        className="tunnel-path tunnel-unencrypted"
        fill="none"
        strokeDasharray="8 6"
      />
    );
  }

  return (
    <g className="encrypted-tunnel">
      <defs>
        <linearGradient id="tunnelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#44c8ff" stopOpacity="0.3">
            <animate attributeName="stop-opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="#b5ff7d" stopOpacity="0.5">
            <animate attributeName="stop-opacity" values="0.5;0.9;0.5" dur="2s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#44c8ff" stopOpacity="0.3">
            <animate attributeName="stop-opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
        <filter id="tunnelGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <motion.path
        d={pathD}
        className="tunnel-path"
        fill="none"
        stroke={active ? 'url(#tunnelGradient)' : 'rgba(68,200,255,0.15)'}
        strokeWidth={active ? 14 : 4}
        filter={active ? 'url(#tunnelGlow)' : undefined}
        initial={{ strokeWidth: 4, opacity: 0.3 }}
        animate={{
          strokeWidth: active ? 14 : 4,
          opacity: active ? 1 : 0.35,
        }}
        transition={{ duration: 0.4 }}
      />

      {active && tlsVersion && (
        <text className="tunnel-label">
          <textPath href={`#tunnel-path-ref`} startOffset="50%" textAnchor="middle">
            {tlsVersion} encrypted
          </textPath>
        </text>
      )}

      <path id="tunnel-path-ref" d={pathD} fill="none" stroke="none" />

      {active && (() => {
        const mid = quadMidpoint(pathD);
        if (!mid) return null;
        return (
          <g className="tunnel-shield" transform={`translate(${mid.x}, ${mid.y})`}>
            <circle r="12" className="shield-icon-bg" />
            <g className="shield-glyph">
              <path
                d="M 0 -6 L 5 -3.5 L 5 1 C 5 4.2 0 6.5 0 6.5 C 0 6.5 -5 4.2 -5 1 L -5 -3.5 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              <path
                d="M -2.2 0 L -0.6 1.8 L 2.4 -1.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>
        );
      })()}
    </g>
  );
}
