// claude-client.js - Client métier pour extraction avec Claude (Anthropic)
// Responsabilité : Logique métier pour extraction stateless avec Claude

const claudeApi = require('./claude-api.js');

/**
 * Valide la clé API Claude (test simple de connexion)
 * @param {string} apiKey - Clé API Anthropic
 * @returns {Promise<{validated: boolean}>} Confirmation validation
 */
async function validateApiKey(apiKey) {
  console.log('[info] Validation de la clé API Claude');
  
  try {
    // Test simple : appel API avec prompt minimal
    const systemPrompt = 'You are a helpful assistant.';
    const userMessages = [{ role: 'user', content: 'Say "OK"' }];
    
    await claudeApi.inferText(systemPrompt, userMessages, apiKey, {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 10
    });
    
    console.log('[info] Clé API Claude validée avec succès');
    return { validated: true };
  } catch (error) {
    console.error(`Erreur lors de la validation de la clé API Claude: ${error.message}`);
    throw new Error(`Claude API key validation failed: ${error.message}. Script stopped.`, { cause: error });
  }
}

/**
 * Construit le prompt système pour un bloc
 * @param {object} block - Bloc avec schema, instructions
 * @param {object} config - Configuration
 * @returns {string} Prompt système
 */
function buildSystemPrompt(block, config) {
  const schemaStr = JSON.stringify(block.schema, null, 2);
  const instructions = block.instructions.join('\n');
  
  return `You are an expert at extracting structured data from text according to JSON Schema specifications.

Your task is to extract data from the provided text content and return it as valid JSON that conforms to the following JSON Schema:

${schemaStr}

Extraction instructions:
${instructions}

Important rules:
- Return ONLY valid JSON that conforms to the schema
- Do not include any explanatory text, markdown formatting, or code blocks
- Extract only information explicitly present in the text content
- Use null for optional fields that are not present
- For arrays with enum values, include all values from the enum that are present in the text`;
}

/**
 * Construit les messages utilisateur avec le contenu HTML transformé
 * @param {string} blockPrompt - Prompt du bloc (instructions + contenu)
 * @param {Array<{url: string, content: string}>} htmlContents - Contenus HTML transformés en texte
 * @returns {Array<{role: string, content: string}>} Messages utilisateur
 */
function prepareMessages(blockPrompt, htmlContents) {
  const messages = [];
  
  // Premier message : instructions d'extraction
  messages.push({
    role: 'user',
    content: blockPrompt
  });
  
  // Messages suivants : contenus HTML transformés en texte
  for (const htmlContent of htmlContents) {
    messages.push({
      role: 'user',
      content: `Text content from ${htmlContent.url}:\n\n${htmlContent.content}`
    });
  }
  
  return messages;
}

/**
 * Extrait un bloc avec Claude
 * @param {object} block - {jsonPointer, schema, instructions, htmlContents}
 * @param {object} config - Configuration complète
 * @param {string} apiKey - Clé API Anthropic
 * @returns {Promise<{jsonPointer: string, data: object}>} Résultat extraction
 */
async function extractBlock(block, config, apiKey) {
  console.log(`[info] Extraction Claude pour bloc ${block.jsonPointer}`);
  
  try {
    // Construire prompt système
    const systemPrompt = buildSystemPrompt(block, config);
    
    // Construire prompt bloc (instructions + contenu)
    const blockPromptParts = [];
    blockPromptParts.push(`## Block: ${block.jsonPointer}\n`);
    blockPromptParts.push('### Extraction Instructions\n');
    for (const instruction of block.instructions) {
      blockPromptParts.push(`- ${instruction}`);
    }
    blockPromptParts.push('\n');
    
    const blockPrompt = blockPromptParts.join('\n');
    
    // Préparer messages utilisateur
    const userMessages = prepareMessages(blockPrompt, block.htmlContents);
    
    // Appel API Claude
    const claudeConfig = config?.llm?.claude || {};
    const model = claudeConfig.model || 'claude-3-5-sonnet-20241022';
    const maxTokens = claudeConfig.maxTokens || 4096;
    const temperature = claudeConfig.temperature || 0.0;
    
    const response = await claudeApi.inferText(systemPrompt, userMessages, apiKey, {
      model: model,
      maxTokens: maxTokens,
      temperature: temperature
    });
    
    // Parser le JSON retourné par Claude
    let parsedData;
    try {
      parsedData = JSON.parse(response.text);
    } catch (error) {
      // Si Claude a retourné du JSON dans un bloc markdown, essayer de l'extraire
      const jsonMatch = response.text.match(/```json\s*([\s\S]*?)\s*```/) || response.text.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Invalid JSON response from Claude. Script stopped.', { cause: error });
      }
    }
    
    console.log(`[info] Extraction Claude terminée pour bloc ${block.jsonPointer}`);
    return { jsonPointer: block.jsonPointer, data: parsedData };
  } catch (error) {
    console.error(`Erreur lors de l'extraction du bloc ${block.jsonPointer} avec Claude: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Exports normaux (interface publique pour orchestrateur)
module.exports = {
  validateApiKey,
  extractBlock
  // Note: buildSystemPrompt et prepareMessages sont des détails d'implémentation
  // non exportés (encapsulation selon @code-modularity-governance)
};

