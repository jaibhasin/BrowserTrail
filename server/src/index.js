import express from 'express';
import cors from 'cors';
import { analyzeUrl } from './routes/analyze.js';
import { analyzeUrlStream } from './routes/analyzeStream.js';

const app = express();
const PORT = process.env.PORT || 3100;

app.use(cors());
app.use(express.json());

app.get('/api/analyze', analyzeUrl);
app.get('/api/analyze/stream', analyzeUrlStream);

app.listen(PORT, () => {
  console.log(`BrowserTrail server running on http://localhost:${PORT}`);
});
