// nuextract-client.js - Script JavaScript pour extraire le HTML et exécuter les APIs NuExtract
// Basé sur extraction-config.schema.json (configuration technique NuExtract) et les schémas JSON de hermes2022-concepts.json et sous-jacents ($ref)

const path = require('path');
const findUp = require('find-up');
const nuextractApi = require('./nuextract-api.js');

// Résolution robuste de la racine du repository (selon @root-directory-governance)
const fullFilePath = findUp.sync('package.json', { cwd: __dirname });
if (!fullFilePath) {
  throw new Error('Impossible de localiser la racine du repository');
}
const repoRoot = path.dirname(fullFilePath);
const resolveFromRepoRoot = (...segments) => path.resolve(repoRoot, ...segments);

const logger = require(resolveFromRepoRoot('shared/src/utils/logger'));

// Cache du projectId NuExtract (immutable après initialisation)
let _projectId = null;



// Gestion du projet NuExtract : recherche ou création (template appliqué par bloc)
async function findOrCreateProject(config, apiKey) {
  logger.info(` Gestion du projet NuExtract`);
  
  try {
    // Résoudre tous les paramètres depuis config avec fallbacks
    const nuextractConfig = config?.llm?.nuextract || config?.nuextract || {};
    const projectName = nuextractConfig.projectName || 'HERMES2022';
    const projectDescription = nuextractConfig.projectDescription || 'Project for HERMES2022 concepts extraction';
    const hostname = nuextractConfig.baseUrl || 'nuextract.ai';
    const port = nuextractConfig.port || 443;
    const pathProjects = nuextractConfig.projectsPath || '/api/projects';
    const pathPrefix = nuextractConfig.pathPrefix || null;
    
    // Validation projectName
    if (!projectName || typeof projectName !== 'string' || projectName.trim() === '') {
      throw new Error('Missing required valid parameter: projectName. Script stopped.');
    }

    logger.info(` Recherche du projet ${projectName} sur la plateforme NuExtract`);

    // Appel API avec tous les paramètres explicites
    const projects = await nuextractApi.getNuExtractProjects(hostname, port, pathProjects, pathPrefix, apiKey);
    const existingProject = projects.find((p) => p.name === projectName);
    
    if (!existingProject) {
      logger.info(` Pas de projet existant trouvé sur la plateforme NuExtract : ${projectName}`);
      console.log(`Création du projet ${projectName} (template sera appliqué par bloc)`);
      
      // Créer le projet sans template (sera appliqué par bloc)
      const projectPayload = {
        name: projectName,
        description: projectDescription
      };
      
      // Appel API avec tous les paramètres explicites
      const created = await nuextractApi.createNuExtractProject(
        hostname, port, pathProjects, pathPrefix, apiKey, projectPayload
      );
      
      _projectId = created?.id;  // Cache interne
      return { id: created?.id, name: projectName, created: true };
    }
    
    // Projet existant trouvé, réutilisation
    logger.info(` Projet existant trouvé sur la plateforme NuExtract : ${projectName} (id: ${existingProject.id})`);
    console.log(`Projet ${projectName} trouvé, réutilisation (template appliqué par bloc)`);
    _projectId = existingProject.id;  // Cache interne
    return { id: existingProject.id, name: projectName, existing: true };
    
  } catch (error) {
    logger.error(`Erreur lors de la gestion du projet NuExtract: ${error.message}`);
    throw error;
  }
}

/**
 * Génère template NuExtract pour UN SEUL bloc
 * @param {object} blockSchema - Schéma JSON du bloc
 * @param {object} config - Configuration complète
 * @param {string} apiKey - Clé API NuExtract
 * @returns {Promise<object>} Template NuExtract
 */
async function generateTemplateForBlock(blockSchema, config, apiKey) {
  logger.info(` Génération du template NuExtract pour un bloc`);
  
  try {
    // Charger les instructions depuis config
    const nuextractConfig = config?.llm?.nuextract || config?.nuextract || {};
    if (!nuextractConfig.templateTransformationInstructions?.instructions) {
      throw new Error('templateTransformationInstructions.instructions non trouvé dans config.llm.nuextract. Script stopped.');
    }
    
    const instructionsArray = nuextractConfig.templateTransformationInstructions.instructions;
    
    if (!Array.isArray(instructionsArray)) {
      const actualType = typeof instructionsArray;
      throw new Error(`templateTransformationInstructions.instructions invalide: type "${actualType}". Format attendu: array de strings. Script stopped.`);
    }
    
    const instructions = instructionsArray.join('\n');
    
    // Stringifier le schéma du bloc uniquement
    const schemaStr = JSON.stringify(blockSchema, null, 2);
    const description = schemaStr + '\n\n' + instructions;
    
    // Logs DEBUG pour diagnostic
    logger.debug('Schéma bloc envoyé:', schemaStr.length, 'caractères');
    logger.debug('Description totale (schéma + instructions):', description.length, 'caractères');
    logger.debug('Premiers 300 car du schéma:', schemaStr.substring(0, 300));
    
    // Déterminer le mode (sync par défaut)
    const templateMode = nuextractConfig.templateMode || 'sync';
    
    if (templateMode !== 'sync' && templateMode !== 'async') {
      throw new Error(`templateMode invalide: "${templateMode}". Valeurs acceptées: "sync", "async". Script stopped.`);
    }
    
    // Récupérer templateGenerationDuration (défaut 30000ms)
    const templateGenerationDuration = nuextractConfig.templateGenerationDuration || 30000;
    
    // Gestion des fallbacks de configuration
    const hostname = nuextractConfig.baseUrl || 'nuextract.ai';
    const port = nuextractConfig.port || 443;
    const pathPrefix = nuextractConfig.pathPrefix || null;
    
    let template;
    
    if (templateMode === 'async') {
      // Mode async
      const pathAsync = nuextractConfig['infer-templateAsyncPath'] || '/api/infer-template-async';
      const pathJobs = nuextractConfig.jobsPath || '/api/jobs/{jobId}';
      
      console.log(`Mode async: Lancement génération template asynchrone pour bloc (timeout API: 60s, sleep initial: ${templateGenerationDuration}ms)...`);
      
      const asyncResponse = await nuextractApi.inferTemplateFromDescriptionAsync(
        hostname, port, pathAsync, pathPrefix, apiKey, description, 60
      );
      
      const jobId = asyncResponse.jobId;
      
      if (!jobId) {
        throw new Error('Pas de jobId reçu de l\'API async. Script stopped.');
      }
      
      console.log(`Job lancé avec ID: ${jobId}`);
      
      const templateData = await nuextractApi.pollJobUntilComplete(
        hostname, port, pathJobs, pathPrefix, apiKey, jobId, 20, 3000, templateGenerationDuration
      );
      
      if (typeof templateData === 'string') {
        try {
          template = JSON.parse(templateData);
        } catch (error) {
          throw new Error('Invalid JSON in template data returned by async API. Script stopped.', { cause: error });
        }
      } else if (templateData && typeof templateData === 'object' && !Array.isArray(templateData)) {
        template = templateData;
      } else {
        const actualType = templateData === null ? 'null' : Array.isArray(templateData) ? 'array' : typeof templateData;
        throw new Error(`Invalid template data type: expected object or JSON string, got ${actualType}. Script stopped.`);
      }
    } else {
      // Mode sync
      const pathSync = nuextractConfig['infer-templatePath'] || '/api/infer-template';
      const syncTimeout = templateGenerationDuration + 5000; // Marge de sécurité +5s
      
      console.log(`Mode sync: Génération template synchrone pour bloc (timeout HTTP: ${syncTimeout}ms)...`);
      
      template = await nuextractApi.inferTemplateFromDescription(
        hostname, port, pathSync, pathPrefix, apiKey, description, syncTimeout
      );
    }
    
    console.log('Template NuExtract généré avec succès pour bloc');
    return template;
  } catch (error) {
    logger.error(`Erreur lors de la génération du template pour bloc: ${error.message}`);
    throw error;
  }
}

/**
 * Extrait UN SEUL bloc avec NuExtract (utilise _projectId interne)
 * @param {object} block - {jsonPointer, schema, instructions, htmlContents}
 * @param {object} config - Configuration complète
 * @param {string} apiKey - Clé API NuExtract
 * @returns {Promise<{jsonPointer: string, data: object}>} Résultat extraction
 */
async function extractSingleBlock(block, config, apiKey) {
  logger.info(` Extraction NuExtract pour bloc ${block.jsonPointer}`);
  
  if (!_projectId) {
    throw new Error('NuExtract project not initialized. Call findOrCreateProject() first. Script stopped.');
  }
  
  try {
    // Fonction helper interne : Construit un prompt Markdown pour un seul bloc
    function buildBlockPrompt(block) {
      logger.info(` Construction du prompt d'extraction pour bloc ${block?.jsonPointer || 'inconnu'}`);
      
      // Validation : htmlContents ne doit pas être vide
      if (block.htmlContents.length === 0) {
        throw new Error('block.htmlContents is empty. No HTML content found for this block. Script stopped.');
      }
      
      // Construire le prompt Markdown pour ce bloc
      const promptParts = [];
      
      // En-tête du bloc avec JSON Pointer
      promptParts.push(`## Block: ${block.jsonPointer}\n`);
      
      // Instructions d'extraction
      promptParts.push('### Extraction Instructions\n');
      for (const instruction of block.instructions) {
        promptParts.push(`- ${instruction}`);
      }
      promptParts.push('\n');
      
      // Pour chaque contenu HTML dans le bloc, ajouter une section de contenu
      for (const htmlContent of block.htmlContents) {
        promptParts.push(`### Text Content from ${htmlContent.url}\n`);
        promptParts.push('```text\n');
        promptParts.push(htmlContent.content);
        promptParts.push('\n```\n');
      }
      
      // Concaténation en un seul prompt pour ce bloc
      const prompt = promptParts.join('\n');
      
      logger.info(` Prompt d'extraction construit pour bloc ${block.jsonPointer} : ${prompt.length} caractères`);
      
      return prompt;
    }
    
    // 1. Générer template pour ce bloc
    const blockTemplate = await generateTemplateForBlock(block.schema, config, apiKey);
    
    // 2. Mettre à jour projet avec ce template (utilise _projectId interne)
    const nuextractConfig = config?.llm?.nuextract || config?.nuextract || {};
    const hostname = nuextractConfig.baseUrl || 'nuextract.ai';
    const port = nuextractConfig.port || 443;
    const pathProjectTemplate = nuextractConfig.projectTemplatePath || '/api/projects/{projectId}/template';
    const pathPrefix = nuextractConfig.pathPrefix || null;
    
    await nuextractApi.putProjectTemplate(hostname, port, pathProjectTemplate, pathPrefix, apiKey, _projectId, blockTemplate);
    
    // 3. Construire prompt (reprendre buildBlockPrompt)
    const prompt = buildBlockPrompt(block);
    
    // 4. Appeler infer-text (utilise _projectId interne)
    const path = nuextractConfig['infer-textPath'] || '/api/projects/{projectId}/infer-text';
    const timeoutMs = 120000;
    
    const partialJson = await nuextractApi.inferTextFromContent(
      hostname, port, path, pathPrefix, _projectId, apiKey, prompt, timeoutMs
    );
    
    logger.info(` Extraction NuExtract terminée pour bloc ${block.jsonPointer}`);
    return { jsonPointer: block.jsonPointer, data: partialJson };
  } catch (error) {
    logger.error(`Erreur lors de l'extraction du bloc ${block.jsonPointer}: ${error.message}`);
    throw error;
  }
}

// Exports
/**
 * Initialise le projet NuExtract (cache _projectId en interne)
 * Cette fonction est appelée par l'orchestrateur avant l'extraction
 */
async function initializeProject(config, apiKey, resolvedSchema) {
  console.log('[info] Initialisation du projet NuExtract');
  
  try {
    // Appeler findOrCreateProject pour initialiser _projectId
    await findOrCreateProject(config, apiKey);
    
    console.log('[info] Projet NuExtract initialisé avec succès');
    
    return { projectInitialized: true };
  } catch (error) {
    logger.error(`Erreur lors de l'initialisation du projet NuExtract: ${error.message}`);
    throw error;
  }
}

module.exports = {
  // Tests BDD
  _testOnly_findOrCreateProject: findOrCreateProject,
  _testOnly_generateTemplateForBlock: generateTemplateForBlock,
  _testOnly_extractSingleBlock: extractSingleBlock,
  
  // Interface publique
  initializeProject,
  findOrCreateProject,
  generateTemplateForBlock,
  extractSingleBlock
};