import { runSequentialAnalysis } from '../services/analyzeOrchestrator.js';
import { buildTargetMeta } from '../lib/analysisHelpers.js';
import { prepareTarget } from '../lib/targetSafety.js';

/**
 * SSE streaming analysis: GET /api/analyze/stream?url=...
 */
export async function analyzeUrlStream(req, res) {
  const rawUrl = req.query.url;

  if (!rawUrl) {
    return res.status(400).json({
      error: 'Missing required query parameter: url',
      hint: 'Usage: /api/analyze/stream?url=https://example.com',
    });
  }

  let target;
  try {
    target = await prepareTarget(rawUrl);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  req.on('close', () => {
    res.end();
  });

  try {
    sendEvent('analysis:start', { url: rawUrl, target: buildTargetMeta(target) });
    await runSequentialAnalysis(rawUrl, sendEvent, target);
    res.end();
  } catch (err) {
    sendEvent('analysis:error', { error: err.message });
    res.end();
  }
}
