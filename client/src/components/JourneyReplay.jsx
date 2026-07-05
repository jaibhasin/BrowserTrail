const PHASES = ['dns', 'route', 'tcp', 'tls', 'http', 'done'];

const SPEED_OPTIONS = [
  { value: 0.1, label: '0.1×' },
  { value: 0.2, label: '0.2×' },
  { value: 0.3, label: '0.3×' },
  { value: 1, label: '1×' },
];

export default function JourneyReplay({
  duration,
  currentTime,
  isPlaying,
  speed,
  onSeek,
  onPlayPause,
  onSpeedChange,
  onStep,
  script = [],
}) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  function seekPhase(phase) {
    const start = script.find((e) => e.type === 'phase-start' && e.phase === phase);
    if (start) onSeek(start.at);
  }

  return (
    <div className="journey-replay journey-replay-minimal">
      <div className="journey-replay-header">
        <span className="journey-replay-title">Route replay</span>
        <div className="journey-replay-controls">
          <button type="button" className="replay-btn" onClick={onPlayPause}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <div className="replay-speed-group" role="group" aria-label="Replay speed">
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`replay-speed-btn ${speed === opt.value ? 'replay-speed-active' : ''}`}
                onClick={() => onSpeedChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button type="button" className="replay-btn" onClick={() => onStep(-1)}>
            ‹
          </button>
          <button type="button" className="replay-btn" onClick={() => onStep(1)}>
            ›
          </button>
        </div>
      </div>

      <div className="journey-replay-phases">
        {PHASES.map((phase) => (
          <button
            key={phase}
            type="button"
            className="replay-phase-btn"
            onClick={() => seekPhase(phase)}
          >
            {phase.toUpperCase()}
          </button>
        ))}
      </div>

      <input
        type="range"
        className="journey-replay-scrubber"
        min={0}
        max={duration}
        step={10}
        value={currentTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        style={{ '--progress': `${progress}%` }}
        aria-label="Replay position"
      />

      <div className="journey-replay-time">
        <span>{(currentTime / 1000).toFixed(1)}s</span>
        <span>{(duration / 1000).toFixed(1)}s</span>
      </div>
    </div>
  );
}
