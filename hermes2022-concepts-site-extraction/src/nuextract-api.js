// nuextract-api.js - Module dédié aux appels HTTP vers les APIs NuExtract
// Applique les principes SOLID : fonctions pures avec Dependency Injection
// Pas de variables globales, tous les paramètres sont explicites

const https = require('https');

// Dériver un template depuis une description textuelle (mode synchrone)
async function inferTemplateFromDescription(hostname, port, path, apiKey, description, timeoutMs = 35000) {
  return new Promise((resolve, reject) => {
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
          reject(new Error('Invalid JSON response from infer-template API', { cause: err }));
        }
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Timeout sync après ${timeoutMs}ms. Pour schémas >4000 caractères, utilisez templateMode: 'async'`));
    });
    req.on('error', (err) => {
      reject(new Error('Network error calling infer-template API', { cause: err }));
    });
    req.write(JSON.stringify({ description }));
    req.end();
  });
}

// Fonction pour générer un template via /api/infer-template-async (version asynchrone)
async function inferTemplateFromDescriptionAsync(hostname, port, pathPrefix, apiKey, description, timeout = 60) {
  return new Promise((resolve, reject) => {
    const path = `${pathPrefix}?timeout=${timeout}s`;
    
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
          reject(new Error('Invalid JSON response from infer-template-async API', { cause: err }));
        }
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête infer-template-async a dépassé 10 secondes'));
    });
    req.on('error', (err) => {
      reject(new Error('Network error calling infer-template-async API', { cause: err }));
    });
    req.write(JSON.stringify({ description }));
    req.end();
  });
}

// Fonction pour obtenir le statut d'un job via /api/jobs/{jobId}
async function getJobStatus(hostname, port, pathPrefix, apiKey, jobId) {
  return new Promise((resolve, reject) => {
    const path = `${pathPrefix}/${jobId}`;
    
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
          reject(new Error('Invalid JSON response from job status API', { cause: err }));
        }
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête GET job a dépassé 5 secondes'));
    });
    req.on('error', (err) => {
      reject(new Error('Network error calling job status API', { cause: err }));
    });
    req.end();
  });
}

// Fonction pour poller le statut d'un job jusqu'à completion
async function pollJobUntilComplete(hostname, port, pathPrefix, apiKey, jobId, maxAttempts = 20, interval = 3000, initialSleepMs = 30000) {
  console.log(`Polling job ${jobId} - attente initiale de ${initialSleepMs}ms...`);
  await new Promise(resolve => setTimeout(resolve, initialSleepMs));
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const jobResponse = await getJobStatus(hostname, port, pathPrefix, apiKey, jobId);
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

// Fonction pour rechercher les projets NuExtract avec l'API GET /api/projects
async function getNuExtractProjects(hostname, port, pathPrefix, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: port,
      path: pathPrefix,
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
          reject(new Error('Invalid JSON response from GET /api/projects', { cause: err }));
        }
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête GET /api/projects a dépassé 10 secondes'));
    });
    req.on('error', (err) => {
      reject(new Error('Network error calling GET /api/projects', { cause: err }));
    });
    req.end();
  });
}

// Fonction pour obtenir un projet NuExtract spécifique avec l'API GET /api/projects/{projectId}
async function getNuExtractProject(hostname, port, pathPrefix, apiKey, projectId) {
  return new Promise((resolve, reject) => {
    const path = `${pathPrefix}/${projectId}`;
    
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
          reject(new Error(`Erreur API projet: ${res.statusCode} - ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Invalid JSON response from GET /api/projects/{projectId}', { cause: err }));
        }
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête GET /api/projects/{projectId} a dépassé 10 secondes'));
    });
    req.on('error', (err) => {
      reject(new Error('Network error calling GET /api/projects/{projectId}', { cause: err }));
    });
    req.end();
  });
}

// Fonction pour Créer un projet NuExtract avec l'API POST /api/projects
async function createNuExtractProject(hostname, port, pathPrefix, apiKey, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: port,
      path: pathPrefix,
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
          reject(new Error('Invalid JSON response from POST /api/projects', { cause: err }));
        }
      });
    });
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête POST /api/projects a dépassé 10 secondes'));
    });
    req.on('error', (err) => {
      reject(new Error('Network error calling POST /api/projects', { cause: err }));
    });
    req.write(JSON.stringify(body));
    req.end();
  });
}

// Fonction pour Mettre à jour le template d'un projet NuExtract avec l'API PUT /api/projects/{projectId}/template
async function putProjectTemplate(hostname, port, pathPrefix, apiKey, projectId, template) {
  return new Promise((resolve, reject) => {
    const path = `${pathPrefix}/${projectId}/template`;
    
    const options = {
      hostname: hostname,
      port: port,
      path: path,
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
          reject(new Error('Invalid JSON response from PUT /api/projects/{projectId}/template', { cause: err }));
        }
      });
    });
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: La requête PUT /api/projects/{projectId}/template a dépassé 10 secondes'));
    });
    req.on('error', (err) => {
      reject(new Error('Network error calling PUT /api/projects/{projectId}/template', { cause: err }));
    });
    req.write(JSON.stringify({ template }));
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
  putProjectTemplate
};

