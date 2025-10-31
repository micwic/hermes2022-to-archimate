// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import * as nuextractApi from '../../../src/nuextract-api.js';

jest.mock('../../../src/nuextract-api.js', () => {
  const actual = jest.requireActual('../../../src/nuextract-api.js');
  return {
    ...actual,
    getNuExtractProjects: jest.fn(actual.getNuExtractProjects),
    createNuExtractProject: jest.fn(actual.createNuExtractProject),
    putProjectTemplate: jest.fn(actual.putProjectTemplate)
  };
});

import {
  _testOnly_loadGlobalConfig as loadGlobalConfig,
  _testOnly_findOrCreateProject as findOrCreateProject
} from '../../../src/nuextract-client.js';

const feature = loadFeature(__dirname + '/nuextract-project-management-mocked.feature');

defineFeature(feature, (test) => {
  let config;
  let error;

  beforeEach(async () => {
    jest.clearAllMocks();
    config = await loadGlobalConfig();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const arrangeRun = async (templateObj, templateReset, existingProject) => {
    try {
      if (existingProject) {
        (nuextractApi.getNuExtractProjects as jest.Mock).mockResolvedValue([{ id: 'p1', name: config.nuextract.projectName }]);
      } else {
        (nuextractApi.getNuExtractProjects as jest.Mock).mockResolvedValue([]);
      }
      await findOrCreateProject(
        'fake-api-key',
        config.nuextract.projectName,
        config.nuextract.projectDescription,
        templateObj,
        templateReset,
        config?.nuextract?.baseUrl || 'nuextract.ai',
        config?.nuextract?.port || 443,
        config?.nuextract?.projectsPath || '/api/projects'
      );
    } catch (e) {
      error = e;
    }
  };

  test('Création de projet sans template (orchestration)', ({ given, when, then }) => {
    given('une configuration valide pour la gestion de projet', () => {
      expect(config).toBeDefined();
    });

    given('aucun projet existant avec le nom configuré', () => {
      // handled by arrangeRun with existingProject=false
    });

    given('un template null', () => {
      // handled by arrangeRun with templateObj=null
    });

    when("on exécute l'orchestration de gestion de projet", async () => {
      await arrangeRun(null, false, false);
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
  }, 5000);

  test('Mise à jour demandée sans template (orchestration)', ({ given, when, then }) => {
    given('une configuration valide pour la gestion de projet', () => {
      expect(config).toBeDefined();
    });

    given('un projet existant sur la plateforme', () => {
      // handled by arrangeRun with existingProject=true
    });

    given('templateReset est true', () => {
      // handled by arrangeRun with templateReset=true
    });

    given('un template null', () => {
      // handled by arrangeRun with templateObj=null
    });

    when("on exécute l'orchestration de gestion de projet", async () => {
      await arrangeRun(null, true, true);
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
  }, 5000);
});


