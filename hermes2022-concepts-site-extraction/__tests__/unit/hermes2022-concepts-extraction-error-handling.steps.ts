// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import https from 'https';
import http from 'http';
import { EventEmitter } from 'events';

// Import des fonctions du module client
import {
  _testOnly_collectHtmlSourcesAndInstructions,
  _testOnly_buildExtractionPrompt
} from '../../src/nuextract-client.js';

const feature = loadFeature(__dirname + '/hermes2022-concepts-extraction-error-handling.feature');

// Variables pour restauration des mocks
let originalHttpsRequest: typeof https.request;
let originalHttpRequest: typeof http.request;

// Hooks pour isolation des tests (bonne pratique Jest/BDD)
beforeEach(() => {
  // Sauvegarder les fonctions originales avant chaque test
  originalHttpsRequest = https.request;
  originalHttpRequest = http.request;
  jest.clearAllMocks();
});

afterEach(() => {
  // Restaurer les fonctions originales après chaque test
  https.request = originalHttpsRequest;
  http.request = originalHttpRequest;
  jest.restoreAllMocks();
});

defineFeature(feature, (test) => {
  // === Gestion des erreurs pour collectHtmlSourcesAndInstructions ===
  
  test('Schéma invalide (null) pour collectHtmlSourcesAndInstructions', ({ given, when, then, and }) => {
    let error;
    
    given('un schéma résolu null pour collectHtmlSourcesAndInstructions', () => {
      // Pas besoin de mock, la validation se fait avant tout appel HTTP
    });
    
    when('on tente d\'appeler collectHtmlSourcesAndInstructions', async () => {
      try {
        await _testOnly_collectHtmlSourcesAndInstructions(
          null,
          { nuextract: { extractionBlocksMaxDepth: 10 } },
          'https://www.hermes.admin.ch/en',
          '/',
          0,
          10
        );
      } catch (e) {
        error = e;
      }
    });
    
    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Script stopped');
      jest.clearAllMocks();
    });
  });
  
  test('Schéma invalide (non-objet) pour collectHtmlSourcesAndInstructions', ({ given, when, then, and }) => {
    let error;
    
    given('un schéma résolu non-objet (string) pour collectHtmlSourcesAndInstructions', () => {
      // Pas besoin de mock, la validation se fait avant tout appel HTTP
    });
    
    when('on tente d\'appeler collectHtmlSourcesAndInstructions', async () => {
      try {
        await _testOnly_collectHtmlSourcesAndInstructions(
          'invalid schema' as any,
          { nuextract: { extractionBlocksMaxDepth: 10 } },
          'https://www.hermes.admin.ch/en',
          '/',
          0,
          10
        );
      } catch (e) {
        error = e;
      }
    });
    
    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Script stopped');
      jest.clearAllMocks();
    });
  });
  
  test('Profondeur maximale atteinte pour collectHtmlSourcesAndInstructions', ({ given, when, then, and }) => {
    let error;
    
    given('un schéma résolu avec récursivité profonde', () => {
      // Pas besoin de mock, la validation se fait avant tout appel HTTP
    });
    
    and('maxDepth configuré à 0 pour collectHtmlSourcesAndInstructions', () => {
      // maxDepth sera 0 dans l'appel
    });
    
    when('on tente d\'appeler collectHtmlSourcesAndInstructions', async () => {
      try {
        await _testOnly_collectHtmlSourcesAndInstructions(
          { method: { properties: {} } },
          { nuextract: { extractionBlocksMaxDepth: 10 } },
          'https://www.hermes.admin.ch/en',
          '/',
          0,
          0 // maxDepth = 0, profondeur actuelle = 0, donc depth >= maxDepth
        );
      } catch (e) {
        error = e;
      }
    });
    
    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Script stopped');
      jest.clearAllMocks();
    });
  });
  
  test('Instructions manquantes pour bloc avec sourceUrl', ({ given, when, then, and }) => {
    let error;
    
    given('un schéma résolu avec bloc sourceUrl sans extractionInstructions', () => {
      // Pas besoin de mock, la validation se fait avant tout appel HTTP
    });
    
    when('on tente d\'appeler collectHtmlSourcesAndInstructions', async () => {
      try {
        await _testOnly_collectHtmlSourcesAndInstructions(
          {
            method: {
              properties: {
                sourceUrl: {
                  enum: ['/']
                }
                // Pas d'extractionInstructions
              }
            }
          },
          { nuextract: { extractionBlocksMaxDepth: 10 } },
          'https://www.hermes.admin.ch/en',
          '/',
          0,
          10
        );
      } catch (e) {
        error = e;
      }
    });
    
    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
    
    and('le JSON Pointer du bloc est inclus dans le message d\'erreur', () => {
      expect(error.message).toContain('/method');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Script stopped');
      jest.clearAllMocks();
    });
  });
  
  test('Instructions invalides (type non-array) pour collectHtmlSourcesAndInstructions', ({ given, when, then, and }) => {
    let error;
    
    given('un schéma résolu avec extractionInstructions de type non-array', () => {
      // Pas besoin de mock, la validation se fait avant tout appel HTTP
    });
    
    when('on tente d\'appeler collectHtmlSourcesAndInstructions', async () => {
      try {
        await _testOnly_collectHtmlSourcesAndInstructions(
          {
            method: {
              properties: {
                sourceUrl: {
                  enum: ['/']
                },
                extractionInstructions: {
                  type: 'string' // Type invalide (non-array)
                }
              }
            }
          },
          { nuextract: { extractionBlocksMaxDepth: 10 } },
          'https://www.hermes.admin.ch/en',
          '/',
          0,
          10
        );
      } catch (e) {
        error = e;
      }
    });
    
    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
    
    and('le JSON Pointer du bloc est inclus dans le message d\'erreur', () => {
      expect(error.message).toContain('/method');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Script stopped');
      jest.clearAllMocks();
    });
  });
  
  test('Instructions invalides (items.enum manquant) pour collectHtmlSourcesAndInstructions', ({ given, when, then, and }) => {
    let error;
    
    given('un schéma résolu avec extractionInstructions array sans items.enum', () => {
      // Pas besoin de mock, la validation se fait avant tout appel HTTP
    });
    
    when('on tente d\'appeler collectHtmlSourcesAndInstructions', async () => {
      try {
        await _testOnly_collectHtmlSourcesAndInstructions(
          {
            method: {
              properties: {
                sourceUrl: {
                  enum: ['/']
                },
                extractionInstructions: {
                  type: 'array'
                  // Pas d'items.enum
                }
              }
            }
          },
          { nuextract: { extractionBlocksMaxDepth: 10 } },
          'https://www.hermes.admin.ch/en',
          '/',
          0,
          10
        );
      } catch (e) {
        error = e;
      }
    });
    
    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
    
    and('le JSON Pointer du bloc est inclus dans le message d\'erreur', () => {
      expect(error.message).toContain('/method');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Script stopped');
      jest.clearAllMocks();
    });
  });
  
  test('Instructions invalides (array vide) pour collectHtmlSourcesAndInstructions', ({ given, when, then, and }) => {
    let error;
    
    given('un schéma résolu avec extractionInstructions array vide', () => {
      // Pas besoin de mock, la validation se fait avant tout appel HTTP
    });
    
    when('on tente d\'appeler collectHtmlSourcesAndInstructions', async () => {
      try {
        await _testOnly_collectHtmlSourcesAndInstructions(
          {
            method: {
              properties: {
                sourceUrl: {
                  enum: ['/']
                },
                extractionInstructions: {
                  type: 'array',
                  items: {
                    enum: [] // Array vide
                  }
                }
              }
            }
          },
          { nuextract: { extractionBlocksMaxDepth: 10 } },
          'https://www.hermes.admin.ch/en',
          '/',
          0,
          10
        );
      } catch (e) {
        error = e;
      }
    });
    
    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
    
    and('le JSON Pointer du bloc est inclus dans le message d\'erreur', () => {
      expect(error.message).toContain('/method');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Script stopped');
      jest.clearAllMocks();
    });
  });
  
  test('Erreur chargement HTML (propagée depuis fetchHtmlContent) pour collectHtmlSourcesAndInstructions', ({ given, when, then, and }) => {
    let error;
    
    given('un schéma résolu avec sourceUrl valide', () => {
      // Pas besoin de mock spécifique, le mock sera fait dans le step suivant
    });
    
    and('fetchHtmlContent simulé pour lever une erreur réseau', () => {
      // Mock https.request pour simuler erreur réseau (fetchHtmlContent utilise https.request)
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockReq = new EventEmitter();
        mockReq.write = jest.fn();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn();
        mockReq.destroy = jest.fn();
        
        setTimeout(() => {
          const networkError = new Error('EHOSTUNREACH');
          (networkError as any).code = 'EHOSTUNREACH';
          mockReq.emit('error', networkError);
        }, 10);
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler collectHtmlSourcesAndInstructions', async () => {
      try {
        await _testOnly_collectHtmlSourcesAndInstructions(
          {
            method: {
              properties: {
                sourceUrl: {
                  enum: ['/']
                },
                extractionInstructions: {
                  type: 'array',
                  items: {
                    enum: ['Extract overview']
                  }
                }
              }
            }
          },
          { nuextract: { extractionBlocksMaxDepth: 10 } },
          'https://www.hermes.admin.ch/en',
          '/',
          0,
          10
        );
      } catch (e) {
        error = e;
      }
    });
    
    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
    
    and('l\'erreur originale est préservée avec Error Cause', () => {
      expect(error.cause).toBeDefined();
      // L'erreur originale peut être soit "Network error fetching HTML content" soit "EHOSTUNREACH"
      expect(error.cause.message || error.cause.code).toBeTruthy();
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Script stopped');
      jest.clearAllMocks();
    });
  });
  
  // === Gestion des erreurs pour buildExtractionPrompt ===
  
  test('Blocks vide (aucun bloc extractible) pour buildExtractionPrompt', ({ given, when, then, and }) => {
    let error;
    
    given('une préparation avec blocks array vide', () => {
      // Pas besoin de mock, la validation se fait avant toute construction
    });
    
    when('on tente d\'appeler buildExtractionPrompt', () => {
      try {
        _testOnly_buildExtractionPrompt({ blocks: [] });
      } catch (e) {
        error = e;
      }
    });
    
    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Script stopped');
      jest.clearAllMocks();
    });
  });
  
  test('Structure invalide (preparation.blocks undefined) pour buildExtractionPrompt', ({ given, when, then, and }) => {
    let error;
    
    given('une préparation avec blocks undefined', () => {
      // Pas besoin de mock, la validation se fait avant toute construction
    });
    
    when('on tente d\'appeler buildExtractionPrompt', () => {
      try {
        _testOnly_buildExtractionPrompt({} as any);
      } catch (e) {
        error = e;
      }
    });
    
    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Script stopped');
      jest.clearAllMocks();
    });
  });
});

