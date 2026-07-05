import { PROTOCOL_CHIPS } from '../constants/protocolChips.js';

export default function ProtocolChips({ activePhase, results, visibleChips }) {
  const chips = PROTOCOL_CHIPS.filter((chip) => {
    if (chip.conditional && !chip.conditional(results)) return false;
    if (visibleChips && !visibleChips.includes(chip.id)) return false;
    return true;
  });

  return (
    <aside className="protocol-chips">
      <p className="protocol-chips-title">Protocols</p>
      <div className="protocol-chips-list">
        {chips.map((chip) => {
          const isActive = activePhase === chip.phase
            || (chip.phase === 'route' && activePhase === 'route')
            || (chip.id === 'http2' && activePhase === 'http');

          const isVisible = visibleChips ? visibleChips.includes(chip.id) : true;

          return (
            <a
              key={chip.id}
              href={chip.wiki}
              target="_blank"
              rel="noopener noreferrer"
              className={`protocol-chip ${isActive ? 'protocol-chip-active' : ''} ${isVisible ? 'protocol-chip-visible' : ''}`}
            >
              <span className="protocol-chip-name">{chip.name}</span>
              <span className="protocol-chip-summary">{chip.summary}</span>
              <span className="protocol-chip-link">Learn more →</span>
            </a>
          );
        })}
      </div>
    </aside>
  );
}
