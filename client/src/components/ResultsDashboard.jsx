import React from 'react';
import OsiLayerMap from './OsiLayerMap.jsx';
import DNSPanel from './DNSPanel.jsx';
import RoutePanel from './RoutePanel.jsx';
import TLSPanel from './TLSPanel.jsx';
import HTTPPanel from './HTTPPanel.jsx';
import SecurityPanel from './SecurityPanel.jsx';
import InsightsBar from './InsightsBar.jsx';
import TimelineChart from './TimelineChart.jsx';

/**
 * Main results dashboard that organizes all analysis data.
 * Shows the OSI model overview + detailed panels for each layer.
 */
export default function ResultsDashboard({ results, url }) {
  const { target, dns, route, tls, http, insights, osiMapping } = results;

  return (
    <div className="dashboard">
      {/* ── Target Header ── */}
      <div className="target-header">
        <div className="target-info">
          <h2 className="target-url">{target.normalized}</h2>
          <div className="target-meta">
            <span className="meta-badge">
              <span className="meta-dot resolved"></span>
              {dns.resolvedIp || 'N/A'}
            </span>
            <span className="meta-badge">{target.hostname}</span>
            <span className="meta-badge">Port {target.port}</span>
            <span className="meta-badge">{http.httpVersion || 'N/A'}</span>
          </div>
        </div>
        <div className="target-time">
          Analyzed at {new Date(target.analyzedAt).toLocaleTimeString()}
        </div>
      </div>

      {/* ── Insights Summary ── */}
      {insights && insights.length > 0 && <InsightsBar insights={insights} />}

      {/* ── OSI Model Overview ── */}
      {osiMapping && <OsiLayerMap layers={osiMapping} />}

      {/* ── Timeline ── */}
      {http.timing && <TimelineChart timing={http.timing} />}

      {/* ── Detailed Panels Grid ── */}
      <div className="panels-grid">
        <DNSPanel data={dns} />
        <RoutePanel data={route} />
        <TLSPanel data={tls} />
        <HTTPPanel data={http} />
        <SecurityPanel headers={http.headers} />
      </div>
    </div>
  );
}
