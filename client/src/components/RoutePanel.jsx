import React from 'react';

/**
 * Displays the traceroute results — the network path packets take.
 *
 * Traceroute works by sending packets with increasing TTL (Time To Live) values.
 *   - TTL=1: The first router receives it, decrements TTL to 0, and sends back
 *     an ICMP "Time Exceeded" message with its identity.
 *   - TTL=2: The second router responds.
 *   - ...and so on, until we reach the destination or hit the max hop limit.
 *
 * Each hop reveals:
 *   - The router's IP address and hostname
 *   - Round-trip latency to that hop
 *   - Where in the network topology we are (LAN, ISP backbone, destination)
 */
export default function RoutePanel({ data }) {
  if (!data) return null;
  if (data.error) {
    return (
      <div className="panel panel-route">
        <div className="panel-header">
          <span className="panel-icon">📍</span>
          <span className="panel-title">Network Route (Traceroute)</span>
        </div>
        <div className="panel-error">{data.error}</div>
      </div>
    );
  }

  const { hops, totalHops } = data;
  const visibleHops = hops.filter(h => !h.timedOut);

  return (
    <div className="panel panel-route">
      <div className="panel-header">
        <span className="panel-icon">📍</span>
        <span className="panel-title">Network Route (Traceroute)</span>
        <span className="panel-subtitle">{visibleHops.length} hops</span>
      </div>

      {/* ── Hop Visualization ── */}
      <div className="route-visual">
        {hops.length === 0 ? (
          <div className="panel-empty">No route data available</div>
        ) : (
          <div className="route-hops">
            {hops.map((hop, i) => (
              <div key={i} className={`route-hop ${hop.timedOut ? 'hop-timeout' : ''}`}>
                {/* Connection line (except for first hop) */}
                {i > 0 && <div className="hop-line"></div>}

                <div className="hop-marker">
                  <span className="hop-number">{hop.hop}</span>
                  {!hop.timedOut && (
                    <span className="hop-rtt">{hop.rtt}ms</span>
                  )}
                </div>

                {!hop.timedOut ? (
                  <div className="hop-info">
                    <code className="hop-ip">{hop.ip}</code>
                    {hop.hostname && hop.hostname !== hop.ip && (
                      <span className="hop-hostname">{hop.hostname}</span>
                    )}
                  </div>
                ) : (
                  <div className="hop-info">
                    <span className="hop-timeout-text">Request timed out</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Explanation ── */}
      <div className="panel-footnote">
        <strong>How traceroute works:</strong> Packets are sent with increasing TTL (Time To Live).
        Each router along the path decrements the TTL. When TTL reaches 0, the router sends back
        an ICMP "Time Exceeded" message, revealing its identity. This builds the complete path
        from your machine to the destination, one hop at a time.
      </div>
    </div>
  );
}
