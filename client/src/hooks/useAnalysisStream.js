import { useCallback, useRef, useState } from 'react';

/**
 * SSE streaming hook for progressive analysis.
 */
export function useAnalysisStream() {
  const [partialResults, setPartialResults] = useState(null);
  const [results, setResults] = useState(null);
  const [activePhase, setActivePhase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  const reset = useCallback(() => {
    setPartialResults(null);
    setResults(null);
    setActivePhase(null);
    setError('');
  }, []);

  const startStream = useCallback((url) => {
    reset();
    setLoading(true);

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const partial = { target: null, dns: null, route: null, tls: null, http: null, geo: null };

    return new Promise((resolve, reject) => {
      fetch(`/api/analyze/stream?url=${encodeURIComponent(url)}`, {
        signal: controller.signal,
        headers: { Accept: 'text/event-stream' },
      })
        .then(async (response) => {
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          const processChunk = (chunk) => {
            buffer += chunk;
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';

            for (const part of parts) {
              const lines = part.split('\n');
              let event = 'message';
              let data = '';

              for (const line of lines) {
                if (line.startsWith('event: ')) event = line.slice(7);
                if (line.startsWith('data: ')) data = line.slice(6);
              }

              if (!data) continue;
              const payload = JSON.parse(data);

              if (event === 'analysis:start') {
                partial.target = payload.target;
                setPartialResults({ ...partial });
              }

              if (event === 'phase:start') {
                setActivePhase(payload.phase);
              }

              if (event === 'phase:complete') {
                partial[payload.phase] = payload.data;
                if (payload.phase === 'dns' && payload.data?.resolvedIp) {
                  partial.target = {
                    ...partial.target,
                    hostname: partial.target?.hostname || url,
                  };
                }
                setPartialResults({ ...partial, target: partial.target });
                setActivePhase(payload.phase);
              }

              if (event === 'geo:complete') {
                partial.geo = payload.data;
                setPartialResults({ ...partial });
              }

              if (event === 'analysis:done') {
                setResults(payload.data);
                setPartialResults(payload.data);
                setActivePhase('done');
                setLoading(false);
                resolve(payload.data);
              }

              if (event === 'analysis:error') {
                setError(payload.error);
                setLoading(false);
                reject(new Error(payload.error));
              }
            }
          };

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            processChunk(decoder.decode(value, { stream: true }));
          }

          setLoading(false);
          resolve(partial);
        })
        .catch((err) => {
          if (err.name === 'AbortError') return;
          setError(err.message);
          setLoading(false);
          reject(err);
        });
    });
  }, [reset]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  return {
    partialResults,
    results,
    activePhase,
    loading,
    error,
    startStream,
    cancel,
    reset,
    setResults,
  };
}
