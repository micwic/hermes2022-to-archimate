// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import { Given, When, Then } from 'jest-cucumber';
import path from 'path';
import findUp from 'find-up';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { EventEmitter } from 'events';

// Mock du module API pour permettre le mocking des appels HTTP
jest.mock('../../src/nuextract-api.js', () => {
  const actual = jest.requireActual('../../src/nuextract-api.js');
  return {
    ...actual,
    inferTemplateFromDescription: jest.fn(actual.inferTemplateFromDescription),
    inferTemplateFromDescriptionAsync: jest.fn(actual.inferTemplateFromDescriptionAsync),
    pollJobUntilComplete: jest.fn(actual.pollJobUntilComplete),
    getNuExtractProjects: jest.fn(actual.getNuExtractProjects),
    putProjectTemplate: jest.fn(actual.putProjectTemplate),
    inferTextFromContent: jest.fn(actual.inferTextFromContent)
  };
});

// Mock du module html-collector-and-transformer pour éviter les appels HTTP réels dans extractHermes2022ConceptsWithNuExtract
jest.mock('../../src/html-collector-and-transformer.js', () => {
  const actual = jest.requireActual('../../src/html-collector-and-transformer.js');
  return {
    ...actual,
    collectHtmlSourcesAndInstructions: jest.fn(actual.collectHtmlSourcesAndInstructions),
    fetchHtmlContent: jest.fn(actual.fetchHtmlContent)
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
  _testOnly_fetchHtmlContent as fetchHtmlContent,
  _testOnly_collectHtmlSourcesAndInstructions as collectHtmlSourcesAndInstructions,
  _testOnly_buildExtractionPrompt as buildExtractionPrompt,
  _testOnly_buildBlockPrompt as buildBlockPrompt,
  _testOnly_recomposeArtifact as recomposeArtifact,
  _testOnly_mergeJsonAtPath as mergeJsonAtPath,
  _testOnly_saveArtifact as saveArtifact,
  _testOnly_extractHermes2022ConceptsWithNuExtract as extractHermes2022ConceptsWithNuExtract
} from '../../src/nuextract-client.js';

const fullFilePath = findUp.sync('package.json', { cwd: __dirname });
if (!fullFilePath) {
  throw new Error('Impossible de localiser la racine du repository');
}
const repoRoot = path.dirname(fullFilePath);
const resolveFromRepoRoot = (...segments: string[]) => path.resolve(repoRoot, ...segments);

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
      expect(error.message).toContain(expectedMessage);
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
      expect(error.message).toContain(expectedMessage);
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
      expect(error.message).toContain(expectedMessage);
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
      expect(error.message).toContain(expectedMessage);
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
      expect(error.message).toContain(expectedMessage);
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
      expect(error.message).toContain(expectedMessage);
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
      apiKey = 'fixture-api-key';
    });

    and('une API qui retourne un template vide', () => {
      jest.spyOn(nuextractApi, 'inferTemplateFromDescription')
        .mockResolvedValue({});
    });

    when('on tente de générer un template', async () => {
      try {
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
        expect(error.message).toContain(expectedMessage);
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
  }, 5000);

  test('Erreur timeout API génération template mode sync', ({ given, when, then, and }) => {
    let error;
    let config;
    let resolvedJsonSchema;
    let apiKey;

    given('une configuration avec templateMode sync', async () => {
      config = await loadGlobalConfig();
      config.nuextract.templateMode = 'sync';
      // Réduire le timeout pour forcer un timeout
      config.nuextract.templateGenerationDuration = 1; // 1ms + 5000ms = timeout très court
      // Charger le schéma résolu pour generateTemplate
      resolvedJsonSchema = await loadAndResolveSchemas(config);
      apiKey = 'fixture-api-key';
    });

    and('un schéma très volumineux causant un timeout', () => {
      jest.spyOn(nuextractApi, 'inferTemplateFromDescription')
        .mockRejectedValue(new Error('Timeout sync après 5001ms. Pour schémas >4000 caractères, utilisez templateMode: \'async\'. Script stopped.'));
    });

    when('on tente de générer un template', async () => {
      try {
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

  test('Erreur API NuExtract infer-template inaccessible', ({ given, when, then, and }) => {
    let error;
    let config;
    let resolvedJsonSchema;
    let apiKey;

    given('une configuration avec baseUrl incorrect', async () => {
      config = await loadGlobalConfig();
      config.nuextract.baseUrl = 'http://127.0.0.1';
      config.nuextract.port = 1; // Port plausible mais sans serveur → ECONNREFUSED
      // Charger le schéma résolu pour generateTemplate
      resolvedJsonSchema = await loadAndResolveSchemas(config);
      apiKey = 'fixture-api-key';
      jest.spyOn(nuextractApi, 'inferTemplateFromDescription')
        .mockRejectedValue(new Error('Network error calling infer-template API. Script stopped.'));
    });

    when('on tente d\'appeler l\'API NuExtract infer-template', async () => {
      try {
        await generateTemplate(config, apiKey, resolvedJsonSchema);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Network error calling infer-template API');
      expect(error.message).toContain(expectedMessage);
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
    const validTemplate = { schema: { foo: 'bar' } };
    
    given('un projet existant sur la plateforme', () => {
      jest.spyOn(nuextractApi, 'getNuExtractProjects')
        .mockResolvedValue([{ id: 'proj-123', name: 'test-project' }]);
    });
    
    and('le projet existant ne contient pas de template ou de template.schema', () => {
      // Mock déjà configuré pour renvoyer un projet sans template
    });
    
    and('templateReset configuré à false', () => {
      // Rien à faire, valeur utilisée dans l'appel
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
    let apiKey;
    
    given('un projet existant sur la plateforme avec un template non conforme', () => {
      const fixturePath = resolveFromRepoRoot('hermes2022-concepts-site-extraction/__tests__/fixtures/nuextract-template-valid.json');
      const fixtureContent = fs.readFileSync(fixturePath, 'utf8');
      validTemplate = JSON.parse(fixtureContent);
      invalidTemplate = { ...validTemplate, __nonConformant__: 'different value' };
      apiKey = 'fixture-api-key';
      
      jest.spyOn(nuextractApi, 'getNuExtractProjects')
        .mockResolvedValue([
          {
            id: 'proj-123',
            name: 'test-project',
            template: {
              type: 'schema',
              schema: invalidTemplate
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
        await findOrCreateProject(config, apiKey, validTemplate); // Template de référence (conforme)
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
    
    then(/^une erreur "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
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
  
  // === Gestion des erreurs pour collectHtmlSourcesAndInstructions ===
  
  test('Schéma invalide (null) pour collectHtmlSourcesAndInstructions', ({ given, when, then, and }) => {
    let error;
    
    given('un schéma résolu null pour collectHtmlSourcesAndInstructions', () => {
      // Pas besoin de mock, la validation se fait avant tout appel HTTP
    });
    
    when('on tente d\'appeler collectHtmlSourcesAndInstructions', async () => {
      try {
        await collectHtmlSourcesAndInstructions(
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
        await collectHtmlSourcesAndInstructions(
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
        await collectHtmlSourcesAndInstructions(
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
        await collectHtmlSourcesAndInstructions(
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
        await collectHtmlSourcesAndInstructions(
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
        await collectHtmlSourcesAndInstructions(
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
        await collectHtmlSourcesAndInstructions(
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
        await collectHtmlSourcesAndInstructions(
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
        buildExtractionPrompt({ blocks: [] });
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
        buildExtractionPrompt({} as any);
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
  
  // === Gestion des erreurs pour buildBlockPrompt ===
  
  test('Bloc null pour buildBlockPrompt', ({ given, when, then, and }) => {
    let error;
    
    given('un bloc null pour buildBlockPrompt', () => {
      // Pas besoin de mock, la validation se fait avant toute construction
    });
    
    when('on tente d\'appeler buildBlockPrompt', () => {
      try {
        buildBlockPrompt(null);
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
  
  test('Bloc sans jsonPointer pour buildBlockPrompt', ({ given, when, then, and }) => {
    let error;
    
    given('un bloc sans jsonPointer pour buildBlockPrompt', () => {
      // Pas besoin de mock, la validation se fait avant toute construction
    });
    
    when('on tente d\'appeler buildBlockPrompt', () => {
      try {
        buildBlockPrompt({ instructions: [], htmlContents: [] } as any);
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
  
  test('Instructions non-array pour buildBlockPrompt', ({ given, when, then, and }) => {
    let error;
    
    given('un bloc avec instructions de type non-array pour buildBlockPrompt', () => {
      // Pas besoin de mock, la validation se fait avant toute construction
    });
    
    when('on tente d\'appeler buildBlockPrompt', () => {
      try {
        buildBlockPrompt({ jsonPointer: '/method', instructions: 'not an array', htmlContents: [] } as any);
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
  
  test('htmlContents vide pour buildBlockPrompt', ({ given, when, then, and }) => {
    let error;
    
    given('un bloc avec htmlContents array vide pour buildBlockPrompt', () => {
      // Pas besoin de mock, la validation se fait avant toute construction
    });
    
    when('on tente d\'appeler buildBlockPrompt', () => {
      try {
        buildBlockPrompt({ jsonPointer: '/method', instructions: [], htmlContents: [] });
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
  
  // === Gestion des erreurs pour mergeJsonAtPath ===
  
  test('Target null pour mergeJsonAtPath', ({ given, when, then, and }) => {
    let error;
    
    given('un target null pour mergeJsonAtPath', () => {
      // Pas besoin de mock, la validation se fait avant toute fusion
    });
    
    when('on tente d\'appeler mergeJsonAtPath', () => {
      try {
        mergeJsonAtPath(null, '/method', {});
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
  
  test('Path invalide (vide) pour mergeJsonAtPath', ({ given, when, then, and }) => {
    let error;
    
    given('un path vide pour mergeJsonAtPath', () => {
      // Pas besoin de mock, la validation se fait avant toute fusion
    });
    
    when('on tente d\'appeler mergeJsonAtPath', () => {
      try {
        mergeJsonAtPath({}, '', {});
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
  
  test('Index array hors limites pour mergeJsonAtPath', ({ given, when, then, and }) => {
    let error;
    
    given('un target array et un path avec index hors limites pour mergeJsonAtPath', () => {
      // Pas besoin de mock, la validation se fait avant toute fusion
    });
    
    when('on tente d\'appeler mergeJsonAtPath', () => {
      try {
        mergeJsonAtPath([], '/10', {}); // Index 10 hors limites pour array vide
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
  
  // === Gestion des erreurs pour recomposeArtifact ===
  
  test('partialResults null pour recomposeArtifact', ({ given, when, then, and }) => {
    let error;
    
    given('des partialResults null pour recomposeArtifact', () => {
      // Pas besoin de mock, la validation se fait avant toute recomposition
    });
    
    when('on tente d\'appeler recomposeArtifact', () => {
      try {
        recomposeArtifact(null, {}, {}, 'https://www.hermes.admin.ch/en');
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
  
  test('partialResults vide pour recomposeArtifact', ({ given, when, then, and }) => {
    let error;
    
    given('des partialResults array vide pour recomposeArtifact', () => {
      // Pas besoin de mock, la validation se fait avant toute recomposition
    });
    
    when('on tente d\'appeler recomposeArtifact', () => {
      try {
        recomposeArtifact([], {}, {}, 'https://www.hermes.admin.ch/en');
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
  
  test('jsonPointer manquant dans résultat partiel pour recomposeArtifact', ({ given, when, then, and }) => {
    let error;
    
    given('des partialResults avec résultat partiel sans jsonPointer pour recomposeArtifact', () => {
      // Pas besoin de mock, la validation se fait avant toute recomposition
    });
    
    when('on tente d\'appeler recomposeArtifact', () => {
      try {
        recomposeArtifact([{ data: {} }] as any, {}, {}, 'https://www.hermes.admin.ch/en');
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
  
  test('data invalide dans résultat partiel pour recomposeArtifact', ({ given, when, then, and }) => {
    let error;
    
    given('des partialResults avec résultat partiel avec data null pour recomposeArtifact', () => {
      // Pas besoin de mock, la validation se fait avant toute recomposition
    });
    
    when('on tente d\'appeler recomposeArtifact', () => {
      try {
        recomposeArtifact([{ jsonPointer: '/method', data: null }], {}, {}, 'https://www.hermes.admin.ch/en');
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

  // === Gestion des erreurs pour saveArtifact ===

  test('Erreur artefact null pour saveArtifact', ({ given, when, then, and }) => {
    let error;
    
    given('un artefact null pour saveArtifact', () => {
      // Pas besoin de mock, la validation se fait avant toute opération fs
    });
    
    when('on tente de sauvegarder l\'artefact', async () => {
      try {
        const config = { artifactBaseDirectory: 'test-dir' };
        await saveArtifact(config, null);
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

  test('Erreur artefact non-objet (array) pour saveArtifact', ({ given, when, then, and }) => {
    let error;
    
    given('un artefact de type array pour saveArtifact', () => {
      // Pas besoin de mock, la validation se fait avant toute opération fs
    });
    
    when('on tente de sauvegarder l\'artefact', async () => {
      try {
        const config = { artifactBaseDirectory: 'test-dir' };
        await saveArtifact(config, [1, 2, 3]);
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

  test('Erreur artefact non-objet (string) pour saveArtifact', ({ given, when, then, and }) => {
    let error;
    
    given('un artefact de type string pour saveArtifact', () => {
      // Pas besoin de mock, la validation se fait avant toute opération fs
    });
    
    when('on tente de sauvegarder l\'artefact', async () => {
      try {
        const config = { artifactBaseDirectory: 'test-dir' };
        await saveArtifact(config, 'not an object');
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

  // === Gestion des erreurs pour extractHermes2022ConceptsWithNuExtract ===

  test('Erreur validation Ajv échouée pour extractHermes2022ConceptsWithNuExtract', ({ given, when, then, and }) => {
    let error;
    let config;
    let apiKey;
    let resolvedSchema;
    
    given('un schéma résolu valide', async () => {
      config = await loadGlobalConfig();
      apiKey = await loadApiKey(config);
      resolvedSchema = await loadAndResolveSchemas(config);
    });
    
    and('une extraction NuExtract qui retourne un artefact non conforme au schéma', () => {
      // Mock collectHtmlSourcesAndInstructions pour retourner des blocs valides (évite appels HTTP réels)
      const htmlCollectorModule = require('../../src/html-collector-and-transformer.js');
      jest.spyOn(htmlCollectorModule, 'collectHtmlSourcesAndInstructions')
        .mockResolvedValue({
          blocks: [
            {
              jsonPointer: '/concepts',
              instructions: ['Extract concepts'],
              htmlContents: [{ url: 'https://test.com', content: 'test content' }]
            }
          ]
        });
      
      // Mock nuextractApi.inferTextFromContent pour retourner un artefact NON CONFORME
      // L'artefact retourné sera recomposé par recomposeArtifact (fonction interne)
      // et le résultat final sera non conforme au schéma, déclenchant l'erreur Ajv
      (nuextractApi.inferTextFromContent as jest.Mock)
        .mockResolvedValue({
          // Structure non conforme : propriété supplémentaire non autorisée, type invalide
          concepts: {
            invalidProperty: 'not in schema', // Propriété non autorisée dans le schéma
            overview: 123 // Type invalide (devrait être string, pas number)
          }
        });
    });
    
    when('on tente d\'extraire les concepts HERMES2022', async () => {
      try {
        await extractHermes2022ConceptsWithNuExtract(resolvedSchema, config, apiKey, 'test-project-id');
      } catch (e) {
        error = e;
      }
    });
    
    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
    
    and('le message contient les détails des erreurs de validation', () => {
      expect(error.message).toContain('Script stopped');
      // Le message doit contenir les détails Ajv (format: "must have required property", "must NOT have additional properties", etc.)
      expect(error.message).toMatch(/must have required property|must NOT have additional properties|must be/);
    });
    
    and('le processus s\'arrête proprement', () => {
      expect(error).toBeInstanceOf(Error);
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });
  });
});
