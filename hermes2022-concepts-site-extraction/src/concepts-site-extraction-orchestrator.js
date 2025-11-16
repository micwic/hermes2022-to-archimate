// concepts-site-extraction-orchestrator.js - Orchestrateur principal pour extraction hybride multi-LLM
// Orchestre l'extraction des concepts HERMES2022 en déléguant aux clients spécialisés (NuExtract, Claude, etc.)

const nuextractClient = require('./nuextract-client.js');
const claudeClient = require('./claude-client.js');
const htmlCollector = require('./html-collector-and-transformer.js');

// Reprendre de nuextract-client.js (snippet repoRoot)
const fs = require('fs');
const path = require('path');
const findUp = require('find-up');
const jwt = require('jsonwebtoken');
const $RefParser = require('@apidevtools/json-schema-ref-parser');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const fullFilePath = findUp.sync('package.json', { cwd: __dirname });
if (!fullFilePath) {
  throw new Error('Impossible de localiser la racine du repository');
}
const repoRoot = path.dirname(fullFilePath);
const resolveFromRepoRoot = (...segments) => path.resolve(repoRoot, ...segments);

// ============================================================================
// SECTION 1 : CONFIGURATION (reprises de nuextract-client.js)
// ============================================================================

async function loadGlobalConfig() {
  // Journalisation en entrée de fonction pour traçabilité (bonne pratique reconnue)
  console.log(`[info] Chargement de la configuration à partir du schéma JSON Schema`);
  
  try {
    // Fonction helper interne pour transformer le schéma JSON en objet config
    function transformJSONSchemaIntoJSONConfigFile(schema) {
      function extractValueFromProperty(property) {
        // Pour propriété simple avec enum : default prédomine, sinon enum[0]
        if (property.enum && property.type !== 'array') {
          return property.default !== undefined ? property.default : property.enum[0];
        }
        
        // Pour array avec items.enum : items.default prédomine, sinon items.enum (array complet)
        if (property.type === 'array' && property.items?.enum) {
          return property.items.default !== undefined ? property.items.default : property.items.enum;
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
        
        // Pour chaînes simples sans enum : default prédomine, sinon null
        if (property.type === 'string' && !property.enum) {
          return property.default !== undefined ? property.default : null;
        }
        
        // Pour boolean : default prédomine, sinon false
        if (property.type === 'boolean') {
          return property.default !== undefined ? property.default : false;
        }
        
        // Pour number : default prédomine, sinon null
        if (property.type === 'number') {
          return property.default !== undefined ? property.default : null;
        }
        
        // Par défaut : vérifier default avant de retourner null
        return property.default !== undefined ? property.default : null;
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
    
    console.log('[info] Configuration chargée avec succès depuis le schéma JSON Schema');
    return config;
  } catch (error) {
    console.error(`Erreur lors du chargement de la configuration: ${error.message}`);
    throw error;
  }
}

async function loadApiKeys(config) {
  // Journalisation en entrée de fonction pour traçabilité (bonne pratique reconnue)
  console.log(`[info] Chargement des clés API pour les LLM configurés`);
  
  const apiKeys = {};
  
  // Itérer sur les configurations LLM
  if (!config?.llm || typeof config.llm !== 'object') {
    throw new Error('Configuration LLM manquante ou invalide. Script stopped.');
  }
  
  for (const [llmName, llmConfig] of Object.entries(config.llm)) {
    if (!llmConfig || typeof llmConfig !== 'object' || !llmConfig.apiKeyFile) {
      continue; // Ignorer les LLM sans configuration apiKeyFile
    }
    
    console.log(`[info] Chargement de la clé API ${llmName} à partir de : ${llmConfig.apiKeyFile}`);
    
    let apiKey = null;
    
    // Priorité 1 : Variable d'environnement (format: {LLM_NAME}_API_KEY en majuscules)
    const envVarName = `${llmName.toUpperCase()}_API_KEY`;
    if (process.env[envVarName]) {
      apiKey = process.env[envVarName];
    } else {
      // Priorité 2 : Fichier depuis config
      const keyPath = resolveFromRepoRoot(llmConfig.apiKeyFile);
      try {
        apiKey = fs.readFileSync(keyPath, 'utf8');
      } catch (error) {
        console.error(`Impossible de lire la clé API ${llmName} (env ${envVarName} ou fichier ${keyPath}) : ${error.message}`);
        throw new Error(`${llmName} API_KEY is not set. Script stopped.`);
      }
    }
    
    // Trim unique sur la clé chargée
    apiKey = apiKey.trim();
    
    // Vérifier que la clé n'est pas vide après trim
    if (!apiKey || apiKey.length === 0) {
      throw new Error(`${llmName} API key is empty after trimming whitespace. Script stopped.`);
    }
    
    // Validation spécifique selon le LLM
    if (llmName === 'nuextract') {
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
        throw new Error('NuExtract API key format is invalid. Script stopped.', { cause: error });
      }
    }
    // Pour Claude et autres LLM : à définir le moment venu
    
    apiKeys[llmName] = apiKey;
    console.log(`[info] Clé API ${llmName} chargée avec succès`);
  }
  
  return apiKeys;
}

async function loadAndResolveSchemas(config) {
  // Journalisation en entrée de fonction pour traçabilité (bonne pratique reconnue)
  console.log(`[info] Chargement et résolution du schéma JSON`);
  
  const mainSchemaFileName = config?.llm?.nuextract?.mainJSONConfigurationFile || 'shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json';
  const mainSchemaFile = resolveFromRepoRoot(mainSchemaFileName);
  
  console.log(`[info] Schéma JSON à partir de : ${mainSchemaFile}`);
  
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
    
    // Valider que resolvedSchema est conforme à JSON Schema Draft-07
    const valid = ajv.validateSchema(resolvedSchema);
    
    if (!valid) {
      const errorMessages = ajv.errors.map(err => `${err.instancePath} ${err.message}`).join('; ');
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

// ============================================================================
// SECTION 2 : INITIALISATION PROJETS LLM
// ============================================================================

async function initializeLLMProjects(config, apiKeys, resolvedSchema) {
  console.log('[info] Initialisation des projets LLM configurés');
  
  const projects = {};
  
  // NuExtract : appeler initializeProject (cache _projectId en interne)
  if (apiKeys.nuextract) {
    await nuextractClient.initializeProject(config, apiKeys.nuextract, resolvedSchema);
    projects.nuextract = { validated: true };
  }
  
  // Claude : stub (non implémenté - validation à définir)
  if (apiKeys.claude) {
    console.log('[info] Claude détecté mais validation skippée (non implémenté)');
    projects.claude = { validated: false, stub: true };
  }
  
  console.log('[info] Projets LLM initialisés avec succès');
  return projects;
}

// ============================================================================
// SECTION 3 : Orchestration des extractions par les llms
// ============================================================================

async function extractHermes2022Concepts(config, resolvedSchema, apiKeys) {
  console.log('[info] Démarrage de l\'extraction HERMES2022 concepts');
  
  /**
   * Fonction helper interne : Détermine le modèle LLM à utiliser pour un bloc selon le schéma
   */
  function getExtractionModelForBlock(schema, jsonPointer) {
    // Parcourir schéma selon jsonPointer pour trouver extractionModel dans le bloc spécifique
    // Format jsonPointer : "/method", "/concepts", "/concepts/concept-phases", "/concepts/concept-phases/phases/0"
    const segments = jsonPointer.replace(/^\/+/, '').split('/').filter(seg => seg !== '');
    
    let current = schema.properties || schema;
    
    // Parcourir jusqu'au bloc spécifique
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Vérifier si segment est un index d'array
      const arrayIndex = parseInt(segment, 10);
      
      if (!isNaN(arrayIndex)) {
        // Segment est un index d'array
        // Si current a items, descendre dans items (schéma d'un élément de l'array)
        if (current && typeof current === 'object' && current.items) {
          current = current.items;
          // Ne pas continuer après items, on cherche extractionModel dans items.properties
          break;
        } else if (Array.isArray(current)) {
          // Cas improbable : current est déjà un array
          if (arrayIndex < 0 || arrayIndex >= current.length) {
            return null;
          }
          current = current[arrayIndex];
        } else {
          return null;
        }
      } else if (current && typeof current === 'object' && current.properties) {
        // Objet avec properties
        if (current.properties[segment]) {
          current = current.properties[segment];
        } else {
          return null;
        }
      } else if (current && typeof current === 'object' && current.items) {
        // Array avec items - descendre dans items pour le prochain segment
        current = current.items;
      } else {
        return null;
      }
    }
    
    // Maintenant current pointe vers le schéma du bloc spécifique
    // Chercher extractionModel dans ce bloc
    if (current && current.properties && current.properties.extractionModel) {
      const extractionModel = current.properties.extractionModel;
      if (extractionModel.enum && extractionModel.enum.length > 0) {
        return extractionModel.enum[0]; // enum[0] = valeur par défaut (nuextract)
      }
    }
    
    // Si pas trouvé, retourner null (fallback 'nuextract' dans extractBlockWithModel)
    return null;
  }
  
  /**
   * Fonction helper interne : Extrait le schéma d'un bloc selon son JSON Pointer
   */
  function getBlockSchema(schema, jsonPointer) {
    // Parcourir schéma selon jsonPointer pour extraire le schéma du bloc
    // Pour les arrays (ex: /concepts/concept-phases/phases/0), retourner items (schéma d'un élément)
    const segments = jsonPointer.replace(/^\/+/, '').split('/').filter(seg => seg !== '');
    
    let current = schema.properties || schema;
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Vérifier si segment est un index d'array
      const arrayIndex = parseInt(segment, 10);
      
      if (!isNaN(arrayIndex)) {
        // Segment est un index d'array
        // Si current a items, retourner items (schéma d'un élément de l'array)
        if (current && typeof current === 'object' && current.items) {
          current = current.items;
          // Ne pas continuer après items, on a le schéma de l'élément
          break;
        } else if (Array.isArray(current)) {
          // Cas improbable : current est déjà un array (ne devrait pas arriver dans un schéma)
          if (arrayIndex < 0 || arrayIndex >= current.length) {
            throw new Error(`Array index out of bounds: ${arrayIndex} at path ${jsonPointer}. Script stopped.`);
          }
          current = current[arrayIndex];
        } else {
          throw new Error(`Invalid schema structure: expected array items at path ${jsonPointer}. Script stopped.`);
        }
      } else if (current && typeof current === 'object' && current.properties) {
        // Objet avec properties
        if (current.properties[segment]) {
          current = current.properties[segment];
        } else {
          throw new Error(`Property "${segment}" not found in schema at path ${jsonPointer}. Script stopped.`);
        }
      } else if (current && typeof current === 'object' && current.items) {
        // Array avec items - descendre dans items pour le prochain segment
        current = current.items;
      } else if (current && typeof current === 'object') {
        // Objet simple (sans properties ni items) - accès direct à la propriété
        if (current[segment]) {
          current = current[segment];
        } else {
          throw new Error(`Property "${segment}" not found in schema at path ${jsonPointer}. Script stopped.`);
        }
      } else {
        throw new Error(`Invalid schema structure at path ${jsonPointer}. Script stopped.`);
      }
    }
    
    return current;
  }
  
  /**
   * Fonction helper interne : Extrait un bloc avec le modèle LLM approprié
   */
  async function extractBlockWithModel(block, model, config, apiKeys) {
    // Journalisation en entrée de fonction pour traçabilité (bonne pratique reconnue)
    console.log(`[info] Extraction du bloc ${block.jsonPointer} avec le modèle ${model}`);
    
    switch (model) {
      case 'nuextract':
        // APPELER extractSingleBlock (pas de projectId, géré en interne)
        return await nuextractClient.extractSingleBlock(block, config, apiKeys.nuextract);
        
      case 'claude':
        return await claudeClient.extractBlock(block, config, apiKeys.claude);
        
      default:
        throw new Error(`Modèle LLM non supporté: ${model}. Script stopped.`);
    }
  }
  
  /**
   * Fonction helper interne : Recompose l'artefact final en fusionnant les résultats partiels par bloc
   */
  function recomposeArtifact(partialResults, resolvedSchema, config, baseUrl) {
    // Journalisation en entrée de fonction pour traçabilité (bonne pratique reconnue)
    console.log(`[info] Recomposition de l'artefact final depuis ${partialResults?.length || 0} résultat(s) partiel(s)`);
    
    /**
     * Fonction helper interne : Fusionne récursivement une valeur dans un objet cible au chemin spécifié (JSON Pointer)
     */
    function mergeJsonAtPath(target, path, value) {
      console.log(`[info] Fusion de valeur au chemin ${path}`);
      
      try {
        // Parser le JSON Pointer
        const segments = path.replace(/^\/+/, '').split('/').filter(seg => seg !== '');
        
        // Parcourir récursivement les segments pour créer ou accéder aux objets intermédiaires
        let current = target;
        for (let i = 0; i < segments.length - 1; i++) {
          const segment = segments[i];
          
          // Vérifier si le segment est un index d'array (nombre)
          const arrayIndex = parseInt(segment, 10);
          if (!isNaN(arrayIndex) && Array.isArray(current)) {
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
            Object.assign(current[arrayIndex], value);
          } else {
            current[arrayIndex] = value;
          }
        } else {
          // Fusionner dans une propriété d'objet
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            if (!current[lastSegment] || typeof current[lastSegment] !== 'object' || Array.isArray(current[lastSegment])) {
              current[lastSegment] = {};
            }
            Object.assign(current[lastSegment], value);
          } else {
            current[lastSegment] = value;
          }
        }
        
        return target;
      } catch (error) {
        console.error(`Erreur lors de la fusion au chemin ${path}: ${error.message}`);
        throw error;
      }
    }
    
    try {
      // Initialiser artefact vide avec structure de base
      const extractionSource = config?.extractionSource || {};
      const artifact = {
        config: {
          extractionSource: extractionSource
        },
        method: {},
        concepts: {}
      };
      
      // Fusionner chaque résultat partiel selon jsonPointer
      for (const partialResult of partialResults) {
        const { jsonPointer, data } = partialResult;
        
        // Validation uniquement pour data (input externe API)
        // Accepter objets ET primitives (string, number, boolean) pour les feuilles du schéma
        if (data === null || data === undefined) {
          throw new Error(`Invalid data in partial result for ${jsonPointer}. Script stopped.`);
        }
        
        // Cas principal : LLM retourne uniquement le bloc demandé
        // Fallback robuste : si data contient une structure complète, extraire la valeur au chemin jsonPointer
        
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
        }
        
        // Fusionner la valeur dans l'artefact au chemin jsonPointer
        mergeJsonAtPath(artifact, jsonPointer, valueToMerge);
      }
      
      // Ajouter hermesVersion au niveau method si présent dans les résultats partiels
      for (const partialResult of partialResults) {
        if (partialResult.data?.method?.hermesVersion) {
          artifact.method.hermesVersion = partialResult.data.method.hermesVersion;
          break;
        }
      }
      
      console.log(`[info] Recomposition de l'artefact final terminée avec succès`);
      
      return artifact;
    } catch (error) {
      console.error(`Erreur lors de la recomposition de l'artefact: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Fonction helper interne récursive : Normalise les valeurs enum dans l'artefact selon le schéma
   */
  function normalizeEnumValues(artifact, schema, jsonPointer = '') {
    if (!schema || !schema.properties) return;
    
    const schemaProps = schema.properties;
    
    // Parcourir les propriétés du SCHÉMA (pas de l'artefact)
    for (const key in schemaProps) {
      if (!schemaProps.hasOwnProperty(key)) continue;
      
      const schemaProp = schemaProps[key];
      const currentPointer = jsonPointer ? `${jsonPointer}/${key}` : `/${key}`;
      
      // Cas 1 : String avec enum + default (extractionModel)
      if (schemaProp.type === 'string' && schemaProp.enum && schemaProp.default) {
        const expectedValue = schemaProp.default;
        console.log(`[debug] Normalisation enum pour ${currentPointer} : forcer "${expectedValue}"`);
        artifact[key] = expectedValue;
      }
      // Cas 2 : Array avec items.enum (sourceUrl, extractionInstructions)
      else if (schemaProp.type === 'array' && schemaProp.items?.enum && Array.isArray(schemaProp.items.enum)) {
        const expectedArray = schemaProp.items.enum;
        console.log(`[debug] Normalisation items.enum pour ${currentPointer} : forcer ${JSON.stringify(expectedArray)}`);
        artifact[key] = expectedArray;
      }
      // Cas 3 : Objet imbriqué (récursion)
      else if (artifact[key] && typeof artifact[key] === 'object' && !Array.isArray(artifact[key]) && schemaProp.properties) {
        normalizeEnumValues(artifact[key], schemaProp, currentPointer);
      }
      // Cas 4 : Array d'objets (phases)
      else if (artifact[key] && Array.isArray(artifact[key]) && schemaProp.items?.properties) {
        artifact[key].forEach((item, index) => {
          normalizeEnumValues(item, schemaProp.items, `${currentPointer}/${index}`);
        });
      }
    }
  }
  
  try {
    // Collecter blocs
    const baseUrl = config?.extractionSource?.baseUrl || 'https://www.hermes.admin.ch/en';
    const maxDepth = config?.llm?.nuextract?.extractionBlocksMaxDepth || 10;
    const schemaToTraverse = resolvedSchema.properties || resolvedSchema;
    
    const preparation = await htmlCollector.collectHtmlSourcesAndInstructions(
      schemaToTraverse, config, baseUrl, '/', 0, maxDepth
    );
    
    // Enrichir chaque bloc avec son schéma et extraire avec le bon LLM
    const partialResults = [];
    for (const block of preparation.blocks) {
      // Lire extractionModel depuis schéma résolu
      const model = getExtractionModelForBlock(resolvedSchema, block.jsonPointer) || 'nuextract';
      
      // Extraire schéma du bloc
      block.schema = getBlockSchema(resolvedSchema, block.jsonPointer);
      
      // Extraire bloc avec le bon LLM (pas de projects passé, projectId caché)
      const result = await extractBlockWithModel(block, model, config, apiKeys);
      partialResults.push(result);
    }
    
    // Recomposer
    const artifact = recomposeArtifact(partialResults, resolvedSchema, config, baseUrl);
    normalizeEnumValues(artifact, resolvedSchema);
    
    // Post-traitement : Générer des IDs conformes pour les phases
    console.log(`[info] Post-traitement : Génération des IDs phases conformes au pattern ph_abc123`);
    if (artifact.concepts?.['concept-phases']?.phases) {
      const crypto = require('crypto');
      for (const phase of artifact.concepts['concept-phases'].phases) {
        if (phase.id && !phase.id.match(/^ph_[a-z0-9]{6}$/)) {
          const hash = crypto.createHash('md5').update((phase.name || phase.id).toLowerCase()).digest('hex');
          const newId = `ph_${hash.substring(0, 6)}`;
          console.log(`[debug] Génération ID phase "${phase.name}": "${phase.id}" → "${newId}"`);
          phase.id = newId;
        }
      }
    }
    
    // Validation avec Ajv (schéma résolu)
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    
    const validate = ajv.compile(resolvedSchema);
    const isValid = validate(artifact);
    
    // Debug: Sauvegarder l'artefact même en cas d'échec de validation pour analyse
    if (!isValid) {
      const debugDir = resolveFromRepoRoot('hermes2022-concepts-site-extraction/__tests__/tmp-artifacts');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      const debugPath = path.join(debugDir, `artifact-debug-${Date.now()}.json`);
      fs.writeFileSync(debugPath, JSON.stringify(artifact, null, 2), 'utf8');
      console.log(`[debug] Artefact invalide sauvegardé pour analyse: ${debugPath}`);
      
      const errors = validate.errors?.map(err => `${err.instancePath}: ${err.message}`).join(', ') || 'Unknown validation error';
      throw new Error(`Extracted JSON does not conform to schema: ${errors}. Script stopped.`);
    }
    
    console.log(`[info] Extraction HERMES2022 concepts terminée avec succès`);
    
    return artifact;
  } catch (error) {
    console.error(`Erreur lors de l'extraction HERMES2022 concepts: ${error.message}`);
    throw error;
  }
}

async function saveArtifact(config, artifact, now = new Date()) {
  console.log('[info] Sauvegarde de l\'artefact et initialisation du fichier d\'approbation');

  try {
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
    throw error;
  }
}

// ============================================================================
// SECTION 4 : Orchestration principale (point d'entrée)
// ============================================================================

async function main() {
  // Journalisation en entrée de fonction pour traçabilité (bonne pratique reconnue)
  console.log('[info] Démarrage du workflow principal concepts-site-extraction-orchestrator');
  
  try {
    // Étape 1 : Chargement de la configuration globale depuis le schéma JSON
    console.log('[info] Étape 1/5 : Chargement de la configuration globale');
    const config = await loadGlobalConfig();
    
    // Étape 2 : Chargement et résolution du schéma JSON
    console.log('[info] Étape 2/5 : Chargement et résolution du schéma JSON');
    const resolvedSchema = await loadAndResolveSchemas(config);
    
    // Étape 3 : Chargement des clés API pour tous les LLM configurés
    console.log('[info] Étape 3/5 : Chargement des clés API');
    const apiKeys = await loadApiKeys(config);
    
    // Étape 4 : Initialisation des projets LLM
    console.log('[info] Étape 4/5 : Initialisation des projets LLM');
    const projects = await initializeLLMProjects(config, apiKeys, resolvedSchema);
    
    // Étape 5 : Extraction des concepts HERMES2022 avec orchestration multi-LLM
    console.log('[info] Étape 5/5 : Extraction des concepts HERMES2022');
    const artifact = await extractHermes2022Concepts(config, resolvedSchema, apiKeys);
    
    // Étape finale : Sauvegarde de l'artefact et du sidecar d'approbation
    console.log('[info] Sauvegarde de l\'artefact');
    const { artifactPath, approvalPath } = await saveArtifact(config, artifact);
    
    console.log(`[info] Extraction terminée avec succès`);
    console.log(`[info] Artefact sauvegardé : ${artifactPath}`);
    console.log(`[info] Sidecar d'approbation : ${approvalPath}`);
    
  } catch (error) {
    console.error(`[error] Extraction a échoué : ${error.message}`);
    if (error.cause) {
      console.error(`[error] Cause : ${error.cause.message}`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

// ============================================================================
// EXPORTS
// ============================================================================

// Exports normaux (interface publique de l'orchestrateur)
module.exports = {
  loadGlobalConfig,
  loadApiKeys,
  loadAndResolveSchemas,
  initializeLLMProjects,
  saveArtifact,
  extractHermes2022Concepts
  // Note: getExtractionModelForBlock, getBlockSchema, extractBlockWithModel, recomposeArtifact, normalizeEnumValues
  // sont des fonctions nested dans extractHermes2022Concepts selon @code-modularity-governance
};

