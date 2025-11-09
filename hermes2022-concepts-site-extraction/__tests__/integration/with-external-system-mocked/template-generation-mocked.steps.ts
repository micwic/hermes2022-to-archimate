// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import * as nuextractApi from '@src/nuextract-api.js';

// Mock global du module API avec alias moduleNameMapper (conforme @root-directory-governance)
jest.mock('@src/nuextract-api.js', () => {
  const actual = jest.requireActual('@src/nuextract-api.js');
  return {
    ...actual,
    inferTemplateFromDescriptionAsync: jest.fn(actual.inferTemplateFromDescriptionAsync),
    pollJobUntilComplete: jest.fn(actual.pollJobUntilComplete)
  };
});

import {
  _testOnly_loadGlobalConfig as loadGlobalConfig,
  _testOnly_loadApiKey as loadApiKey,
  _testOnly_loadAndResolveSchemas as loadAndResolveSchemas,
  _testOnly_generateTemplate as generateTemplate
} from '@src/nuextract-client.js';

const feature = loadFeature(__dirname + '/template-generation-mocked.feature');

defineFeature(feature, (test) => {
  let config;
  let apiKey;
  let error;

  beforeEach(async () => {
    jest.clearAllMocks();
    config = await loadGlobalConfig();
    apiKey = 'fake-api-key';
    // Forcer mode async par défaut
    config.nuextract.templateMode = 'async';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const arrangeErrorThrow = async () => {
    try {
      const resolvedJsonSchema = await loadAndResolveSchemas(config);
      await generateTemplate(config, apiKey, resolvedJsonSchema);
    } catch (e) {
      error = e;
    }
  };

  test('Erreur HTTP 500 en mode async', ({ given, when, then }) => {
    given('une configuration valide pour la génération de template', () => {
      expect(config).toBeDefined();
    });

    given('une API infer-template-async qui retourne 500', () => {
      (nuextractApi.inferTemplateFromDescriptionAsync as jest.Mock).mockRejectedValue(
        new Error('Erreur infer-template-async: 500 - Internal Server Error')
      );
    });

    when('on génère un template NuExtract en mode async', arrangeErrorThrow);

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
  }, 5000);

  test('Timeout 10s en mode async', ({ given, when, then }) => {
    given('une configuration valide pour la génération de template', () => {
      expect(config).toBeDefined();
    });

    given('une API infer-template-async qui timeoute à 10s', () => {
      (nuextractApi.inferTemplateFromDescriptionAsync as jest.Mock).mockRejectedValue(
        new Error('Timeout: La requête infer-template-async a dépassé 10 secondes')
      );
    });

    when('on génère un template NuExtract en mode async', arrangeErrorThrow);

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
  }, 5000);

  test('JSON invalide retourné par le polling', ({ given, when, then }) => {
    given('une configuration valide pour la génération de template', () => {
      expect(config).toBeDefined();
    });

    given('une API async qui retourne un jobId valide', () => {
      (nuextractApi.inferTemplateFromDescriptionAsync as jest.Mock).mockResolvedValue({ status: 'submitted', jobId: 'job-1' });
    });

    given('un polling qui retourne un JSON invalide', () => {
      (nuextractApi.pollJobUntilComplete as jest.Mock).mockResolvedValue('{invalid json}');
    });

    when('on génère un template NuExtract en mode async', arrangeErrorThrow);

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
  }, 5000);

  test('Type templateData invalide (array)', ({ given, when, then }) => {
    given('une configuration valide pour la génération de template', () => {
      expect(config).toBeDefined();
    });

    given('une API async qui retourne un jobId valide', () => {
      (nuextractApi.inferTemplateFromDescriptionAsync as jest.Mock).mockResolvedValue({ status: 'submitted', jobId: 'job-2' });
    });

    given('un polling qui retourne un type invalide', () => {
      (nuextractApi.pollJobUntilComplete as jest.Mock).mockResolvedValue([1, 2, 3]);
    });

    when('on génère un template NuExtract en mode async', arrangeErrorThrow);

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
  }, 5000);
});


