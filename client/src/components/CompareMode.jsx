import { useState } from 'react';

const DEFAULT_COMPARE = ['github.com', 'gitlab.com'];

export default function CompareMode({ onCompare, disabled }) {
  const [a, setA] = useState(DEFAULT_COMPARE[0]);
  const [b, setB] = useState(DEFAULT_COMPARE[1]);

  return (
    <div className="compare-mode">
      <p className="compare-mode-title">Compare URLs</p>
      <div className="compare-mode-inputs">
        <input
          type="text"
          value={a}
          onChange={(e) => setA(e.target.value)}
          placeholder="URL A"
          disabled={disabled}
        />
        <span className="compare-vs">vs</span>
        <input
          type="text"
          value={b}
          onChange={(e) => setB(e.target.value)}
          placeholder="URL B"
          disabled={disabled}
        />
        <button
          type="button"
          className="compare-run-btn"
          disabled={disabled || !a.trim() || !b.trim()}
          onClick={() => onCompare(a.trim(), b.trim())}
        >
          Race
        </button>
      </div>
    </div>
  );
}
