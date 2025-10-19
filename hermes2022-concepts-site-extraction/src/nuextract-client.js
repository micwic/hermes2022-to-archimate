// nuextract-client.js - Client pour extraire le HTML et exécuter les APIs NuExtract
// Basé sur les fichiers de configuration extraction-config.json extraction-*.md

const fs = require('fs');
const https = require('https');
const path = require('path');

// Variable globale pour la configuration (chargée une seule fois au démarrage)
let GLOBAL_CONFIG = null;

// Initialiser la configuration au démarrage du script
(() => {
  const configPath = path.join(__dirname, '../config/extraction-config.json');
  try {
    GLOBAL_CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('[info] Configuration chargée une seule fois au démarrage');
  } catch (error) {
    console.error(`Erreur lors du chargement de la configuration : ${error.message}`);
    GLOBAL_CONFIG = {}; // Objet vide comme fallback
  }
})();

// Fonction pour récupérer la configuration (simple getter) - supprimée car inutile
// function loadConfig() {
//   return GLOBAL_CONFIG;
// }

// Fonction pour lire la clé API depuis un fichier externe
function loadApiKey(config) {
  const fromEnv = process.env.NUEXTRACT_API_KEY && process.env.NUEXTRACT_API_KEY.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const keyFile = config?.nuextract?.apiKeyFile || 'config/nuextract-api-key.key';
  const keyPath = path.join(__dirname, '..', keyFile);
  try {
    return fs.readFileSync(keyPath, 'utf8').trim();
  } catch (error) {
    throw new Error(`Impossible de lire la clé API NuExtract (env NUEXTRACT_API_KEY ou fichier ${keyPath}) : ${error.message}`);
  }
}

// Fonction pour résoudre récursivement les $ref dans un schéma JSON et les inclure dans le schéma principal
function resolveJSONSchemaRefs(schema, baseDir, visitedFiles = new Set(), visitedObjects = new Set()) {
  if (typeof schema !== 'object' || schema === null) {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map(item => resolveJSONSchemaRefs(item, baseDir, visitedFiles, visitedObjects));
  }
  // Vérifier si l'objet a déjà été résolu pour éviter les boucles profondes
  const objKey = JSON.stringify(schema);
  if (visitedObjects.has(objKey)) {
    console.warn(`[warn] Boucle infinie détectée dans l'objet, référence ignorée`);
    return schema;
  }
  visitedObjects.add(objKey);
  const resolved = { ...schema };
  if (resolved.$ref) {
    const refPath = path.resolve(baseDir, resolved.$ref);
    if (visitedFiles.has(refPath)) {
      console.warn(`[warn] Boucle infinie détectée pour $ref ${resolved.$ref}, référence ignorée`);
      return resolved;
    }
    visitedFiles.add(refPath);
    try {
      const refContent = JSON.parse(fs.readFileSync(refPath, 'utf8'));
      const resolvedRef = resolveJSONSchemaRefs(refContent, baseDir, visitedFiles, visitedObjects);
      delete resolved.$ref;
      return { ...resolved, ...resolvedRef };
    } catch (error) {
      console.warn(`[warn] Impossible de résoudre $ref ${resolved.$ref} : ${error.message}`);
      return resolved; // Retourner la référence non résolue si échec
    }
  }
  // Résoudre récursivement pour tous les objets
  for (const key in resolved) {
    resolved[key] = resolveJSONSchemaRefs(resolved[key], baseDir, visitedFiles, visitedObjects);
  }
  return resolved;
}

// Fonction pour rechercher les projets NuExtract
async function getNuExtractProjects(apiKey) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const options = {
      hostname: 'nuextract.ai',
      port: 443,
      path: '/api/projects',
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

    req.on('error', reject);
    req.end();
  });
}

// Création d'un projet NuExtract
async function createNuExtractProject(apiKey, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nuextract.ai',
      port: 443,
      path: '/api/projects',
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
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

// Mise à jour du template d'un projet
async function putProjectTemplate(apiKey, projectId, template) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nuextract.ai',
      port: 443,
      path: `/api/projects/${projectId}/template`,
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
    req.on('error', reject);
    req.write(JSON.stringify({ template }));
    req.end();
  });
}

// Dériver un template depuis une description textuelle
async function inferTemplateFromDescription(apiKey, description) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nuextract.ai',
      port: 443,
      path: '/api/infer-template',
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
    req.on('error', reject);
    req.write(JSON.stringify({ description }));
    req.end();
  });
}

function readJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function resolveArtifactDir() {
  const envDir = process.env.HERMES2022_CONCEPTS_ARTIFACT_DIR && process.env.HERMES2022_CONCEPTS_ARTIFACT_DIR.trim();
  if (envDir) {
    return path.resolve(__dirname, '..', envDir);
  }
  const configPath = path.resolve(__dirname, '../config/extraction-config.json');
  try {
    const cfg = readJson(configPath);
    const fromCfg = (cfg && cfg.artifactBaseDir) || 'shared/hermes2022-extraction-files/data';
    return path.resolve(__dirname, '..', fromCfg);
  } catch (e) {
    // défaut sur répertoire partagé
    return path.resolve(__dirname, '..', 'shared/hermes2022-extraction-files/data');
  }
}

// Classe principale pour gérer les interactions avec NuExtract
class NuExtractClient {
  constructor() {
    this.apiKey = loadApiKey(GLOBAL_CONFIG);
    this.projectId = null;
  }

  // Initialiser le client en trouvant ou créant le projet depuis la configuration (avec génération de template si nécessaire)
  async initialize() {
    if (!this.projectId) {
      const projectName = GLOBAL_CONFIG?.nuextract?.projectName || 'HERMES2022';
      const projectDescription = GLOBAL_CONFIG?.nuextract?.projectDescription || 'Project for HERMES2022 concepts extraction';
      const shouldReset = GLOBAL_CONFIG?.nuextract?.templateReset || false;

      // Générer le template si nécessaire (toujours pour création, optionnel pour mise à jour)
      let templateObj = null;
      if (shouldReset) {
        templateObj = await this.generateTemplate();
      }

      this.projectId = await this.findOrCreateProject(projectName, projectDescription, templateObj);
      console.log(`Projet ${projectName} trouvé avec ID: ${this.projectId}`);
    }
    return this.projectId;
  }

  // Créer si absent, sinon retourner l'existant; possibilité de mettre à jour template si fourni
  async findOrCreateProject(projectName, projectDescription, templateObj = null) {
    const projects = await getNuExtractProjects(this.apiKey);
    const existing = projects.find((p) => p.name === projectName);
    if (existing) {
      this.projectId = existing.id;
      if (templateObj && templateObj.schemas) {
        await putProjectTemplate(this.apiKey, this.projectId, templateObj);
      }
      return this.projectId;
    }
    // Créer avec le template généré si fourni, sinon vide
    const created = await createNuExtractProject(this.apiKey, {
      name: projectName,
      description: projectDescription,
      template: templateObj && templateObj.schemas ? templateObj : { schemas: {} }
    });
    this.projectId = created?.id;
    return this.projectId;
  }

  // Générer un template via /api/infer-template
  async generateTemplate() {
    const instFile = GLOBAL_CONFIG?.nuextract?.templateTransformationInstructionFile || 'config/instructions-template-nuextract.md';
    const instPath = path.resolve(__dirname, '..', instFile);
    let instructions = '';
    try {
      instructions = fs.readFileSync(instPath, 'utf8');
    } catch (_) {
      instructions = '';
    }
    const repoRoot = path.resolve(__dirname, '..', '..');
    const mainSchemaFileName = GLOBAL_CONFIG?.nuextract?.mainJSONConfigurationFile || 'shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json';
    const mainSchemaFile = path.resolve(repoRoot, mainSchemaFileName);
    const schemaDir = path.dirname(mainSchemaFile);
    let mainSchema = '';
    try {
      const rawSchema = JSON.parse(fs.readFileSync(mainSchemaFile, 'utf8'));
      const resolvedSchema = resolveJSONSchemaRefs(rawSchema, schemaDir);
      mainSchema = JSON.stringify(resolvedSchema, null, 2);
    } catch (_) {
      mainSchema = '';
    }
    const header = 'Derive a NuExtract extraction template. Enforce enumerations and structures. Avoid $ref; inline structures.';
    const description = [
      header,
      '\n# Instructions',
      instructions,
      '\n# Target JSON structures (illustrative, inline without $ref)\n',
      `## ${path.basename(mainSchemaFileName)} (resolved)\n`,
      mainSchema
    ].join('\n');
    const templ = await inferTemplateFromDescription(this.apiKey, description);
    return templ;
  }

  // Appliquer un template au projet (nécessite initialisation préalable)
  async applyTemplateToProject(templateObj) {
    if (!this.projectId) {
      await this.initialize();
    }
    await putProjectTemplate(this.apiKey, this.projectId, templateObj);
  }

  // Générer et appliquer le template si templateReset est true
  async buildAndApplyTemplate() {
    const shouldReset = GLOBAL_CONFIG?.templateReset || false;
    if (shouldReset) {
      const templ = await this.generateTemplate();
      await this.applyTemplateToProject(templ);
      return templ;
    }
    // Sinon, ne rien faire
    return null;
  }

  // Fonction pour récupérer le contenu d'une URL
  static async fetchHtml(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} pour ${url}`));
          return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  // Fonction pour appeler NuExtract infer-text avec le projet (retries 429/5xx)
  async inferText(text) {
    if (!this.projectId) {
      await this.initialize();
    }

    const payload = { text };
    const maxAttempts = 3;
    const baseDelayMs = 500;
    let attempt = 0;
    while (true) {
      attempt += 1;
      try {
        const res = await new Promise((resolve, reject) => {
          const options = {
            hostname: 'nuextract.ai',
            port: 443,
            path: `/api/projects/${this.projectId}/infer-text`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            }
          };
          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              if (res.statusCode !== 200) {
                const err = new Error(`NuExtract API error: ${res.statusCode} - ${data}`);
                err.statusCode = res.statusCode;
                reject(err);
                return;
              }
              try {
                resolve(JSON.parse(data));
              } catch (err) {
                reject(new Error(`Invalid JSON response: ${err.message}`));
              }
            });
          });
          req.on('error', reject);
          req.write(JSON.stringify(payload));
          req.end();
        });
        return res;
      } catch (e) {
        const status = e && e.statusCode;
        if ((status === 429 || (status && status >= 500)) && attempt < maxAttempts) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw e;
      }
    }
  }
  // Fonction principale pour tester l'overview
  async testOverview() {
    const urls = [
      'https://www.hermes.admin.ch/en/project-management/method-overview.html',
      'https://www.hermes.admin.ch/en/project-management/method-overview/preface.html'
    ];

    let combinedHtml = '';
    for (const url of urls) {
      console.log(`Récupération de ${url}...`);
      const html = await NuExtractClient.fetchHtml(url);
      combinedHtml += html + '\n';
    }

    // Instructions d'extraction pour overview (basées sur extraction-concepts-overview.md, lignes 11-20 et 24-27)
    const prompt = `
Extraire uniquement les informations présentes sur les pages de références.
Privilégier la précision sur la quantité d'informations avec une formulation adaptée à une injection ultérieure dans l'IA en RAG.
Ne pas compléter avec d'autres pages que celles indiquées. Citer textuellement les termes clés si cela améliore la fidélité sans transformer en citation longue.

Instructions :
- Produire un texte synthétique (overview) couvrant la gestion de projet en mode traditionnel ou agile, les autres utilisations sont hors contexte, en se limitant strictement aux informations explicitement présentes dans les deux pages référencées ci-dessus :
  - Finalité et périmètre de la méthode (focus « project management »)
  - Principes/approches de conduite (traditionnelle, agile, hybride) si et seulement si mention explicite
  - Articulation des concepts de haut niveau et leurs relations au survol (sans détailler les sous-chapitres traités ailleurs) : phases, scénarios, modules, tâches, résultats, rôles
  - Vue d'ensemble des phases et de leur hiérarchie (1, 2, 2.1, 2.2, 2.3, 3) au niveau conceptuel uniquement
  - Gouvernance et assurance qualité si mention explicite (jalons, décisions, « quality gates »)
  - Domaines explicitement hors scope sur ces pages (portefeuille, gestion des applications, etc.)
  - Longueur cible : 200–650 mots (≈ 1 200–4 000 caractères). Bornes strictes du schéma : 600–5 000 caractères.
  - Sortie : texte brut (pas de Markdown riche). Langue du site. Style factuel, neutre, sans extrapolation.
- Intégrer les points saillants utiles à l'IA pour le contexte et la méthodologie dans son ensemble sans créer des redondances inutiles avec les concepts sous-jacents décrits pour eux-mêmes.
    `;

    console.log('Appel à NuExtract pour overview...');
    const result = await this.inferText(prompt + '\n' + combinedHtml);

    // Sauvegarder le résultat
    const outputPath = `${resolveArtifactDir()}/hermes2022-concepts-overview-${new Date().toISOString().slice(0, 10)}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`Résultat sauvegardé dans ${outputPath}`);

    return result;
  }
  // Fonction principale pour tester une phase
  async testPhase(phaseName, url, prompt) {
    console.log(`Récupération de ${url} pour ${phaseName}...`);
    const html = await NuExtractClient.fetchHtml(url);

    console.log(`Appel à NuExtract pour ${phaseName}...`);
    const result = await this.inferText(prompt + '\n' + html);

    // Sauvegarder le résultat
    const outputPath = `${resolveArtifactDir()}/hermes2022-phase-${phaseName.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`Résultat sauvegardé dans ${outputPath}`);

    return result;
  }
}

// Tests principaux
async function runTests() {
  // Créer les répertoires si nécessaire
  const outDir = resolveArtifactDir();
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(this.config?.nuextract?.logsDir || '../logs')) fs.mkdirSync(this.config?.nuextract?.logsDir || '../logs', { recursive: true });

  // Initialiser le client NuExtract
  const client = new NuExtractClient();
  await client.initialize();

  // Construire et appliquer le template (création ou mise à jour)
  try {
    await client.buildAndApplyTemplate();
    console.log('Template NuExtract appliqué avec succès.');
  } catch (e) {
    console.warn('[warn] Échec de construction/apply du template:', e.message);
  }

  try {
    // Test overview
    console.log('=== Test Overview ===');
    const overviewResult = await client.testOverview();
    console.log('Overview extraite avec succès.');

    // Tests des phases avec prompts basés sur extraction-phases-*.md
    const phases = [
      {
        name: 'Initiation',
        url: 'https://www.hermes.admin.ch/en/project-management/phases/initiation.html',
        prompt: `
Extraire uniquement les informations présentes sur la page de références.
Privilégier la précision sur la quantité d'informations avec une formulation adaptée à une injection ultérieure dans l'IA en RAG.
Ne pas compléter avec d'autres pages que celles indiquées. Citer textuellement les termes clés si cela améliore la fidélité sans transformer en citation longue.

Instructions :
### 1. Informations de base
- **Nom de la phase** : "Initiation"
- **Ordre hiérarchique** : "1"
- **Type** : "simple"

### 2. Description principale
Extraire la description principale de la phase Initiation. Cette description doit expliquer :
- L'objectif principal de la phase
- Le rôle dans le cycle de vie du projet
- Les fondements créés

### 3. Contexte et articulation
Extraire le contexte qui explique :
- Comment la phase s'intègre dans le cycle de vie
- Sa relation avec les autres phases
- Son importance dans la méthodologie HERMES2022
- Intégrer, si pertinent, des éléments d'articulation tirés de la page générale des phases : <https://www.hermes.admin.ch/en/project-management/phases.html>

### 4. Résultats attendus (outcomes)
Identifier et lister les résultats principaux de la phase Initiation, notamment :
- Les documents produits
- Les décisions prises
- Les fondations établies

### 5. Jalons (milestones)
Identifier les points de contrôle et jalons de la phase, notamment :
- Les décisions de phase release
- Les validations requises
- Les critères de réussite

### 6. Approches supportées
Déterminer si la phase supporte :
- Approche traditionnelle
- Approche agile
- Les deux approches (si mention explicite). Renseigner le champ \`approach\` avec une ou plusieurs valeurs autorisées par le schéma (\`traditional\`, \`agile\`, \`both\`) en fonction du contenu de la page.
        `,
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            order: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
            context: { type: 'string' },
            outcomes: { type: 'array', items: { type: 'string' } },
            milestones: { type: 'array', items: { type: 'string' } },
            approach: { type: 'array', items: { type: 'string' } }
          },
          required: ['id', 'name', 'order', 'type']
        }
      },
      {
        name: 'Concept',
        url: 'https://www.hermes.admin.ch/en/project-management/phases/concept.html',
        prompt: `
Extraire uniquement les informations présentes sur la page de références.
Privilégier la précision sur la quantité d'informations avec une formulation adaptée à une injection ultérieure dans l'IA en RAG.
Ne pas compléter avec d'autres pages que celles indiquées. Citer textuellement les termes clés si cela améliore la fidélité sans transformer en citation longue.

Instructions pour la phase Concept (adapter selon le contenu réel de la page, basé sur extraction-phases-concept.md) :
### 1. Informations de base
- **Nom de la phase** : "Concept"
- **Ordre hiérarchique** : "2.1"
- **Type** : "simple"

### 2. Description principale
Extraire la description principale de la phase Concept. Cette description doit expliquer :
- L'objectif principal de la phase
- Le rôle dans le cycle de vie du projet
- Les fondements créés

### 3. Contexte et articulation
Extraire le contexte qui explique :
- Comment la phase s'intègre dans le cycle de vie
- Sa relation avec les autres phases
- Son importance dans la méthodologie HERMES2022
- Intégrer, si pertinent, des éléments d'articulation tirés de la page générale des phases.

### 4. Résultats attendus (outcomes)
Identifier et lister les résultats principaux de la phase Concept, notamment :
- Les documents produits
- Les décisions prises
- Les fondations établies

### 5. Jalons (milestones)
Identifier les points de contrôle et jalons de la phase, notamment :
- Les décisions de phase release
- Les validations requises
- Les critères de réussite

### 6. Approches supportées
Déterminer si la phase supporte :
- Approche traditionnelle
- Approche agile
- Les deux approches (si mention explicite).
        `,
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            order: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
            context: { type: 'string' },
            outcomes: { type: 'array', items: { type: 'string' } },
            milestones: { type: 'array', items: { type: 'string' } },
            approach: { type: 'array', items: { type: 'string' } }
          },
          required: ['id', 'name', 'order', 'type']
        }
      },
      // Ajouter d'autres phases similaires avec leurs prompts adaptés
      {
        name: 'Implementation',
        url: 'https://www.hermes.admin.ch/en/project-management/phases/implementation.html',
        prompt: `
Extraire uniquement les informations présentes sur la page de références.
Privilégier la précision sur la quantité d'informations avec une formulation adaptée à une injection ultérieure dans l'IA en RAG.
Ne pas compléter avec d'autres pages que celles indiquées. Citer textuellement les termes clés si cela améliore la fidélité sans transformer en citation longue.

Instructions pour la phase Implementation (adapter selon le contenu réel de la page, basé sur extraction-phases-implementation.md) :
### 1. Informations de base
- **Nom de la phase** : "Implementation"
- **Ordre hiérarchique** : "2.2"
- **Type** : "simple"

### 2. Description principale
Extraire la description principale de la phase Implementation. Cette description doit expliquer :
- L'objectif principal de la phase
- Le rôle dans le cycle de vie du projet
- Les fondements créés

### 3. Contexte et articulation
Extraire le contexte qui explique :
- Comment la phase s'intègre dans le cycle de vie
- Sa relation avec les autres phases
- Son importance dans la méthodologie HERMES2022
- Intégrer, si pertinent, des éléments d'articulation tirés de la page générale des phases.

### 4. Résultats attendus (outcomes)
Identifier et lister les résultats principaux de la phase Implementation, notamment :
- Les documents produits
- Les décisions prises
- Les fondations établies

### 5. Jalons (milestones)
Identifier les points de contrôle et jalons de la phase, notamment :
- Les décisions de phase release
- Les validations requises
- Les critères de réussite

### 6. Approches supportées
Déterminer si la phase supporte :
- Approche traditionnelle
- Approche agile
- Les deux approches (si mention explicite).
        `,
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            order: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
            context: { type: 'string' },
            outcomes: { type: 'array', items: { type: 'string' } },
            milestones: { type: 'array', items: { type: 'string' } },
            approach: { type: 'array', items: { type: 'string' } }
          },
          required: ['id', 'name', 'order', 'type']
        }
      },
      {
        name: 'Deployment',
        url: 'https://www.hermes.admin.ch/en/project-management/phases/deployment.html',
        prompt: `
Extraire uniquement les informations présentes sur la page de références.
Privilégier la précision sur la quantité d'informations avec une formulation adaptée à une injection ultérieure dans l'IA en RAG.
Ne pas compléter avec d'autres pages que celles indiquées. Citer textuellement les termes clés si cela améliore la fidélité sans transformer en citation longue.

Instructions pour la phase Deployment (adapter selon le contenu réel de la page, basé sur extraction-phases-deployment.md) :
### 1. Informations de base
- **Nom de la phase** : "Deployment"
- **Ordre hiérarchique** : "2.3"
- **Type** : "simple"

### 2. Description principale
Extraire la description principale de la phase Deployment. Cette description doit expliquer :
- L'objectif principal de la phase
- Le rôle dans le cycle de vie du projet
- Les fondements créés

### 3. Contexte et articulation
Extraire le contexte qui explique :
- Comment la phase s'intègre dans le cycle de vie
- Sa relation avec les autres phases
- Son importance dans la méthodologie HERMES2022
- Intégrer, si pertinent, des éléments d'articulation tirés de la page générale des phases.

### 4. Résultats attendus (outcomes)
Identifier et lister les résultats principaux de la phase Deployment, notamment :
- Les documents produits
- Les décisions prises
- Les fondations établies

### 5. Jalons (milestones)
Identifier les points de contrôle et jalons de la phase, notamment :
- Les décisions de phase release
- Les validations requises
- Les critères de réussite

### 6. Approches supportées
Déterminer si la phase supporte :
- Approche traditionnelle
- Approche agile
- Les deux approches (si mention explicite).
        `,
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            order: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
            context: { type: 'string' },
            outcomes: { type: 'array', items: { type: 'string' } },
            milestones: { type: 'array', items: { type: 'string' } },
            approach: { type: 'array', items: { type: 'string' } }
          },
          required: ['id', 'name', 'order', 'type']
        }
      },
      {
        name: 'Execution',
        url: 'https://www.hermes.admin.ch/en/project-management/phases/execution.html',
        prompt: `
Extraire uniquement les informations présentes sur la page de références.
Privilégier la précision sur la quantité d'informations avec une formulation adaptée à une injection ultérieure dans l'IA en RAG.
Ne pas compléter avec d'autres pages que celles indiquées. Citer textuellement les termes clés si cela améliore la fidélité sans transformer en citation longue.

Instructions pour la phase Execution (adapter selon le contenu réel de la page, basé sur extraction-phases-execution.md) :
### 1. Informations de base
- **Nom de la phase** : "Execution"
- **Ordre hiérarchique** : "2"
- **Type** : "composite"

### 2. Description principale
Extraire la description principale de la phase Execution. Cette description doit expliquer :
- L'objectif principal de la phase
- Le rôle dans le cycle de vie du projet
- Les fondements créés

### 3. Contexte et articulation
Extraire le contexte qui explique :
- Comment la phase s'intègre dans le cycle de vie
- Sa relation avec les autres phases
- Son importance dans la méthodologie HERMES2022
- Intégrer, si pertinent, des éléments d'articulation tirés de la page générale des phases.

### 4. Résultats attendus (outcomes)
Identifier et lister les résultats principaux de la phase Execution, notamment :
- Les documents produits
- Les décisions prises
- Les fondations établies

### 5. Jalons (milestones)
Identifier les points de contrôle et jalons de la phase, notamment :
- Les décisions de phase release
- Les validations requises
- Les critères de réussite

### 6. Approches supportées
Déterminer si la phase supporte :
- Approche traditionnelle
- Approche agile
- Les deux approches (si mention explicite).
        `,
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            order: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
            context: { type: 'string' },
            outcomes: { type: 'array', items: { type: 'string' } },
            milestones: { type: 'array', items: { type: 'string' } },
            approach: { type: 'array', items: { type: 'string' } }
          },
          required: ['id', 'name', 'order', 'type']
        }
      },
      {
        name: 'Closure',
        url: 'https://www.hermes.admin.ch/en/project-management/phases/closure.html',
        prompt: `
Extraire uniquement les informations présentes sur la page de références.
Privilégier la précision sur la quantité d'informations avec une formulation adaptée à une injection ultérieure dans l'IA en RAG.
Ne pas compléter avec d'autres pages que celles indiquées. Citer textuellement les termes clés si cela améliore la fidélité sans transformer en citation longue.

Instructions pour la phase Closure (adapter selon le contenu réel de la page, basé sur extraction-phases-closure.md) :
### 1. Informations de base
- **Nom de la phase** : "Closure"
- **Ordre hiérarchique** : "3"
- **Type** : "simple"

### 2. Description principale
Extraire la description principale de la phase Closure. Cette description doit expliquer :
- L'objectif principal de la phase
- Le rôle dans le cycle de vie du projet
- Les fondements créés

### 3. Contexte et articulation
Extraire le contexte qui explique :
- Comment la phase s'intègre dans le cycle de vie
- Sa relation avec les autres phases
- Son importance dans la méthodologie HERMES2022
- Intégrer, si pertinent, des éléments d'articulation tirés de la page générale des phases.

### 4. Résultats attendus (outcomes)
Identifier et lister les résultats principaux de la phase Closure, notamment :
- Les documents produits
- Les décisions prises
- Les fondations établies

### 5. Jalons (milestones)
Identifier les points de contrôle et jalons de la phase, notamment :
- Les décisions de phase release
- Les validations requises
- Les critères de réussite

### 6. Approches supportées
Déterminer si la phase supporte :
- Approche traditionnelle
- Approche agile
- Les deux approches (si mention explicite).
        `,
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            order: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
            context: { type: 'string' },
            outcomes: { type: 'array', items: { type: 'string' } },
            milestones: { type: 'array', items: { type: 'string' } },
            approach: { type: 'array', items: { type: 'string' } }
          },
          required: ['id', 'name', 'order', 'type']
        }
      }
    ];

    for (const phase of phases) {
      console.log(`=== Test Phase ${phase.name} ===`);
      const phaseResult = await client.testPhase(phase.name, phase.url, phase.prompt);
      console.log(`${phase.name} extraite avec succès.`);
    }

    console.log('Tous les tests terminés.');
  } catch (error) {
    console.error('Erreur lors des tests :', error.message);
    // Log d'erreur
    fs.appendFileSync(`${this.config?.nuextract?.logsDir || '../logs'}/extraction-errors.json`, JSON.stringify({ error: error.message, timestamp: new Date().toISOString() }) + '\n');
  }
}

// Exécuter les tests
runTests();
