// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';

// Mocks avec alias moduleNameMapper (conforme @root-directory-governance)
// Utilise <rootDir> de Jest (équivalent repoRoot détecté via package.json)
jest.mock('@src/nuextract-api.js', () => {
  const actual = jest.requireActual('@src/nuextract-api.js');
  return {
    ...actual,
    inferTextFromContent: jest.fn(actual.inferTextFromContent)
  };
});

jest.mock('@src/html-collector-and-transformer.js', () => ({
  collectHtmlSourcesAndInstructions: jest.fn(),
  fetchHtmlContent: jest.fn()
}));

// Imports avec alias moduleNameMapper
const nuextractApi = require('@src/nuextract-api.js');
const { collectHtmlSourcesAndInstructions } = require('@src/html-collector-and-transformer.js');
const {
  _testOnly_extractHermes2022ConceptsWithNuExtract: extractHermes2022ConceptsWithNuExtract
} = require('@src/nuextract-client.js');

const feature = loadFeature(__dirname + '/extract-hermes2022-concepts-mocked.feature');

defineFeature(feature, (test) => {
  let config;
  let resolvedSchema;
  let apiKey;
  let projectId;
  let preparation;
  let extractionResult;
  let extractionError;
  const inferTextMock = nuextractApi.inferTextFromContent as jest.Mock;
  const collectMock = collectHtmlSourcesAndInstructions as jest.Mock;

  const buildResolvedSchema = () => ({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      config: {
        type: 'object',
        properties: {
          extractionSource: {
            type: 'object',
            properties: {
              baseUrl: { type: 'string' },
              language: { type: 'string' }
            },
            required: ['baseUrl', 'language'],
            additionalProperties: false
          }
        },
        required: ['extractionSource'],
        additionalProperties: false
      },
      method: {
        type: 'object',
        properties: {
          hermesVersion: { type: 'string' }
        },
        required: ['hermesVersion'],
        additionalProperties: false
      },
      concepts: {
        type: 'object',
        properties: {
          overview: { type: 'string', minLength: 10 }
        },
        required: ['overview'],
        additionalProperties: false
      }
    },
    required: ['config', 'method', 'concepts'],
    additionalProperties: false
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    config = {
      nuextract: {
        extractionBlocksMaxDepth: 2,
        baseUrl: 'nuextract.ai',
        port: 443,
        ['infer-textPath']: '/api/projects/{projectId}/infer-text',
        pathPrefix: null
      },
      extractionSource: {
        baseUrl: 'https://www.hermes.admin.ch/en',
        language: 'en'
      }
    };

    resolvedSchema = buildResolvedSchema();
    apiKey = 'fake-api-key';
    projectId = 'project-123';
    extractionResult = undefined;
    extractionError = undefined;
    preparation = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const runExtraction = async () => {
    try {
      extractionResult = await extractHermes2022ConceptsWithNuExtract(
        resolvedSchema,
        config,
        apiKey,
        projectId
      );
    } catch (error) {
      extractionError = error;
    }
  };

  test('Extraction réussie avec agrégation des blocs NuExtract', ({ given, when, then, and }) => {
    given('une configuration d\'extraction hermes2022 minimaliste', () => {
      expect(config).toBeDefined();
      expect(resolvedSchema).toBeDefined();
    });

    given('des blocs collectés pour l\'extraction', () => {
      const overviewText = 'Synthèse méthodologique '.repeat(40); // > 10 caractères
      const methodPointer = '/method';
      const conceptsPointer = '/concepts/overview';

      preparation = {
        blocks: [
          {
            jsonPointer: methodPointer,
            instructions: ['Retourner la version officielle de la méthode.'],
            htmlContents: [
              {
                url: 'https://www.hermes.admin.ch/en/project-management/method-overview.html',
                content: 'Contenu HTML exemple pour la méthode.'
              }
            ]
          },
          {
            jsonPointer: conceptsPointer,
            instructions: ['Synthétiser l\'overview des concepts.'],
            htmlContents: [
              {
                url: 'https://www.hermes.admin.ch/en/project-management/phases.html',
                content: 'Contenu HTML exemple pour les phases.'
              }
            ]
          }
        ]
      };

      collectMock.mockResolvedValue(preparation);

      inferTextMock.mockImplementation(async (_hostname, _port, _path, _prefix, _projectId, _apiKey, prompt) => {
        if (prompt.includes(`Block: ${methodPointer}`)) {
          return {
            method: {
              hermesVersion: '2022'
            }
          };
        }

        if (prompt.includes(`Block: ${conceptsPointer}`)) {
          return {
            concepts: {
              overview: overviewText
            }
          };
        }

        throw new Error(`Prompt inattendu: ${prompt}`);
      });
    });

    and('les mocks API sont configurés pour retourner des réponses valides', () => {
      // Vérification que les mocks sont configurés (pas encore appelés)
      expect(collectMock).toHaveBeenCalledTimes(0);
      expect(inferTextMock).toHaveBeenCalledTimes(0);
      // Vérification que les mocks sont des fonctions Jest mockées
      expect(jest.isMockFunction(collectMock)).toBe(true);
      expect(jest.isMockFunction(inferTextMock)).toBe(true);
    });

    when('on exécute l\'extraction des concepts avec extractHermes2022ConceptsWithNuExtract', runExtraction);

    then('un artefact est reconstruit avec succès', () => {
      expect(extractionError).toBeUndefined();
      expect(extractionResult).toBeDefined();
      expect(extractionResult.method).toBeDefined();
      expect(extractionResult.method.hermesVersion).toBe('2022');
      expect(extractionResult.concepts).toBeDefined();
      expect(extractionResult.concepts.overview.length).toBeGreaterThan(10);
    });

    and('chaque bloc est envoyé à l\'API NuExtract', () => {
      expect(inferTextMock).toHaveBeenCalledTimes(preparation.blocks.length);
      const prompts = inferTextMock.mock.calls.map(call => call[6]);
      expect(prompts.some(prompt => prompt.includes('Block: /method'))).toBe(true);
      expect(prompts.some(prompt => prompt.includes('Block: /concepts/overview'))).toBe(true);
    });
  }, 5000);

  test('Erreur lors de l\'extraction à cause d\'une réponse NuExtract invalide', ({ given, when, then }) => {
    given('une configuration d\'extraction hermes2022 minimaliste', () => {
      expect(config).toBeDefined();
      expect(resolvedSchema).toBeDefined();
    });

    given('des blocs collectés pour l\'extraction', () => {
      preparation = {
        blocks: [
          {
            jsonPointer: '/concepts/overview',
            instructions: ['Synthétiser l\'overview'],
            htmlContents: [
              {
                url: 'https://www.hermes.admin.ch/en/project-management/method-overview.html',
                content: 'Contenu HTML exemple.'
              }
            ]
          }
        ]
      };

      collectMock.mockResolvedValue(preparation);
    });

    // Step avec capture du message depuis .feature (conforme @bdd-governance)
    given(/^une réponse NuExtract invalide contenant "(.*)"$/, (errorMessage) => {
      // Le message provient de .feature via regex capture
      inferTextMock.mockRejectedValue(new Error(errorMessage));
    });

    when('on exécute l\'extraction des concepts avec extractHermes2022ConceptsWithNuExtract', runExtraction);

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(extractionError).toBeDefined();
      expect(extractionError.message).toContain(expectedMessage);
      expect(inferTextMock).toHaveBeenCalledTimes(1);
    });
  }, 5000);
});
