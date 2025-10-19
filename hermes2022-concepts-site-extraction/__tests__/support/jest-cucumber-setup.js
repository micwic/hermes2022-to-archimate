const fs = require('fs');
const path = require('path');

// Charger la clé API dans le process.env si absente, depuis le fichier .key
(() => {
  if (!process.env.NUEXTRACT_API_KEY) {
    const keyPath = path.resolve(__dirname, '../../config/nuextract-api-key.key');
    if (fs.existsSync(keyPath)) {
      try {
        const key = fs.readFileSync(keyPath, 'utf8').trim();
        if (key) {
          process.env.NUEXTRACT_API_KEY = key;
          // eslint-disable-next-line no-console
          console.log('[jest-setup] NUEXTRACT_API_KEY chargé depuis le fichier .key');
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[jest-setup] Impossible de charger la clé API depuis le fichier .key:', e.message);
      }
    }
  }
})();

module.exports = {};
