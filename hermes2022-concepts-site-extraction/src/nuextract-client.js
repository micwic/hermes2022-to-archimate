// nuextract-client.js - Script JavaScript pour extraire le HTML et exécuter les APIs NuExtract
// Basé sur les fichiers de configuration extraction-config.json extraction-*.md et les schémas JSON de hermes2022-concepts.json et sous-jacents ($ref)

const fs = require('fs');
const https = require('https');
const path = require('path');
const { resolveFromRepoRoot } = require('./path-resolver.js');

// Variable globale pour la configuration (chargée une seule fois au démarrage)
let GLOBAL_CONFIG = null;
let API_KEY = null;
let TEMPLATE = null;
let PROJECT_ID = null;

// Charger la configuration depuis le fichier
async function loadGlobalConfig() {
  const configPath = resolveFromRepoRoot('hermes2022-concepts-site-extraction/config/extraction-config.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('[info] Configuration chargée une seule fois au démarrage');
    return config;
  } catch (error) {
    console.error(`Erreur lors du chargement de la configuration : ${error.message}`);
    throw new Error('Configuration not found. Script stopped');
  }
};

// Lire la clé API depuis un fichier externe si elle n'est pas déjà dans l'environnement
async function loadApiKey(config) {
  const fromEnv = process.env.NUEXTRACT_API_KEY && process.env.NUEXTRACT_API_KEY.trim();
  if (fromEnv) {
    return fromEnv;
  }
  else {
    const keyFile = config?.nuextract?.apiKeyFile || 'hermes2022-concepts-site-extraction/config/nuextract-api-key.key';
    const keyPath = resolveFromRepoRoot(keyFile);
    try {
      const apiKey = fs.readFileSync(keyPath, 'utf8').trim();  // la clé API est lue depuis le fichier
      return apiKey;
    } catch (error) {
      console.error(`Impossible de lire la clé API NuExtract (env NUEXTRACT_API_KEY ou fichier ${keyPath}) : ${error.message}`);
      throw new Error('API_KEY is not set. Script stopped.');
    }
  }
};

// Dériver un template depuis une description textuelle
async function inferTemplateFromDescription(apiKey, description) {
  return new Promise((resolve, reject) => {
    // Utiliser la configuration avec fallbacks
    const hostname = GLOBAL_CONFIG?.nuextract?.baseUrl || 'nuextract.ai';
    const port = GLOBAL_CONFIG?.nuextract?.port || 443;
    const path = GLOBAL_CONFIG?.nuextract?.inferTemplatePath || '/api/infer-template';

    const options = {
      hostname: hostname,
      port: port,
      path: path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Erreur infer-template: ${res.statusCode} - ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Réponse JSON invalide: ${err.message}`));
        }
      });
    });
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête infer-template a dépassé 10 secondes'));
    });
    req.on('error', reject);
    req.write(JSON.stringify({ description }));
    req.end();
  });
}

// Fonction pour générer un template via /api/infer-template-async (version asynchrone)
async function inferTemplateFromDescriptionAsync(apiKey, description, timeout = 60) {
  return new Promise((resolve, reject) => {
    const hostname = GLOBAL_CONFIG?.nuextract?.baseUrl || 'nuextract.ai';
    const port = GLOBAL_CONFIG?.nuextract?.port || 443;
    const path = `/api/infer-template-async?timeout=${timeout}s`;
    
    const options = {
      hostname: hostname,
      port: port,
      path: path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Erreur infer-template-async: ${res.statusCode} - ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Réponse JSON invalide: ${err.message}`));
        }
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête infer-template-async a dépassé 10 secondes'));
    });
    req.on('error', reject);
    req.write(JSON.stringify({ description }));
    req.end();
  });
}

// Fonction pour obtenir le statut d'un job via /api/jobs/{jobId}
async function getJobStatus(apiKey, jobId) {
  return new Promise((resolve, reject) => {
    const hostname = GLOBAL_CONFIG?.nuextract?.baseUrl || 'nuextract.ai';
    const port = GLOBAL_CONFIG?.nuextract?.port || 443;
    const path = `/api/jobs/${jobId}`;
    
    const options = {
      hostname: hostname,
      port: port,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Erreur GET job: ${res.statusCode} - ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Réponse JSON invalide: ${err.message}`));
        }
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête GET job a dépassé 5 secondes'));
    });
    req.on('error', reject);
    req.end();
  });
}

// Fonction pour poller le statut d'un job jusqu'à completion
async function pollJobUntilComplete(apiKey, jobId, maxAttempts = 20, interval = 3000) {
  console.log(`Polling job ${jobId} - attente initiale de 30 secondes...`);
  await new Promise(resolve => setTimeout(resolve, 30000)); // Sleep initial 30s
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const jobResponse = await getJobStatus(apiKey, jobId);
    const status = jobResponse.status;
    
    console.log(`[${attempt}/${maxAttempts}] Statut: ${status}`);
    
    // Statuts terminaux
    if (status === 'completed' || status === 'timeout') {
      if (!jobResponse.outputData) {
        throw new Error(`Job ${status} mais pas de outputData`);
      }
      if (status === 'timeout') {
        console.warn('⚠️  Job terminé avec statut "timeout" mais outputData présent - traitement comme succès');
      }
      return jobResponse.outputData;
    }
    
    if (status === 'failed') {
      throw new Error(`Job failed: ${JSON.stringify(jobResponse)}`);
    }
    
    // Attendre avant la prochaine tentative
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  throw new Error(`Timeout polling après ${maxAttempts} tentatives`);
}

// Fonction pour résoudre récursivement les $ref dans un schéma JSON et les inclure dans le schéma principal
function resolveJSONSchemaRefs(schema, baseDir, visitedFiles = new Set()) {
  if (typeof schema !== 'object' || schema === null) {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map(item => resolveJSONSchemaRefs(item, baseDir, visitedFiles));
  }
  
  const resolved = { ...schema };
  
  // Traiter les $ref
  if (resolved.$ref) {
    const refPath = path.resolve(baseDir, resolved.$ref);
    if (visitedFiles.has(refPath)) {
      console.warn(`[warn] Référence circulaire détectée pour $ref ${resolved.$ref}, référence ignorée`);
      return resolved;
    }
    visitedFiles.add(refPath);
    try {
      const refContent = JSON.parse(fs.readFileSync(refPath, 'utf8'));
      const resolvedRef = resolveJSONSchemaRefs(refContent, baseDir, visitedFiles);
      delete resolved.$ref;
      return { ...resolved, ...resolvedRef };
    } catch (error) {
      console.warn(`[warn] Impossible de résoudre $ref ${resolved.$ref} : ${error.message}`);
      return resolved; // Retourner la référence non résolue si échec
    }
  }
  
  // Résoudre récursivement pour tous les objets
  for (const key in resolved) {
    resolved[key] = resolveJSONSchemaRefs(resolved[key], baseDir, visitedFiles);
  }
  
  return resolved;
}

  // Fonction pour lire les instructions de transformation du template
  // Extrait uniquement le contenu sous le heading ciblé pour éviter de polluer l'API
  function loadInstructions() {
    const instFile = GLOBAL_CONFIG?.nuextract?.templateTransformationInstructionFile || 'hermes2022-concepts-site-extraction/config/instructions-template-nuextract.md';
    const instPath = resolveFromRepoRoot(instFile);
    try {
      const fullContent = fs.readFileSync(instPath, 'utf8');
      
      // Extraire uniquement le contenu sous le heading ciblé
      const targetHeading = '## Instructions complémentaires pour /api/infer-template /api/infer-template-async de NuExtract';
      const lines = fullContent.split('\n');
      const startIdx = lines.findIndex(line => line.trim() === targetHeading);
      
      if (startIdx === -1) {
        console.warn(`⚠️  Heading "${targetHeading}" non trouvé, utilisation fichier complet`);
        return fullContent;
      }
      
      // Extraire du heading jusqu'au prochain heading de niveau 1 ou 2, ou fin de fichier
      const contentLines = [];
      for (let i = startIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        // Arrêter si on rencontre un autre heading de niveau 1 ou 2
        if (line.match(/^#{1,2}\s+/)) break;
        contentLines.push(line);
      }
      
      return contentLines.join('\n').trim();
    } catch (error) {
      console.warn(`⚠️  Impossible de lire les instructions: ${error.message}`);
      return '';
    }
  }

  // Fonction pour charger et résoudre les schémas JSON
  function loadAndResolveSchemas() {
    const mainSchemaFileName = GLOBAL_CONFIG?.nuextract?.mainJSONConfigurationFile || 'shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json';
    const mainSchemaFile = resolveFromRepoRoot(mainSchemaFileName);
    const schemaDir = path.dirname(mainSchemaFile);

    let rawSchema = '';

    try {
      rawSchema = JSON.parse(fs.readFileSync(mainSchemaFile, 'utf8'));
    } catch (error) {
      console.error(`Erreur critique: Impossible de lire le schéma JSON principal: ${error.message}`);
      throw new Error('Main JSON schema file not found. Script stopped.');
    }

    try {
      const resolvedSchema = resolveJSONSchemaRefs(rawSchema, schemaDir);
      return JSON.stringify(resolvedSchema, null, 2);
    } catch (error) {
      console.warn(`Avertissement: Impossible de résoudre les références JSON: ${error.message}`);
      // Retourner le schéma brut sans résolution des références
      return JSON.stringify(rawSchema, null, 2);
    }
  }

  // Fonction pour construire la description du template
  // Format : schéma JSON en premier, puis instructions (sans headers inutiles)
  function buildTemplateDescription(instructions, mainSchema) {
    return [
      mainSchema,
      '\n',
      instructions
    ].join('\n');
  }

  // Générer un template via /api/infer-template-async (version asynchrone)
  async function generateTemplate(config, apiKey) {
    try {
      const instructions = loadInstructions();
      const mainSchema = loadAndResolveSchemas();
      const description = buildTemplateDescription(instructions, mainSchema);

      // Lancer génération asynchrone avec timeout de 60s
      console.log('Lancement génération template asynchrone (timeout: 60s)...');
      const asyncResponse = await inferTemplateFromDescriptionAsync(apiKey, description, 60);
      const jobId = asyncResponse.jobId;
      
      if (!jobId) {
        throw new Error('Pas de jobId reçu de l\'API async');
      }
      
      console.log(`Job lancé avec ID: ${jobId}`);
      
      // Polling avec sleep initial 30s puis tentatives toutes les 3s
      const templateData = await pollJobUntilComplete(apiKey, jobId, 20, 3000);
      
      // Vérifier si templateData est une string JSON à parser
      let template;
      if (typeof templateData === 'string') {
        template = JSON.parse(templateData);
      } else {
        template = templateData;
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
      throw new Error('Template generation failed. Script stopped.');
    }
  }

  // Fonction pour rechercher les projets NuExtract avec l'API GET /api/projects
async function getNuExtractProjects(apiKey) {
  return new Promise((resolve, reject) => {
    // Utiliser la configuration avec fallbacks
    const hostname = GLOBAL_CONFIG?.nuextract?.baseUrl || 'nuextract.ai';
    const port = GLOBAL_CONFIG?.nuextract?.port || 443;
    const path = GLOBAL_CONFIG?.nuextract?.projectsPath || '/api/projects';

    const options = {
      hostname: hostname,
      port: port,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Erreur API projets: ${res.statusCode} - ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Réponse JSON invalide: ${err.message}`));
        }
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête GET /api/projects a dépassé 10 secondes'));
    });
    req.on('error', reject);
    req.end();
  });
}

// Fonction pour Créer un projet NuExtract avec l'API POST /api/projects
async function createNuExtractProject(apiKey, body) {
  return new Promise((resolve, reject) => {
    const options = {
      // Utiliser la configuration avec fallbacks
      hostname: GLOBAL_CONFIG?.nuextract?.baseUrl || 'nuextract.ai',
      port: GLOBAL_CONFIG?.nuextract?.port || 443,
      path: GLOBAL_CONFIG?.nuextract?.projectsPath || '/api/projects',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Erreur création projet: ${res.statusCode} - ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Réponse JSON invalide: ${err.message}`));
        }
      });
    });
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête POST /api/projects a dépassé 10 secondes'));
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

// Fonction pour Mettre à jour le template d'un projet NuExtract avec l'API PUT /api/projects/{projectId}/template
async function putProjectTemplate(apiKey, projectId, template) {
  return new Promise((resolve, reject) => {
    const options = {
      // Utiliser la configuration avec fallbacks
      hostname: GLOBAL_CONFIG?.nuextract?.baseUrl || 'nuextract.ai',
      port: GLOBAL_CONFIG?.nuextract?.port || 443,
      path: `${GLOBAL_CONFIG?.nuextract?.projectsPath || '/api/projects'}/${projectId}/template`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Erreur mise à jour template: ${res.statusCode} - ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Réponse JSON invalide: ${err.message}`));
        }
      });
    });
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête PUT /api/projects/{projectId}/template a dépassé 10 secondes'));
    });
    req.on('error', reject);
    req.write(JSON.stringify({ template }));
    req.end();
  });
}

// Gestion du projet NuExtract, il est recherché et mis à jour avec le template si le projet existe déjà ou créé avec le template généré si le projet n'existe pas encore
async function findOrCreateProject(apiKey, projectName, projectDescription, templateObj = null) {
  try {
    const projects = await getNuExtractProjects(apiKey);
    const existingProject = projects.find((p) => p.name === projectName);
    let projectId;
    if (existingProject) {
      // Projet existant - le mettre à jour avec le template si fourni
      if (templateObj) {
        await putProjectTemplate(apiKey, existingProject.id, templateObj);
      }
      projectId = existingProject.id;
    } else {
      // Créer le projet avec le template généré si fourni, sinon vide
      const created = await createNuExtractProject(apiKey, {
        name: projectName,
        description: projectDescription,
        template: templateObj || {}
      });
      projectId = created?.id;
    }
    console.log(`Projet ${projectName} avec ID: ${projectId}, le projet a été ${existingProject ? 'mis à jour' : 'créé'} avec le template généré `);
    return projectId;
  } catch (error) {
    console.error(`Erreur lors de la gestion du projet NuExtract: ${error.message}`);
    throw new Error('Project management failed. Script stopped.');
  }
}

// Point d'entrée du script qui exécute les fonctions séquentiellement
async function main() {
  try {
    GLOBAL_CONFIG = await loadGlobalConfig();
    API_KEY = await loadApiKey(GLOBAL_CONFIG);
    TEMPLATE = await generateTemplate(GLOBAL_CONFIG, API_KEY);
    PROJECT_ID = await findOrCreateProject(API_KEY, GLOBAL_CONFIG?.nuextract?.projectName || 'HERMES2022', GLOBAL_CONFIG?.nuextract?.projectDescription || 'Project for HERMES2022 concepts extraction', TEMPLATE);
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

// Exports nécessaires pour les tests
module.exports = {
  loadGlobalConfig,
  loadApiKey,
  generateTemplate,
  findOrCreateProject
};