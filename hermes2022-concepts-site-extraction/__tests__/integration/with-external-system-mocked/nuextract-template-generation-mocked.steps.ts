// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import * as nuextractApi from '@src/nuextract-api.js';

// Mock global du module API pour prévoir l'intégration multi-LLM
// TESTS D'INTÉGRATION MOCKÉS : Mock UNIQUEMENT la frontière externe (API NuExtract)
jest.mock('@src/nuextract-api.js', () => {
  const actual = jest.requireActual('@src/nuextract-api.js');
  return {
    ...actual,
    inferTemplateFromDescription: jest.fn(actual.inferTemplateFromDescription),
    inferTemplateFromDescriptionAsync: jest.fn(actual.inferTemplateFromDescriptionAsync),
    pollJobUntilComplete: jest.fn(actual.pollJobUntilComplete)
  };
});

// Structure préparée pour Claude (commentée pour future intégration multi-LLM)
// jest.mock('@src/claude-api.js', () => ({ extractBlock: jest.fn() }));

// REFACTORING BDD Phase 2 - Import depuis orchestrateur
import { 
  loadGlobalConfig
} from '@src/concepts-site-extraction-orchestrator.js';

// Import de la nouvelle fonction par bloc
import {
  _testOnly_generateTemplateForBlock as generateTemplateForBlock
} from '@src/nuextract-client.js';

const feature = loadFeature(__dirname + '/nuextract-template-generation-mocked.feature');

defineFeature(feature, (test) => {
  let config;
  let apiKey;
  let blockSchema;
  let template;
  let error;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Charger la config réelle via loadGlobalConfig (pas mockée)
    // TESTS D'INTÉGRATION : Fonctions internes non mockées
    config = await loadGlobalConfig();
    apiKey = 'fake-api-key';
    blockSchema = null;
    template = null;
    error = null;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Génération réussie de template bloc en mode sync', ({ given, and, when, then }) => {
    given('une configuration valide pour la génération de template', () => {
      expect(config).toBeDefined();
      // Mode sync par défaut
      config.llm.nuextract.templateMode = 'sync';
    });

    and('un schéma de bloc pour concepts overview', () => {
      blockSchema = {
        type: 'string',
        minLength: 600
      };
    });

    and('une API infer-template qui retourne un template valide', () => {
      (nuextractApi.inferTemplateFromDescription as jest.Mock).mockResolvedValue({
        overview: 'string'
      });
    });

    when('on génère un template pour le bloc avec generateTemplateForBlock en mode sync', async () => {
      template = await generateTemplateForBlock(blockSchema, config, apiKey);
    });

    then('le template est généré avec succès', () => {
      expect(template).toBeDefined();
      expect(nuextractApi.inferTemplateFromDescription).toHaveBeenCalledTimes(1);
    });

    and('le template contient la structure attendue', () => {
      expect(template.overview).toBe('string');
    });
  }, 5000);

  test('Génération réussie de template bloc en mode async', ({ given, and, when, then }) => {
    given('une configuration valide pour la génération de template', () => {
      expect(config).toBeDefined();
    });

    and('un schéma de bloc pour concepts overview', () => {
      blockSchema = {
        type: 'string',
        minLength: 600
      };
    });

    and('le mode est configuré en async', () => {
      config.llm.nuextract.templateMode = 'async';
    });

    and('une API infer-template-async qui retourne un jobId valide', () => {
      (nuextractApi.inferTemplateFromDescriptionAsync as jest.Mock).mockResolvedValue({
        status: 'submitted',
        jobId: 'job-success-123'
      });
    });

    and('un polling qui retourne un template valide', () => {
      (nuextractApi.pollJobUntilComplete as jest.Mock).mockResolvedValue({
        overview: 'string'
      });
    });

    when('on génère un template pour le bloc avec generateTemplateForBlock en mode async', async () => {
      template = await generateTemplateForBlock(blockSchema, config, apiKey);
    });

    then('le template est généré avec succès', () => {
      expect(template).toBeDefined();
      expect(nuextractApi.inferTemplateFromDescriptionAsync).toHaveBeenCalledTimes(1);
      expect(nuextractApi.pollJobUntilComplete).toHaveBeenCalledTimes(1);
    });

    and('le template contient la structure attendue', () => {
      expect(template.overview).toBe('string');
    });
  }, 5000);

  test('Erreur HTTP 500 en mode async', ({ given, and, when, then }) => {
    given('une configuration valide pour la génération de template', () => {
      expect(config).toBeDefined();
    });

    and('un schéma de bloc pour concepts overview', () => {
      blockSchema = {
        type: 'string',
        minLength: 600
      };
    });

    and('le mode est configuré en async', () => {
      config.llm.nuextract.templateMode = 'async';
    });

    and('une API infer-template-async qui retourne 500', () => {
      (nuextractApi.inferTemplateFromDescriptionAsync as jest.Mock).mockRejectedValue(
        new Error('Erreur infer-template-async: 500 - Internal Server Error')
      );
    });

    when('on génère un template pour le bloc avec generateTemplateForBlock en mode async', async () => {
      try {
        await generateTemplateForBlock(blockSchema, config, apiKey);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
  }, 5000);

  test('Timeout 10s en mode async', ({ given, and, when, then }) => {
    given('une configuration valide pour la génération de template', () => {
      expect(config).toBeDefined();
    });

    and('un schéma de bloc pour concepts overview', () => {
      blockSchema = {
        type: 'string',
        minLength: 600
      };
    });

    and('le mode est configuré en async', () => {
      config.llm.nuextract.templateMode = 'async';
    });

    and('une API infer-template-async qui timeoute à 10s', () => {
      (nuextractApi.inferTemplateFromDescriptionAsync as jest.Mock).mockRejectedValue(
        new Error('Timeout: La requête infer-template-async a dépassé 10 secondes')
      );
    });

    when('on génère un template pour le bloc avec generateTemplateForBlock en mode async', async () => {
      try {
        await generateTemplateForBlock(blockSchema, config, apiKey);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
  }, 5000);

  test('JSON invalide retourné par le polling', ({ given, and, when, then }) => {
    given('une configuration valide pour la génération de template', () => {
      expect(config).toBeDefined();
    });

    and('un schéma de bloc pour concepts overview', () => {
      blockSchema = {
        type: 'string',
        minLength: 600
      };
    });

    and('le mode est configuré en async', () => {
      config.llm.nuextract.templateMode = 'async';
    });

    and('une API async qui retourne un jobId valide', () => {
      (nuextractApi.inferTemplateFromDescriptionAsync as jest.Mock).mockResolvedValue({
        status: 'submitted',
        jobId: 'job-invalid-json'
      });
    });

    and('un polling qui retourne un JSON invalide', () => {
      (nuextractApi.pollJobUntilComplete as jest.Mock).mockResolvedValue('{invalid json}');
    });

    when('on génère un template pour le bloc avec generateTemplateForBlock en mode async', async () => {
      try {
        await generateTemplateForBlock(blockSchema, config, apiKey);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
  }, 5000);

  test('Type templateData invalide (array)', ({ given, and, when, then }) => {
    given('une configuration valide pour la génération de template', () => {
      expect(config).toBeDefined();
    });

    and('un schéma de bloc pour concepts overview', () => {
      blockSchema = {
        type: 'string',
        minLength: 600
      };
    });

    and('le mode est configuré en async', () => {
      config.llm.nuextract.templateMode = 'async';
    });

    and('une API async qui retourne un jobId valide', () => {
      (nuextractApi.inferTemplateFromDescriptionAsync as jest.Mock).mockResolvedValue({
        status: 'submitted',
        jobId: 'job-invalid-type'
      });
    });

    and('un polling qui retourne un type invalide', () => {
      (nuextractApi.pollJobUntilComplete as jest.Mock).mockResolvedValue([1, 2, 3]);
    });

    when('on génère un template pour le bloc avec generateTemplateForBlock en mode async', async () => {
      try {
        await generateTemplateForBlock(blockSchema, config, apiKey);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
  }, 5000);
});
