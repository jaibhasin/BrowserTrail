import { runParallelAnalysis } from '../services/analyzeOrchestrator.js';
import { prepareTarget } from '../lib/targetSafety.js';

/**
 * Main analysis endpoint: /api/analyze?url=https://example.com
 */
export async function analyzeUrl(req, res) {
  const rawUrl = req.query.url;

  if (!rawUrl) {
    return res.status(400).json({
      error: 'Missing required query parameter: url',
      hint: 'Usage: /api/analyze?url=https://example.com',
    });
  }

  try {
    const target = await prepareTarget(rawUrl);
    const results = await runParallelAnalysis(rawUrl, target);
    return res.json(results);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      error: `Analysis failed: ${err.message}`,
    });
  }
}
