import { runParallelAnalysis } from '../services/analyzeOrchestrator.js';

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
    const results = await runParallelAnalysis(rawUrl);
    return res.json(results);
  } catch (err) {
    return res.status(500).json({
      error: `Analysis failed: ${err.message}`,
    });
  }
}
