// nuextract-client.js - Script JavaScript pour extraire le HTML et exécuter les APIs NuExtract
// Basé sur extraction-config.schema.json (configuration technique NuExtract) et les schémas JSON de hermes2022-concepts.json et sous-jacents ($ref)

const fs = require('fs');
const path = require('path');
const findUp = require('find-up');
const jwt = require('jsonwebtoken');
const nuextractApi = require('./nuextract-api.js');
const $RefParser = require('@apidevtools/json-schema-ref-parser');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { collectHtmlSourcesAndInstructions, fetchHtmlContent } = require('./html-collector-and-transformer.js');

const fullFilePath = findUp.sync('package.json', { cwd: __dirname });
if (!fullFilePath) {
  throw new Error('Impossible de localiser la racine du repository');
}
const repoRoot = path.dirname(fullFilePath);
const resolveFromRepoRoot = (...segments) => path.resolve(repoRoot, ...segments);

// Fonction helper pour transformer schéma JSON Schema en objet config JSON
function transformJSONSchemaIntoJSONConfigFile(schema) {
  function extractValueFromProperty(property) {
    // Pour propriété simple avec enum : utiliser enum[0]
    // Note: Gère aussi les union types comme ["string", "null"] car property.type !== 'array' reste vrai
    if (property.enum && property.type !== 'array') {
      return property.enum[0];
    }
    
    // Pour array avec items.enum : utiliser items.enum (array complet)
    if (property.type === 'array' && property.items?.enum) {
      return property.items.enum;
    }
    
    // Pour objet : construire récursivement
    if (property.type === 'object' && property.properties) {
      const obj = {};
      for (const [key, value] of Object.entries(property.properties)) {
        obj[key] = extractValueFromProperty(value);
      }
      return obj;
    }
    
    // Pour array avec items object : construire array avec un élément
    if (property.type === 'array' && property.items?.type === 'object' && property.items.properties) {
      const obj = {};
      for (const [key, value] of Object.entries(property.items.properties)) {
        obj[key] = extractValueFromProperty(value);
      }
      return [obj];
    }
    
    // Pour chaînes simples sans enum : retourner null
    if (property.type === 'string' && !property.enum) {
      return null;
    }
    
    // Pour boolean : false par défaut
    if (property.type === 'boolean') {
      return false;
    }
    
    // Pour number : null par défaut
    if (property.type === 'number') {
      return null;
    }
    
    // Par défaut
    return null;
  }
  
  // Construire l'objet config à partir du schéma
  const config = {};
  if (schema.properties) {
    for (const [key, property] of Object.entries(schema.properties)) {
      config[key] = extractValueFromProperty(property);
    }
  }
  
  return config;
}

// Charger la configuration depuis le schéma JSON Schema
async function loadGlobalConfig() {
  console.log(`[info] Chargement de la configuration à partir du schéma JSON Schema`);
  
  try {
    // Étape 1: Lire le schéma JSON Schema
    const schemaPath = resolveFromRepoRoot('hermes2022-concepts-site-extraction/config/extraction-config.schema.json');
    let schemaContent;
    try {
      schemaContent = fs.readFileSync(schemaPath, 'utf8');
    } catch (error) {
      console.error(`Erreur lors de la lecture du schéma JSON Schema : ${error.message}`);
      throw new Error('Schema file not found. Script stopped.', { cause: error });
    }
    
    // Étape 2: Parser le schéma JSON Schema
    let schema;
    try {
      schema = JSON.parse(schemaContent);
    } catch (error) {
      console.error(`Erreur lors du parsing JSON du schéma : ${error.message}`);
      throw new Error('Invalid JSON in schema file. Script stopped.', { cause: error });
    }
    
    // Étape 3: Transformer le schéma en objet config JSON
    const config = transformJSONSchemaIntoJSONConfigFile(schema);
    
    // Étape 4: Valider l'objet config transformé avec Ajv
    try {
      const ajv = new Ajv({ strict: false, allErrors: true });
      addFormats(ajv);
      const validate = ajv.compile(schema);
      const valid = validate(config);
      
      if (!valid) {
        const errorMessages = validate.errors.map(err => `${err.instancePath} ${err.message}`).join('; ');
        console.error(`Erreur critique : Le config transformé n'est pas conforme au schéma: ${errorMessages}`);
        throw new Error('Config validation failed after transformation. Script stopped.');
      }
    } catch (error) {
      if (error.message === 'Config validation failed after transformation. Script stopped.') {
        throw error;
      }
      console.error(`Erreur critique : Échec de la validation du config avec Ajv: ${error.message}`);
      throw new Error('Config validation failed after transformation. Script stopped.', { cause: error });
    }
    
    // Étape 5: Validation structurelle minimale
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new Error('Invalid config structure: expected an object. Script stopped.');
    }
    
    if (!config.nuextract || typeof config.nuextract !== 'object') {
      throw new Error('Invalid config structure: missing "nuextract" section. Script stopped.');
    }
    
    console.log('[info] Configuration chargée avec succès depuis le schéma JSON Schema');
    return config;
  } catch (error) {
    console.error(`Erreur lors du chargement de la configuration: ${error.message}`);
    throw error;
  }
};

// Lire la clé API depuis un fichier externe si elle n'est pas déjà dans l'environnement
async function loadApiKey(config) {
  let apiKey = null;
  console.log(`[info] Chargement de la clé API NuExtract à partir de : ${config.nuextract.apiKeyFile}`);
  
  // Priorité 1 : Variable d'environnement
  if (process.env.NUEXTRACT_API_KEY) {
    apiKey = process.env.NUEXTRACT_API_KEY;
  } else {
    // Priorité 2/3 : Fichier (config ou fallback)
    const keyFile = config?.nuextract?.apiKeyFile || 'hermes2022-concepts-site-extraction/config/nuextract-api-key.key';
    const keyPath = resolveFromRepoRoot(keyFile);
    try {
      apiKey = fs.readFileSync(keyPath, 'utf8');
    } catch (error) {
      console.error(`Impossible de lire la clé API NuExtract (env NUEXTRACT_API_KEY ou fichier ${keyPath}) : ${error.message}`);
      throw new Error('API_KEY is not set. Script stopped.');
    }
  }
  
  // Trim unique sur la clé chargée
  apiKey = apiKey.trim();
  
  // Vérifier que la clé n'est pas vide après trim
  if (!apiKey || apiKey.length === 0) {
    throw new Error('API key is empty after trimming whitespace. Script stopped.');
  }
  
  // Validation JWT avec jsonwebtoken (décodage sans vérification de signature)
  try {
    const decoded = jwt.decode(apiKey, { complete: true });
    
    if (!decoded || !decoded.header || !decoded.payload) {
      throw new Error('JWT structure is invalid (could not decode header or payload)');
    }
    
    // Vérification optionnelle : format header standard
    if (!decoded.header.typ || !decoded.header.alg) {
      throw new Error('JWT header missing required fields (typ, alg)');
    }
    
  } catch (error) {
    throw new Error('API key format is invalid. Script stopped.', { cause: error });
  }
  
  console.log(`[info] Clé API NuExtract chargée avec succès`);
  return apiKey;
};

// Fonction pour lire les instructions de transformation du template
async function loadInstructions(config) {
  console.log(`[info] Chargement des instructions depuis config.nuextract.templateTransformationInstructions.instructions`);
  
  try {
    // Instructions depuis config déjà chargée (SRP : extraction uniquement, pas de chargement fichier)
    if (!config?.nuextract?.templateTransformationInstructions?.instructions) {
      throw new Error('templateTransformationInstructions.instructions non trouvé dans config.nuextract. Script stopped.');
    }
    
    const instructionsArray = config.nuextract.templateTransformationInstructions.instructions;
    
    // Valider que c'est un array (Pattern 1 : erreur de validation selon @error-handling-governance)
    if (!Array.isArray(instructionsArray)) {
      const actualType = typeof instructionsArray;
      throw new Error(`templateTransformationInstructions.instructions invalide: type "${actualType}". Format attendu: array de strings. Script stopped.`);
    }
    
    // Joindre les valeurs de l'array avec \n pour concaténation
    const instructions = instructionsArray.join('\n');
    console.log(`[info] Instructions chargées depuis config.nuextract.templateTransformationInstructions.instructions (${instructionsArray.length} instructions)`);
    return instructions;
  } catch (error) {
    // Pattern 3 : Propagation d'erreur dans fonctions d'orchestration
    // Message contextualisé pour identifier facilement la fonction (bonne pratique reconnue)
    console.error(`Erreur lors du chargement des instructions: ${error.message}`);
    throw error; // Propagation simple avec préservation de la stack trace
  }
}

// Fonction pour charger et résoudre les schémas JSON
async function loadAndResolveSchemas(config) {
  const mainSchemaFileName = config?.nuextract?.mainJSONConfigurationFile || 'shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json';
  const mainSchemaFile = resolveFromRepoRoot(mainSchemaFileName);
  
  console.log(`[info] Chargement et résolution du schéma JSON à partir de : ${mainSchemaFile}`);
  
  let resolvedSchema;
  
  // Bloc 1: Résolution des $ref avec $RefParser
  try {
    resolvedSchema = await $RefParser.dereference(mainSchemaFile, {
      dereference: {
        circular: 'ignore'
      }
    });
  } catch (error) {
    console.error(`Erreur critique : Échec du chargement ou de la résolution des références du schéma JSON: ${error.message}`);
    throw new Error('Invalid JSON schema structure or content. Script stopped.', { cause: error });
  }
  
  // Bloc 2: Validation de conformité JSON Schema avec Ajv
  try {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    
    // Méta-schéma JSON Schema Draft-07 (standard utilisé dans le projet)
    const metaSchema = require('ajv/dist/refs/json-schema-draft-07.json');
    
    const validate = ajv.compile(metaSchema);
    const valid = validate(resolvedSchema);
    
    if (!valid) {
      const errorMessages = validate.errors.map(err => `${err.instancePath} ${err.message}`).join('; ');
      const validationError = new Error(`Schema validation failed: ${errorMessages}`);
      console.error(`Erreur critique : Le schéma résolu n'est pas conforme à JSON Schema Draft-07: ${errorMessages}`);
      throw new Error('Invalid JSON schema structure or content. Script stopped.', { cause: validationError });
    }
  } catch (error) {
    // Si l'erreur vient déjà du bloc de validation ci-dessus, la relancer
    if (error.message === 'Invalid JSON schema structure or content. Script stopped.') {
      throw error;
    }
    // Sinon, c'est une erreur inattendue dans Ajv lui-même
    console.error(`Erreur critique : Échec de la validation du schéma avec Ajv: ${error.message}`);
    throw new Error('Invalid JSON schema structure or content. Script stopped.', { cause: error });
  }
  
  console.log(`[info] Schéma JSON chargé, résolu et validé avec succès`);
  return resolvedSchema;
}

// Générer un template via /api/infer-template (sync) ou /api/infer-template-async (async)
async function generateTemplate(config, apiKey, resolvedJsonSchema) {
  try {
    const instructions = await loadInstructions(config);
    // Stringifier le schéma résolu uniquement pour construire la description API
    const mainSchema = JSON.stringify(resolvedJsonSchema, null, 2);
    const description = mainSchema + '\n' + instructions;

    console.log(`[info] Génération du template avec la description NuExtract suivante : ${description}`);

    // Déterminer le mode (sync par défaut)
    const templateMode = config?.nuextract?.templateMode || 'sync';
    
    // Validation du mode
    if (templateMode !== 'sync' && templateMode !== 'async') {
      throw new Error(`templateMode invalide: "${templateMode}". Valeurs acceptées: "sync", "async"`);
    }
    
    // Récupérer templateGenerationDuration (défaut 30000ms)
    const templateGenerationDuration = config?.nuextract?.templateGenerationDuration || 30000;
    
    // Gestion des fallbacks de configuration (Dependency Injection)
    const hostname = config?.nuextract?.baseUrl || 'nuextract.ai';
    const port = config?.nuextract?.port || 443;
    const pathPrefix = config?.nuextract?.pathPrefix || null;
    
    let template;
    
    if (templateMode === 'async') {
      // Mode async
      const pathAsync = config?.nuextract?.['infer-templateAsyncPath'] || '/api/infer-template-async';
      const pathJobs = config?.nuextract?.jobsPath || '/api/jobs/{jobId}';
      
      console.log(`Mode async: Lancement génération template asynchrone (timeout API: 60s, sleep initial: ${templateGenerationDuration}ms)...`);
      
      // Appel API avec tous les paramètres explicites
      const asyncResponse = await nuextractApi.inferTemplateFromDescriptionAsync(
        hostname, port, pathAsync, pathPrefix, apiKey, description, 60
      );
      
      const jobId = asyncResponse.jobId;
      
      if (!jobId) {
        throw new Error('Pas de jobId reçu de l\'API async');
      }
      
      console.log(`Job lancé avec ID: ${jobId}`);
      
      // Polling avec tous les paramètres explicites
      const templateData = await nuextractApi.pollJobUntilComplete(
        hostname, port, pathJobs, pathPrefix, apiKey, jobId, 20, 3000, templateGenerationDuration
      );
      
      // Vérifier et valider le type de templateData
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
      const pathSync = config?.nuextract?.['infer-templatePath'] || '/api/infer-template';
      const syncTimeout = templateGenerationDuration + 5000; // Marge de sécurité +5s
      
      console.log(`Mode sync: Génération template synchrone (timeout HTTP: ${syncTimeout}ms)...`);
      
      // Appel API avec tous les paramètres explicites
      template = await nuextractApi.inferTemplateFromDescription(
        hostname, port, pathSync, pathPrefix, apiKey, description, syncTimeout
      );
    }
    
    // Sauvegarder le template généré
    const templateDirConfig = config?.nuextract?.templateOutputDirectory || 'shared/hermes2022-extraction-files/config/nuextract-template-generated';
    const templateDir = resolveFromRepoRoot(templateDirConfig);
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }
    const templatePath = path.join(templateDir, 'nuextract-template.json');
    fs.writeFileSync(templatePath, JSON.stringify(template, null, 2), 'utf8');
    console.log(`Template sauvegardé dans : ${templatePath}`);
    
    console.log('Template NuExtract généré avec succès');
    return template;
  } catch (error) {
    console.error(`Erreur lors de la génération du template: ${error.message}`);
    throw error;
  }
}

// Gestion du projet NuExtract, il est recherché et mis à jour avec le template si le projet existe déjà ou créé avec le template généré si le projet n'existe pas encore
async function findOrCreateProject(config, apiKey, templateObj) {
  // Journalisation en entrée de fonction pour traçabilité
  console.log(`[info] Gestion du projet NuExtract`);
  
  try {
    // Résoudre tous les paramètres depuis config avec fallbacks
    const templateReset = config?.nuextract?.templateReset ?? false;
    const projectName = config?.nuextract?.projectName || 'HERMES2022';
    const projectDescription = config?.nuextract?.projectDescription || 'Project for HERMES2022 concepts extraction';
    const hostname = config?.nuextract?.baseUrl || 'nuextract.ai';
    const port = config?.nuextract?.port || 443;
    const pathProjects = config?.nuextract?.projectsPath || '/api/projects';
    const pathProjectTemplate = config?.nuextract?.projectTemplatePath || '/api/projects/{projectId}/template';
    const pathPrefix = config?.nuextract?.pathPrefix || null;
    
    // Validation projectName
    if (!projectName || typeof projectName !== 'string' || projectName.trim() === '') {
      throw new Error('Missing required valid parameter: projectName. Script stopped.');
    }

    console.log(`[info] Recherche du projet ${projectName} sur la plateforme NuExtract`);

    // Appel API avec tous les paramètres explicites
    const projects = await nuextractApi.getNuExtractProjects(hostname, port, pathProjects, pathPrefix, apiKey);
    const existingProject = projects.find((p) => p.name === projectName);
    
    if (!existingProject) {
      console.log(`[info] Pas de projet existant trouvé sur la plateforme NuExtract : ${projectName}`);
      // Créer le projet - le template est obligatoire pour un nouveau projet
      if (!templateObj) {
        throw new Error('A valid NuExtractTemplate is required for project creation. Script stopped.');
      }
      
      console.log(`Création du projet ${projectName} avec template ${templateObj}`);
      
      // Appel API avec tous les paramètres explicites
      const created = await nuextractApi.createNuExtractProject(
        hostname, port, pathProjects, pathPrefix, apiKey, {
          name: projectName,
          description: projectDescription,
          template: templateObj
        }
      );
      
      return { id: created?.id, name: projectName, created: true };
    }
    
    if (existingProject) {
      console.log(`[info] Projet existant trouvé sur la plateforme NuExtract : ${projectName} (id: ${existingProject.id})`);
      
      if (templateReset) {
        // Mise à jour du template demandée
        if (!templateObj) {
          throw new Error('A valid NuExtractTemplate is required for template update. Script stopped.');
        }
        // Utiliser le path passé en paramètre
        await nuextractApi.putProjectTemplate(hostname, port, pathProjectTemplate, pathPrefix, apiKey, existingProject.id, templateObj);
        console.log(`[info] Template mis à jour pour le projet ${projectName} (id: ${existingProject.id})`);
        return { id: existingProject.id, name: projectName, updated: true };
      } else {
        // Réutilisation du projet existant sans modification
        // Vérifier la conformité du template existant avec le template fourni (conforme au JSON schema)
        if (!templateObj) {
          throw new Error('A valid NuExtractTemplate is required for template conformity validation. Script stopped.');
        }
        
        console.log(`[info] Paramètre de mise à jour du template : ${templateReset}, Vérification de la conformité du template existant avec le JSON schema`);
        
        // Le template est déjà disponible dans existingProject (retourné par getNuExtractProjects)
        if (!existingProject.template || !existingProject.template.schema) {
          throw new Error(`Le projet ${projectName} existe mais ne contient pas de template valide. Script stopped.`);
        }
        
        // Comparaison profonde du template existant avec le template de référence (conforme au JSON schema)
        const existingTemplateSchema = JSON.stringify(existingProject.template.schema);
        const expectedTemplateSchema = JSON.stringify(templateObj);
        
        if (existingTemplateSchema !== expectedTemplateSchema) {
          throw new Error(`Le template existant du projet ${projectName} n'est pas conforme au JSON schema attendu. Script stopped.`);
        }
        
        console.log(`[info] Template existant conforme au JSON schema - projet ${projectName} (id: ${existingProject.id})`);
        console.log(`Projet ${projectName} trouvé, réutilisation sans modification`);
        return { id: existingProject.id, name: projectName, existing: true };
      }
    }
  } catch (error) {
    console.error(`Erreur lors de la gestion du projet NuExtract: ${error.message}`);
    throw error;
  }
}

/**
 * Fusionne récursivement une valeur dans un objet cible au chemin spécifié (JSON Pointer)
 * @param {object} target - Objet cible dans lequel fusionner
 * @param {string} path - Chemin JSON Pointer (ex: "/concepts/overview" ou "/concepts/phases/0/description")
 * @param {any} value - Valeur à fusionner
 * @returns {object} - Objet cible modifié
 */
function mergeJsonAtPath(target, path, value) {
  // Journalisation en entrée de fonction pour traçabilité
  console.log(`[info] Fusion de valeur au chemin ${path}`);
  console.log(`[debug] Type de valeur à fusionner : ${typeof value}, est objet : ${typeof value === 'object'}, est array : ${Array.isArray(value)}, est null : ${value === null}`);
  console.log(`[debug] Clés de la valeur (si objet) :`, value && typeof value === 'object' ? Object.keys(value) : 'N/A');
  
  try {
    // Validation paramètres
    if (!target || typeof target !== 'object') {
      throw new Error('Invalid target: target must be a non-null object. Script stopped.');
    }
    
    if (!path || typeof path !== 'string') {
      throw new Error('Invalid path: path must be a non-empty string. Script stopped.');
    }
    
    // Parser le JSON Pointer (format: /path/to/property ou /path/to/array/0)
    // Retirer le slash initial et diviser en segments
    const segments = path.replace(/^\/+/, '').split('/').filter(seg => seg !== '');
    
    if (segments.length === 0) {
      // Chemin racine : fusionner directement la valeur
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(target, value);
      } else {
        // Pour les valeurs simples ou arrays, remplacer complètement
        // Note: Ce cas ne devrait pas arriver normalement car on fusionne toujours des objets
        throw new Error(`Cannot merge non-object value at root path. Script stopped.`);
      }
      return target;
    }
    
    // Parcourir récursivement les segments pour créer ou accéder aux objets intermédiaires
    let current = target;
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      
      // Vérifier si le segment est un index d'array (nombre)
      const arrayIndex = parseInt(segment, 10);
      if (!isNaN(arrayIndex) && Array.isArray(current)) {
        // Accéder à l'élément de l'array
        if (arrayIndex < 0 || arrayIndex >= current.length) {
          throw new Error(`Array index out of bounds: ${arrayIndex} at path ${path}. Script stopped.`);
        }
        current = current[arrayIndex];
      } else {
        // Créer l'objet intermédiaire s'il n'existe pas
        if (!current[segment] || typeof current[segment] !== 'object') {
          current[segment] = {};
        }
        current = current[segment];
      }
    }
    
    // Dernier segment : fusionner la valeur
    const lastSegment = segments[segments.length - 1];
    const arrayIndex = parseInt(lastSegment, 10);
    
    if (!isNaN(arrayIndex) && Array.isArray(current)) {
      // Fusionner dans un élément d'array
      if (arrayIndex < 0 || arrayIndex >= current.length) {
        throw new Error(`Array index out of bounds: ${arrayIndex} at path ${path}. Script stopped.`);
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Fusionner objet dans l'élément de l'array
        Object.assign(current[arrayIndex], value);
      } else {
        // Remplacer l'élément de l'array
        current[arrayIndex] = value;
      }
    } else {
      // Fusionner dans une propriété d'objet
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Fusionner objet récursivement
        if (!current[lastSegment] || typeof current[lastSegment] !== 'object' || Array.isArray(current[lastSegment])) {
          current[lastSegment] = {};
        }
        Object.assign(current[lastSegment], value);
      } else {
        // Remplacer la propriété
        current[lastSegment] = value;
      }
    }
    
    return target;
  } catch (error) {
    // Message contextualisé pour identifier facilement la fonction
    console.error(`Erreur lors de la fusion au chemin ${path}: ${error.message}`);
    throw error; // Propagation simple avec préservation de la stack trace
  }
}

/**
 * Construit un prompt Markdown pour un seul bloc
 * @param {{jsonPointer: string, instructions: Array<string>, htmlContents: Array<{url: string, content: string}>}} block - Bloc avec JSON Pointer, instructions et contenus HTML
 * @returns {string} - Prompt Markdown pour ce bloc
 */
function buildBlockPrompt(block) {
  // Journalisation en entrée de fonction pour traçabilité
  console.log(`[info] Construction du prompt d'extraction pour bloc ${block?.jsonPointer || 'inconnu'}`);
  
  try {
    // Validation structure bloc
    if (!block || typeof block !== 'object') {
      throw new Error('Invalid block: block must be a non-null object. Script stopped.');
    }
    
    if (!block.jsonPointer) {
      throw new Error('block.jsonPointer is required. Script stopped.');
    }
    
    if (!Array.isArray(block.instructions)) {
      throw new Error('block.instructions must be an array. Script stopped.');
    }
    
    if (!Array.isArray(block.htmlContents)) {
      throw new Error('block.htmlContents must be an array. Script stopped.');
    }
    
    if (block.htmlContents.length === 0) {
      throw new Error('block.htmlContents is empty. No HTML content found for this block. Script stopped.');
    }
    
    // Construire le prompt Markdown pour ce bloc
    const promptParts = [];
    
    // Log des instructions d'extraction pour ce bloc (une seule fois)
    console.log(`[debug] Bloc ${block.jsonPointer} : ${block.instructions.length} instruction(s) d'extraction`);
    console.log(`[debug] Instructions : ${block.instructions.join(' | ')}`);
    
    // En-tête du bloc avec JSON Pointer (une seule fois)
    promptParts.push(`## Block: ${block.jsonPointer}\n`);
    
    // Instructions d'extraction (une seule fois pour tout le bloc)
    promptParts.push('### Extraction Instructions\n');
    for (const instruction of block.instructions) {
      promptParts.push(`- ${instruction}`);
    }
    promptParts.push('\n');
    
    // Pour chaque contenu HTML dans le bloc, ajouter une section de contenu
    for (const htmlContent of block.htmlContents) {
      // Contenu texte (déjà converti HTML→texte) pour cette URL spécifique
      promptParts.push(`### Text Content from ${htmlContent.url}\n`);
      promptParts.push('```text');
      promptParts.push(htmlContent.content);
      promptParts.push('```\n');
      
      // Log pour chaque URL traitée (taille du contenu texte)
      console.log(`[debug] Contenu ajouté pour ${htmlContent.url} : ${htmlContent.content.length} caractères texte`);
    }
    
    // Concaténation en un seul prompt pour ce bloc
    const prompt = promptParts.join('\n');
    
    // Journalisation en sortie de fonction pour validation du succès
    console.log(`[info] Prompt d'extraction construit pour bloc ${block.jsonPointer} : ${prompt.length} caractères`);
    
    // Log temporaire pour validation visuelle de la structure (premiers 800 caractères)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[debug] Extrait du prompt :\n${prompt.substring(0, 800)}...\n`);
    }
    
    return prompt;
  } catch (error) {
    // Message contextualisé pour identifier facilement la fonction
    console.error(`Erreur lors de la construction du prompt d'extraction pour bloc: ${error.message}`);
    throw error; // Propagation simple avec préservation de la stack trace
  }
}

/**
 * Construit un prompt Markdown agrégé depuis la préparation collectée
 * @param {{blocks: Array<{jsonPointer: string, instructions: Array<string>, htmlContents: Array<{url: string, content: string}>}>}} preparation - Préparation avec blocs collectés
 * @returns {string} - Prompt Markdown agrégé
 */
function buildExtractionPrompt(preparation) {
  // Journalisation en entrée de fonction pour traçabilité
  console.log(`[info] Construction du prompt d'extraction depuis ${preparation?.blocks?.length || 0} bloc(s)`);
  
  try {
    // Validation structure préparation
    if (!preparation || typeof preparation !== 'object') {
      throw new Error('Invalid preparation: preparation must be a non-null object. Script stopped.');
    }
    
    if (!preparation.blocks) {
      throw new Error('preparation.blocks is required. Script stopped.');
    }
    
    if (!Array.isArray(preparation.blocks)) {
      throw new Error('preparation.blocks must be an array. Script stopped.');
    }
    
    if (preparation.blocks.length === 0) {
      throw new Error('preparation.blocks is empty. No extractible blocks found. Script stopped.');
    }
    
    // Construire sections Markdown pour chaque bloc
    // Pour chaque contenu HTML, générer les instructions AVANT le contenu
    const sections = [];
    
    for (const block of preparation.blocks) {
      // Pour chaque contenu HTML dans le bloc, créer une section avec instructions + contenu
      for (const htmlContent of block.htmlContents) {
        const section = [];
        
        // En-tête du bloc avec JSON Pointer
        section.push(`## Block: ${block.jsonPointer}\n`);
        
        // Instructions d'extraction (répétées pour chaque contenu HTML)
        section.push('### Extraction Instructions\n');
        for (const instruction of block.instructions) {
          section.push(`- ${instruction}`);
        }
        section.push('');
        
        // Contenu HTML pour cette URL spécifique
        section.push(`### HTML Content from ${htmlContent.url}\n`);
        section.push('```html');
        section.push(htmlContent.content);
        section.push('```\n');
        
        sections.push(section.join('\n'));
      }
    }
    
    // Concaténation avec séparateurs clairs
    const prompt = sections.join('\n---\n\n');
    
    // Journalisation en sortie de fonction pour validation du succès
    console.log(`[info] Prompt d'extraction construit : ${prompt.length} caractères`);
    
    return prompt;
  } catch (error) {
    // Message contextualisé pour identifier facilement la fonction
    console.error(`Erreur lors de la construction du prompt d'extraction: ${error.message}`);
    throw error; // Propagation simple avec préservation de la stack trace
  }
}

/**
 * Recompose l'artefact final en fusionnant les résultats partiels par bloc
 * @param {Array<{jsonPointer: string, data: object}>} partialResults - Résultats partiels de l'extraction par bloc
 * @param {object} resolvedSchema - Schéma résolu pour validation
 * @param {object} config - Configuration complète
 * @param {string} baseUrl - URL de base
 * @returns {object} - Artefact final recomposé
 */
function recomposeArtifact(partialResults, resolvedSchema, config, baseUrl) {
  // Journalisation en entrée de fonction pour traçabilité
  console.log(`[info] Recomposition de l'artefact final depuis ${partialResults?.length || 0} résultat(s) partiel(s)`);
  
  try {
    // Validation paramètres
    if (!partialResults || !Array.isArray(partialResults)) {
      throw new Error('Invalid partialResults: partialResults must be an array. Script stopped.');
    }
    
    if (partialResults.length === 0) {
      throw new Error('partialResults is empty. No extraction results to recompose. Script stopped.');
    }
    
    // Initialiser artefact vide avec structure de base
    const extractionSource = config?.extractionSource || {};
    const artifact = {
      config: {
        extractionSource: extractionSource
      },
      method: {},
      concepts: {},
      metadata: {}
    };
    
    // Fusionner chaque résultat partiel selon jsonPointer
    for (const partialResult of partialResults) {
      const { jsonPointer, data } = partialResult;
      
      if (!jsonPointer || typeof jsonPointer !== 'string') {
        throw new Error(`Invalid jsonPointer in partial result: ${jsonPointer}. Script stopped.`);
      }
      
      if (!data || typeof data !== 'object') {
        throw new Error(`Invalid data in partial result for ${jsonPointer}. Script stopped.`);
      }
      
      // Cas principal : NuExtract retourne uniquement le bloc demandé (grâce aux instructions ajustées)
      // Fallback robuste : si data contient une structure complète (method/concepts), extraire la valeur au chemin jsonPointer
      
      let valueToMerge = data;
      
      // Détecter si data contient une structure complète (avec method/concepts) ou juste le bloc
      const hasCompleteStructure = data.method !== undefined || (data.concepts !== undefined && typeof data.concepts === 'object');
      
      if (hasCompleteStructure) {
        // Fallback : data contient la structure complète, extraire la valeur au chemin jsonPointer
        const segments = jsonPointer.replace(/^\/+/, '').split('/').filter(seg => seg !== '');
        let extractedValue = data;
        let extractionSuccess = true;
        
        // Naviguer dans data selon les segments du jsonPointer
        for (const segment of segments) {
          const arrayIndex = parseInt(segment, 10);
          if (!isNaN(arrayIndex) && Array.isArray(extractedValue)) {
            if (arrayIndex < 0 || arrayIndex >= extractedValue.length) {
              extractionSuccess = false;
              break;
            }
            extractedValue = extractedValue[arrayIndex];
          } else if (extractedValue && typeof extractedValue === 'object' && segment in extractedValue) {
            extractedValue = extractedValue[segment];
          } else {
            extractionSuccess = false;
            break;
          }
        }
        
        // Si l'extraction a réussi, utiliser la valeur extraite, sinon utiliser data tel quel
        if (extractionSuccess && extractedValue !== undefined) {
          valueToMerge = extractedValue;
        }
        // Sinon, valueToMerge reste = data (fusionner toute la structure)
      }
      // Sinon (cas principal), valueToMerge = data (bloc uniquement retourné par NuExtract)
      
      // Log de la valeur à fusionner pour debug
      console.log(`[debug] Valeur à fusionner pour ${jsonPointer} :`, JSON.stringify(valueToMerge, null, 2));
      
      // Fusionner la valeur dans l'artefact au chemin jsonPointer
      mergeJsonAtPath(artifact, jsonPointer, valueToMerge);
    }
    
    // Construire métadonnées (identique à l'actuel)
    const hermesVersion = config?.hermesVersion || '2022';
    const metadata = {
      extractionDate: new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
      extractionSource: extractionSource.baseUrl || baseUrl,
      extractionLanguage: extractionSource.language || 'en',
      schemaVersion: resolvedSchema.$schema || 'http://json-schema.org/draft-07/schema#',
      extractionMethod: 'NuExtract',
      extractionTool: 'hermes2022-concepts-site-extraction'
    };
    
    artifact.metadata = metadata;
    
    // Ajouter hermesVersion au niveau method si présent dans les résultats partiels
    // Chercher dans tous les résultats partiels pour trouver hermesVersion
    for (const partialResult of partialResults) {
      if (partialResult.data?.method?.hermesVersion) {
        artifact.method.hermesVersion = partialResult.data.method.hermesVersion;
        break;
      }
    }
    
    // Journalisation en sortie de fonction pour validation du succès
    console.log(`[info] Recomposition de l'artefact final terminée avec succès`);
    
    return artifact;
  } catch (error) {
    // Message contextualisé pour identifier facilement la fonction
    console.error(`Erreur lors de la recomposition de l'artefact: ${error.message}`);
    throw error; // Propagation simple avec préservation de la stack trace
  }
}

/**
 * Normalise les valeurs enum dans l'artefact selon le schéma
 * Force les valeurs définies dans items.enum du schéma pour les propriétés paramétriques (sourceUrl, extractionInstructions)
 * IMPORTANT: Parcourt les propriétés du SCHÉMA (pas de l'artefact) pour ajouter les propriétés paramétriques manquantes
 * @param {object} artifact - Artefact à normaliser (modifié en place)
 * @param {object} schema - Schéma résolu avec les enum de référence
 * @param {string} jsonPointer - Pointeur JSON courant (pour logs)
 */
function normalizeEnumValues(artifact, schema, jsonPointer = '') {
  if (!schema || !schema.properties) return;
  
  const schemaProps = schema.properties;
  
  // CORRECTION: Parcourir les propriétés du SCHÉMA (pas de l'artefact)
  // pour détecter et ajouter les propriétés paramétriques manquantes (sourceUrl, extractionInstructions)
  for (const key in schemaProps) {
    if (!schemaProps.hasOwnProperty(key)) continue;
    
    const schemaProp = schemaProps[key];
    const currentPointer = jsonPointer ? `${jsonPointer}/${key}` : `/${key}`;
    
    // Cas 1 : Array avec items.enum (sourceUrl, extractionInstructions)
    // Force l'array complet de toutes les valeurs items.enum (propriétés paramétriques)
    // AJOUTE la propriété si elle n'existe pas dans l'artefact (NuExtract ne retourne pas les propriétés paramétriques)
    if (schemaProp.type === 'array' && schemaProp.items?.enum && Array.isArray(schemaProp.items.enum)) {
      const expectedArray = schemaProp.items.enum; // Array complet des valeurs paramétriques
      console.log(`[debug] Normalisation items.enum pour ${currentPointer} : forcer ${JSON.stringify(expectedArray)}`);
      artifact[key] = expectedArray; // Force la valeur (ajoute si manquante, écrase si présente)
    }
    // Cas 2 : Objet imbriqué (récursion)
    // Si la propriété existe dans l'artefact ET est un objet, on descend récursivement
    else if (artifact[key] && typeof artifact[key] === 'object' && !Array.isArray(artifact[key]) && schemaProp.properties) {
      normalizeEnumValues(artifact[key], schemaProp, currentPointer);
    }
    // Cas 3 : Array d'objets (phases)
    // Si la propriété existe dans l'artefact ET est un array d'objets, on descend récursivement
    else if (artifact[key] && Array.isArray(artifact[key]) && schemaProp.items?.properties) {
      artifact[key].forEach((item, index) => {
        normalizeEnumValues(item, schemaProp.items, `${currentPointer}/${index}`);
      });
    }
  }
}

/**
 * Extrait les concepts HERMES2022 depuis les sources HTML via NuExtract
 * @param {object} resolvedSchema - Schéma JSON résolu (déjà déréférencé)
 * @param {object} config - Configuration complète avec nuextract, extractionSource, hermesVersion, etc.
 * @param {string} apiKey - Clé API NuExtract
 * @param {string} projectId - ID du projet NuExtract
 * @returns {Promise<object>} - Artefact JSON validé avec métadonnées enrichies
 */
async function extractHermes2022ConceptsWithNuExtract(resolvedSchema, config, apiKey, projectId) {
  // Journalisation en entrée de fonction pour traçabilité
  console.log(`[info] Extraction HERMES2022 concepts avec NuExtract pour projet ${projectId}`);
  
  try {
    // Récupérer maxDepth depuis config
    const maxDepth = config?.nuextract?.extractionBlocksMaxDepth || 10;
    
    // Récupérer baseUrl depuis extractionSource
    const baseUrl = config?.extractionSource?.baseUrl || 'https://www.hermes.admin.ch/en';
    
    // Phase 1 : Collecte des sources HTML et instructions
    // IMPORTANT: Utiliser le schéma résolu (AVANT génération du template) qui contient les extractionInstructions
    // Le template NuExtract généré ne contiendra pas les extractionInstructions (métadonnées d'extraction)
    // mais les enum du schéma seront transformés en format template par l'API NuExtract via le prompt
    // Si le schéma résolu a une structure JSON Schema standard avec properties au niveau racine,
    // passer directement resolvedSchema.properties pour éviter de parcourir les métadonnées ($schema, $id, etc.)
    const schemaToTraverse = resolvedSchema.properties ? resolvedSchema.properties : resolvedSchema;
    const preparation = await collectHtmlSourcesAndInstructions(
      schemaToTraverse,
      config,
      baseUrl,
      '/',
      0,
      maxDepth
    );
    
    // Phase 2 : Extraction par bloc via API NuExtract
    // Récupérer les paramètres pour l'appel API
    const hostname = config?.nuextract?.baseUrl || 'nuextract.ai';
    const port = config?.nuextract?.port || 443;
    const path = config?.nuextract?.['infer-textPath'] || '/api/projects/{projectId}/infer-text';
    const pathPrefix = config?.nuextract?.pathPrefix || null;
    const timeoutMs = 120000; // 120s pour gros contenus
    
    // Boucle sur chaque bloc pour extraction individuelle
    const partialResults = [];
    for (const block of preparation.blocks) {
      // Construire prompt pour ce bloc
      const blockPrompt = buildBlockPrompt(block);
      
      // Extraction NuExtract pour ce bloc
      const partialJson = await nuextractApi.inferTextFromContent(
        hostname,
        port,
        path,
        pathPrefix,
        projectId,
        apiKey,
        blockPrompt,
        timeoutMs
      );
      
      // Log de la réponse brute de l'API NuExtract pour debug
      console.log(`[debug] Réponse API NuExtract pour bloc ${block.jsonPointer} - Type:`, typeof partialJson, '- Est objet:', typeof partialJson === 'object', '- Clés:', partialJson ? Object.keys(partialJson).slice(0, 10) : 'null');
      
      // Stocker résultat partiel avec son jsonPointer
      partialResults.push({ jsonPointer: block.jsonPointer, data: partialJson });
    }
    
    // Phase 3 : Recomposition de l'artefact final
    const artifact = recomposeArtifact(partialResults, resolvedSchema, config, baseUrl);
    
    // Normaliser les valeurs enum depuis le schéma (forcer sourceUrl, extractionInstructions selon concept enum paramétrique)
    console.log(`[info] Normalisation des valeurs enum depuis le schéma`);
    normalizeEnumValues(artifact, resolvedSchema);
    
    // Phase 4 : Validation avec Ajv (schéma résolu)
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    
    const validate = ajv.compile(resolvedSchema);
    const isValid = validate(artifact);
    
    if (!isValid) {
      const errors = validate.errors?.map(err => `${err.instancePath}: ${err.message}`).join(', ') || 'Unknown validation error';
      throw new Error(`Extracted JSON does not conform to schema: ${errors}. Script stopped.`);
    }
    
    // Journalisation en sortie de fonction pour validation du succès
    console.log(`[info] Extraction HERMES2022 concepts terminée avec succès pour projet ${projectId}`);
    
    return artifact;
  } catch (error) {
    // Message contextualisé pour identifier facilement la fonction
    console.error(`Erreur lors de l'extraction HERMES2022 concepts: ${error.message}`);
    throw error; // Propagation simple avec préservation de la stack trace
  }
}

/**
 * Sauvegarde l'artefact JSON et initialise le fichier d'approbation associé
 * @param {object} config - Configuration complète
 * @param {object} artifact - Artefact JSON à persister
 * @param {Date} [now=new Date()] - Date de référence (injectable pour les tests)
 * @returns {{ artifactPath: string, approvalPath: string }} - Chemins des fichiers créés
 */
async function saveArtifact(config, artifact, now = new Date()) {
  // Journalisation en entrée de fonction pour traçabilité
  console.log('[info] Sauvegarde de l\'artefact et initialisation du fichier d\'approbation');

  try {
    if (!artifact || typeof artifact !== 'object') {
      throw new Error('Invalid artifact: artifact must be a non-null object. Script stopped.');
    }

    const artifactBaseDir = process.env.HERMES2022_CONCEPTS_ARTIFACT_DIR
      || config?.artifactBaseDirectory
      || 'shared/hermes2022-extraction-files/data';
    const artifactDir = resolveFromRepoRoot(artifactBaseDir);

    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }

    const extractionDate = now.toISOString().split('T')[0];
    const artifactFileName = `hermes2022-concepts-${extractionDate}.json`;
    const artifactPath = path.join(artifactDir, artifactFileName);

    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), 'utf8');
    console.log(`[info] Artefact sauvegardé dans ${artifactPath}`);

    const approvalFileName = `hermes2022-concepts-${extractionDate}.approval.json`;
    const approvalPath = path.join(artifactDir, approvalFileName);
    const approvalPayload = {
      artifact: artifactFileName,
      approvals: [
        {
          target: '/concepts/overview',
          rule: 'overview-quality',
          status: 'pending',
          lastChecked: extractionDate
        }
      ]
    };

    fs.writeFileSync(approvalPath, JSON.stringify(approvalPayload, null, 2), 'utf8');
    console.log(`[info] Fichier d'approbation initialisé dans ${approvalPath}`);

    return { artifactPath, approvalPath };
  } catch (error) {
    console.error(`Erreur lors de la sauvegarde de l'artefact: ${error.message}`);
    throw error; // Propagation simple avec préservation de la stack trace
  }
}

// Point d'entrée du script qui exécute les fonctions séquentiellement
async function main() {
  console.log('[info] Démarrage du workflow principal hermes2022-concepts-site-extraction');
  try {
    const config = await loadGlobalConfig();
    const apiKey = await loadApiKey(config);
    
    // Résoudre le schéma une fois après apiKey
    const resolvedJsonSchema = await loadAndResolveSchemas(config);
    
    // Générer le template avec le schéma résolu
    const template = await generateTemplate(config, apiKey, resolvedJsonSchema);
    
    // Gestion du projet NuExtract (résout tous les paramètres depuis config en interne)
    const projectResult = await findOrCreateProject(config, apiKey, template);
    
    // Appel extraction HERMES2022 concepts avec NuExtract (utilise le schéma déjà résolu)
    const artifact = await extractHermes2022ConceptsWithNuExtract(
      resolvedJsonSchema,
      config,
      apiKey,
      projectResult.id
    );
    await saveArtifact(config, artifact);

    console.log('Extraction terminée avec succès');
  } catch (error) {
    console.error('Extraction a échoué:', error.message);
    process.exit(1);
  }
}

// N'exécuter main() que si le script est lancé directement, pas lors des imports pour tests
if (require.main === module) {
  main();
}

// Exports pour tests uniquement (logique métier)
module.exports = {
  _testOnly_loadGlobalConfig: loadGlobalConfig,
  _testOnly_loadApiKey: loadApiKey,
  _testOnly_loadInstructions: loadInstructions,
  _testOnly_loadAndResolveSchemas: loadAndResolveSchemas,
  _testOnly_generateTemplate: generateTemplate,
  _testOnly_findOrCreateProject: findOrCreateProject,
  _testOnly_fetchHtmlContent: fetchHtmlContent,
  _testOnly_collectHtmlSourcesAndInstructions: collectHtmlSourcesAndInstructions,
  _testOnly_buildExtractionPrompt: buildExtractionPrompt,
  _testOnly_buildBlockPrompt: buildBlockPrompt,
  _testOnly_recomposeArtifact: recomposeArtifact,
  _testOnly_mergeJsonAtPath: mergeJsonAtPath,
  _testOnly_extractHermes2022ConceptsWithNuExtract: extractHermes2022ConceptsWithNuExtract,
  _testOnly_saveArtifact: saveArtifact
};