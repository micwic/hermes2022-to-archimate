// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import https from 'https';
import { EventEmitter } from 'events';

// Import des fonctions du module nuextract-api (exports normaux !)
import {
  inferTemplateFromDescription,
  inferTemplateFromDescriptionAsync,
  getJobStatus,
  pollJobUntilComplete,
  getNuExtractProjects,
  createNuExtractProject,
  inferTextFromContent
} from '../../src/nuextract-api.js';

const feature = loadFeature(__dirname + '/nuextract-api-error-handling.feature');

// Variables pour restauration des mocks
let originalHttpsRequest: typeof https.request;

// Hooks pour isolation des tests (bonne pratique Jest/BDD)
beforeEach(() => {
  // Sauvegarder les fonctions originales avant chaque test
  originalHttpsRequest = https.request;
  jest.clearAllMocks();
});

afterEach(() => {
  // Restaurer les fonctions originales après chaque test
  https.request = originalHttpsRequest;
  jest.restoreAllMocks();
});

defineFeature(feature, (test) => {
  
  // === Tests des erreurs HTTP pour inferTemplateFromDescription ===
  
  test('Erreur réseau lors d\'appel API inferTemplateFromDescription', ({ given, when, then, and }) => {
    let error;
    
    given('une erreur réseau simulée pour inferTemplateFromDescription', () => {
      // Mock https.request pour simuler une erreur réseau
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockReq = new EventEmitter();
        mockReq.write = jest.fn();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn();
        mockReq.destroy = jest.fn();
        
        // Simuler une erreur réseau après un court délai
        setTimeout(() => {
          const networkError = new Error('ECONNREFUSED');
          networkError.code = 'ECONNREFUSED';
          mockReq.emit('error', networkError);
        }, 10);
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler inferTemplateFromDescription', async () => {
      try {
        await inferTemplateFromDescription('nuextract.ai', 443, '/api/infer-template', null, 'fake-api-key', 'test description', 35000);
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur "Network error calling infer-template API" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Network error calling infer-template API');
    });
    
    and('l\'erreur originale est préservée avec Error Cause', () => {
      expect(error.cause).toBeDefined();
      expect(error.cause.code).toBe('ECONNREFUSED');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  test('Timeout lors d\'appel API inferTemplateFromDescription', ({ given, when, then, and }) => {
    let error;
    
    given('un timeout simulé après 35 secondes pour inferTemplateFromDescription', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockReq = new EventEmitter();
        mockReq.write = jest.fn();
        mockReq.end = jest.fn();
        mockReq.destroy = jest.fn();
        
        // Capturer le callback de setTimeout et l'invoquer immédiatement pour simulation rapide
        let timeoutCallback;
        mockReq.setTimeout = jest.fn((timeout, cb) => {
          timeoutCallback = cb;
          // Simuler le timeout immédiatement pour test rapide
          setTimeout(() => {
            if (timeoutCallback) timeoutCallback();
          }, 10);
        });
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler inferTemplateFromDescription', async () => {
      try {
        await inferTemplateFromDescription('nuextract.ai', 443, '/api/infer-template', null, 'fake-api-key', 'test description', 35000);
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur contenant "Timeout sync après" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Timeout sync après');
    });
    
    and('le message suggère d\'utiliser le mode async', () => {
      expect(error.message).toContain('utilisez templateMode: \'async\'');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  test('Code HTTP non-200 pour inferTemplateFromDescription', ({ given, when, then, and }) => {
    let error;
    
    given('une réponse HTTP 500 de l\'API inferTemplateFromDescription', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockRes = new EventEmitter();
        mockRes.statusCode = 500;
        
        const mockReq = new EventEmitter();
        mockReq.write = jest.fn();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn((timeout, cb) => {});
        mockReq.destroy = jest.fn();
        
        setTimeout(() => {
          callback(mockRes);
          setTimeout(() => {
            mockRes.emit('data', Buffer.from('Internal Server Error'));
            mockRes.emit('end');
          }, 10);
        }, 10);
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler inferTemplateFromDescription', async () => {
      try {
        await inferTemplateFromDescription('nuextract.ai', 443, '/api/infer-template', null, 'fake-api-key', 'test description', 35000);
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur contenant "Erreur infer-template: 500" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Erreur infer-template: 500');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  test('JSON invalide dans réponse inferTemplateFromDescription', ({ given, when, then, and }) => {
    let error;
    
    given('une réponse avec JSON malformé pour inferTemplateFromDescription', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockRes = new EventEmitter();
        mockRes.statusCode = 200;
        
        const mockReq = new EventEmitter();
        mockReq.write = jest.fn();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn((timeout, cb) => {});
        mockReq.destroy = jest.fn();
        
        setTimeout(() => {
          callback(mockRes);
          setTimeout(() => {
            mockRes.emit('data', Buffer.from('{ invalid json ,,,'));
            mockRes.emit('end');
          }, 10);
        }, 10);
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler inferTemplateFromDescription', async () => {
      try {
        await inferTemplateFromDescription('nuextract.ai', 443, '/api/infer-template', null, 'fake-api-key', 'test description', 35000);
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur "Invalid JSON response from infer-template API" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid JSON response from infer-template API');
    });
    
    and('l\'erreur de parsing est préservée avec Error Cause', () => {
      expect(error.cause).toBeDefined();
      expect(error.cause).toBeInstanceOf(Error);
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  // === Tests des erreurs HTTP pour inferTemplateFromDescriptionAsync ===
  
  test('Erreur réseau lors d\'appel API inferTemplateFromDescriptionAsync', ({ given, when, then, and }) => {
    let error;
    
    given('une erreur réseau simulée pour inferTemplateFromDescriptionAsync', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockReq = new EventEmitter();
        mockReq.write = jest.fn();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn();
        mockReq.destroy = jest.fn();
        
        setTimeout(() => {
          const networkError = new Error('ETIMEDOUT');
          networkError.code = 'ETIMEDOUT';
          mockReq.emit('error', networkError);
        }, 10);
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler inferTemplateFromDescriptionAsync', async () => {
      try {
        await inferTemplateFromDescriptionAsync('nuextract.ai', 443, '/api/infer-template-async', null, 'fake-api-key', 'test description', 60);
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur "Network error calling infer-template-async API" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Network error calling infer-template-async API');
    });
    
    and('l\'erreur originale est préservée avec Error Cause', () => {
      expect(error.cause).toBeDefined();
      expect(error.cause.code).toBe('ETIMEDOUT');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  test('Timeout lors d\'appel API inferTemplateFromDescriptionAsync', ({ given, when, then, and }) => {
    let error;
    
    given('un timeout simulé après 10 secondes pour inferTemplateFromDescriptionAsync', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockReq = new EventEmitter();
        mockReq.write = jest.fn();
        mockReq.end = jest.fn();
        mockReq.destroy = jest.fn();
        
        let timeoutCallback;
        mockReq.setTimeout = jest.fn((timeout, cb) => {
          timeoutCallback = cb;
          setTimeout(() => {
            if (timeoutCallback) timeoutCallback();
          }, 10);
        });
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler inferTemplateFromDescriptionAsync', async () => {
      try {
        await inferTemplateFromDescriptionAsync('nuextract.ai', 443, '/api/infer-template-async', null, 'fake-api-key', 'test description', 60);
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur "Timeout: La requête infer-template-async a dépassé 10 secondes" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Timeout: La requête infer-template-async a dépassé 10 secondes');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  test('Code HTTP non-200 pour inferTemplateFromDescriptionAsync', ({ given, when, then, and }) => {
    let error;
    
    given('une réponse HTTP 400 de l\'API inferTemplateFromDescriptionAsync', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockRes = new EventEmitter();
        mockRes.statusCode = 400;
        
        const mockReq = new EventEmitter();
        mockReq.write = jest.fn();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn((timeout, cb) => {});
        mockReq.destroy = jest.fn();
        
        setTimeout(() => {
          callback(mockRes);
          setTimeout(() => {
            mockRes.emit('data', Buffer.from('Bad Request'));
            mockRes.emit('end');
          }, 10);
        }, 10);
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler inferTemplateFromDescriptionAsync', async () => {
      try {
        await inferTemplateFromDescriptionAsync('nuextract.ai', 443, '/api/infer-template-async', null, 'fake-api-key', 'test description', 60);
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur contenant "Erreur infer-template-async: 400" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Erreur infer-template-async: 400');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  // === Tests des erreurs HTTP pour getJobStatus ===
  
  test('Erreur réseau lors d\'appel API getJobStatus', ({ given, when, then, and }) => {
    let error;
    
    given('une erreur réseau simulée pour getJobStatus', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockReq = new EventEmitter();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn();
        mockReq.destroy = jest.fn();
        
        setTimeout(() => {
          const networkError = new Error('ENOTFOUND');
          networkError.code = 'ENOTFOUND';
          mockReq.emit('error', networkError);
        }, 10);
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler getJobStatus', async () => {
      try {
        await getJobStatus('nuextract.ai', 443, '/api/jobs/{jobId}', null, 'fake-api-key', 'test-job-id');
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur "Network error calling job status API" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Network error calling job status API');
    });
    
    and('l\'erreur originale est préservée avec Error Cause', () => {
      expect(error.cause).toBeDefined();
      expect(error.cause.code).toBe('ENOTFOUND');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  test('Timeout lors d\'appel API getJobStatus', ({ given, when, then, and }) => {
    let error;
    
    given('un timeout simulé après 5 secondes pour getJobStatus', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockReq = new EventEmitter();
        mockReq.end = jest.fn();
        mockReq.destroy = jest.fn();
        
        let timeoutCallback;
        mockReq.setTimeout = jest.fn((timeout, cb) => {
          timeoutCallback = cb;
          setTimeout(() => {
            if (timeoutCallback) timeoutCallback();
          }, 10);
        });
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler getJobStatus', async () => {
      try {
        await getJobStatus('nuextract.ai', 443, '/api/jobs/{jobId}', null, 'fake-api-key', 'test-job-id');
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur "Timeout: La requête GET job a dépassé 5 secondes" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Timeout: La requête GET job a dépassé 5 secondes');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  test('JSON invalide dans réponse getJobStatus', ({ given, when, then, and }) => {
    let error;
    
    given('une réponse avec JSON malformé pour getJobStatus', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockRes = new EventEmitter();
        mockRes.statusCode = 200;
        
        const mockReq = new EventEmitter();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn((timeout, cb) => {});
        mockReq.destroy = jest.fn();
        
        setTimeout(() => {
          callback(mockRes);
          setTimeout(() => {
            mockRes.emit('data', Buffer.from('{ malformed json ,,,'));
            mockRes.emit('end');
          }, 10);
        }, 10);
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler getJobStatus', async () => {
      try {
        await getJobStatus('nuextract.ai', 443, '/api/jobs/{jobId}', null, 'fake-api-key', 'test-job-id');
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur "Invalid JSON response from job status API" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid JSON response from job status API');
    });
    
    and('l\'erreur de parsing est préservée avec Error Cause', () => {
      expect(error.cause).toBeDefined();
      expect(error.cause).toBeInstanceOf(Error);
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  // === Tests des erreurs pour pollJobUntilComplete ===
  
  test('Erreur job terminé sans outputData', ({ given, when, then, and }) => {
    let error;
    
    given('un job avec statut completed mais sans outputData', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockRes = new EventEmitter();
        mockRes.statusCode = 200;
        
        const mockReq = new EventEmitter();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn((timeout, cb) => {});
        mockReq.destroy = jest.fn();
        
        setTimeout(() => {
          callback(mockRes);
          setTimeout(() => {
            mockRes.emit('data', Buffer.from(JSON.stringify({ status: 'completed', outputData: null })));
            mockRes.emit('end');
          }, 10);
        }, 10);
        
        return mockReq;
      });
    });
    
    when('on tente de poller le job', async () => {
      try {
        // maxAttempts=1, interval=100, initialSleepMs=100 pour test rapide
        await pollJobUntilComplete('nuextract.ai', 443, '/api/jobs/{jobId}', null, 'fake-api-key', 'test-job-id', 1, 100, 100);
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur "Job completed mais pas de outputData" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Job completed mais pas de outputData');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  test('Erreur job avec statut failed', ({ given, when, then, and }) => {
    let error;
    
    given('un job avec statut failed', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockRes = new EventEmitter();
        mockRes.statusCode = 200;
        
        const mockReq = new EventEmitter();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn((timeout, cb) => {});
        mockReq.destroy = jest.fn();
        
        setTimeout(() => {
          callback(mockRes);
          setTimeout(() => {
            mockRes.emit('data', Buffer.from(JSON.stringify({ status: 'failed', error: 'Processing error' })));
            mockRes.emit('end');
          }, 10);
        }, 10);
        
        return mockReq;
      });
    });
    
    when('on tente de poller le job', async () => {
      try {
        await pollJobUntilComplete('nuextract.ai', 443, '/api/jobs/{jobId}', null, 'fake-api-key', 'test-job-id', 1, 100, 100);
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur contenant "Job failed" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Job failed');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  test('Timeout polling après max tentatives', ({ given, when, then, and }) => {
    let error;
    
    given('un job qui reste en statut running après max tentatives', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockRes = new EventEmitter();
        mockRes.statusCode = 200;
        
        const mockReq = new EventEmitter();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn((timeout, cb) => {});
        mockReq.destroy = jest.fn();
        
        setTimeout(() => {
          callback(mockRes);
          setTimeout(() => {
            // Toujours retourner "running" pour simuler le timeout
            mockRes.emit('data', Buffer.from(JSON.stringify({ status: 'running' })));
            mockRes.emit('end');
          }, 10);
        }, 10);
        
        return mockReq;
      });
    });
    
    when('on tente de poller le job', async () => {
      try {
        // maxAttempts=3, interval=100, initialSleepMs=100 pour test rapide
        await pollJobUntilComplete('nuextract.ai', 443, '/api/jobs/{jobId}', null, 'fake-api-key', 'test-job-id', 3, 100, 100);
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur contenant "Timeout polling après" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Timeout polling après');
    });
    
    and('une erreur contenant "tentatives" est générée', () => {
      expect(error.message).toContain('tentatives');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 20000); // Timeout de 20s pour permettre le polling avec maxAttempts=3
  
  // === Tests des erreurs HTTP pour getNuExtractProjects ===
  
  test('Erreur réseau lors d\'appel API getNuExtractProjects', ({ given, when, then, and }) => {
    let error;
    
    given('une erreur réseau simulée pour getNuExtractProjects', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockReq = new EventEmitter();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn();
        mockReq.destroy = jest.fn();
        
        setTimeout(() => {
          const networkError = new Error('ECONNRESET');
          networkError.code = 'ECONNRESET';
          mockReq.emit('error', networkError);
        }, 10);
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler getNuExtractProjects', async () => {
      try {
        await getNuExtractProjects('nuextract.ai', 443, '/api/projects', null, 'fake-api-key');
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur "Network error calling GET /api/projects" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Network error calling GET /api/projects');
    });
    
    and('l\'erreur originale est préservée avec Error Cause', () => {
      expect(error.cause).toBeDefined();
      expect(error.cause.code).toBe('ECONNRESET');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  test('Timeout lors d\'appel API getNuExtractProjects', ({ given, when, then, and }) => {
    let error;
    
    given('un timeout simulé après 10 secondes pour getNuExtractProjects', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockReq = new EventEmitter();
        mockReq.end = jest.fn();
        mockReq.destroy = jest.fn();
        
        let timeoutCallback;
        mockReq.setTimeout = jest.fn((timeout, cb) => {
          timeoutCallback = cb;
          setTimeout(() => {
            if (timeoutCallback) timeoutCallback();
          }, 10);
        });
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler getNuExtractProjects', async () => {
      try {
        await getNuExtractProjects('nuextract.ai', 443, '/api/projects', null, 'fake-api-key');
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur "Timeout: La requête GET /api/projects a dépassé 10 secondes" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Timeout: La requête GET /api/projects a dépassé 10 secondes');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  // === Tests des erreurs HTTP pour createNuExtractProject ===
  
  test('Erreur réseau lors d\'appel API createNuExtractProject', ({ given, when, then, and }) => {
    let error;
    
    given('une erreur réseau simulée pour createNuExtractProject', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockReq = new EventEmitter();
        mockReq.write = jest.fn();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn();
        mockReq.destroy = jest.fn();
        
        setTimeout(() => {
          const networkError = new Error('EHOSTUNREACH');
          networkError.code = 'EHOSTUNREACH';
          mockReq.emit('error', networkError);
        }, 10);
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler createNuExtractProject', async () => {
      try {
        await createNuExtractProject('nuextract.ai', 443, '/api/projects', null, 'fake-api-key', { name: 'test', description: 'test' });
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur "Network error calling POST /api/projects" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Network error calling POST /api/projects');
    });
    
    and('l\'erreur originale est préservée avec Error Cause', () => {
      expect(error.cause).toBeDefined();
      expect(error.cause.code).toBe('EHOSTUNREACH');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  // === Tests des erreurs HTTP pour inferTextFromContent ===
  
  test('Erreur réseau lors d\'appel API inferTextFromContent', ({ given, when, then, and }) => {
    let error;
    
    given('une erreur réseau simulée pour inferTextFromContent', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockReq = new EventEmitter();
        mockReq.write = jest.fn();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn();
        mockReq.destroy = jest.fn();
        
        setTimeout(() => {
          const networkError = new Error('EHOSTUNREACH');
          networkError.code = 'EHOSTUNREACH';
          mockReq.emit('error', networkError);
        }, 10);
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler inferTextFromContent', async () => {
      try {
        await inferTextFromContent('nuextract.ai', 443, '/api/projects/{projectId}/infer-text', null, 'test-project-id', 'fake-api-key', 'test text');
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur "Network error calling infer-text API" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Network error calling infer-text API');
    });
    
    and('l\'erreur originale est préservée avec Error Cause', () => {
      expect(error.cause).toBeDefined();
      expect(error.cause.code).toBe('EHOSTUNREACH');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  test('Timeout lors d\'appel API inferTextFromContent', ({ given, when, then, and }) => {
    let error;
    
    given('un timeout simulé après 120 secondes pour inferTextFromContent', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockReq = new EventEmitter();
        mockReq.write = jest.fn();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn((timeoutMs, callback) => {
          if (callback) {
            setTimeout(() => callback(), 10);
          }
        });
        mockReq.destroy = jest.fn();
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler inferTextFromContent', async () => {
      try {
        await inferTextFromContent('nuextract.ai', 443, '/api/projects/{projectId}/infer-text', null, 'test-project-id', 'fake-api-key', 'test text', 120000);
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur contenant "Timeout: La requête infer-text a dépassé 120 secondes" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Timeout: La requête infer-text a dépassé 120 secondes');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  test('Code HTTP non-200 pour inferTextFromContent', ({ given, when, then, and }) => {
    let error;
    
    given('une réponse HTTP 500 de l\'API inferTextFromContent', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockRes = new EventEmitter();
        mockRes.statusCode = 500;
        
        const mockReq = new EventEmitter();
        mockReq.write = jest.fn();
        mockReq.end = jest.fn(() => {
          setTimeout(() => {
            callback(mockRes);
            mockRes.emit('data', 'Internal Server Error');
            mockRes.emit('end');
          }, 10);
        });
        mockReq.setTimeout = jest.fn();
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler inferTextFromContent', async () => {
      try {
        await inferTextFromContent('nuextract.ai', 443, '/api/projects/{projectId}/infer-text', null, 'test-project-id', 'fake-api-key', 'test text');
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur contenant "Erreur infer-text: 500" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Erreur infer-text: 500');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  test('JSON invalide dans réponse inferTextFromContent', ({ given, when, then, and }) => {
    let error;
    
    given('une réponse avec JSON malformé pour inferTextFromContent', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockRes = new EventEmitter();
        mockRes.statusCode = 200;
        
        const mockReq = new EventEmitter();
        mockReq.write = jest.fn();
        mockReq.end = jest.fn(() => {
          setTimeout(() => {
            callback(mockRes);
            mockRes.emit('data', '{ invalid json }');
            mockRes.emit('end');
          }, 10);
        });
        mockReq.setTimeout = jest.fn();
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler inferTextFromContent', async () => {
      try {
        await inferTextFromContent('nuextract.ai', 443, '/api/projects/{projectId}/infer-text', null, 'test-project-id', 'fake-api-key', 'test text');
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur "Invalid JSON response from infer-text API" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid JSON response from infer-text API');
    });
    
    and('l\'erreur de parsing est préservée avec Error Cause', () => {
      expect(error.cause).toBeDefined();
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  test('Path invalide pour inferTextFromContent', ({ given, when, then, and }) => {
    let error;
    
    given('un path invalide pour inferTextFromContent', () => {
      // Pas besoin de mock, la validation se fait avant l'appel HTTP
    });
    
    when('on tente d\'appeler inferTextFromContent', async () => {
      try {
        await inferTextFromContent('nuextract.ai', 443, null as any, null, 'test-project-id', 'fake-api-key', 'test text');
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur contenant "Invalid path" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid path');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  
  test('ProjectId invalide pour inferTextFromContent', ({ given, when, then, and }) => {
    let error;
    
    given('un projectId invalide (null ou vide) pour inferTextFromContent', () => {
      // Pas besoin de mock, la validation se fait avant l'appel HTTP
    });
    
    when('on tente d\'appeler inferTextFromContent', async () => {
      try {
        await inferTextFromContent('nuextract.ai', 443, '/api/projects/{projectId}/infer-text', null, null as any, 'fake-api-key', 'test text');
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur contenant "Invalid projectId" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid projectId');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
});

