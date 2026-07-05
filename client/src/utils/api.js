/**
 * API utilities for communicating with the BrowserTrail backend.
 */

const API_BASE = '/api';

export async function analyzeUrl(url) {
  const response = await fetch(`${API_BASE}/analyze?url=${encodeURIComponent(url)}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Opens an SSE stream for progressive analysis.
 * @param {string} url
 * @param {(event: string, payload: object) => void} onEvent
 * @returns {() => void} abort function
 */
export function analyzeUrlStream(url, onEvent) {
  const controller = new AbortController();

  fetch(`${API_BASE}/analyze/stream?url=${encodeURIComponent(url)}`, {
    signal: controller.signal,
    headers: { Accept: 'text/event-stream' },
  }).then(async (response) => {
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
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
        if (data) onEvent(event, JSON.parse(data));
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') onEvent('analysis:error', { error: err.message });
  });

  return () => controller.abort();
}
