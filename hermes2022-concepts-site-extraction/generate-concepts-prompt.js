// Script temporaire pour générer le prompt du bloc /concepts pour test sur nuextract.ai
const path = require('path');
const findUp = require('find-up');

const fullFilePath = findUp.sync('package.json', { cwd: __dirname });
if (!fullFilePath) {
  throw new Error('Impossible de localiser la racine du repository');
}
const repoRoot = path.dirname(fullFilePath);
const resolveFromRepoRoot = (...segments) => path.resolve(repoRoot, ...segments);
const { _testOnly_loadGlobalConfig } = require('./src/nuextract-client.js');
const { _testOnly_loadAndResolveSchemas } = require('./src/nuextract-client.js');
const { _testOnly_fetchHtmlContent } = require('./src/nuextract-client.js');

async function generateConceptsPrompt() {
  try {
    // Charger la configuration
    const config = await _testOnly_loadGlobalConfig();
    const resolvedSchema = await _testOnly_loadAndResolveSchemas(config);
    
    // Base URL
    const baseUrl = config?.extractionSource?.baseUrl || 'https://www.hermes.admin.ch/en';
    
    // Extraire le bloc /concepts depuis le schéma résolu
    const schemaToTraverse = resolvedSchema.properties ? resolvedSchema.properties : resolvedSchema;
    const conceptsSchema = schemaToTraverse.concepts;
    
    if (!conceptsSchema || !conceptsSchema.properties) {
      throw new Error('concepts schema not found in resolved schema');
    }
    
    const sourceUrlProp = conceptsSchema.properties.sourceUrl;
    const extractionInstructionsProp = conceptsSchema.properties.extractionInstructions;
    
    if (!sourceUrlProp || !extractionInstructionsProp) {
      throw new Error('sourceUrl or extractionInstructions not found in concepts schema');
    }
    
    // Extraire les URLs
    let sourceUrls = [];
    if (sourceUrlProp.enum && Array.isArray(sourceUrlProp.enum)) {
      sourceUrls = sourceUrlProp.enum;
    } else if (typeof sourceUrlProp.default === 'string') {
      sourceUrls = [sourceUrlProp.default];
    } else {
      throw new Error('Invalid sourceUrl in concepts schema');
    }
    
    // Extraire les instructions
    if (extractionInstructionsProp.type !== 'array' || !extractionInstructionsProp.items?.enum) {
      throw new Error('Invalid extractionInstructions in concepts schema');
    }
    const instructions = extractionInstructionsProp.items.enum;
    
    // Charger les contenus HTML
    const htmlContents = [];
    for (const sourceUrl of sourceUrls) {
      const fullUrl = sourceUrl.startsWith('http') ? sourceUrl : `${baseUrl}${sourceUrl.startsWith('/') ? '' : '/'}${sourceUrl}`;
      const htmlContent = await _testOnly_fetchHtmlContent(fullUrl);
      htmlContents.push({ url: fullUrl, content: htmlContent });
    }
    
    // Construire le prompt
    const sections = [];
    for (const htmlContent of htmlContents) {
      const section = [];
      
      section.push(`## Block: /concepts\n`);
      
      section.push('### Extraction Instructions\n');
      for (const instruction of instructions) {
        section.push(`- ${instruction}`);
      }
      section.push('');
      
      section.push(`### HTML Content from ${htmlContent.url}\n`);
      section.push('```html');
      section.push(htmlContent.content);
      section.push('```\n');
      
      sections.push(section.join('\n'));
    }
    
    const prompt = sections.join('\n---\n\n');
    
    // Afficher le prompt (sans logs pour faciliter copier-coller)
    // Note: Les logs [info] sont affichés via console.log dans les fonctions appelées
    // mais le prompt final est affiché ici pour copier-coller direct
    console.log(prompt);
    
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  generateConceptsPrompt();
}

