// nuextract-client.js - Script JavaScript pour extraire le HTML et exécuter les APIs NuExtract
// Basé sur extraction-config.schema.json (configuration technique NuExtract) et les schémas JSON de hermes2022-concepts.json et sous-jacents ($ref)

const fs = require('fs');
const https = require('https');
const path = require('path');
const jwt = require('jsonwebtoken');
const { resolveFromRepoRoot } = require('./path-resolver.js');
const nuextractApi = require('./nuextract-api.js');
const $RefParser = require('@apidevtools/json-schema-ref-parser');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// Variables globales pour compatibilité avec l'exécution séquentielle de main()
let TEMPLATE = null;
let PROJECT_ID = null;

// Fonction helper pour transformer schéma JSON Schema en objet config JSON
function transformSchemaToConfig(schema) {
  function extractValueFromProperty(property) {
    // Pour propriété simple avec enum : utiliser enum[0]
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
    const config = transformSchemaToConfig(schema);
    
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
  return JSON.stringify(resolvedSchema, null, 2);
}

// Générer un template via /api/infer-template (sync) ou /api/infer-template-async (async)
async function generateTemplate(config, apiKey) {
  try {
    const instructions = await loadInstructions(config);
    const mainSchema = await loadAndResolveSchemas(config);
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
    
    let template;
    
    if (templateMode === 'async') {
      // Mode async
      const pathAsync = config?.nuextract?.['infer-templateAsyncPath'] || '/api/infer-template-async';
      const pathJobs = '/api/jobs';
      
      console.log(`Mode async: Lancement génération template asynchrone (timeout API: 60s, sleep initial: ${templateGenerationDuration}ms)...`);
      
      // Appel API avec tous les paramètres explicites
      const asyncResponse = await nuextractApi.inferTemplateFromDescriptionAsync(
        hostname, port, pathAsync, apiKey, description, 60
      );
      
      const jobId = asyncResponse.jobId;
      
      if (!jobId) {
        throw new Error('Pas de jobId reçu de l\'API async');
      }
      
      console.log(`Job lancé avec ID: ${jobId}`);
      
      // Polling avec tous les paramètres explicites
      const templateData = await nuextractApi.pollJobUntilComplete(
        hostname, port, pathJobs, apiKey, jobId, 20, 3000, templateGenerationDuration
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
        hostname, port, pathSync, apiKey, description, syncTimeout
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
async function findOrCreateProject(apiKey, projectName, projectDescription, templateObj, templateReset, hostname, port, pathProjects) {
  
  console.log(`[info] Gestion du projet NuExtract avec les paramètres : projectName=${projectName}, projectDescription=${projectDescription}, templateObj=${templateObj}, templateReset=${templateReset}, hostname=${hostname}, port=${port}, pathProjects=${pathProjects}`);
  
  try {
    // Validation projectName
    if (!projectName || typeof projectName !== 'string' || projectName.trim() === '') {
      throw new Error('Missing required valid parameter: projectName. Script stopped.');
    }

    console.log(`[info] Recherche du projet ${projectName} sur la plateforme NuExtract`);

    // Appel API avec tous les paramètres explicites
    const projects = await nuextractApi.getNuExtractProjects(hostname, port, pathProjects, apiKey);
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
        hostname, port, pathProjects, apiKey, {
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
        await nuextractApi.putProjectTemplate(hostname, port, pathProjects, apiKey, existingProject.id, templateObj);
        console.log(`[info] Template mis à jour pour le projet ${projectName} (id: ${existingProject.id})`);
        return { id: existingProject.id, name: projectName, updated: true };
      } else {
        // Réutilisation du projet existant sans modification
        console.log(`Projet ${projectName} trouvé, réutilisation sans modification`);
        return { id: existingProject.id, name: projectName, existing: true };
      }
    }
  } catch (error) {
    console.error(`Erreur lors de la gestion du projet NuExtract: ${error.message}`);
    throw error;
  }
}

// Point d'entrée du script qui exécute les fonctions séquentiellement
async function main() {
  try {
    const config = await loadGlobalConfig();
    const apiKey = await loadApiKey(config);
    const template = await generateTemplate(config, apiKey);
    
    // Récupérer les paramètres pour findOrCreateProject avec fallbacks
    const templateReset = config?.nuextract?.templateReset ?? false;
    const projectName = config?.nuextract?.projectName || 'HERMES2022';
    const projectDescription = config?.nuextract?.projectDescription || 'Project for HERMES2022 concepts extraction';
    
    // Extraire les valeurs de configuration pour les appels API (Dependency Injection)
    const hostname = config?.nuextract?.baseUrl || 'nuextract.ai';
    const port = config?.nuextract?.port || 443;
    const pathProjects = config?.nuextract?.projectsPath || '/api/projects';
    
    // Appel avec valeurs concrètes injectées (pas de config !)
    const projectResult = await findOrCreateProject(
      apiKey, 
      projectName, 
      projectDescription, 
      template,
      templateReset,
      hostname,   // Valeur concrète
      port,       // Valeur concrète
      pathProjects // Valeur concrète
    );
    
    // Affecter aux variables globales pour compatibilité
    TEMPLATE = template;
    PROJECT_ID = projectResult;
    
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
  _testOnly_findOrCreateProject: findOrCreateProject
};