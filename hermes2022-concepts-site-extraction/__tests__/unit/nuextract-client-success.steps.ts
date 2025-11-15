// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';

jest.mock('../../src/nuextract-api.js', () => {
  const actual = jest.requireActual('../../src/nuextract-api.js');
  return {
    ...actual,
    getNuExtractProjects: jest.fn(actual.getNuExtractProjects),
    createNuExtractProject: jest.fn(actual.createNuExtractProject),
    inferTemplateFromDescription: jest.fn(actual.inferTemplateFromDescription),
    inferTemplateFromDescriptionAsync: jest.fn(actual.inferTemplateFromDescriptionAsync),
    pollJobUntilComplete: jest.fn(actual.pollJobUntilComplete),
    putProjectTemplate: jest.fn(actual.putProjectTemplate),
    inferTextFromContent: jest.fn(actual.inferTextFromContent)
  };
});

const nuextractApi = require('../../src/nuextract-api.js');
const {
  _testOnly_findOrCreateProject: findOrCreateProject,
  _testOnly_generateTemplateForBlock: generateTemplateForBlock,
  _testOnly_extractSingleBlock: extractSingleBlock
} = require('../../src/nuextract-client.js');

const feature = loadFeature(__dirname + '/nuextract-client-success.feature');

defineFeature(feature, (test) => {
  let config;
  let apiKey;
  let blockSchema;
  let block;
  let result;
  let template;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    config = {
      llm: {
        nuextract: {
          projectName: 'HERMES2022',
          projectDescription: 'Test project',
          templateTransformationInstructions: {
            instructions: ['instruction1', 'instruction2']
          },
          templateMode: 'sync',
          baseUrl: 'nuextract.ai',
          port: 443,
          projectsPath: '/api/projects',
          pathPrefix: null
        }
      }
    };

    apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    
    blockSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' }
      }
    };

    result = undefined;
    template = undefined;
    block = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Création réussie d\'un projet NuExtract', ({ given, and, when, then }) => {
    given('une configuration minimale valide', () => {
      expect(config).toBeDefined();
      expect(config.llm.nuextract.projectName).toBe('HERMES2022');
    });

    and('un projet n\'existe pas encore sur la plateforme', () => {
      (nuextractApi.getNuExtractProjects as jest.Mock).mockResolvedValue([]);
      (nuextractApi.createNuExtractProject as jest.Mock).mockResolvedValue({
        id: 'project-new-123',
        name: 'HERMES2022'
      });
    });

    when('on appelle findOrCreateProject', async () => {
      result = await findOrCreateProject(config, apiKey);
    });

    then('le projet est créé avec succès', () => {
      expect(result).toBeDefined();
      expect(result.created).toBe(true);
      expect(nuextractApi.createNuExtractProject).toHaveBeenCalledTimes(1);
    });

    and('l\'identifiant du projet est retourné', () => {
      expect(result.id).toBe('project-new-123');
      expect(result.name).toBe('HERMES2022');
    });
  }, 5000);

  test('Réutilisation réussie d\'un projet existant', ({ given, and, when, then }) => {
    given('une configuration minimale valide', () => {
      expect(config).toBeDefined();
    });

    and('un projet existe déjà sur la plateforme', () => {
      (nuextractApi.getNuExtractProjects as jest.Mock).mockResolvedValue([
        { id: 'project-existing-456', name: 'HERMES2022' }
      ]);
    });

    when('on appelle findOrCreateProject', async () => {
      result = await findOrCreateProject(config, apiKey);
    });

    then('le projet existant est réutilisé', () => {
      expect(result).toBeDefined();
      expect(result.existing).toBe(true);
      expect(nuextractApi.createNuExtractProject).not.toHaveBeenCalled();
    });

    and('l\'identifiant du projet existant est retourné', () => {
      expect(result.id).toBe('project-existing-456');
      expect(result.name).toBe('HERMES2022');
    });
  }, 5000);

  test('Génération réussie de template en mode sync', ({ given, and, when, then }) => {
    given('une configuration minimale valide', () => {
      expect(config).toBeDefined();
      expect(config.llm.nuextract.templateMode).toBe('sync');
    });

    and('un schéma de bloc simple', () => {
      expect(blockSchema).toBeDefined();
      expect(blockSchema.type).toBe('object');
    });

    and('une clé API valide', () => {
      expect(apiKey).toBeDefined();
    });

    when('on génère un template avec generateTemplateForBlock en mode sync', async () => {
      (nuextractApi.inferTemplateFromDescription as jest.Mock).mockResolvedValue({
        name: 'string',
        description: 'string'
      });

      template = await generateTemplateForBlock(blockSchema, config, apiKey);
    });

    then('le template est généré avec succès', () => {
      expect(template).toBeDefined();
      expect(nuextractApi.inferTemplateFromDescription).toHaveBeenCalledTimes(1);
    });

    and('le template contient la structure attendue', () => {
      expect(template.name).toBe('string');
      expect(template.description).toBe('string');
    });
  }, 5000);

  test('Génération réussie de template en mode async', ({ given, and, when, then }) => {
    given('une configuration minimale valide', () => {
      config.llm.nuextract.templateMode = 'async';
      expect(config.llm.nuextract.templateMode).toBe('async');
    });

    and('un schéma de bloc simple', () => {
      expect(blockSchema).toBeDefined();
    });

    and('une clé API valide', () => {
      expect(apiKey).toBeDefined();
    });

    when('on génère un template avec generateTemplateForBlock en mode async', async () => {
      (nuextractApi.inferTemplateFromDescriptionAsync as jest.Mock).mockResolvedValue({
        status: 'submitted',
        jobId: 'job-789'
      });

      (nuextractApi.pollJobUntilComplete as jest.Mock).mockResolvedValue({
        name: 'string',
        description: 'string'
      });

      template = await generateTemplateForBlock(blockSchema, config, apiKey);
    });

    then('le template est généré avec succès après polling', () => {
      expect(template).toBeDefined();
      expect(nuextractApi.inferTemplateFromDescriptionAsync).toHaveBeenCalledTimes(1);
      expect(nuextractApi.pollJobUntilComplete).toHaveBeenCalledTimes(1);
    });

    and('le template contient la structure attendue', () => {
      expect(template.name).toBe('string');
      expect(template.description).toBe('string');
    });
  }, 120000);

  test('Extraction réussie d\'un bloc unique', ({ given, and, when, then }) => {
    given('une configuration minimale valide', () => {
      expect(config).toBeDefined();
    });

    and('un bloc avec schéma et contenus HTML', () => {
      block = {
        jsonPointer: '/concepts/overview',
        schema: {
          type: 'string',
          minLength: 10
        },
        instructions: ['Synthétiser l\'overview des concepts HERMES2022'],
        htmlContents: [
          {
            url: 'https://www.hermes.admin.ch/en/project-management/phases.html',
            content: 'Contenu HTML exemple pour les phases.'
          }
        ]
      };
      expect(block).toBeDefined();
      expect(block.htmlContents.length).toBeGreaterThan(0);
    });

    and('une clé API valide', () => {
      expect(apiKey).toBeDefined();
    });

    and('un projet NuExtract initialisé', async () => {
      (nuextractApi.getNuExtractProjects as jest.Mock).mockResolvedValue([
        { id: 'project-initialized-999', name: 'HERMES2022' }
      ]);
      await findOrCreateProject(config, apiKey);
    });

    when('on extrait le bloc avec extractSingleBlock', async () => {
      (nuextractApi.inferTemplateFromDescription as jest.Mock).mockResolvedValue({
        overview: 'string'
      });

      (nuextractApi.putProjectTemplate as jest.Mock).mockResolvedValue({});

      (nuextractApi.inferTextFromContent as jest.Mock).mockResolvedValue(
        'Synthèse méthodologique complète des concepts HERMES2022.'
      );

      result = await extractSingleBlock(block, config, apiKey);
    });

    then('l\'extraction retourne des données structurées', () => {
      expect(result).toBeDefined();
      expect(result.jsonPointer).toBe('/concepts/overview');
      expect(result.data).toBeDefined();
    });

    and('les données respectent le schéma du bloc', () => {
      expect(typeof result.data).toBe('string');
      expect(result.data.length).toBeGreaterThan(10);
    });
  }, 120000);
});
