// nuextract-client.js - Script JavaScript pour extraire le HTML et exécuter les APIs NuExtract
// Basé sur extraction-config.schema.json (configuration technique NuExtract) et les schémas JSON de hermes2022-concepts.json et sous-jacents ($ref)

const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
const { URL } = require('url');
const { resolveFromRepoRoot } = require('./path-resolver.js');
const nuextractApi = require('./nuextract-api.js');
const $RefParser = require('@apidevtools/json-schema-ref-parser');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

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
        
        console.log(`[info] Vérification de la conformité du template existant avec le JSON schema`);
        
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
 * Collecte récursivement les sources HTML et instructions depuis un schéma résolu
 * @param {object} resolvedSchema - Schéma JSON résolu (déjà déréférencé)
 * @param {object} config - Configuration avec baseUrl et extractionBlocksMaxDepth
 * @param {string} baseUrl - URL de base pour construire les URLs complètes (ex: "https://www.hermes.admin.ch/en")
 * @param {string} jsonPointer - JSON Pointer actuel pour traçabilité (défaut: "/")
 * @param {number} depth - Profondeur actuelle de récursivité (défaut: 0)
 * @param {number} maxDepth - Profondeur maximale autorisée (défaut: 10)
 * @returns {Promise<{blocks: Array<{jsonPointer: string, instructions: Array<string>, htmlContents: Array<{url: string, content: string}>}>}>} - Préparation avec blocs collectés
 */
async function collectHtmlSourcesAndInstructions(resolvedSchema, config, baseUrl, jsonPointer = '/', depth = 0, maxDepth = 10) {
  // Journalisation en entrée de fonction pour traçabilité
  console.log(`[info] Collecte HTML sources et instructions depuis ${jsonPointer} (profondeur ${depth}/${maxDepth})`);
  
  try {
    // Validation schéma résolu
    if (!resolvedSchema || typeof resolvedSchema !== 'object' || Array.isArray(resolvedSchema)) {
      throw new Error(`Invalid resolved schema: schema must be a non-null object. Current JSON Pointer: ${jsonPointer}. Script stopped.`);
    }
    
    // Garde-fou profondeur
    if (depth >= maxDepth) {
      throw new Error(`Maximum recursion depth (${maxDepth}) reached at JSON Pointer: ${jsonPointer}. Script stopped.`);
    }
    
    const blocks = [];
    
    // Parcourir récursivement les propriétés du schéma
    for (const [key, value] of Object.entries(resolvedSchema)) {
      const currentPointer = jsonPointer === '/' ? `/${key}` : `${jsonPointer}/${key}`;
      
      // Si la valeur est un objet avec properties.sourceUrl, c'est un bloc extractible
      if (value && typeof value === 'object' && !Array.isArray(value) && value.properties) {
        const sourceUrlProp = value.properties.sourceUrl;
        const extractionInstructionsProp = value.properties.extractionInstructions;
        
        // Détecter bloc avec sourceUrl
        if (sourceUrlProp) {
          // Validation extractionInstructions obligatoire
          if (!extractionInstructionsProp) {
            throw new Error(`extractionInstructions is required for block with sourceUrl at JSON Pointer: ${currentPointer}. Script stopped.`);
          }
          
          if (extractionInstructionsProp.type !== 'array') {
            throw new Error(`extractionInstructions must be an array at JSON Pointer: ${currentPointer}. Script stopped.`);
          }
          
          if (!extractionInstructionsProp.items || !extractionInstructionsProp.items.enum) {
            throw new Error(`extractionInstructions.items.enum is required at JSON Pointer: ${currentPointer}. Script stopped.`);
          }
          
          if (!Array.isArray(extractionInstructionsProp.items.enum) || extractionInstructionsProp.items.enum.length === 0) {
            throw new Error(`extractionInstructions array is empty at JSON Pointer: ${currentPointer}. Script stopped.`);
          }
          
          // Extraire instructions depuis items.enum
          const instructions = extractionInstructionsProp.items.enum;
          
          // Extraire URLs depuis sourceUrl (peut être enum ou string)
          let sourceUrls = [];
          if (sourceUrlProp.enum && Array.isArray(sourceUrlProp.enum)) {
            // Enum : plusieurs URLs
            sourceUrls = sourceUrlProp.enum;
          } else if (typeof sourceUrlProp.default === 'string') {
            // String unique avec default
            sourceUrls = [sourceUrlProp.default];
          } else if (sourceUrlProp.enum && sourceUrlProp.enum.length > 0) {
            // Enum simple (premier élément)
            sourceUrls = [sourceUrlProp.enum[0]];
          } else {
            throw new Error(`Invalid sourceUrl at JSON Pointer: ${currentPointer}. Must have enum or default. Script stopped.`);
          }
          
          // Charger HTML pour chaque URL
          const htmlContents = [];
          for (const sourceUrl of sourceUrls) {
            // Construire URL complète
            const fullUrl = sourceUrl.startsWith('http') ? sourceUrl : `${baseUrl}${sourceUrl.startsWith('/') ? '' : '/'}${sourceUrl}`;
            
            try {
              const htmlContent = await fetchHtmlContent(fullUrl);
              htmlContents.push({ url: fullUrl, content: htmlContent });
            } catch (error) {
              // Propager erreur avec contexte
              throw new Error(`Error loading HTML from ${fullUrl} at JSON Pointer: ${currentPointer}. Script stopped.`, { cause: error });
            }
          }
          
          // Ajouter bloc collecté
          blocks.push({
            jsonPointer: currentPointer,
            instructions,
            htmlContents
          });
        }
        
        // Récurrence sur les sous-propriétés
        const nestedResult = await collectHtmlSourcesAndInstructions(
          value.properties,
          config,
          baseUrl,
          currentPointer,
          depth + 1,
          maxDepth
        );
        blocks.push(...nestedResult.blocks);
      }
      
      // Si la valeur est un array avec items.properties, traiter comme bloc extractible
      if (value && typeof value === 'object' && value.type === 'array' && value.items && value.items.properties) {
        const itemsProps = value.items.properties;
        const sourceUrlProp = itemsProps.sourceUrl;
        const extractionInstructionsProp = itemsProps.extractionInstructions;
        
        // Si items.properties a sourceUrl, c'est un bloc extractible (ex: phases)
        if (sourceUrlProp) {
          // Validation extractionInstructions obligatoire
          if (!extractionInstructionsProp) {
            throw new Error(`extractionInstructions is required for array items with sourceUrl at JSON Pointer: ${currentPointer}. Script stopped.`);
          }
          
          if (extractionInstructionsProp.type !== 'array') {
            throw new Error(`extractionInstructions must be an array at JSON Pointer: ${currentPointer}. Script stopped.`);
          }
          
          if (!extractionInstructionsProp.items || !extractionInstructionsProp.items.enum) {
            throw new Error(`extractionInstructions.items.enum is required at JSON Pointer: ${currentPointer}. Script stopped.`);
          }
          
          if (!Array.isArray(extractionInstructionsProp.items.enum) || extractionInstructionsProp.items.enum.length === 0) {
            throw new Error(`extractionInstructions array is empty at JSON Pointer: ${currentPointer}. Script stopped.`);
          }
          
          // Extraire instructions communes depuis items.enum
          const instructions = extractionInstructionsProp.items.enum;
          
          // Extraire URLs depuis sourceUrl (enum avec plusieurs URLs pour phases)
          let sourceUrls = [];
          if (sourceUrlProp.enum && Array.isArray(sourceUrlProp.enum)) {
            // Enum : plusieurs URLs (cas phases : chaque URL utilise les mêmes instructions)
            sourceUrls = sourceUrlProp.enum;
          } else if (typeof sourceUrlProp.default === 'string') {
            // String unique avec default
            sourceUrls = [sourceUrlProp.default];
          } else {
            throw new Error(`Invalid sourceUrl for array items at JSON Pointer: ${currentPointer}. Must have enum or default. Script stopped.`);
          }
          
          // Charger HTML pour chaque URL avec les instructions communes
          const htmlContents = [];
          for (const sourceUrl of sourceUrls) {
            // Construire URL complète
            const fullUrl = sourceUrl.startsWith('http') ? sourceUrl : `${baseUrl}${sourceUrl.startsWith('/') ? '' : '/'}${sourceUrl}`;
            
            try {
              const htmlContent = await fetchHtmlContent(fullUrl);
              htmlContents.push({ url: fullUrl, content: htmlContent });
            } catch (error) {
              // Propager erreur avec contexte
              throw new Error(`Error loading HTML from ${fullUrl} at JSON Pointer: ${currentPointer}. Script stopped.`, { cause: error });
            }
          }
          
          // Ajouter bloc collecté (une seule fois avec toutes les URLs)
          blocks.push({
            jsonPointer: currentPointer,
            instructions,
            htmlContents
          });
        }
        
        // Récurrence sur les autres propriétés des items (sans sourceUrl)
        // Exclure sourceUrl et extractionInstructions pour éviter duplication
        const otherItemsProps = { ...itemsProps };
        delete otherItemsProps.sourceUrl;
        delete otherItemsProps.extractionInstructions;
        
        if (Object.keys(otherItemsProps).length > 0) {
          const nestedResult = await collectHtmlSourcesAndInstructions(
            otherItemsProps,
            config,
            baseUrl,
            currentPointer,
            depth + 1,
            maxDepth
          );
          blocks.push(...nestedResult.blocks);
        }
      }
    }
    
    // Journalisation en sortie de fonction pour validation du succès
    console.log(`[info] Collecte terminée depuis ${jsonPointer} : ${blocks.length} bloc(s) trouvé(s)`);
    
    return { blocks };
  } catch (error) {
    // Message contextualisé pour identifier facilement la fonction
    console.error(`Erreur lors de la collecte HTML sources et instructions: ${error.message}`);
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
    const preparation = await collectHtmlSourcesAndInstructions(
      resolvedSchema,
      config,
      baseUrl,
      '/',
      0,
      maxDepth
    );
    
    // Phase 2 : Construction du prompt agrégé
    const aggregatedPrompt = buildExtractionPrompt(preparation);
    
    // Phase 3 : Extraction via API NuExtract
    // Récupérer les paramètres pour l'appel API
    const hostname = config?.nuextract?.baseUrl || 'nuextract.ai';
    const port = config?.nuextract?.port || 443;
    const path = config?.nuextract?.['infer-textPath'] || '/api/projects/{projectId}/infer-text';
    const pathPrefix = config?.nuextract?.pathPrefix || null;
    const timeoutMs = 120000; // 120s pour gros contenus
    
    // Appel API NuExtract avec prompt agrégé
    const extractedJson = await nuextractApi.inferTextFromContent(
      hostname,
      port,
      path,
      pathPrefix,
      projectId,
      apiKey,
      aggregatedPrompt,
      timeoutMs
    );
    
    // Phase 4 : Validation avec Ajv (schéma résolu)
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    
    const validate = ajv.compile(resolvedSchema);
    const isValid = validate(extractedJson);
    
    if (!isValid) {
      const errors = validate.errors?.map(err => `${err.instancePath}: ${err.message}`).join(', ') || 'Unknown validation error';
      throw new Error(`Extracted JSON does not conform to schema: ${errors}. Script stopped.`);
    }
    
    // Phase 5 : Enrichir avec métadonnées
    const hermesVersion = config?.hermesVersion || '2022';
    const extractionSource = config?.extractionSource || {};
    const metadata = {
      extractionDate: new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
      extractionSource: extractionSource.baseUrl || baseUrl,
      extractionLanguage: extractionSource.language || 'en',
      schemaVersion: resolvedSchema.$schema || 'http://json-schema.org/draft-07/schema#',
      extractionMethod: 'NuExtract',
      extractionTool: 'hermes2022-concepts-site-extraction'
    };
    
    // Construire artefact final avec structure conforme au schéma
    const artifact = {
      config: {
        extractionSource: extractionSource
      },
      method: extractedJson.method || {},
      concepts: extractedJson.concepts || {},
      metadata: metadata
    };
    
    // Ajouter hermesVersion au niveau racine si présent dans extractedJson
    if (extractedJson.method?.hermesVersion) {
      artifact.method.hermesVersion = extractedJson.method.hermesVersion;
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
 * Charge le contenu HTML depuis une URL
 * @param {string} url - URL complète de la page HTML à charger
 * @param {number} timeoutMs - Timeout en millisecondes (défaut: 30000)
 * @returns {Promise<string>} - Contenu HTML de la page
 */
async function fetchHtmlContent(url, timeoutMs = 30000) {
  // Journalisation en entrée de fonction pour traçabilité
  console.log(`[info] Chargement du contenu HTML depuis ${url}`);
  
  try {
    // Parser l'URL pour extraire protocole, hostname, port et path
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (err) {
      throw new Error(`Invalid URL: ${url}. Script stopped.`, { cause: err });
    }
    
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const hostname = parsedUrl.hostname;
    const port = parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80);
    const path = parsedUrl.pathname + parsedUrl.search;
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        port,
        path,
        method: 'GET',
        headers: {
          'User-Agent': 'hermes2022-concepts-site-extraction/1.0'
        }
      };
      
      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            console.error(`Erreur HTTP ${res.statusCode} lors du chargement de ${url}`);
            reject(new Error(`HTTP error: ${res.statusCode} - ${data.substring(0, 200)}. Script stopped.`, { cause: new Error(`Status ${res.statusCode}`) }));
            return;
          }
          resolve(data);
        });
      });
      
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        console.error(`Timeout lors du chargement de ${url} après ${timeoutMs}ms`);
        reject(new Error(`Timeout: La requête HTML a dépassé ${timeoutMs / 1000} secondes. Script stopped.`));
      });
      
      req.on('error', (err) => {
        console.error(`Erreur réseau lors du chargement de ${url}: ${err.message}`);
        reject(new Error(`Network error fetching HTML content from ${url}. Script stopped.`, { cause: err }));
      });
      
      req.end();
    });
  } catch (error) {
    // Message contextualisé pour identifier facilement la fonction
    console.error(`Erreur lors du chargement du contenu HTML: ${error.message}`);
    throw error; // Propagation simple avec préservation de la stack trace
  }
}

// Point d'entrée du script qui exécute les fonctions séquentiellement
async function main() {
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
    
    // Sauvegarder artefact dans artifactBaseDirectory
    const artifactBaseDir = process.env.HERMES2022_CONCEPTS_ARTIFACT_DIR || config?.artifactBaseDirectory || 'shared/hermes2022-extraction-files/data';
    const artifactDir = await resolveFromRepoRoot(artifactBaseDir);
    
    // Créer le répertoire s'il n'existe pas
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }
    
    // Générer nom de fichier avec date YYYY-MM-DD
    const extractionDate = new Date().toISOString().split('T')[0];
    const artifactFileName = `hermes2022-concepts-${extractionDate}.json`;
    const artifactPath = path.join(artifactDir, artifactFileName);
    
    // Sauvegarder artefact JSON
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), 'utf8');
    console.log(`[info] Artefact sauvegardé dans ${artifactPath}`);
    
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
  _testOnly_extractHermes2022ConceptsWithNuExtract: extractHermes2022ConceptsWithNuExtract
};