// nuextract-api.js - Module dédié aux appels HTTP vers les APIs NuExtract
// Applique les principes SOLID : fonctions pures avec Dependency Injection
// Pas de variables globales, tous les paramètres sont explicites

const https = require('https');

// Dériver un template depuis une description textuelle (mode synchrone)
async function inferTemplateFromDescription(hostname, port, path, pathPrefix, apiKey, description, timeoutMs = 35000) {
  // Validation des paramètres
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path: path is required and must be a string. Script stopped.');
  }
  
  // Construire le path final avec préfixe optionnel
  let finalPath = path;
  if (pathPrefix && pathPrefix.trim() !== '') {
    finalPath = pathPrefix + finalPath;
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: port,
      path: finalPath,
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
          reject(new Error(`Erreur infer-template: ${res.statusCode} - ${data.substring(0, 200)}. Script stopped.`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Invalid JSON response from infer-template API. Script stopped.', { cause: err }));
        }
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Timeout sync après ${timeoutMs}ms. Pour schémas >4000 caractères, utilisez templateMode: 'async'. Script stopped.`));
    });
    req.on('error', (err) => {
      reject(new Error('Network error calling infer-template API. Script stopped.', { cause: err }));
    });
    req.write(JSON.stringify({ description }));
    req.end();
  });
}

// Fonction pour générer un template via /api/infer-template-async (version asynchrone)
async function inferTemplateFromDescriptionAsync(hostname, port, path, pathPrefix, apiKey, description, timeout = 60) {
  // Validation des paramètres
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path: path is required and must be a string. Script stopped.');
  }
  
  // Construire le path final avec timeout et préfixe optionnel
  let finalPath = `${path}?timeout=${timeout}s`;
  if (pathPrefix && pathPrefix.trim() !== '') {
    finalPath = pathPrefix + finalPath;
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: port,
      path: finalPath,
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
          reject(new Error(`Erreur infer-template-async: ${res.statusCode} - ${data.substring(0, 200)}. Script stopped.`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Invalid JSON response from infer-template-async API. Script stopped.', { cause: err }));
        }
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête infer-template-async a dépassé 10 secondes. Script stopped.'));
    });
    req.on('error', (err) => {
      reject(new Error('Network error calling infer-template-async API. Script stopped.', { cause: err }));
    });
    req.write(JSON.stringify({ description }));
    req.end();
  });
}

// Fonction pour obtenir le statut d'un job via /api/jobs/{jobId}
async function getJobStatus(hostname, port, path, pathPrefix, apiKey, jobId) {
  // Validation des paramètres
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path: path is required and must be a string. Script stopped.');
  }
  if (!jobId || typeof jobId !== 'string') {
    throw new Error('Invalid jobId: jobId is required and must be a string. Script stopped.');
  }
  
  // Remplacer {jobId} par la valeur réelle dans le path
  let finalPath = path.replace(/{jobId}/g, jobId);
  
  // Ajouter le préfixe optionnel si défini et non vide
  if (pathPrefix && pathPrefix.trim() !== '') {
    finalPath = pathPrefix + finalPath;
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: port,
      path: finalPath,
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
          reject(new Error(`Erreur GET job: ${res.statusCode} - ${data.substring(0, 200)}. Script stopped.`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Invalid JSON response from job status API. Script stopped.', { cause: err }));
        }
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête GET job a dépassé 5 secondes. Script stopped.'));
    });
    req.on('error', (err) => {
      reject(new Error('Network error calling job status API. Script stopped.', { cause: err }));
    });
    req.end();
  });
}

// Fonction pour poller le statut d'un job jusqu'à completion
async function pollJobUntilComplete(hostname, port, path, pathPrefix, apiKey, jobId, maxAttempts = 20, interval = 3000, initialSleepMs = 30000) {
  console.log(`Polling job ${jobId} - attente initiale de ${initialSleepMs}ms...`);
  await new Promise(resolve => setTimeout(resolve, initialSleepMs));
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const jobResponse = await getJobStatus(hostname, port, path, pathPrefix, apiKey, jobId);
    const status = jobResponse.status;
    
    console.log(`[${attempt}/${maxAttempts}] Statut: ${status}`);
    
    // Statuts terminaux
    if (status === 'completed' || status === 'timeout') {
      if (!jobResponse.outputData) {
        throw new Error(`Job ${status} mais pas de outputData. Script stopped.`);
      }
      if (status === 'timeout') {
        console.warn('⚠️  Job terminé avec statut "timeout" mais outputData présent - traitement comme succès');
      }
      return jobResponse.outputData;
    }
    
    if (status === 'failed') {
      throw new Error(`Job failed: ${JSON.stringify(jobResponse)}. Script stopped.`);
    }
    
    // Attendre avant la prochaine tentative
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  throw new Error(`Timeout polling après ${maxAttempts} tentatives. Script stopped.`);
}

// Fonction pour rechercher les projets NuExtract avec l'API GET /api/projects
async function getNuExtractProjects(hostname, port, path, pathPrefix, apiKey) {
  // Validation des paramètres
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path: path is required and must be a string. Script stopped.');
  }
  
  // Construire le path final avec préfixe optionnel
  let finalPath = path;
  if (pathPrefix && pathPrefix.trim() !== '') {
    finalPath = pathPrefix + finalPath;
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: port,
      path: finalPath,
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
          reject(new Error(`Erreur API projets: ${res.statusCode} - ${data.substring(0, 200)}. Script stopped.`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Invalid JSON response from GET /api/projects. Script stopped.', { cause: err }));
        }
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête GET /api/projects a dépassé 10 secondes. Script stopped.'));
    });
    req.on('error', (err) => {
      reject(new Error('Network error calling GET /api/projects. Script stopped.', { cause: err }));
    });
    req.end();
  });
}

// Fonction pour obtenir un projet NuExtract spécifique avec l'API GET /api/projects/{projectId}
async function getNuExtractProject(hostname, port, path, pathPrefix, apiKey, projectId) {
  // Validation des paramètres
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path: path is required and must be a string. Script stopped.');
  }
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Invalid projectId: projectId is required and must be a string. Script stopped.');
  }
  
  // Remplacer {projectId} par la valeur réelle dans le path
  let finalPath = path.replace(/{projectId}/g, projectId);
  
  // Ajouter le préfixe optionnel si défini et non vide
  if (pathPrefix && pathPrefix.trim() !== '') {
    finalPath = pathPrefix + finalPath;
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: port,
      path: finalPath,
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
          reject(new Error(`Erreur API projet: ${res.statusCode} - ${data.substring(0, 200)}. Script stopped.`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Invalid JSON response from GET /api/projects/{projectId}. Script stopped.', { cause: err }));
        }
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête GET /api/projects/{projectId} a dépassé 10 secondes. Script stopped.'));
    });
    req.on('error', (err) => {
      reject(new Error('Network error calling GET /api/projects/{projectId}. Script stopped.', { cause: err }));
    });
    req.end();
  });
}

// Fonction pour Créer un projet NuExtract avec l'API POST /api/projects
async function createNuExtractProject(hostname, port, path, pathPrefix, apiKey, body) {
  // Validation des paramètres
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path: path is required and must be a string. Script stopped.');
  }
  
  // Construire le path final avec préfixe optionnel
  let finalPath = path;
  if (pathPrefix && pathPrefix.trim() !== '') {
    finalPath = pathPrefix + finalPath;
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: port,
      path: finalPath,
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
          reject(new Error(`Erreur création projet: ${res.statusCode} - ${data.substring(0, 200)}. Script stopped.`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Invalid JSON response from POST /api/projects. Script stopped.', { cause: err }));
        }
      });
    });
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête POST /api/projects a dépassé 10 secondes. Script stopped.'));
    });
    req.on('error', (err) => {
      reject(new Error('Network error calling POST /api/projects. Script stopped.', { cause: err }));
    });
    req.write(JSON.stringify(body));
    req.end();
  });
}

// Fonction pour Mettre à jour le template d'un projet NuExtract avec l'API PUT /api/projects/{projectId}/template
async function putProjectTemplate(hostname, port, path, pathPrefix, apiKey, projectId, template) {
  // Validation des paramètres
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path: path is required and must be a string. Script stopped.');
  }
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Invalid projectId: projectId is required and must be a string. Script stopped.');
  }
  
  // Remplacer {projectId} par la valeur réelle dans le path
  let finalPath = path.replace(/{projectId}/g, projectId);
  
  // Ajouter le préfixe optionnel si défini et non vide
  if (pathPrefix && pathPrefix.trim() !== '') {
    finalPath = pathPrefix + finalPath;
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: port,
      path: finalPath,
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
          reject(new Error(`Erreur mise à jour template: ${res.statusCode} - ${data.substring(0, 200)}. Script stopped.`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Invalid JSON response from PUT /api/projects/{projectId}/template. Script stopped.', { cause: err }));
        }
      });
    });
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête PUT /api/projects/{projectId}/template a dépassé 10 secondes. Script stopped.'));
    });
    req.on('error', (err) => {
      reject(new Error('Network error calling PUT /api/projects/{projectId}/template. Script stopped.', { cause: err }));
    });
    req.write(JSON.stringify({ template }));
    req.end();
  });
}

// Fonction pour extraire du texte depuis un contenu via /api/projects/{projectId}/infer-text
async function inferTextFromContent(hostname, port, path, pathPrefix, projectId, apiKey, text, timeoutMs = 120000) {
  // Validation des paramètres
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path: path is required and must be a string. Script stopped.');
  }
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Invalid projectId: projectId is required and must be a string. Script stopped.');
  }
  
  // Remplacer {projectId} par la valeur réelle dans le path
  let finalPath = path.replace(/{projectId}/g, projectId);
  
  // Ajouter le préfixe optionnel si défini et non vide
  if (pathPrefix && pathPrefix.trim() !== '') {
    finalPath = pathPrefix + finalPath;
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: port,
      path: finalPath,
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
          reject(new Error(`Erreur infer-text: ${res.statusCode} - ${data.substring(0, 200)}. Script stopped.`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Invalid JSON response from infer-text API. Script stopped.', { cause: err }));
        }
      });
    });
    
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Timeout: La requête infer-text a dépassé ${timeoutMs / 1000} secondes. Script stopped.`));
    });
    
    req.on('error', (err) => {
      reject(new Error('Network error calling infer-text API. Script stopped.', { cause: err }));
    });
    
    req.write(JSON.stringify({ text }));
    req.end();
  });
}

// EXPORTS NORMAUX (interface publique du module API)
module.exports = {
  inferTemplateFromDescription,
  inferTemplateFromDescriptionAsync,
  getJobStatus,
  pollJobUntilComplete,
  getNuExtractProjects,
  getNuExtractProject,
  createNuExtractProject,
  putProjectTemplate,
  inferTextFromContent
};

