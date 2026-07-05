import React from 'react';

/**
 * Shows key insights and findings from the analysis.
 * Color-coded by severity: good, info, warning, error.
 */
export default function InsightsBar({ insights }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="insights-bar">
      <h3 className="insights-title">Insights & Findings</h3>
      <div className="insights-list">
        {insights.map((insight, i) => (
          <div key={i} className={`insight-item severity-${insight.severity}`}>
            <span className="insight-icon">
              {insight.severity === 'good' ? '✓' :
               insight.severity === 'warning' ? '⚠' :
               insight.severity === 'error' ? '✗' : 'ℹ'}
            </span>
            <span className="insight-topic">{insight.topic}</span>
            <span className="insight-message">{insight.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
