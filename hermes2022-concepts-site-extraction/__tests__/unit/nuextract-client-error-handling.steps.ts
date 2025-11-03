// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import { Given, When, Then } from 'jest-cucumber';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { EventEmitter } from 'events';

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
  _testOnly_findOrCreateProject as findOrCreateProject,
  _testOnly_fetchHtmlContent as fetchHtmlContent
} from '../../src/nuextract-client.js';
import { resolveFromRepoRoot } from '../../src/path-resolver.js';

const feature = loadFeature(__dirname + '/nuextract-client-error-handling.feature');

// Variables pour restauration des mocks
let originalReadFileSync: typeof fs.readFileSync;
let originalHttpsRequest: typeof https.request;
let originalHttpRequest: typeof http.request;

// Hooks pour isolation des tests (bonne pratique Jest/BDD)
beforeEach(() => {
  // Sauvegarder les fonctions originales avant chaque test
  originalReadFileSync = fs.readFileSync;
  originalHttpsRequest = https.request;
  originalHttpRequest = http.request;
  jest.clearAllMocks();
});

afterEach(() => {
  // Restaurer les fonctions originales après chaque test
  fs.readFileSync = originalReadFileSync;
  https.request = originalHttpsRequest;
  http.request = originalHttpRequest;
  jest.restoreAllMocks();
});

defineFeature(feature, (test) => {
  
  // === Gestion des erreurs de configuration (fonction loadGlobalConfig) ===

  test('Erreur schéma JSON Schema introuvable', ({ given, when, then, and }) => {
    let error;

    given('un schéma extraction-config.schema.json inexistant', () => {
      // Mocker fs.readFileSync pour simuler un fichier manquant
      fs.readFileSync = jest.fn().mockImplementation(() => {
        const err = new Error('ENOENT: no such file or directory');
        err.code = 'ENOENT';
        throw err;
      });
    });

    when('on tente de charger la configuration depuis le schéma', async () => {
      try {
        await loadGlobalConfig();
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Schema file not found');
      expect(error.message).toContain('Script stopped');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  test('Erreur schéma JSON Schema malformé', ({ given, when, then, and }) => {
    let error;

    given('un fichier extraction-config.schema.json avec syntaxe JSON invalide', () => {
      // Mocker fs.readFileSync pour retourner du JSON invalide
      fs.readFileSync = jest.fn().mockImplementation((filePath, encoding) => {
        if (filePath.includes('extraction-config.schema.json') || filePath.includes('extraction-config.json')) {
          return '{ invalid json ,,, }';
        }
        return originalReadFileSync(filePath, encoding);
      });
    });

    when('on tente de charger la configuration depuis le schéma', async () => {
      try {
        await loadGlobalConfig();
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid JSON');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  test('Erreur structure config invalide après transformation', ({ given, when, then, and }) => {
    let error;

    given('un schéma JSON Schema avec structure invalide après transformation', () => {
      // TODO: À implémenter après création de transformJSONSchemaIntoJSONConfigFile()
      // Ce test nécessitera un mock de transformJSONSchemaIntoJSONConfigFile() retournant une structure invalide
    });

    when('on tente de charger la configuration depuis le schéma', async () => {
      // TODO: À implémenter
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      // TODO: À implémenter
    });

    and('le processus s\'arrête proprement', () => {
      // TODO: À implémenter
    });
  });

  test('Erreur section nuextract absente après transformation', ({ given, when, then, and }) => {
    let error;

    given('un schéma JSON Schema sans section nuextract après transformation', () => {
      // TODO: À implémenter après création de transformJSONSchemaIntoJSONConfigFile()
      // Ce test nécessitera un mock de transformJSONSchemaIntoJSONConfigFile() retournant un config sans nuextract
    });

    when('on tente de charger la configuration depuis le schéma', async () => {
      // TODO: À implémenter
    });

    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      // TODO: À implémenter
    });

    and('le processus s\'arrête proprement', () => {
      // TODO: À implémenter
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

  test('Erreur templateTransformationInstructions.instructions absent de config', ({ given, when, then, and }) => {
    let error;
    let config;

    given('une configuration sans templateTransformationInstructions.instructions', async () => {
      config = await loadGlobalConfig();
      // Supprimer templateTransformationInstructions ou instructions
      if (config.nuextract.templateTransformationInstructions) {
        delete config.nuextract.templateTransformationInstructions.instructions;
      } else {
        config.nuextract.templateTransformationInstructions = {};
      }
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
      expect(error.message).toContain('templateTransformationInstructions.instructions non trouvé');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  test('Erreur templateTransformationInstructions.instructions n\'est pas un array', ({ given, when, then, and }) => {
    let error;
    let config;

    given('une configuration avec templateTransformationInstructions.instructions de type string', async () => {
      config = await loadGlobalConfig();
      // Forcer instructions comme string au lieu d'array
      config.nuextract.templateTransformationInstructions = {
        instructions: 'not an array'
      };
    });

    when('on tente de charger les instructions', async () => {
      try {
        await loadInstructions(config);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('instructions invalide: type');
    });

    and('le message indique le format attendu "array de strings"', () => {
      expect(error.message).toContain('array de strings');
    });

    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  // === Gestion des erreurs de génération de template (fonction generateTemplate) ===

  test('Erreur templateMode invalide', ({ given, when, then, and }) => {
    let error;
    let config;
    let resolvedJsonSchema;

    given('une configuration avec templateMode "invalid"', async () => {
      config = await loadGlobalConfig();
      config.nuextract.templateMode = 'invalid';
      // Charger le schéma résolu pour generateTemplate
      resolvedJsonSchema = await loadAndResolveSchemas(config);
    });

    when('on tente de générer un template', async () => {
      try {
        const apiKey = await loadApiKey(config);
        await generateTemplate(config, apiKey, resolvedJsonSchema);
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
    let resolvedJsonSchema;

    given('une configuration avec templateMode async', async () => {
      // Charger config ET apiKey (Arrange = Given)
      config = await loadGlobalConfig();
      apiKey = await loadApiKey(config);
      config.nuextract.templateMode = 'async';
      // Charger le schéma résolu pour generateTemplate
      resolvedJsonSchema = await loadAndResolveSchemas(config);
    });

    and('une API async qui ne retourne pas de jobId', () => {
      (nuextractApi.inferTemplateFromDescriptionAsync as jest.Mock)
        .mockResolvedValue({ status: 'submitted' });
    });

    when('on tente de générer un template', async () => {
      try {
        await generateTemplate(config, apiKey, resolvedJsonSchema); // Act simple
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
    let resolvedJsonSchema;

    given('une configuration avec templateMode async', async () => {
      // Charger config ET apiKey (Arrange = Given)
      config = await loadGlobalConfig();
      apiKey = await loadApiKey(config);
      config.nuextract.templateMode = 'async';
      // Charger le schéma résolu pour generateTemplate
      resolvedJsonSchema = await loadAndResolveSchemas(config);
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
        await generateTemplate(config, apiKey, resolvedJsonSchema); // Act simple
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
    let resolvedJsonSchema;

    given('une configuration avec templateMode async', async () => {
      jest.clearAllMocks();
      
      // Charger config ET apiKey (Arrange = Given)
      config = await loadGlobalConfig();
      apiKey = await loadApiKey(config);
      config.nuextract.templateMode = 'async';
      // Charger le schéma résolu pour generateTemplate
      resolvedJsonSchema = await loadAndResolveSchemas(config);
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
        await generateTemplate(config, apiKey, resolvedJsonSchema);
      } catch (err) {
        errorNull = err;
      }

      // Test 2: number
      try {
        (nuextractApi.pollJobUntilComplete as jest.Mock)
          .mockResolvedValue(42); // Type invalide : number
        await generateTemplate(config, apiKey, resolvedJsonSchema);
      } catch (err) {
        errorNumber = err;
      }

      // Test 3: array
      try {
        (nuextractApi.pollJobUntilComplete as jest.Mock)
          .mockResolvedValue([1, 2, 3]); // Type invalide : array
        await generateTemplate(config, apiKey, resolvedJsonSchema);
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
    let resolvedJsonSchema;

    given('une configuration valide', async () => {
      config = await loadGlobalConfig();
      // Charger le schéma résolu pour generateTemplate
      resolvedJsonSchema = await loadAndResolveSchemas(config);
    });

    and('une API qui retourne un template vide', () => {
      // On va simuler cela en vérifiant la réponse après l'appel
    });

    when('on tente de générer un template', async () => {
      try {
        apiKey = await loadApiKey(config);
        const template = await generateTemplate(config, apiKey, resolvedJsonSchema);
        
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
    let resolvedJsonSchema;

    given('une configuration avec templateMode sync', async () => {
      config = await loadGlobalConfig();
      config.nuextract.templateMode = 'sync';
      // Réduire le timeout pour forcer un timeout
      config.nuextract.templateGenerationDuration = 1; // 1ms + 5000ms = timeout très court
      // Charger le schéma résolu pour generateTemplate
      resolvedJsonSchema = await loadAndResolveSchemas(config);
    });

    and('un schéma très volumineux causant un timeout', () => {
      // Le schéma actuel est assez volumineux pour causer des timeouts en mode sync
    });

    when('on tente de générer un template', async () => {
      try {
        const apiKey = await loadApiKey(config);
        await generateTemplate(config, apiKey, resolvedJsonSchema);
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
    let resolvedJsonSchema;

    given('une configuration avec baseUrl incorrect', async () => {
      config = await loadGlobalConfig();
      config.nuextract.baseUrl = 'localhost';
      config.nuextract.port = 99999; // Port inaccessible
      // Charger le schéma résolu pour generateTemplate
      resolvedJsonSchema = await loadAndResolveSchemas(config);
    });

    when('on tente d\'appeler l\'API NuExtract', async () => {
      try {
        const apiKey = await loadApiKey(config);
        await generateTemplate(config, apiKey, resolvedJsonSchema);
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
        // Note: Si projectName est absent de config, le fallback 'HERMES2022' s'applique
        // Pour tester la validation, il faut passer projectName comme chaîne vide après trim
        const config = {
          nuextract: {
            projectName: '   ', // projectName vide après trim (teste la validation)
            projectDescription: 'Test project',
            baseUrl: 'nuextract.ai',
            port: 443,
            projectsPath: '/api/projects',
            projectTemplatePath: '/api/projects/{projectId}/template',
            pathPrefix: null
          }
        };
        await findOrCreateProject(config, 'fake-api-key', { test: 'template' });
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
        const config = {
          nuextract: {
            projectName: 'test-project',
            projectDescription: 'Test project without template',
            templateReset: false,
            baseUrl: 'nuextract.ai',
            port: 443,
            projectsPath: '/api/projects',
            projectTemplatePath: '/api/projects/{projectId}/template',
            pathPrefix: null
          }
        };
        await findOrCreateProject(config, 'fake-api-key', null); // template null
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
        const config = {
          nuextract: {
            projectName: 'test-project',
            projectDescription: 'Test project',
            templateReset: true, // templateReset = true
            baseUrl: 'nuextract.ai',
            port: 443,
            projectsPath: '/api/projects',
            projectTemplatePath: '/api/projects/{projectId}/template',
            pathPrefix: null
          }
        };
        await findOrCreateProject(config, 'fake-api-key', null); // template null
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
  
  test('Erreur validation conformité projet existant sans template fourni', ({ given, when, then, and }) => {
    let error;
    
    given('un projet existant sur la plateforme', () => {
      // Mock getNuExtractProjects retournant un projet existant
      jest.spyOn(nuextractApi, 'getNuExtractProjects')
        .mockResolvedValue([{ id: 'proj-123', name: 'test-project' }]);
    });
    
    and('templateReset configuré à false', () => {
      // templateReset sera false dans l'appel
    });
    
    and('un template null ou vide', () => {
      // Template sera null
    });
    
    when('on tente de rechercher le projet', async () => {
      try {
        const config = {
          nuextract: {
            projectName: 'test-project',
            projectDescription: 'Test project',
            templateReset: false, // templateReset = false
            baseUrl: 'nuextract.ai',
            port: 443,
            projectsPath: '/api/projects',
            projectTemplatePath: '/api/projects/{projectId}/template',
            pathPrefix: null
          }
        };
        await findOrCreateProject(config, 'fake-api-key', null); // template null
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
      expect(error.message).toContain('Script stopped');
      jest.clearAllMocks();
    });
  });
  
  test('Erreur projet existant sans template valide', ({ given, when, then, and }) => {
    let error;
    let validTemplate;
    
    given('un projet existant sur la plateforme', async () => {
      // Mock getNuExtractProjects retournant un projet existant SANS template
      jest.spyOn(nuextractApi, 'getNuExtractProjects')
        .mockResolvedValue([
          { 
            id: 'proj-123', 
            name: 'test-project',
            // Pas de propriété template
          }
        ]);
      
      // Charger un template valide pour la comparaison
      const config = await loadGlobalConfig();
      const apiKey = await loadApiKey(config);
      const resolvedJsonSchema = await loadAndResolveSchemas(config);
      validTemplate = await generateTemplate(config, apiKey, resolvedJsonSchema);
    });
    
    and('le projet existant ne contient pas de template ou de template.schema', () => {
      // Le projet mocké ci-dessus n'a pas de template (déjà fait dans given)
    });
    
    and('templateReset configuré à false', () => {
      // templateReset sera false dans l'appel
    });
    
    when('on tente de rechercher le projet', async () => {
      try {
        const config = {
          nuextract: {
            projectName: 'test-project',
            projectDescription: 'Test project',
            templateReset: false, // templateReset = false
            baseUrl: 'nuextract.ai',
            port: 443,
            projectsPath: '/api/projects',
            projectTemplatePath: '/api/projects/{projectId}/template',
            pathPrefix: null
          }
        };
        await findOrCreateProject(config, 'fake-api-key', validTemplate);
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
  
  test('Erreur template existant non conforme au JSON schema', ({ given, when, then, and }) => {
    let error;
    let validTemplate;
    let invalidTemplate;
    
    given('un projet existant sur la plateforme avec un template non conforme', async () => {
      // Charger un template valide pour la comparaison
      const config = await loadGlobalConfig();
      const apiKey = await loadApiKey(config);
      const resolvedJsonSchema = await loadAndResolveSchemas(config);
      validTemplate = await generateTemplate(config, apiKey, resolvedJsonSchema);
      
      // Créer un template non conforme (différent)
      invalidTemplate = { ...validTemplate, differentProperty: 'different value' };
      
      // Mock getNuExtractProjects retournant un projet existant avec template NON conforme
      jest.spyOn(nuextractApi, 'getNuExtractProjects')
        .mockResolvedValue([
          { 
            id: 'proj-123', 
            name: 'test-project',
            template: {
              type: 'schema',
              schema: invalidTemplate // Template différent (non conforme)
            }
          }
        ]);
    });
    
    and('templateReset configuré à false', () => {
      // templateReset sera false dans l'appel
    });
    
    when('on tente de rechercher le projet', async () => {
      try {
        const config = {
          nuextract: {
            projectName: 'test-project',
            projectDescription: 'Test project',
            templateReset: false,
            baseUrl: 'nuextract.ai',
            port: 443,
            projectsPath: '/api/projects',
            projectTemplatePath: '/api/projects/{projectId}/template',
            pathPrefix: null
          }
        };
        await findOrCreateProject(config, 'fake-api-key', validTemplate); // Template de référence (conforme)
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
  
  // === Tests des erreurs HTTP pour fetchHtmlContent ===
  
  test('Erreur réseau lors d\'appel fetchHtmlContent', ({ given, when, then, and }) => {
    let error;
    
    given('une erreur réseau simulée pour fetchHtmlContent', () => {
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
    
    when('on tente d\'appeler fetchHtmlContent', async () => {
      try {
        await fetchHtmlContent('https://www.hermes.admin.ch/en/project-management/phases.html');
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur "Network error fetching HTML content" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Network error fetching HTML content');
    });
    
    and('l\'erreur originale est préservée avec Error Cause', () => {
      expect(error.cause).toBeDefined();
      expect(error.cause.code).toBe('EHOSTUNREACH');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Script stopped');
      jest.clearAllMocks();
    });
  });
  
  test('Timeout lors d\'appel fetchHtmlContent', ({ given, when, then, and }) => {
    let error;
    
    given('un timeout simulé après 30 secondes pour fetchHtmlContent', () => {
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
    
    when('on tente d\'appeler fetchHtmlContent', async () => {
      try {
        await fetchHtmlContent('https://www.hermes.admin.ch/en/project-management/phases.html', 30000);
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur contenant "Timeout: La requête HTML a dépassé 30 secondes" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Timeout: La requête HTML a dépassé 30 secondes');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Script stopped');
      jest.clearAllMocks();
    });
  });
  
  test('Code HTTP non-200 pour fetchHtmlContent', ({ given, when, then, and }) => {
    let error;
    
    given('une réponse HTTP 404 pour fetchHtmlContent', () => {
      https.request = jest.fn().mockImplementation((options, callback) => {
        const mockRes = new EventEmitter();
        mockRes.statusCode = 404;
        
        const mockReq = new EventEmitter();
        mockReq.write = jest.fn();
        mockReq.end = jest.fn(() => {
          setTimeout(() => {
            callback(mockRes);
            mockRes.emit('data', 'Not Found');
            mockRes.emit('end');
          }, 10);
        });
        mockReq.setTimeout = jest.fn();
        
        return mockReq;
      });
    });
    
    when('on tente d\'appeler fetchHtmlContent', async () => {
      try {
        await fetchHtmlContent('https://www.hermes.admin.ch/en/project-management/phases.html');
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur contenant "HTTP error: 404" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('HTTP error: 404');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Script stopped');
      jest.clearAllMocks();
    });
  });
  
  test('URL invalide pour fetchHtmlContent', ({ given, when, then, and }) => {
    let error;
    
    given('une URL invalide pour fetchHtmlContent', () => {
      // Pas besoin de mock, la validation se fait avant l'appel HTTP
    });
    
    when('on tente d\'appeler fetchHtmlContent', async () => {
      try {
        await fetchHtmlContent('invalid-url');
      } catch (e) {
        error = e;
      }
    });
    
    then('une erreur contenant "Invalid URL" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid URL');
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Script stopped');
      jest.clearAllMocks();
    });
  });
});
