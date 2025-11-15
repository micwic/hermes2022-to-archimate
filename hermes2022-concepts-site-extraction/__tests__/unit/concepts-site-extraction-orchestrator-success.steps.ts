// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';

// Mock des CLIENTS (niveau orchestrateur), pas des API (niveau inférieur)
jest.mock('../../src/nuextract-client.js', () => {
  const actual = jest.requireActual('../../src/nuextract-client.js');
  return {
    ...actual,
    _testOnly_extractSingleBlock: jest.fn(actual._testOnly_extractSingleBlock)
  };
});

jest.mock('../../src/claude-client.js', () => {
  const actual = jest.requireActual('../../src/claude-client.js');
  return {
    ...actual,
    extractBlock: jest.fn(actual.extractBlock)
  };
});

jest.mock('../../src/html-collector-and-transformer.js', () => ({
  collectHtmlSourcesAndInstructions: jest.fn(),
  fetchHtmlContent: jest.fn()
}));

const nuextractClient = require('../../src/nuextract-client.js');
const claudeClient = require('../../src/claude-client.js');
const { collectHtmlSourcesAndInstructions } = require('../../src/html-collector-and-transformer.js');
const {
  extractHermes2022Concepts
} = require('../../src/concepts-site-extraction-orchestrator.js');

const feature = loadFeature(__dirname + '/concepts-site-extraction-orchestrator-success.feature');

defineFeature(feature, (test) => {
  let config;
  let resolvedSchema;
  let apiKeys;
  let preparation;
  let extractionResult;
  let extractionError;
  const extractSingleBlockMock = nuextractClient._testOnly_extractSingleBlock as jest.Mock;
  const extractBlockClaudeMock = claudeClient.extractBlock as jest.Mock;
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
      llm: {
        nuextract: {
          extractionBlocksMaxDepth: 2,
          baseUrl: 'nuextract.ai',
          port: 443
        }
      },
      extractionSource: {
        baseUrl: 'https://www.hermes.admin.ch/en',
        language: 'en'
      }
    };
    
    resolvedSchema = buildResolvedSchema();
    apiKeys = {
      nuextract: 'fake-nuextract-key',
      claude: 'fake-claude-key'
    };
    extractionResult = undefined;
    extractionError = undefined;
    preparation = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const runExtraction = async () => {
    try {
      extractionResult = await extractHermes2022Concepts(
        config,
        resolvedSchema,
        apiKeys
      );
    } catch (error) {
      extractionError = error;
    }
  };

  test('Extraction réussie avec agrégation des blocs', ({ given, when, then, and }) => {
    let overviewText; // Déclarer dans le scope du test
    
    given('une configuration d\'extraction hermes2022 minimaliste', () => {
      expect(resolvedSchema).toBeDefined();
      expect(apiKeys).toBeDefined();
    });

    given('des blocs collectés pour l\'extraction', () => {
      overviewText = 'Synthèse méthodologique '.repeat(40); // > 10 caractères
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

      // Mock des clients : retournent directement les résultats attendus
      // (on teste l'orchestration, pas l'extraction elle-même)
      extractSingleBlockMock.mockImplementation(async (block, config, apiKey) => {
        if (block.jsonPointer === methodPointer) {
          return {
            jsonPointer: methodPointer,
            data: { hermesVersion: '2022' }
          };
        }
        if (block.jsonPointer === conceptsPointer) {
          return {
            jsonPointer: conceptsPointer,
            data: overviewText // String directe (primitive) pour feuille du schéma
          };
        }
        throw new Error(`Bloc NuExtract inattendu: ${block.jsonPointer}`);
      });

      extractBlockClaudeMock.mockImplementation(async (block, config, apiKey) => {
        if (block.jsonPointer === methodPointer) {
          return {
            jsonPointer: methodPointer,
            data: { hermesVersion: '2022' }
          };
        }
        if (block.jsonPointer === conceptsPointer) {
          return {
            jsonPointer: conceptsPointer,
            data: overviewText // String directe (primitive) pour feuille du schéma
          };
        }
        throw new Error(`Bloc Claude inattendu: ${block.jsonPointer}`);
      });
    });

    and('les mocks clients sont configurés pour retourner des réponses valides', () => {
      expect(collectMock).toHaveBeenCalledTimes(0);
      expect(extractSingleBlockMock).toHaveBeenCalledTimes(0);
      expect(extractBlockClaudeMock).toHaveBeenCalledTimes(0);
      expect(jest.isMockFunction(collectMock)).toBe(true);
      expect(jest.isMockFunction(extractSingleBlockMock)).toBe(true);
      expect(jest.isMockFunction(extractBlockClaudeMock)).toBe(true);
    });

    when('on exécute l\'extraction des concepts avec extractHermes2022Concepts', runExtraction);

    then('un artefact est reconstruit avec succès', () => {
      expect(extractionError).toBeUndefined();
      expect(extractionResult).toBeDefined();
      expect(extractionResult.method).toBeDefined();
      expect(extractionResult.method.hermesVersion).toBe('2022');
      expect(extractionResult.concepts).toBeDefined();
      expect(extractionResult.concepts.overview).toBe(overviewText);
      expect(extractionResult.concepts.overview.length).toBeGreaterThan(10);
    });

    and('chaque bloc est extrait via les clients LLM appropriés', () => {
      // Par défaut, les blocs utilisent Claude (extractionModel: "claude")
      expect(extractBlockClaudeMock).toHaveBeenCalledTimes(2);
      
      const calls = (extractBlockClaudeMock as jest.Mock).mock.calls;
      const jsonPointers = calls.map(call => call[0].jsonPointer);
      
      expect(jsonPointers).toContain('/method');
      expect(jsonPointers).toContain('/concepts/overview');
    });
  }, 5000);
});

