import { startTransition, useEffect, useMemo, useState } from 'react';
import NetworkJourney from './components/NetworkJourney.jsx';
import JourneyReplay from './components/JourneyReplay.jsx';
import ResultsPanel from './components/ResultsPanel.jsx';
import { useAnalysisStream } from './hooks/useAnalysisStream.js';
import { useJourneyReplay } from './hooks/useJourneyReplay.js';
import { buildJourneyScript } from './utils/journeyScript.js';
import './App.css';
import './networkJourney.css';
import './journeyReplay.css';

export default function App() {
  const [input, setInput] = useState('');
  const [canvasMode, setCanvasMode] = useState('idle');
  const [lastTarget, setLastTarget] = useState('');
  const [hasScanned, setHasScanned] = useState(false);

  const {
    partialResults,
    results,
    activePhase,
    loading,
    error,
    startStream,
    reset,
  } = useAnalysisStream();

  const replay = useJourneyReplay(results);

  const animationEvents = useMemo(() => {
    if (canvasMode === 'replay' && results) return replay.script;
    if (canvasMode === 'scanning' && results) return buildJourneyScript(results);
    if (canvasMode === 'scanning' && partialResults) {
      return buildJourneyScript({
        ...partialResults,
        target: partialResults.target || { hostname: lastTarget, protocol: 'https:' },
      });
    }
    return [];
  }, [canvasMode, replay.script, results, partialResults, lastTarget]);

  async function runAnalysis(rawTarget) {
    const trimmed = rawTarget.trim();
    if (!trimmed || loading) return;

    setLastTarget(trimmed);
    setHasScanned(true);
    setCanvasMode('scanning');
    reset();

    try {
      await startStream(trimmed);
      startTransition(() => setCanvasMode('replay'));
    } catch {
      setCanvasMode('idle');
    }
  }

  useEffect(() => {
    if (canvasMode === 'replay' && results) {
      replay.seek(0);
      replay.play();
    }
  }, [canvasMode, results?.target?.analyzedAt]);

  function handleSubmit(event) {
    event.preventDefault();
    void runAnalysis(input);
  }

  const displayResults = results || partialResults;
  const showJourney = hasScanned || canvasMode === 'scanning' || canvasMode === 'replay';

  return (
    <div className="app-shell app-shell-minimal">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <main className={`app-minimal ${showJourney ? 'app-minimal-with-journey' : ''}`}>
        <form className="glass-search" onSubmit={handleSubmit}>
          <input
            type="text"
            className="glass-search-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter a website…"
            disabled={loading}
            spellCheck="false"
            autoComplete="off"
            aria-label="Website URL"
          />
          <button
            type="submit"
            className="glass-search-button"
            disabled={!input.trim() || loading}
            aria-label={loading ? 'Scanning' : 'Go'}
          >
            {loading ? (
              <span className="glass-search-spinner" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        </form>

        {error && <p className="glass-search-error">{error}</p>}

        {showJourney && (
          <>
            <NetworkJourney
              mode={canvasMode === 'idle' && hasScanned ? 'scanning' : canvasMode}
              results={displayResults}
              partialResults={partialResults}
              activePhase={activePhase}
              animationEvents={animationEvents}
              replayTime={canvasMode === 'replay' ? replay.currentTime : undefined}
            />

            {canvasMode === 'replay' && results && (
              <JourneyReplay
                duration={replay.duration}
                currentTime={replay.currentTime}
                isPlaying={replay.isPlaying}
                speed={replay.speed}
                script={replay.script}
                onSeek={replay.seek}
                onPlayPause={replay.playPause}
                onSpeedChange={replay.setSpeed}
                onStep={replay.step}
              />
            )}
          </>
        )}

        {results && !loading && <ResultsPanel results={results} />}
      </main>
    </div>
  );
}
