import React from 'react';

/**
 * Waterfall timeline showing the sequence and duration of each network stage.
 *
 * This is modeled after browser DevTools Network waterfall charts.
 * It shows how the stages overlap and which ones take the most time.
 *
 * The critical insight: these stages are SEQUENTIAL (not parallel)
 * for a single HTTP request. DNS → TCP → TLS → TTFB → Download.
 * Each stage must complete before the next can begin.
 */
export default function TimelineChart({ timing }) {
  if (!timing) return null;

  // Collect all readable timings (filter out nulls)
  const stages = [
    { key: 'dns', label: 'DNS Lookup', time: timing.dns, color: 'var(--color-dns)' },
    { key: 'tcp', label: 'TCP Connect', time: timing.tcp, color: 'var(--color-tcp)' },
    { key: 'tls', label: 'TLS Handshake', time: timing.tls, color: 'var(--color-tls)' },
    { key: 'ttfb', label: 'TTFB (Server Wait)', time: timing.ttfb, color: 'var(--color-ttfb)' },
    { key: 'download', label: 'Download', time: timing.download, color: 'var(--color-download)' },
  ].filter(s => s.time !== null && s.time !== undefined);

  if (stages.length === 0) return null;

  // Calculate total time and offsets
  // For simplicity, we lay them end-to-end
  const totalTime = stages.reduce((sum, s) => sum + s.time, 0);
  const maxBarWidth = 100; // percentage

  // Compute cumulative offsets and widths as percentages
  let cumulative = 0;
  const positionedStages = stages.map((s) => {
    const offset = cumulative;
    const width = totalTime > 0 ? (s.time / totalTime) * maxBarWidth : 0;
    cumulative += width;
    return { ...s, offset, width };
  });

  return (
    <div className="timeline-section">
      <h3 className="section-title">
        <span className="section-icon">⏱</span>
        Network Timeline — Waterfall View
      </h3>

      <div className="timeline-container">
        {/* ── Waterfall bars ── */}
        <div className="timeline-waterfall">
          {positionedStages.map((stage) => (
            <div key={stage.key} className="timeline-row">
              <span className="timeline-label">{stage.label}</span>
              <div className="timeline-track">
                <div
                  className="timeline-bar"
                  style={{
                    marginLeft: `${stage.offset}%`,
                    width: `${Math.max(stage.width, 1)}%`,
                    backgroundColor: stage.color,
                  }}
                >
                  {stage.width > 8 && (
                    <span className="timeline-bar-text">{stage.time}ms</span>
                  )}
                </div>
              </div>
              <span className="timeline-time">{stage.time}ms</span>
            </div>
          ))}
        </div>

        {/* ── Summary ── */}
        <div className="timeline-summary">
          <div className="timeline-total">
            <span>Total time:</span>
            <strong>{totalTime.toFixed(0)}ms</strong>
          </div>
          <div className="timeline-note">
            <strong>Sequential model:</strong> Each stage waits for the previous one to complete.
            DNS must finish before TCP can start, TCP before TLS, and so on.
            This is why DNS and TCP optimizations (connection reuse, preconnect) matter so much.
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="timeline-legend">
          {stages.map((s) => (
            <div key={s.key} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: s.color }}></span>
              <span className="legend-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
