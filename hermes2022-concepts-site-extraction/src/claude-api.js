// claude-api.js - Module API pour appels HTTP vers Anthropic Claude API
// Responsabilité : Appels HTTP purs vers l'API Claude (fonctions pures avec paramètres explicites)

const https = require('https');

/**
 * Appel API Claude pour extraction de texte
 * @param {string} systemPrompt - Prompt système pour Claude
 * @param {Array<{role: string, content: string}>} userMessages - Messages utilisateur
 * @param {string} apiKey - Clé API Anthropic
 * @param {object} options - Options (model, maxTokens, temperature)
 * @returns {Promise<object>} Réponse Claude avec contenu extrait
 */
async function inferText(systemPrompt, userMessages, apiKey, options = {}) {
  return new Promise((resolve, reject) => {
    const model = options.model || 'claude-3-5-sonnet-20241022';
    const maxTokens = options.maxTokens || 4096;
    const temperature = options.temperature || 0.0;
    
    const hostname = 'api.anthropic.com';
    const path = '/v1/messages';
    const port = 443;
    
    const payload = JSON.stringify({
      model: model,
      max_tokens: maxTokens,
      temperature: temperature,
      system: systemPrompt,
      messages: userMessages
    });
    
    const requestOptions = {
      hostname: hostname,
      port: port,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Claude API error: ${res.statusCode} - ${data}`));
          return;
        }
        
        try {
          const response = JSON.parse(data);
          
          // Extraire le contenu texte de la réponse Claude
          if (response.content && Array.isArray(response.content) && response.content.length > 0) {
            const textContent = response.content[0].text;
            resolve({ text: textContent });
          } else {
            reject(new Error('Invalid Claude API response: missing content'));
          }
        } catch (err) {
          reject(new Error('Invalid JSON response from Claude API', { cause: err }));
        }
      });
    });
    
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('Timeout: Request exceeded 120 seconds'));
    });
    
    req.on('error', (err) => {
      reject(new Error('Network error', { cause: err }));
    });
    
    req.write(payload);
    req.end();
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

// Exports normaux (interface publique du module API selon @code-modularity-governance)
module.exports = {
  inferText
};

