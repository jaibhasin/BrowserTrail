import React from 'react';

/**
 * Displays detailed DNS resolution results.
 *
 * DNS (Domain Name System) is the phonebook of the internet.
 * It translates human-readable domain names into machine-readable IP addresses.
 * Every web request begins with a DNS lookup — this is the first packet.
 *
 * What we show:
 *   - Resolved IP address (the actual server we connected to)
 *   - All DNS record types found (A, AAAA, CNAME, MX, NS, TXT)
 *   - Query latency (how long DNS took)
 */
export default function DNSPanel({ data }) {
  if (!data) return null;
  if (data.error) {
    return (
      <div className="panel panel-dns">
        <PanelHeader icon="🗺" title="DNS Resolution" />
        <div className="panel-error">{data.error}</div>
      </div>
    );
  }

  const { records, resolvedIp, queryTime } = data;
  const recordTypes = Object.keys(records);

  return (
    <div className="panel panel-dns">
      <PanelHeader icon="🗺" title="DNS Resolution" subtitle={`${queryTime}ms`} />

      {/* Primary IP */}
      <div className="dns-primary">
        <span className="dns-label">Resolved IP</span>
        <span className="dns-ip">{resolvedIp || 'N/A'}</span>
      </div>

      {/* Record Types */}
      {recordTypes.length === 0 ? (
        <div className="panel-empty">No DNS records found</div>
      ) : (
        <div className="dns-records">
          {recordTypes.map((type) => {
            const record = records[type];
            return (
              <div key={type} className="dns-record-group">
                <div className="dns-record-header">
                  <span className="dns-record-type">{type}</span>
                  <span className="dns-record-label">{record.label}</span>
                  <span className="dns-record-count">{record.values.length} record{record.values.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="dns-record-values">
                  {record.values.map((val, i) => (
                    <code key={i} className="dns-value">{String(val)}</code>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Explanation */}
      <div className="panel-footnote">
        <strong>How DNS works:</strong> When you type a URL, your computer first asks a DNS server
        to translate the domain name into an IP address. This query can go through multiple
        resolvers (ISP, public, or recursive) before reaching the authoritative nameserver.
        Each record type serves a different purpose.
      </div>
    </div>
  );
}

function PanelHeader({ icon, title, subtitle }) {
  return (
    <div className="panel-header">
      <span className="panel-icon">{icon}</span>
      <span className="panel-title">{title}</span>
      {subtitle && <span className="panel-subtitle">{subtitle}</span>}
    </div>
  );
}
