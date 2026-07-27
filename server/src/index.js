import { createApp } from './app.js';

const PORT = process.env.PORT || 3100;
const app = createApp();

app.listen(PORT, () => {
  console.log(`BrowserTrail server running on http://localhost:${PORT}`);
});
