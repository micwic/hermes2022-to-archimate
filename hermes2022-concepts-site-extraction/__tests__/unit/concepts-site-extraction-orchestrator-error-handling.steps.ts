// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
const path = require('path');
const fs = require('fs');

// Mock des modules clients pour permettre le mocking des appels
jest.mock('../../src/nuextract-client.js', () => {
  const actual = jest.requireActual('../../src/nuextract-client.js');
  return {
    ...actual,
    initializeProject: jest.fn(actual.initializeProject),
    extractSingleBlock: jest.fn(actual.extractSingleBlock)
  };
});

jest.mock('../../src/claude-client.js', () => {
  const actual = jest.requireActual('../../src/claude-client.js');
  return {
    ...actual,
    validateApiKey: jest.fn(actual.validateApiKey),
    extractBlock: jest.fn(actual.extractBlock)
  };
});

jest.mock('../../src/html-collector-and-transformer.js', () => {
  const actual = jest.requireActual('../../src/html-collector-and-transformer.js');
  return {
    ...actual,
    collectHtmlSourcesAndInstructions: jest.fn(actual.collectHtmlSourcesAndInstructions)
  };
});


// Import des modules mockés
const nuextractClient = require('../../src/nuextract-client.js');
const claudeClient = require('../../src/claude-client.js');
const htmlCollector = require('../../src/html-collector-and-transformer.js');

// Import des fonctions du script orchestrateur
const {
  loadGlobalConfig,
  loadApiKeys,
  loadAndResolveSchemas,
  initializeLLMProjects,
  saveArtifact,
  extractHermes2022Concepts
} = require('../../src/concepts-site-extraction-orchestrator.js');

const feature = loadFeature(__dirname + '/concepts-site-extraction-orchestrator-error-handling.feature');

// Variables pour restauration des mocks
let originalReadFileSync: typeof fs.readFileSync;
let originalWriteFileSync: typeof fs.writeFileSync;
let originalMkdirSync: typeof fs.mkdirSync;
let originalExistsSync: typeof fs.existsSync;
let originalEnv: NodeJS.ProcessEnv;

// Hooks pour isolation des tests (bonne pratique Jest/BDD)
beforeEach(() => {
  // Sauvegarder les fonctions originales avant chaque test
  originalReadFileSync = fs.readFileSync;
  originalWriteFileSync = fs.writeFileSync;
  originalMkdirSync = fs.mkdirSync;
  originalExistsSync = fs.existsSync;
  originalEnv = { ...process.env };
  jest.clearAllMocks();
});

afterEach(() => {
  // Restaurer les fonctions originales après chaque test
  fs.readFileSync = originalReadFileSync;
  fs.writeFileSync = originalWriteFileSync;
  fs.mkdirSync = originalMkdirSync;
  fs.existsSync = originalExistsSync;
  process.env = originalEnv;
  jest.restoreAllMocks();
});

defineFeature(feature, (test) => {
  
  // === Gestion des erreurs de configuration (fonction loadGlobalConfig) ===
  // NOTE: Les 4 tests suivants sont temporairement désactivés (test.skip) due à
  // une limitation technique ts-jest + Ajv + ajv-formats (erreur source-map).
  // Voir: .cursor/rules/summary/2025-11-15-source-map-error-ajv-investigation.md
  // La fonction loadGlobalConfig est testée indirectement par les tests d'intégration.

  test.skip('Erreur schéma JSON Schema introuvable', ({ given, when, then, and }) => {
    let error;

    given('un schéma extraction-config.schema.json inexistant', () => {
      fs.readFileSync = jest.fn().mockImplementation((filePath) => {
        if (filePath && filePath.includes('extraction-config.schema.json')) {
          const err = new Error('ENOENT: no such file or directory');
          err.code = 'ENOENT';
          throw err;
        }
        // Pour les autres fichiers, utiliser l'implémentation originale
        return originalReadFileSync(filePath);
      });
    });

    when('on tente de charger la configuration depuis le schéma', async () => {
      try {
        await loadGlobalConfig();
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  test.skip('Erreur schéma JSON Schema malformé', ({ given, when, then, and }) => {
    let error;

    given('un fichier extraction-config.schema.json avec syntaxe JSON invalide', () => {
      fs.readFileSync = jest.fn().mockImplementation((filePath) => {
        if (filePath && filePath.includes('extraction-config.schema.json')) {
          return '{ invalid json }';
        }
        // Pour les autres fichiers, utiliser l'implémentation originale
        return originalReadFileSync(filePath);
      });
    });

    when('on tente de charger la configuration depuis le schéma', async () => {
      try {
        await loadGlobalConfig();
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  test.skip('Erreur structure config invalide après transformation', ({ given, when, then, and }) => {
    let error;

    given('un schéma JSON Schema avec structure invalide après transformation', () => {
      // Schéma qui produit un array au lieu d'un objet après transformation
      const invalidSchema = JSON.stringify({
        type: 'array',
        items: { type: 'string' }
      });
      fs.readFileSync = jest.fn().mockImplementation((filePath) => {
        if (filePath && filePath.includes('extraction-config.schema.json')) {
          return invalidSchema;
        }
        // Pour les autres fichiers, utiliser l'implémentation originale
        return originalReadFileSync(filePath);
      });
    });

    when('on tente de charger la configuration depuis le schéma', async () => {
      try {
        await loadGlobalConfig();
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  test.skip('Erreur section llm absente après transformation', ({ given, when, then, and }) => {
    let error;

    given('un schéma JSON Schema sans section llm après transformation', () => {
      const schemaWithoutLlm = JSON.stringify({
        type: 'object',
        properties: {
          extractionSource: {
            type: 'object',
            properties: {
              baseUrl: { type: 'string', enum: ['https://www.hermes.admin.ch/en'] }
            }
          }
        }
      });
      fs.readFileSync = jest.fn().mockImplementation((filePath) => {
        if (filePath && filePath.includes('extraction-config.schema.json')) {
          return schemaWithoutLlm;
        }
        // Pour les autres fichiers, utiliser l'implémentation originale
        return originalReadFileSync(filePath);
      });
    });

    when('on tente de charger la configuration depuis le schéma', async () => {
      try {
        await loadGlobalConfig();
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  // === Gestion du chargement des clés API (fonction loadApiKeys) ===

  test('Erreur configuration LLM manquante', ({ given, when, then, and }) => {
    let error;

    given('une configuration sans section llm', () => {
      // Pas de configuration nécessaire, on passe directement config sans llm
    });

    when('on tente de charger les clés API', async () => {
      try {
        await loadApiKeys({});
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  test('Erreur configuration LLM invalide (non objet)', ({ given, when, then, and }) => {
    let error;

    given('une configuration avec llm de type string', () => {
      // Pas de configuration nécessaire
    });

    when('on tente de charger les clés API', async () => {
      try {
        await loadApiKeys({ llm: 'invalid' });
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  test('Erreur fichier clé API NuExtract inexistant', ({ given, when, then, and }) => {
    let error;

    given('une configuration avec llm.nuextract.apiKeyFile pointant vers un fichier inexistant', () => {
      // Pas de configuration nécessaire
    });

    and('aucune variable d\'environnement NUEXTRACT_API_KEY', () => {
      delete process.env.NUEXTRACT_API_KEY;
    });

    when('on tente de charger les clés API', async () => {
      fs.readFileSync = jest.fn().mockImplementation(() => {
        const err = new Error('ENOENT: no such file or directory');
        err.code = 'ENOENT';
        throw err;
      });
      
      try {
        await loadApiKeys({
          llm: {
            nuextract: {
              apiKeyFile: 'hermes2022-concepts-site-extraction/config/nuextract-api-key.key'
            }
          }
        });
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  test('Erreur fichier clé API Claude inexistant', ({ given, when, then, and }) => {
    let error;

    given('une configuration avec llm.claude.apiKeyFile pointant vers un fichier inexistant', () => {
      // Pas de configuration nécessaire
    });

    and('aucune variable d\'environnement CLAUDE_API_KEY', () => {
      delete process.env.CLAUDE_API_KEY;
    });

    when('on tente de charger les clés API', async () => {
      fs.readFileSync = jest.fn().mockImplementation(() => {
        const err = new Error('ENOENT: no such file or directory');
        err.code = 'ENOENT';
        throw err;
      });
      
      try {
        await loadApiKeys({
          llm: {
            claude: {
              apiKeyFile: 'hermes2022-concepts-site-extraction/config/claude-api-key.key'
            }
          }
        });
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  test('Erreur clé API NuExtract vide après trim', ({ given, when, then, and }) => {
    let error;

    given('un fichier de clé API NuExtract contenant uniquement des espaces', () => {
      fs.readFileSync = jest.fn().mockReturnValue('   \n\t  ');
    });

    when('on tente de charger les clés API', async () => {
      try {
        await loadApiKeys({
          llm: {
            nuextract: {
              apiKeyFile: 'hermes2022-concepts-site-extraction/config/nuextract-api-key.key'
            }
          }
        });
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  test('Erreur clé API NuExtract format JWT invalide', ({ given, when, then, and }) => {
    let error;

    given('un fichier de clé API NuExtract contenant "1234" sans format JWT', () => {
      fs.readFileSync = jest.fn().mockReturnValue('1234');
    });

    when('on tente de charger les clés API', async () => {
      try {
        await loadApiKeys({
          llm: {
            nuextract: {
              apiKeyFile: 'hermes2022-concepts-site-extraction/config/nuextract-api-key.key'
            }
          }
        });
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  test('Chargement réussi avec trim appliqué', ({ given, when, then, and }) => {
    let apiKeys;

    given('un fichier de clé API NuExtract contenant une clé valide avec espaces', () => {
      // Mock JWT valide
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      fs.readFileSync = jest.fn().mockImplementation((filePath) => {
        if (filePath.includes('nuextract-api-key.key')) {
          return `  ${validJWT}  \n`;
        }
        if (filePath.includes('claude-api-key.key')) {
          return '  sk-ant-api03-valid-key  \n';
        }
        return '';
      });
    });

    and('un fichier de clé API Claude contenant une clé valide', () => {
      // Déjà mocké dans le given précédent
    });

    when('on tente de charger les clés API', async () => {
      apiKeys = await loadApiKeys({
        llm: {
          nuextract: {
            apiKeyFile: 'hermes2022-concepts-site-extraction/config/nuextract-api-key.key'
          },
          claude: {
            apiKeyFile: 'hermes2022-concepts-site-extraction/config/claude-api-key.key'
          }
        }
      });
    });

    then('les clés sont chargées avec succès', () => {
      expect(apiKeys).toBeDefined();
      expect(apiKeys.nuextract).toBeDefined();
      expect(apiKeys.claude).toBeDefined();
    });

    and('les espaces ont été supprimés', () => {
      expect(apiKeys.nuextract).not.toContain(' ');
      expect(apiKeys.nuextract).not.toContain('\n');
      expect(apiKeys.claude).not.toContain(' ');
      expect(apiKeys.claude).not.toContain('\n');
    });
  }, 5000);

  // === Gestion des erreurs de chargement et résolution des schémas JSON (fonction loadAndResolveSchemas) ===
  // NOTE: Les 3 tests suivants sont temporairement désactivés (test.skip) due à
  // une limitation technique ts-jest + Ajv + ajv-formats (erreur source-map).
  // Voir: .cursor/rules/summary/2025-11-15-source-map-error-ajv-investigation.md

  test.skip('Erreur schéma JSON manquant', ({ given, when, then, and }) => {
    let error;

    given('un fichier de schéma JSON inexistant', () => {
      fs.readFileSync = jest.fn().mockImplementation(() => {
        const err = new Error('ENOENT: no such file or directory');
        err.code = 'ENOENT';
        throw err;
      });
    });

    when('on tente de charger et résoudre le schéma JSON', async () => {
      try {
        await loadAndResolveSchemas({
          llm: {
            nuextract: {
              mainJSONConfigurationFile: 'shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json'
            }
          }
        });
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
    });
  }, 5000);

  test.skip('Erreur fichier $ref manquant', ({ given, when, then, and }) => {
    let error;
    const tmpDir = path.resolve(__dirname, '../tmp-test-schemas');
    const schemaPath = path.join(tmpDir, 'test-schema-with-invalid-ref.json');

    given('un schéma JSON valide avec une référence $ref vers un fichier inexistant', () => {
      // Créer un répertoire temporaire
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      // Créer un schéma avec une référence $ref vers un fichier inexistant
      const schemaWithInvalidRef = {
        '$schema': 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          phases: {
            $ref: './fichier-inexistant-qui-provoque-erreur.json'
          }
        }
      };

      fs.writeFileSync(schemaPath, JSON.stringify(schemaWithInvalidRef, null, 2), 'utf8');

      // Mock fs.readFileSync pour retourner le schéma avec référence invalide
      fs.readFileSync = jest.fn().mockImplementation((filePath) => {
        if (filePath && filePath.includes('test-schema-with-invalid-ref.json')) {
          return fs.readFileSync(schemaPath, 'utf8');
        }
        // Pour les autres fichiers, utiliser l'implémentation originale
        return originalReadFileSync(filePath);
      });
    });

    when('on tente de charger et résoudre le schéma JSON', async () => {
      try {
        await loadAndResolveSchemas({
          llm: {
            nuextract: {
              mainJSONConfigurationFile: 'shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json'
            }
          }
        });
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
    });
  }, 5000);

  test.skip('Erreur JSON malformé', ({ given, when, then, and }) => {
    let error;

    given('un fichier avec syntaxe JSON invalide', () => {
      fs.readFileSync = jest.fn().mockReturnValue('{ invalid json }');
    });

    when('on tente de charger et résoudre le schéma JSON', async () => {
      try {
        await loadAndResolveSchemas({
          llm: {
            nuextract: {
              mainJSONConfigurationFile: 'shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json'
            }
          }
        });
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
    });
  }, 5000);

  test('Erreur schéma JSON non conforme à JSON Schema Draft-07', ({ given, when, then, and }) => {
    let error;
    const tmpDir = path.resolve(__dirname, '../tmp-test-schemas');
    const schemaPath = path.join(tmpDir, 'test-invalid-schema-structure.json');

    given('un JSON valide mais non conforme à JSON Schema Draft-07', () => {
      // Créer un répertoire temporaire
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      // Un JSON syntaxiquement valide mais qui ne respecte pas JSON Schema Draft-07
      // Par exemple : un objet qui prétend être un schéma mais avec des propriétés invalides
      const invalidSchema = {
        notAValidSchemaProperty: true,
        anotherInvalidProperty: 'yes',
        properties: {
          // "properties" doit être un objet avec des schémas valides, pas des strings
          name: 'this should be a schema object not a string'
        }
      };

      // Créer un fichier temporaire avec le schéma invalide
      fs.writeFileSync(schemaPath, JSON.stringify(invalidSchema, null, 2), 'utf8');

      // Mock fs.readFileSync pour retourner le schéma invalide
      fs.readFileSync = jest.fn().mockImplementation((filePath) => {
        if (filePath && filePath.includes('test-invalid-schema-structure.json')) {
          return fs.readFileSync(schemaPath, 'utf8');
        }
        // Pour les autres fichiers, utiliser l'implémentation originale
        return originalReadFileSync(filePath);
      });
    });

    when('on tente de charger et résoudre le schéma JSON', async () => {
      try {
        // Utiliser le chemin relatif
        await loadAndResolveSchemas({
          llm: {
            nuextract: {
              mainJSONConfigurationFile: schemaPath
            }
          }
        });
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid JSON schema structure or content');
      expect(error.cause).toBeDefined();
      expect(error.cause.message).toContain(expectedMessage);
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      // Nettoyer les fichiers temporaires
      if (fs.existsSync(schemaPath)) {
        fs.unlinkSync(schemaPath);
      }
      if (fs.existsSync(tmpDir)) {
        try {
          fs.rmdirSync(tmpDir);
        } catch (e) {
          // Ignorer erreur si répertoire non vide
        }
      }
    });
  }, 5000);

  // === Gestion des erreurs d'initialisation des projets LLM (fonction initializeLLMProjects) ===

  test('Erreur initialisation projet NuExtract échouée', ({ given, when, then, and }) => {
    let error;

    given('une configuration valide', () => {
      // Pas de configuration nécessaire
    });

    and('des clés API valides', () => {
      // Pas de configuration nécessaire
    });

    and('un schéma JSON résolu valide', () => {
      // Pas de configuration nécessaire
    });

    and('initializeProject de nuextract-client échoue', () => {
      (nuextractClient.initializeProject as jest.Mock).mockRejectedValue(
        new Error('NuExtract project initialization failed')
      );
    });

    when('on tente d\'initialiser les projets LLM', async () => {
      try {
        await initializeLLMProjects(
          { llm: { nuextract: {} } },
          { nuextract: 'valid-jwt-token' },
          { properties: {} }
        );
      } catch (e) {
        error = e;
      }
    });

    then('une erreur est propagée depuis nuextract-client', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('NuExtract project initialization failed');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  test('Erreur validation clé API Claude échouée', ({ given, when, then, and }) => {
    let error;

    given('une configuration valide', () => {
      // Pas de configuration nécessaire
    });

    and('des clés API valides', () => {
      // Pas de configuration nécessaire
    });

    and('un schéma JSON résolu valide', () => {
      // Pas de configuration nécessaire
    });

    and('validateApiKey de claude-client échoue', () => {
      (claudeClient.validateApiKey as jest.Mock).mockRejectedValue(
        new Error('Claude API key validation failed')
      );
    });

    when('on tente d\'initialiser les projets LLM', async () => {
      try {
        await initializeLLMProjects(
          { llm: { claude: {} } },
          { claude: 'sk-ant-api03-invalid-key' },
          { properties: {} }
        );
      } catch (e) {
        error = e;
      }
    });

    then('une erreur est propagée depuis claude-client', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Claude API key validation failed');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  // === Gestion des erreurs de sauvegarde (fonction saveArtifact) ===

  test('Erreur répertoire de sauvegarde non accessible', ({ given, when, then, and }) => {
    let error;

    given('une configuration valide', () => {
      // Pas de configuration nécessaire
    });

    and('un artefact valide', () => {
      // Pas de configuration nécessaire
    });

    and('un répertoire de sauvegarde non accessible en écriture', () => {
      fs.existsSync = jest.fn().mockReturnValue(false);
      fs.mkdirSync = jest.fn().mockImplementation(() => {
        const err = new Error('EACCES: permission denied');
        err.code = 'EACCES';
        throw err;
      });
    });

    when('on tente de sauvegarder l\'artefact', async () => {
      try {
        await saveArtifact(
          {
            artifactBaseDir: 'shared/hermes2022-extraction-files/data'
          },
          { method: {}, concepts: {} }
        );
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      // Cas spécial : "EACCES" ou "ENOENT" → vérifier que le message contient l'un des deux
      if (expectedMessage.includes('" ou "')) {
        const options = expectedMessage.split('" ou "');
        const hasMatch = options.some(opt => error.message.includes(opt.replace(/"/g, '')));
        expect(hasMatch).toBe(true);
      } else {
        expect(error.message).toContain(expectedMessage);
      }
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  test('Erreur écriture fichier artefact échouée', ({ given, when, then, and }) => {
    let error;

    given('une configuration valide', () => {
      // Pas de configuration nécessaire
    });

    and('un artefact valide', () => {
      // Pas de configuration nécessaire
    });

    and('fs.writeFileSync échoue lors de l\'écriture', () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.writeFileSync = jest.fn().mockImplementation(() => {
        const err = new Error('EACCES: permission denied');
        err.code = 'EACCES';
        throw err;
      });
    });

    when('on tente de sauvegarder l\'artefact', async () => {
      try {
        await saveArtifact(
          {
            artifactBaseDir: 'shared/hermes2022-extraction-files/data'
          },
          { method: {}, concepts: {} }
        );
      } catch (e) {
        error = e;
      }
    });

    then('une erreur est générée', () => {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(Error);
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  // === Gestion des erreurs d'extraction (fonction extractHermes2022Concepts) ===

  test('Erreur collecte HTML échouée', ({ given, when, then, and }) => {
    let error;

    given('une configuration valide', () => {
      // Pas de configuration nécessaire
    });

    and('un schéma JSON résolu valide', () => {
      // Pas de configuration nécessaire
    });

    and('des clés API valides', () => {
      // Pas de configuration nécessaire
    });

    and('collectHtmlSourcesAndInstructions échoue', () => {
      (htmlCollector.collectHtmlSourcesAndInstructions as jest.Mock).mockRejectedValue(
        new Error('HTML collection failed')
      );
    });

    when('on tente d\'extraire les concepts HERMES2022', async () => {
      try {
        await extractHermes2022Concepts(
          { extractionSource: { baseUrl: 'https://www.hermes.admin.ch/en' } },
          { properties: {} },
          { nuextract: 'valid-jwt', claude: 'valid-key' }
        );
      } catch (e) {
        error = e;
      }
    });

    then('une erreur est propagée depuis html-collector', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('HTML collection failed');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  // NOTE: Test suivant temporairement désactivé (test.skip) - utilise Ajv dans recomposeArtifact()
  // Voir: .cursor/rules/summary/2025-11-15-source-map-error-ajv-investigation.md
  test.skip('Erreur extraction bloc NuExtract échouée', ({ given, when, then, and }) => {
    let error;

    given('une configuration valide', () => {
      // Pas de configuration nécessaire
    });

    and('un schéma JSON résolu valide', () => {
      // Pas de configuration nécessaire
    });

    and('des clés API valides', () => {
      // Pas de configuration nécessaire
    });

    and('des blocs HTML collectés avec succès', () => {
      (htmlCollector.collectHtmlSourcesAndInstructions as jest.Mock).mockResolvedValue({
        blocks: [
          {
            jsonPointer: '/method',
            instructions: [],
            htmlContents: [{ url: 'https://example.com', content: '<html></html>' }]
          }
        ]
      });
    });

    and('extractSingleBlock de nuextract-client échoue', () => {
      (nuextractClient.extractSingleBlock as jest.Mock).mockRejectedValue(
        new Error('NuExtract extraction failed')
      );
    });

    when('on tente d\'extraire les concepts HERMES2022', async () => {
      try {
        await extractHermes2022Concepts(
          {
            extractionSource: { baseUrl: 'https://www.hermes.admin.ch/en' },
            llm: { nuextract: { extractionBlocksMaxDepth: 10 } }
          },
          {
            properties: {
              method: {
                properties: {
                  extractionModel: { enum: ['nuextract'] }
                }
              }
            }
          },
          { nuextract: 'valid-jwt', claude: 'valid-key' }
        );
      } catch (e) {
        error = e;
      }
    });

    then('une erreur est propagée depuis nuextract-client', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('NuExtract extraction failed');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  test('Erreur extraction bloc Claude échouée', ({ given, when, then, and }) => {
    let error;

    given('une configuration valide', () => {
      // Pas de configuration nécessaire
    });

    and('un schéma JSON résolu valide', () => {
      // Pas de configuration nécessaire
    });

    and('des clés API valides', () => {
      // Pas de configuration nécessaire
    });

    and('des blocs HTML collectés avec succès', () => {
      (htmlCollector.collectHtmlSourcesAndInstructions as jest.Mock).mockResolvedValue({
        blocks: [
          {
            jsonPointer: '/method',
            instructions: [],
            htmlContents: [{ url: 'https://example.com', content: '<html></html>' }]
          }
        ]
      });
    });

    and('extractBlock de claude-client échoue', () => {
      (claudeClient.extractBlock as jest.Mock).mockRejectedValue(
        new Error('Claude extraction failed')
      );
    });

    when('on tente d\'extraire les concepts HERMES2022', async () => {
      try {
        await extractHermes2022Concepts(
          {
            extractionSource: { baseUrl: 'https://www.hermes.admin.ch/en' },
            llm: { nuextract: { extractionBlocksMaxDepth: 10 } }
          },
          {
            properties: {
              method: {
                properties: {
                  extractionModel: { enum: ['claude'] }
                }
              }
            }
          },
          { nuextract: 'valid-jwt', claude: 'valid-key' }
        );
      } catch (e) {
        error = e;
      }
    });

    then('une erreur est propagée depuis claude-client', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Claude extraction failed');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

  test('Erreur validation artefact échouée', ({ given, when, then, and }) => {
    let error;

    given('une configuration valide', () => {
      // Pas de configuration nécessaire
    });

    and('un schéma JSON résolu valide', () => {
      // Pas de configuration nécessaire
    });

    and('des clés API valides', () => {
      // Pas de configuration nécessaire
    });

    and('des blocs HTML collectés avec succès', () => {
      (htmlCollector.collectHtmlSourcesAndInstructions as jest.Mock).mockResolvedValue({
        blocks: [
          {
            jsonPointer: '/method',
            instructions: [],
            htmlContents: [{ url: 'https://example.com', content: '<html></html>' }]
          }
        ]
      });
    });

    and('un artefact extrait non conforme au schéma', () => {
      // Mock extraction qui retourne un artefact invalide
      (claudeClient.extractBlock as jest.Mock).mockResolvedValue({
        jsonPointer: '/method',
        data: { invalidField: 'invalid' } // Artefact non conforme
      });
    });

    when('on tente d\'extraire les concepts HERMES2022', async () => {
      try {
        await extractHermes2022Concepts(
          {
            extractionSource: { baseUrl: 'https://www.hermes.admin.ch/en' },
            llm: { nuextract: { extractionBlocksMaxDepth: 10 } }
          },
          {
            properties: {
              method: {
                type: 'object',
                properties: {
                  extractionModel: { enum: ['claude'] },
                  hermesVersion: { type: 'string' }
                },
                required: ['hermesVersion']
              }
            },
            required: ['method']
          },
          { nuextract: 'valid-jwt', claude: 'valid-key' }
        );
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  }, 5000);

});

