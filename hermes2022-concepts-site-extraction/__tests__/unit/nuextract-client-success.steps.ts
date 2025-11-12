// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import fs from 'fs';
import path from 'path';

// Mock global du module nuextract-api.js
jest.mock('../../src/nuextract-api.js', () => {
  const actual = jest.requireActual('../../src/nuextract-api.js');
  return {
    ...actual,
    inferTemplateFromDescription: jest.fn(actual.inferTemplateFromDescription),
    getNuExtractProjects: jest.fn(actual.getNuExtractProjects),
    createNuExtractProject: jest.fn(actual.createNuExtractProject),
    putProjectTemplate: jest.fn(actual.putProjectTemplate)
  };
});

// Import du module API mocké
import * as nuextractApi from '../../src/nuextract-api.js';

// Import des fonctions à tester avec alias @src selon moduleNameMapper
const { 
  _testOnly_loadGlobalConfig,
  _testOnly_loadApiKey,
  _testOnly_loadAndResolveSchemas,
  _testOnly_generateTemplate,
  _testOnly_findOrCreateProject,
  _testOnly_fetchHtmlContent,
  _testOnly_collectHtmlSourcesAndInstructions,
  _testOnly_saveArtifact
} = require('@src/nuextract-client.js');

const feature = loadFeature('hermes2022-concepts-site-extraction/__tests__/unit/nuextract-client-success.feature');

defineFeature(feature, (test) => {
  let config;
  let apiKey;
  let resolvedJsonSchema;
  let template;
  let originalEnv;
  let originalReadFileSync: typeof fs.readFileSync;
  let originalExistsSync: typeof fs.existsSync;
  let originalWriteFileSync: typeof fs.writeFileSync;

  // Hooks d'isolation des tests (bonne pratique Jest/BDD)
  beforeEach(() => {
    originalReadFileSync = fs.readFileSync;
    originalExistsSync = fs.existsSync;
    originalWriteFileSync = fs.writeFileSync;
    jest.clearAllMocks();
    // Sauvegarder l'environnement original
    originalEnv = process.env.NUEXTRACT_API_KEY;
    apiKey = undefined;
    template = undefined;
    resolvedJsonSchema = undefined;
  });

  afterEach(() => {
    // Restaurer l'environnement original
    if (originalEnv !== undefined) {
      process.env.NUEXTRACT_API_KEY = originalEnv;
    } else {
      delete process.env.NUEXTRACT_API_KEY;
    }
    fs.readFileSync = originalReadFileSync;
    fs.existsSync = originalExistsSync;
    fs.writeFileSync = originalWriteFileSync;
    jest.restoreAllMocks();
  });

  //
  // === Tests de succès pour loadApiKey ===

  test('Chargement réussi depuis variable système', ({ given, when, then, and }) => {
    const jwtFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

    given('une variable système NUEXTRACT_API_KEY définie avec un JWT valide', () => {
      process.env.NUEXTRACT_API_KEY = jwtFromEnv;
      config = { nuextract: { apiKeyFile: 'dummy-path.key' } };
    });

    when('on charge la clé API avec loadApiKey', async () => {
      apiKey = await _testOnly_loadApiKey(config);
    });

    then('la clé API est retournée', () => {
      expect(apiKey).toBeDefined();
      expect(typeof apiKey).toBe('string');
    });

    and('la clé API correspond au JWT de la variable système', () => {
      expect(apiKey).toBe(jwtFromEnv);
    });
  }, 5000);

  test('Chargement réussi depuis fichier avec espaces', ({ given, and, when, then }) => {
    const jwtWithSpaces = '  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.abc123  ';
    const jwtTrimmed = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.abc123';

    given('aucune variable système NUEXTRACT_API_KEY', () => {
      delete process.env.NUEXTRACT_API_KEY;
    });

    and(/^un fichier de clé API contenant un JWT valide avec espaces "(.*)"$/, (jwtContent) => {
      config = { nuextract: { apiKeyFile: 'fake-path.key' } };
      // Mocker fs.readFileSync pour retourner le JWT avec espaces
      fs.readFileSync = jest.fn().mockReturnValue(jwtWithSpaces);
    });

    when('on charge la clé API avec loadApiKey', async () => {
      apiKey = await _testOnly_loadApiKey(config);
    });

    then('la clé API est retournée', () => {
      expect(apiKey).toBeDefined();
      expect(typeof apiKey).toBe('string');
    });

    and(/^la clé API est le JWT sans espaces "(.*)"$/, (expectedJwt) => {
      expect(apiKey).toBe(jwtTrimmed);
      // Vérifier que les espaces ont été supprimés
      expect(apiKey).not.toContain(' ');
    });
  }, 5000);

  test('Chargement réussi depuis fichier sans espaces', ({ given, and, when, then }) => {
    const jwtNoSpaces = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.abc123';

    given('aucune variable système NUEXTRACT_API_KEY', () => {
      delete process.env.NUEXTRACT_API_KEY;
    });

    and(/^un fichier de clé API contenant un JWT valide sans espaces "(.*)"$/, (jwtContent) => {
      config = { nuextract: { apiKeyFile: 'fake-path.key' } };
      // Mocker fs.readFileSync pour retourner le JWT sans espaces
      fs.readFileSync = jest.fn().mockReturnValue(jwtNoSpaces);
    });

    when('on charge la clé API avec loadApiKey', async () => {
      apiKey = await _testOnly_loadApiKey(config);
    });

    then('la clé API est retournée', () => {
      expect(apiKey).toBeDefined();
      expect(typeof apiKey).toBe('string');
    });

    and('la clé API est identique au contenu du fichier', () => {
      expect(apiKey).toBe(jwtNoSpaces);
    });
  }, 5000);

  //
  // === Tests de succès pour generateTemplate ===

  test('Génération template mode sync avec répertoire existant', ({ given, and, when, then }) => {
    const expectedTemplate = {
      config: { extractionSource: { baseUrl: "https://test.com" } },
      method: { overview: "Test method" }
    };

    given(/^une configuration valide avec templateMode "(.*)" et deux instructions$/, (mode) => {
      config = {
        nuextract: {
          templateMode: 'sync',
          templateTransformationInstructions: {
            instructions: [
              'Instruction 1 pour transformation',
              'Instruction 2 pour transformation'
            ]
          },
          baseUrl: 'nuextract.ai',
          port: 443,
          'infer-templatePath': '/api/infer-template',
          templateGenerationDuration: 30000,
          templateOutputDirectory: 'shared/hermes2022-extraction-files/config/nuextract-template-generated'
        }
      };
    });

    and('une clé API valide', () => {
      apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    });

    and('un schéma JSON résolu valide', () => {
      resolvedJsonSchema = {
        type: 'object',
        properties: {
          config: { type: 'object' },
          method: { type: 'object' }
        }
      };
    });

    and('un répertoire de sauvegarde qui existe', () => {
      // Mock fs.existsSync pour simuler que le répertoire existe
      fs.existsSync = jest.fn().mockReturnValue(true);
    });

    and('une API NuExtract sync qui retourne un template valide', () => {
      // Mock de l'API sync
      (nuextractApi.inferTemplateFromDescription as jest.Mock)
        .mockResolvedValue(expectedTemplate);
    });

    when('on génère le template avec generateTemplate', async () => {
      // Mock fs.writeFileSync (pas de vraie écriture)
      fs.writeFileSync = jest.fn();
      
      template = await _testOnly_generateTemplate(config, apiKey, resolvedJsonSchema);
    });

    then('le template est retourné', () => {
      expect(template).toBeDefined();
      expect(typeof template).toBe('object');
    });

    and('le template correspond au template API', () => {
      expect(template).toEqual(expectedTemplate);
    });

    and('l\'API sync a été appelée avec les bons paramètres', () => {
      expect(nuextractApi.inferTemplateFromDescription).toHaveBeenCalledTimes(1);
      
      const callArgs = (nuextractApi.inferTemplateFromDescription as jest.Mock).mock.calls[0];
      
      // Vérifier les paramètres (hostname, port, path, pathPrefix, apiKey, description, timeout)
      expect(callArgs[0]).toBe('nuextract.ai'); // hostname
      expect(callArgs[1]).toBe(443); // port
      expect(callArgs[2]).toBe('/api/infer-template'); // path
      expect(callArgs[4]).toBe(apiKey); // apiKey
      expect(callArgs[5]).toContain('Instruction 1'); // description contient instructions
      expect(callArgs[5]).toContain('Instruction 2');
      expect(callArgs[6]).toBe(35000); // timeout (30000 + 5000)
    });

    and('le template a été sauvegardé dans le fichier', () => {
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      
      const writeArgs = (fs.writeFileSync as jest.Mock).mock.calls[0];
      const savedContent = JSON.parse(writeArgs[1]);
      
      expect(savedContent).toEqual(expectedTemplate);
      expect(writeArgs[2]).toBe('utf8'); // encoding
    });
  }, 5000);

  //
  // === Tests de succès pour loadGlobalConfig ===

  test('Chargement réussi de la configuration globale', ({ given, when, then, and }) => {
    const schemaContent = {
      type: 'object',
      properties: {
        nuextract: {
          type: 'object',
          properties: {
            baseUrl: { type: 'string', enum: ['nuextract.ai'] },
            port: { type: 'number', enum: [443] }
          }
        }
      }
    };

    given('un fichier de schéma JSON valide', () => {
      // Mock fs.readFileSync pour retourner un schéma JSON valide
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(schemaContent));
    });

    when('on charge la configuration avec loadGlobalConfig', async () => {
      config = await _testOnly_loadGlobalConfig();
    });

    then('la configuration est retournée', () => {
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    and('la configuration contient la section nuextract', () => {
      expect(config.nuextract).toBeDefined();
      expect(config.nuextract.baseUrl).toBe('nuextract.ai');
      expect(config.nuextract.port).toBe(443);
    });
  }, 5000);

  //
  // === Tests de succès pour loadAndResolveSchemas ===

  test('Résolution réussie du schéma JSON avec $ref', ({ given, and, when, then }) => {
    let resolvedSchema;

    given('une configuration avec le chemin vers un schéma JSON principal valide', () => {
      config = {
        nuextract: {
          mainJSONConfigurationFile: 'shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json'
        }
      };
    });

    and('le schéma principal contient des $ref vers d\'autres fichiers', () => {
      // Le schéma réel contient des $ref, pas besoin de mock ici
    });

    and('tous les fichiers $ref existent et sont valides', () => {
      // Les fichiers existent réellement dans le projet
    });

    when('on charge et résout le schéma avec loadAndResolveSchemas', async () => {
      resolvedSchema = await _testOnly_loadAndResolveSchemas(config);
    });

    then('le schéma résolu est retourné', () => {
      expect(resolvedSchema).toBeDefined();
      expect(typeof resolvedSchema).toBe('object');
    });

    and('toutes les $ref sont remplacées par leur contenu', () => {
      // Vérifier qu'il n'y a plus de $ref dans le schéma résolu
      const schemaString = JSON.stringify(resolvedSchema);
      expect(schemaString).not.toContain('"$ref"');
    });

    and('le schéma résolu est valide selon JSON Schema Draft-07', () => {
      // La fonction loadAndResolveSchemas valide déjà le schéma avec Ajv
      // Si on arrive ici sans erreur, c'est que le schéma est valide
      expect(resolvedSchema.type).toBe('object');
      expect(resolvedSchema.properties).toBeDefined();
    });
  }, 5000);

  //
  // === Tests de succès pour findOrCreateProject ===

  test('Création d\'un nouveau projet NuExtract avec template', ({ given, and, when, then }) => {
    let project;
    const templateObj = { schema: { type: 'object' } };

    given(/^une configuration avec projectName "(.*)"$/, (projectName) => {
      config = {
        nuextract: {
          projectName,
          projectDescription: 'Test project description',
          baseUrl: 'nuextract.ai',
          port: 443,
          projectsPath: '/api/projects'
        }
      };
    });

    and('une clé API valide', () => {
      apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    });

    and('un template JSON valide', () => {
      // Template déjà défini dans templateObj
    });

    and(/^le projet "(.*)" n'existe pas encore$/, (projectName) => {
      // Mock getNuExtractProjects pour retourner liste vide
      (nuextractApi.getNuExtractProjects as jest.Mock)
        .mockResolvedValue([]);
      
      // Mock createNuExtractProject pour retourner un projet créé
      (nuextractApi.createNuExtractProject as jest.Mock)
        .mockResolvedValue({ id: 'new-project-id', name: projectName });
    });

    when('on appelle findOrCreateProject', async () => {
      project = await _testOnly_findOrCreateProject(config, apiKey, templateObj);
    });

    then('un nouveau projet est créé', () => {
      expect(nuextractApi.createNuExtractProject).toHaveBeenCalledTimes(1);
    });

    and('le projet est retourné avec son ID', () => {
      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.name).toBe('test-project');
    });

    and('le projet a la propriété created à true', () => {
      expect(project.created).toBe(true);
    });
  }, 5000);

  test('Récupération d\'un projet existant sans mise à jour', ({ given, and, when, then }) => {
    let project;
    const templateObj = { type: 'object', properties: { test: { type: 'string' } } };

    given(/^une configuration avec projectName "(.*)" et templateReset false$/, (projectName) => {
      config = {
        nuextract: {
          projectName,
          templateReset: false,
          baseUrl: 'nuextract.ai',
          port: 443,
          projectsPath: '/api/projects'
        }
      };
    });

    and('une clé API valide', () => {
      apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    });

    and('un template JSON valide', () => {
      // Template déjà défini dans templateObj
    });

    and(/^le projet "(.*)" existe déjà avec un template conforme$/, (projectName) => {
      // Mock getNuExtractProjects pour retourner le projet existant avec template conforme
      // Note: existingProject.template.schema doit correspondre à templateObj
      (nuextractApi.getNuExtractProjects as jest.Mock)
        .mockResolvedValue([
          {
            id: 'existing-project-id',
            name: projectName,
            template: {
              schema: templateObj // Le template a une propriété schema
            }
          }
        ]);
    });

    when('on appelle findOrCreateProject', async () => {
      project = await _testOnly_findOrCreateProject(config, apiKey, templateObj);
    });

    then('le projet existant est retourné', () => {
      expect(project).toBeDefined();
      expect(project.id).toBe('existing-project-id');
      expect(project.name).toBe('existing-project');
    });

    and('aucune mise à jour n\'est effectuée', () => {
      expect(nuextractApi.putProjectTemplate).not.toHaveBeenCalled();
      expect(nuextractApi.createNuExtractProject).not.toHaveBeenCalled();
    });

    and('le projet a la propriété existing à true', () => {
      expect(project.existing).toBe(true);
    });
  }, 5000);

  //
  // === Tests de succès pour fetchHtmlContent ===

  test('Téléchargement réussi d\'une page HTML', ({ given, and, when, then }) => {
    let content;
    const mockHtmlContent = '<html><body><h1>Test Page</h1><p>Test content</p></body></html>';

    given(/^une URL valide "(.*)"$/, (url) => {
      // Mock https.request pour simuler une réponse HTTP 200
      const https = require('https');
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from(mockHtmlContent));
          }
          if (event === 'end') {
            callback();
          }
        })
      };
      
      const mockRequest = {
        setTimeout: jest.fn(),
        on: jest.fn(),
        end: jest.fn()
      };
      
      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });
    });

    and('le serveur répond avec un code 200', () => {
      // Déjà mocké dans le given
    });

    when('on télécharge le contenu avec fetchHtmlContent', async () => {
      content = await _testOnly_fetchHtmlContent('https://www.hermes.admin.ch/en/project-management/phases.html');
    });

    then('le contenu texte est retourné', () => {
      expect(content).toBeDefined();
      expect(typeof content).toBe('string');
    });

    and('le contenu est une chaîne non vide', () => {
      expect(content.length).toBeGreaterThan(0);
      // Vérifier que le contenu texte contient des éléments clés (conversion HTML→texte)
      expect(content).toContain('Test');
    });
  }, 5000);

  //
  // === Tests de succès pour collectHtmlSourcesAndInstructions ===

  test('Collecte réussie des blocs HTML avec instructions', ({ given, and, when, then }) => {
    let result;
    const mockResolvedSchema = {
      concepts: {
        type: 'object',
        properties: {
          sourceUrl: {
            type: 'array',
            items: {
              enum: ['/en/project-management/method-overview.html']
            }
          },
          extractionInstructions: {
            type: 'array',
            items: {
              enum: ['Extract the overview text']
            }
          },
          overview: { type: 'string' }
        }
      }
    };

    given('un schéma JSON résolu avec sourceUrl et extractionInstructions', () => {
      // Schéma déjà défini dans mockResolvedSchema
    });

    and('une configuration avec baseUrl valide', () => {
      config = {
        extractionSource: {
          baseUrl: 'https://www.hermes.admin.ch'
        }
      };
    });

    and('les URLs du schéma sont accessibles', () => {
      // Mock fetchHtmlContent (déjà importé depuis html-collector-and-transformer)
      const mockHtml = '<html><body><h1>Overview</h1><p>Test overview content</p></body></html>';
      jest.spyOn(require('../../src/html-collector-and-transformer.js'), 'fetchHtmlContent')
        .mockResolvedValue('Overview\n\nTest overview content');
    });

    when('on collecte les sources avec collectHtmlSourcesAndInstructions', async () => {
      result = await _testOnly_collectHtmlSourcesAndInstructions(
        mockResolvedSchema,
        config,
        'https://www.hermes.admin.ch'
      );
    });

    then('une liste de blocs est retournée', () => {
      expect(result).toBeDefined();
      expect(result.blocks).toBeDefined();
      expect(Array.isArray(result.blocks)).toBe(true);
    });

    and('chaque bloc contient jsonPointer, instructions et htmlContents', () => {
      expect(result.blocks.length).toBeGreaterThan(0);
      
      for (const block of result.blocks) {
        expect(block.jsonPointer).toBeDefined();
        expect(typeof block.jsonPointer).toBe('string');
        expect(block.instructions).toBeDefined();
        expect(Array.isArray(block.instructions)).toBe(true);
        expect(block.htmlContents).toBeDefined();
        expect(Array.isArray(block.htmlContents)).toBe(true);
      }
    });
  }, 5000);

  //
  // === Tests de succès pour saveArtifact ===

  test('Sauvegarde réussie de l\'artefact JSON', ({ given, and, when, then }) => {
    let result;
    const artifact = {
      config: { extractionSource: { baseUrl: 'https://test.com' } },
      method: { overview: 'Test method' },
      concepts: { overview: 'Test concepts' }
    };
    const testDate = new Date('2025-11-12T10:00:00.000Z');

    given('une configuration avec artifactBaseDirectory valide', () => {
      config = {
        artifactBaseDirectory: 'shared/hermes2022-extraction-files/data'
      };
    });

    and('un artefact JSON valide', () => {
      // Artifact déjà défini
    });

    and('un répertoire de destination qui existe', () => {
      // Mock fs.existsSync pour retourner true
      fs.existsSync = jest.fn().mockReturnValue(true);
      
      // Mock fs.writeFileSync (pas de vraie écriture)
      fs.writeFileSync = jest.fn();
    });

    when('on sauvegarde l\'artefact avec saveArtifact', async () => {
      result = await _testOnly_saveArtifact(config, artifact, testDate);
    });

    then('l\'artefact est écrit dans le fichier', () => {
      expect(fs.writeFileSync).toHaveBeenCalled();
      
      // Vérifier que le premier appel est pour l'artefact
      const firstCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      expect(firstCall[0]).toContain('hermes2022-concepts-2025-11-12.json');
      
      const savedContent = JSON.parse(firstCall[1]);
      expect(savedContent).toEqual(artifact);
    });

    and('le fichier d\'approbation est créé', () => {
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
      
      // Vérifier que le deuxième appel est pour l'approbation
      const secondCall = (fs.writeFileSync as jest.Mock).mock.calls[1];
      expect(secondCall[0]).toContain('hermes2022-concepts-2025-11-12.approval.json');
      
      const approvalContent = JSON.parse(secondCall[1]);
      expect(approvalContent.artifact).toBe('hermes2022-concepts-2025-11-12.json');
      expect(approvalContent.approvals).toBeDefined();
      expect(Array.isArray(approvalContent.approvals)).toBe(true);
    });

    and('les chemins des fichiers sont retournés', () => {
      expect(result).toBeDefined();
      expect(result.artifactPath).toBeDefined();
      expect(result.approvalPath).toBeDefined();
      expect(result.artifactPath).toContain('hermes2022-concepts-2025-11-12.json');
      expect(result.approvalPath).toContain('hermes2022-concepts-2025-11-12.approval.json');
    });
  }, 5000);
});

