import React from 'react';

/**
 * Visualizes the 7-layer OSI model with analysis data mapped to each layer.
 *
 * Each layer card shows:
 *   - Layer number and name
 *   - The protocol found at that layer
 *   - Key data points relevant to that layer
 *
 * The OSI model is the conceptual framework that organizes network communication
 * from physical signals (Layer 1) up to application data (Layer 7).
 */
export default function OsiLayerMap({ layers }) {
  if (!layers) return null;

  return (
    <div className="osi-section">
      <h3 className="section-title">
        <span className="section-icon">📐</span>
        OSI Model — Layer-by-Layer Analysis
      </h3>
      <div className="osi-stack">
        {/* Render layers from top (7) to bottom (1) */}
        {layers.sort((a, b) => b.layer - a.layer).map((layer) => (
          <OsiLayerCard key={layer.layer} layer={layer} />
        ))}
      </div>
    </div>
  );
}

function OsiLayerCard({ layer }) {
  const { layer: num, name, protocol, data } = layer;

  return (
    <div className={`osi-layer osi-layer-l${num}`}>
      <div className="osi-layer-header">
        <div className="osi-layer-id">
          <span className="osi-layer-num">L{num}</span>
          <span className="osi-layer-name">{name}</span>
        </div>
        <span className="osi-protocol">{protocol}</span>
      </div>
      <div className="osi-layer-data">
        {data ? (
          <div className="osi-data-grid">
            {Object.entries(data).filter(([, v]) => v !== null && v !== undefined).map(([key, value]) => (
              <div key={key} className="osi-data-item">
                <span className="osi-data-key">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                </span>
                <span className="osi-data-value">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <span className="osi-no-data">No data captured</span>
        )}
      </div>
    </div>
  );
}
