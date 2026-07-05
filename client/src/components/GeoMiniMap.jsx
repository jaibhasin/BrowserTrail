/**
 * Simple SVG world mini-map with hop arcs.
 */
export default function GeoMiniMap({ geo, activeHopIp, expanded, onToggle }) {
  const locations = geo?.locations ? Object.values(geo.locations).filter((l) => l.lat && l.lon) : [];

  const project = (lat, lon) => {
    const x = ((lon + 180) / 360) * 280 + 10;
    const y = ((90 - lat) / 180) * 120 + 10;
    return { x, y };
  };

  const points = locations.map((loc) => ({ ...loc, ...project(loc.lat, loc.lon) }));

  return (
    <div className={`geo-minimap ${expanded ? 'geo-minimap-expanded' : ''}`}>
      <div className="geo-minimap-header">
        <span className="geo-minimap-title">Route map</span>
        <button type="button" className="geo-minimap-toggle" onClick={onToggle}>
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      <svg viewBox="0 0 300 140" className="geo-minimap-svg" role="img" aria-label="Geographic route map">
        <rect width="300" height="140" className="geo-minimap-bg" rx="8" />
        <path
          d="M10,70 Q80,30 150,70 T290,70"
          className="geo-minimap-graticule"
          fill="none"
        />
        {points.map((pt, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          return (
            <line
              key={`arc-${pt.ip}`}
              x1={prev.x}
              y1={prev.y}
              x2={pt.x}
              y2={pt.y}
              className="geo-arc"
            />
          );
        })}
        {points.map((pt) => (
          <g key={pt.ip}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={pt.ip === activeHopIp ? 6 : 4}
              className={`geo-point ${pt.ip === activeHopIp ? 'geo-point-active' : ''}`}
            />
            <title>{`${pt.city || pt.ip}, ${pt.country || ''}`}</title>
          </g>
        ))}
        {points.length === 0 && (
          <text x="150" y="75" textAnchor="middle" className="geo-empty">
            Awaiting geo data
          </text>
        )}
      </svg>
    </div>
  );
}
