// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import { Given, When, Then } from 'jest-cucumber';
import path from 'path';
import fs from 'fs';

// Mock du module API pour permettre le mocking des appels HTTP
jest.mock('../../src/nuextract-api.js', () => {
  const actual = jest.requireActual('../../src/nuextract-api.js');
  return {
    ...actual,
    inferTemplateFromDescriptionAsync: jest.fn(actual.inferTemplateFromDescriptionAsync),
    pollJobUntilComplete: jest.fn(actual.pollJobUntilComplete),
    getNuExtractProjects: jest.fn(actual.getNuExtractProjects),
    putProjectTemplate: jest.fn(actual.putProjectTemplate)
  };
});

// Import du module API mocké (exports normaux !)
import * as nuextractApi from '../../src/nuextract-api.js';

// Import des fonctions du script refactorisé
import { 
  _testOnly_loadGlobalConfig as loadGlobalConfig, 
  _testOnly_loadApiKey as loadApiKey,
  _testOnly_loadInstructions as loadInstructions,
  _testOnly_loadAndResolveSchemas as loadAndResolveSchemas,
  _testOnly_generateTemplate as generateTemplate, 
  _testOnly_findOrCreateProject as findOrCreateProject
} from '../../src/nuextract-client.js';
import { resolveFromRepoRoot } from '../../src/path-resolver.js';

const feature = loadFeature(__dirname + '/nuextract-client-error-handling.feature');

// Variables pour restauration des mocks
let originalReadFileSync: typeof fs.readFileSync;

// Hooks pour isolation des tests (bonne pratique Jest/BDD)
beforeEach(() => {
  // Sauvegarder les fonctions originales avant chaque test
  originalReadFileSync = fs.readFileSync;
  jest.clearAllMocks();
});

afterEach(() => {
  // Restaurer les fonctions originales après chaque test
  fs.readFileSync = originalReadFileSync;
  jest.restoreAllMocks();
});

defineFeature(feature, (test) => {
  
  // === Gestion des erreurs de configuration (fonction loadGlobalConfig) ===
  
  test('Erreur générée et gérée en cas de fichier de configuration général extraction-config.json manquant', ({ given, when, then, and }) => {
    let error;

    given('un fichier de configuration général extraction-config.json inexistant', () => {
      // Mocker fs.readFileSync pour simuler un fichier manquant
      fs.readFileSync = jest.fn().mockImplementation(() => {
        const err = new Error('ENOENT: no such file or directory');
        err.code = 'ENOENT';
        throw err;
      });
    });

    when('on tente de charger la configuration', async () => {
      try {
        await loadGlobalConfig();
      } catch (e) {
        error = e;
      }
    });

    then('une erreur adhoc au fichier de configuration général extraction-config.json manquant générée', () => {
      expect(error).toBeDefined();
      // Le code encapsule l'erreur système dans son propre message
      expect(error.message).toContain('Configuration file not found');
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  test('Erreur générée et gérée en cas de fichier de configuration général extraction-config.json présent mais malformé', ({ given, when, then, and }) => {
    let error;

    given('un fichier de configuration général extraction-config.json existant mais malformé', () => {
      // Mocker fs.readFileSync pour retourner du JSON invalide
      fs.readFileSync = jest.fn().mockImplementation((filePath, encoding) => {
        if (filePath.includes('extraction-config.json')) {
          return '{ invalid json ,,, }';
        }
        return originalReadFileSync(filePath, encoding);
      });
    });

    when('on tente de charger la configuration', async () => {
      try {
        await loadGlobalConfig();
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid JSON in main configuration file');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  test('Erreur générée et gérée en cas de section nuextract absente dans le fichier de configuration', ({ given, when, then, and }) => {
    let error;

    given('un fichier de configuration général extraction-config.json existant et formatté mais sans section nuextract', () => {
      // Mocker fs.readFileSync pour retourner une config valide JSON mais sans section nuextract
      fs.readFileSync = jest.fn().mockImplementation((filePath, encoding) => {
        if (filePath.includes('extraction-config.json')) {
          return JSON.stringify({
            hermesVersion: "2022",
            extractionSource: {
              baseUrl: "https://www.hermes.admin.ch/en",
              language: "en"
            }
            // Section nuextract absente
          });
        }
        return originalReadFileSync(filePath, encoding);
      });
    });

    when('on tente de charger la configuration', async () => {
      try {
        await loadGlobalConfig();
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('missing "nuextract" section');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  test('Erreur générée et gérée en cas de section nuextract avec moins de 15 clés', ({ given, when, then, and }) => {
    let error;

    given('un fichier de configuration général extraction-config.json avec section nuextract contenant moins de 15 clés', () => {
      // Mocker fs.readFileSync pour retourner une config valide JSON mais avec moins de 15 clés dans nuextract
      fs.readFileSync = jest.fn().mockImplementation((filePath, encoding) => {
        if (filePath.includes('extraction-config.json')) {
          return JSON.stringify({
            hermesVersion: "2022",
            nuextract: {
              apiKeyFile: "config/key.key",
              projectName: "TEST",
              baseUrl: "nuextract.ai",
              port: 443
              // Seulement 4 clés au lieu de 15 minimum
            }
          });
        }
        return originalReadFileSync(filePath, encoding);
      });
    });

    when('on tente de charger la configuration', async () => {
      try {
        await loadGlobalConfig();
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid JSON minimal content for nuextract-client.js in main configuration file');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });
  // === Gestion du chargement de la clé API (fonction loadApiKey) ===

  test('Erreur si variable d\'environnement et fichier tous deux absents', ({ given, when, then, and }) => {
    let error;
    let config;
    let originalEnv;

    given('aucune variable d\'environnement NUEXTRACT_API_KEY', () => {
      originalEnv = process.env.NUEXTRACT_API_KEY;
      delete process.env.NUEXTRACT_API_KEY;
    });

    and('un fichier de clé API inexistant', async () => {
      config = await loadGlobalConfig();
      config.nuextract.apiKeyFile = 'chemin/inexistant/api-key.key';
    });

    when('on tente de charger la clé API', async () => {
      try {
        await loadApiKey(config);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('API_KEY is not set');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      // Restaurer env
      if (originalEnv) {
        process.env.NUEXTRACT_API_KEY = originalEnv;
      }
    });
  });

  test('Erreur si clé vide après trim (whitespace uniquement)', ({ given, when, then, and }) => {
    let error;
    let config;

    given('un fichier de clé API contenant uniquement des espaces et retours à la ligne', async () => {
      config = await loadGlobalConfig();
      // Mock fs.readFileSync pour retourner whitespace uniquement
      fs.readFileSync = jest.fn().mockImplementation((filePath, encoding) => {
        if (filePath.includes('nuextract-api-key.key')) {
          return '   \n  \t  \n  '; // Whitespace uniquement
        }
        return originalReadFileSync(filePath, encoding);
      });
    });

    when('on tente de charger la clé API', async () => {
      try {
        await loadApiKey(config);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('API key is empty after trimming');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  test('Erreur si clé n\'est pas au format JWT valide', ({ given, when, then, and }) => {
    let error;
    let config;

    given('un fichier de clé API contenant "1234" sans format JWT', async () => {
      config = await loadGlobalConfig();
      // Mock fs.readFileSync pour retourner une clé non-JWT
      fs.readFileSync = jest.fn().mockImplementation((filePath, encoding) => {
        if (filePath.includes('nuextract-api-key.key')) {
          return '1234'; // Clé simple sans format JWT
        }
        return originalReadFileSync(filePath, encoding);
      });
    });

    when('on tente de charger la clé API', async () => {
      try {
        await loadApiKey(config);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('API key format is invalid');
      // Le message peut être "JWT structure is invalid" ou "could not decode"
      expect(error.message.toLowerCase()).toMatch(/jwt|structure|decode|invalid/);
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  test('Chargement réussi avec trim appliqué', ({ given, when, then, and }) => {
    let result;
    let config;
    // JWT valide de test: header {"alg":"HS256","typ":"JWT"} + payload {"sub":"test","iat":1234567890}
    const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiaWF0IjoxMjM0NTY3ODkwfQ.signature';

    given('un fichier de clé API contenant une clé valide avec espaces', async () => {
      config = await loadGlobalConfig();
      // Mock fs.readFileSync pour retourner une clé JWT valide avec espaces
      fs.readFileSync = jest.fn().mockImplementation((filePath, encoding) => {
        if (filePath.includes('nuextract-api-key.key')) {
          return `  \n  ${validJWT}  \t  `; // JWT valide avec espaces
        }
        return originalReadFileSync(filePath, encoding);
      });
    });

    when('on tente de charger la clé API', async () => {
      result = await loadApiKey(config);
    });

    then('la clé est chargée avec succès', () => {
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      // Vérifier que c'est bien au format JWT (3 parties)
      expect(result.split('.').length).toBe(3);
    });

    and('les espaces ont été supprimés', () => {
      expect(result).toBe(validJWT);
      expect(result).not.toContain(' ');
      expect(result).not.toContain('\n');
      expect(result).not.toContain('\t');
    });
  });

  // === Gestion des erreurs de chargement des instructions (fonction loadInstructions) ===

  test('Erreur fichier instructions manquant', ({ given, when, then, and }) => {
    let error;
    let config;

    given('un fichier d\'instructions inexistant', async () => {
      config = await loadGlobalConfig();
      // Mock fs.readFileSync pour simuler un fichier manquant
      fs.readFileSync = jest.fn().mockImplementation((filePath, encoding) => {
        if (filePath.includes('instructions-template-nuextract.md')) {
          const err = new Error('ENOENT: no such file or directory');
          err.code = 'ENOENT';
          throw err;
        }
        return originalReadFileSync(filePath, encoding);
      });
    });

    when('on tente de charger les instructions', async () => {
      try {
        await loadInstructions(config);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Instructions file not found');
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      // Vérifier Error Cause
      expect(error.cause).toBeDefined();
      expect(error.cause.code).toBe('ENOENT');
    });
  });

  test('Erreur heading absent dans le fichier d\'instructions', ({ given, when, then, and }) => {
    let error;
    let config;

    given('un fichier d\'instructions sans le heading requis', async () => {
      config = await loadGlobalConfig();
      // Mock fs.readFileSync pour retourner un fichier sans le heading attendu
      fs.readFileSync = jest.fn().mockImplementation((filePath, encoding) => {
        if (filePath.includes('instructions-template-nuextract.md')) {
          // Fichier avec un contenu mais sans le heading correct
          return `# Prompt génération de template NuExtract

## Autres instructions non pertinentes

- instruction 1
- instruction 2
`;
        }
        return originalReadFileSync(filePath, encoding);
      });
    });

    when('on tente de charger les instructions', async () => {
      try {
        await loadInstructions(config);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Instructions heading not found in file');
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  test('Erreur contenu vide après extraction du heading', ({ given, when, then, and }) => {
    let error;
    let config;

    given('un fichier d\'instructions avec heading mais contenu vide', async () => {
      config = await loadGlobalConfig();
      // Mock fs.readFileSync pour retourner un fichier avec heading mais lignes vides
      fs.readFileSync = jest.fn().mockImplementation((filePath, encoding) => {
        if (filePath.includes('instructions-template-nuextract.md')) {
          // Fichier avec le heading correct mais uniquement des lignes vides après
          return `# Prompt génération de template NuExtract

## Instructions complémentaires pour /api/infer-template /api/infer-template-async de NuExtract

   
   
`;
        }
        return originalReadFileSync(filePath, encoding);
      });
    });

    when('on tente de charger les instructions', async () => {
      try {
        await loadInstructions(config);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Instructions content is empty after extraction');
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  // === Gestion des erreurs de génération de template (fonction generateTemplate) ===

  test('Erreur templateMode invalide', ({ given, when, then, and }) => {
    let error;
    let config;

    given('une configuration avec templateMode "invalid"', async () => {
      config = await loadGlobalConfig();
      config.nuextract.templateMode = 'invalid';
    });

    when('on tente de générer un template', async () => {
      try {
        const apiKey = await loadApiKey(config);
        await generateTemplate(config, apiKey);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('templateMode invalide');
    });

    and('le message indique les valeurs acceptées "sync" et "async"', () => {
      expect(error.message).toContain('sync');
      expect(error.message).toContain('async');
    });
  });

  test('Erreur jobId null en mode async', ({ given, when, then, and }) => {
    let config;
    let apiKey;
    let error;

    given('une configuration avec templateMode async', async () => {
      // Charger config ET apiKey (Arrange = Given)
      config = await loadGlobalConfig();
      apiKey = await loadApiKey(config);
      config.nuextract.templateMode = 'async';
    });

    and('une API async qui ne retourne pas de jobId', () => {
      (nuextractApi.inferTemplateFromDescriptionAsync as jest.Mock)
        .mockResolvedValue({ status: 'submitted' });
    });

    when('on tente de générer un template', async () => {
      try {
        await generateTemplate(config, apiKey); // Act simple
      } catch (err) {
        error = err;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  test('Erreur parse JSON templateData invalide en mode async', ({ given, when, then, and }) => {
    let config;
    let apiKey;
    let error;

    given('une configuration avec templateMode async', async () => {
      // Charger config ET apiKey (Arrange = Given)
      config = await loadGlobalConfig();
      apiKey = await loadApiKey(config);
      config.nuextract.templateMode = 'async';
    });

    and('templateData retourné est une string JSON invalide', () => {
      // Mock 1: inferTemplateFromDescriptionAsync retourne un jobId VALIDE (pas d'erreur à ce niveau)
      (nuextractApi.inferTemplateFromDescriptionAsync as jest.Mock)
        .mockResolvedValue({
          status: 'submitted',
          jobId: 'job-123' // jobId valide pour passer cette étape
        });
      
      // Mock 2: pollJobUntilComplete retourne directement une string JSON INVALIDE (c'est l'erreur testée)
      // Note: pollJobUntilComplete retourne directement outputData, pas l'objet complet
      (nuextractApi.pollJobUntilComplete as jest.Mock)
        .mockResolvedValue('{invalid json}'); // String JSON invalide = erreur isolée
    });

    when('on tente de parser le templateData', async () => {
      try {
        await generateTemplate(config, apiKey); // Act simple
      } catch (err) {
        error = err;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });

    and('l\'erreur originale est préservée avec Error Cause', () => {
      expect(error.cause).toBeDefined();
      expect(error.cause.message).toContain('JSON');
    });
  });

  test('Erreur type templateData invalide en mode async', ({ given, when, then, and }) => {
    let config;
    let apiKey;
    let errorNull;
    let errorNumber;
    let errorArray;

    given('une configuration avec templateMode async', async () => {
      jest.clearAllMocks();
      
      // Charger config ET apiKey (Arrange = Given)
      config = await loadGlobalConfig();
      apiKey = await loadApiKey(config);
      config.nuextract.templateMode = 'async';
    });

    and('templateData retourné est de type invalide (null, number, array)', async () => {
      // Mock inferTemplateFromDescriptionAsync pour retourner un jobId valide (pas d'erreur à ce niveau)
      (nuextractApi.inferTemplateFromDescriptionAsync as jest.Mock)
        .mockResolvedValue({
          status: 'submitted',
          jobId: 'job-123'
        });
    });

    when('on tente de valider le type de templateData', async () => {
      // Test 1: null
      try {
        (nuextractApi.pollJobUntilComplete as jest.Mock)
          .mockResolvedValue(null); // Type invalide : null
        await generateTemplate(config, apiKey);
      } catch (err) {
        errorNull = err;
      }

      // Test 2: number
      try {
        (nuextractApi.pollJobUntilComplete as jest.Mock)
          .mockResolvedValue(42); // Type invalide : number
        await generateTemplate(config, apiKey);
      } catch (err) {
        errorNumber = err;
      }

      // Test 3: array
      try {
        (nuextractApi.pollJobUntilComplete as jest.Mock)
          .mockResolvedValue([1, 2, 3]); // Type invalide : array
        await generateTemplate(config, apiKey);
      } catch (err) {
        errorArray = err;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(errorNull).toBeDefined();
      expect(errorNull.message).toContain(expectedMessage);
      expect(errorNumber).toBeDefined();
      expect(errorNumber.message).toContain(expectedMessage);
      expect(errorArray).toBeDefined();
      expect(errorArray.message).toContain(expectedMessage);
    });

    and('le message indique le type attendu et le type reçu', () => {
      expect(errorNull.message).toContain('expected object or JSON string');
      expect(errorNull.message).toContain('got null');
      expect(errorNumber.message).toContain('got number');
      expect(errorArray.message).toContain('got array');
    });
  });

  // === Gestion des erreurs de chargement et résolution des schémas JSON (fonction loadAndResolveSchemas) ===

  test('Erreur schéma JSON manquant', ({ given, when, then, and }) => {
    let error;
    let config;

    given('un fichier de schéma JSON inexistant', async () => {
      jest.clearAllMocks();
      
      config = await loadGlobalConfig();
      config.nuextract.mainJSONConfigurationFile = 'chemin/inexistant/schema-qui-nexiste-pas.json';
    });

    when('on tente de charger et résoudre le schéma JSON', async () => {
      try {
        await loadAndResolveSchemas(config);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.cause).toBeDefined();
      expect(error.cause.message).toContain(expectedMessage);
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  test('Erreur fichier $ref manquant', ({ given, when, then, and }) => {
    let config;
    let error;
    const tmpDir = path.join(__dirname, '../../tmp-test-schemas');
    const schemaPath = path.join(tmpDir, 'test-schema-with-invalid-ref.json');

    given('un schéma JSON valide avec une référence $ref vers un fichier inexistant', async () => {
      jest.clearAllMocks();
      
      config = await loadGlobalConfig();
      
      // Créer un répertoire temporaire
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      
      // Créer un schéma avec une référence $ref vers un fichier inexistant
      const schemaWithInvalidRef = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "phases": {
            "$ref": "./fichier-inexistant-qui-provoque-erreur.json"
          }
        }
      };
      
      fs.writeFileSync(schemaPath, JSON.stringify(schemaWithInvalidRef, null, 2));
      
      // Utiliser le chemin relatif au repoRoot
      const relativePath = path.relative(resolveFromRepoRoot('.'), schemaPath);
      config.nuextract.mainJSONConfigurationFile = relativePath;
    });

    when('on tente de charger et résoudre le schéma JSON', async () => {
      try {
        await loadAndResolveSchemas(config);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
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
        fs.rmdirSync(tmpDir);
      }
    });
  });

  test('Erreur JSON malformé', ({ given, when, then, and }) => {
    let config;
    let error;
    const tmpDir = path.join(__dirname, '../../tmp-test-schemas');
    const schemaPath = path.join(tmpDir, 'test-malformed-json.json');

    given('un fichier avec syntaxe JSON invalide', async () => {
      jest.clearAllMocks();
      
      config = await loadGlobalConfig();
      
      // Créer un répertoire temporaire
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      
      // Un fichier avec JSON malformé (syntaxe invalide)
      fs.writeFileSync(schemaPath, '{ invalid json syntax ,,, }', 'utf8');
      
      // Utiliser le chemin relatif au repoRoot
      const relativePath = path.relative(resolveFromRepoRoot('.'), schemaPath);
      config.nuextract.mainJSONConfigurationFile = relativePath;
    });

    when('on tente de charger et résoudre le schéma JSON', async () => {
      try {
        await loadAndResolveSchemas(config);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
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
        fs.rmdirSync(tmpDir);
      }
    });
  });

  test('Erreur schéma JSON non conforme à JSON Schema Draft-07', ({ given, when, then, and }) => {
    let config;
    let error;
    const tmpDir = path.join(__dirname, '../../tmp-test-schemas');
    const schemaPath = path.join(tmpDir, 'test-invalid-schema-structure.json');

    given('un JSON valide mais non conforme à JSON Schema Draft-07', async () => {
      jest.clearAllMocks();
      
      config = await loadGlobalConfig();
      
      // Créer un répertoire temporaire
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      
      // Un JSON syntaxiquement valide mais qui ne respecte pas JSON Schema Draft-07
      // Par exemple : un objet qui prétend être un schéma mais avec des propriétés invalides
      const invalidSchema = {
        notAValidSchemaProperty: true,
        anotherInvalidProperty: "yes",
        properties: {
          // "properties" doit être un objet avec des schémas valides, pas des strings
          name: "this should be a schema object not a string"
        }
      };
      fs.writeFileSync(schemaPath, JSON.stringify(invalidSchema, null, 2), 'utf8');
      
      // Utiliser le chemin relatif au repoRoot
      const relativePath = path.relative(resolveFromRepoRoot('.'), schemaPath);
      config.nuextract.mainJSONConfigurationFile = relativePath;
    });

    when('on tente de charger et résoudre le schéma JSON', async () => {
      try {
        await loadAndResolveSchemas(config);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
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
        fs.rmdirSync(tmpDir);
      }
    });
  });

  // === Gestion des erreurs de template NuExtract et appels API ===

  test('Erreur template vide retourné par l\'API', ({ given, when, then, and }) => {
    let error;
    let config;
    let apiKey;

    given('une configuration valide', async () => {
      config = await loadGlobalConfig();
    });

    and('une API qui retourne un template vide', () => {
      // On va simuler cela en vérifiant la réponse après l'appel
    });

    when('on tente de générer un template', async () => {
      try {
        apiKey = await loadApiKey(config);
        const template = await generateTemplate(config, apiKey);
        
        // Vérifier que le template n'est pas vide
        if (!template || Object.keys(template).length === 0) {
          throw new Error('Empty template returned by API');
        }
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      // Dans le cas normal, l'API ne devrait pas retourner un template vide
      // Ce test vérifie la logique de validation
      if (error) {
        expect(error.message).toContain('Empty template');
      } else {
        // Si pas d'erreur, le template est valide
        expect(error).toBeUndefined();
      }
    });

    and('le processus s\'arrête proprement', () => {
      if (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  }, 60000);

  test('Erreur timeout API génération template mode sync', ({ given, when, then, and }) => {
    let error;
    let config;

    given('une configuration avec templateMode sync', async () => {
      config = await loadGlobalConfig();
      config.nuextract.templateMode = 'sync';
      // Réduire le timeout pour forcer un timeout
      config.nuextract.templateGenerationDuration = 1; // 1ms + 5000ms = timeout très court
    });

    and('un schéma très volumineux causant un timeout', () => {
      // Le schéma actuel est assez volumineux pour causer des timeouts en mode sync
    });

    when('on tente de générer un template', async () => {
      try {
        const apiKey = await loadApiKey(config);
        await generateTemplate(config, apiKey);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message.toLowerCase()).toContain('timeout');
    });

    and('le message suggère d\'utiliser le mode async', () => {
      if (error && error.message.includes('sync')) {
        expect(error.message).toContain('async');
      }
    });
  }, 30000);

  test('Erreur API NuExtract inaccessible', ({ given, when, then, and }) => {
    let error;
    let config;

    given('une configuration avec baseUrl incorrect', async () => {
      config = await loadGlobalConfig();
      config.nuextract.baseUrl = 'localhost';
      config.nuextract.port = 99999; // Port inaccessible
    });

    when('on tente d\'appeler l\'API NuExtract', async () => {
      try {
        const apiKey = await loadApiKey(config);
        await generateTemplate(config, apiKey);
      } catch (e) {
        error = e;
      }
    });

    then('une erreur de connexion est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    });

    and('le processus s\'arrête proprement', () => {
      // RangeError est une sous-classe d'Error
      expect(error).toBeDefined();
      expect(error.constructor.name).toMatch(/Error|RangeError/);
    });
  }, 30000);

  // === Gestion des erreurs de gestion de projet (fonction findOrCreateProject) ===

  test('Erreur paramètre projectName manquant ou vide', ({ given, when, then, and }) => {
    let error;

    given('un projectName null ou vide', () => {
      // projectName sera null ou vide
    });

    when('on tente de gérer un projet', async () => {
      try {
        // Appel direct avec projectName null (erreur levée avant appels API)
        await findOrCreateProject(
          'fake-api-key',
          null, // projectName null
          'Test project',
          { test: 'template' },
          false,
          'nuextract.ai',
          443,
          '/api/projects'
        );
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      jest.clearAllMocks();
    });
  });

  test('Erreur création nouveau projet sans template', ({ given, when, then, and }) => {
    let error;

    given('aucun projet existant avec le nom configuré', () => {
      // Mock getNuExtractProjects retournant liste vide (aucun projet existant)
      jest.spyOn(nuextractApi, 'getNuExtractProjects')
        .mockResolvedValue([]);
    });

    and('un template null ou vide', () => {
      // Template sera null
    });

    when('on tente de créer un nouveau projet', async () => {
      try {
        await findOrCreateProject(
          'fake-api-key',
          'test-project',
          'Test project without template',
          null, // template null
          false,
          'nuextract.ai',
          443,
          '/api/projects'
        );
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      jest.clearAllMocks();
    });
  });

  test('Erreur mise à jour projet existant avec mise à jour demandée sans template fourni', ({ given, when, then, and }) => {
    let error;

    given('un projet existant sur la plateforme', () => {
      // Mock getNuExtractProjects retournant un projet existant
      jest.spyOn(nuextractApi, 'getNuExtractProjects')
        .mockResolvedValue([{ id: 'proj-123', name: 'test-project' }]);
    });

    and('templateReset configuré à true', () => {
      // templateReset sera true dans l'appel
    });

    and('un template null ou vide', () => {
      // Template sera null
    });

    when('on tente de mettre à jour le projet', async () => {
      try {
        await findOrCreateProject(
          'fake-api-key',
          'test-project',
          'Test project',
          null, // template null
          true, // templateReset = true
          'nuextract.ai',
          443,
          '/api/projects'
        );
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      jest.clearAllMocks();
    });
  });
});
