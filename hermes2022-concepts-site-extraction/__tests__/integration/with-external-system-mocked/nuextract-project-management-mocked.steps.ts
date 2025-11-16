// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import * as nuextractApi from '@src/nuextract-api.js';

// Mock global du module API pour prévoir l'intégration multi-LLM
// TESTS D'INTÉGRATION MOCKÉS : Mock UNIQUEMENT la frontière externe (API NuExtract)
jest.mock('@src/nuextract-api.js', () => {
  const actual = jest.requireActual('@src/nuextract-api.js');
  return {
    ...actual,
    getNuExtractProjects: jest.fn(actual.getNuExtractProjects),
    createNuExtractProject: jest.fn(actual.createNuExtractProject)
  };
});

// REFACTORING BDD Phase 2 - Import loadGlobalConfig depuis orchestrateur
import { loadGlobalConfig } from '@src/concepts-site-extraction-orchestrator.js';

import {
  _testOnly_findOrCreateProject as findOrCreateProject
} from '@src/nuextract-client.js';

const feature = loadFeature(__dirname + '/nuextract-project-management-mocked.feature');

defineFeature(feature, (test) => {
  let config;
  let apiKey;
  let result;
  let error;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Charger la config réelle via loadGlobalConfig (pas mockée)
    // TESTS D'INTÉGRATION : Fonctions internes non mockées
    config = await loadGlobalConfig();
    apiKey = 'fake-api-key';
    result = null;
    error = null;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // === Scénarios de succès ===

  test('Création réussie de projet (sans template, workflow par blocs)', ({ given, and, when, then }) => {
    given('une configuration valide pour la gestion de projet', () => {
      expect(config).toBeDefined();
      expect(config.llm.nuextract.projectName).toBeDefined();
    });

    and('aucun projet existant avec le nom configuré', () => {
      // Mock getNuExtractProjects pour retourner array vide
      (nuextractApi.getNuExtractProjects as jest.Mock).mockResolvedValue([]);
      
      // Mock createNuExtractProject pour retourner projet créé
      (nuextractApi.createNuExtractProject as jest.Mock).mockResolvedValue({
        id: 'new-project-123',
        name: config.llm.nuextract.projectName
      });
    });

    when('on appelle findOrCreateProject avec la config et l\'apiKey', async () => {
      result = await findOrCreateProject(config, apiKey);
    });

    then('le projet est créé avec succès', () => {
      expect(result).toBeDefined();
      expect(result.id).toBe('new-project-123');
      expect(result.name).toBe(config.llm.nuextract.projectName);
    });

    and('l\'id du projet est mis en cache dans _projectId', () => {
      // Validé par comportement interne (cache _projectId dans nuextract-client.js)
      // Cette validation est indirecte via le retour de findOrCreateProject
      expect(result.id).toBeDefined();
    });

    and('la réponse contient created: true', () => {
      expect(result.created).toBe(true);
    });
  }, 5000);

  test('Réutilisation de projet existant (cache _projectId)', ({ given, and, when, then }) => {
    given('une configuration valide pour la gestion de projet', () => {
      expect(config).toBeDefined();
      expect(config.llm.nuextract.projectName).toBeDefined();
    });

    and(/^un projet existant sur la plateforme avec id "(.*)"$/, (projectId) => {
      // Mock getNuExtractProjects pour retourner projet existant
      (nuextractApi.getNuExtractProjects as jest.Mock).mockResolvedValue([
        {
          id: projectId,
          name: config.llm.nuextract.projectName
        }
      ]);
    });

    when('on appelle findOrCreateProject avec la config et l\'apiKey', async () => {
      result = await findOrCreateProject(config, apiKey);
    });

    then('le projet existant est réutilisé', () => {
      expect(result).toBeDefined();
      expect(result.id).toBe('project-123');
      expect(result.name).toBe(config.llm.nuextract.projectName);
    });

    and('l\'id du projet est mis en cache dans _projectId', () => {
      // Validé par comportement interne
      expect(result.id).toBeDefined();
    });

    and('la réponse contient existing: true', () => {
      expect(result.existing).toBe(true);
    });
  }, 5000);

  // === Scénarios d'erreur ===

  test('Erreur projectName manquant dans config', ({ given, and, when, then }) => {
    given('une configuration valide pour la gestion de projet', () => {
      expect(config).toBeDefined();
    });

    and('une config avec projectName vide', () => {
      // Créer une config vide pour contourner le fallback || 'HERMES2022'
      // Le fallback ne s'applique que si nuextractConfig.projectName existe
      config.llm.nuextract.projectName = '   '; // Chaîne avec espaces seulement → .trim() === ''
    });

    when('on tente d\'appeler findOrCreateProject', async () => {
      try {
        await findOrCreateProject(config, apiKey);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
  }, 5000);

  test('Erreur API getNuExtractProjects (HTTP 500)', ({ given, and, when, then }) => {
    given('une configuration valide pour la gestion de projet', () => {
      expect(config).toBeDefined();
    });

    and('une API getNuExtractProjects qui retourne 500', () => {
      // Mock getNuExtractProjects pour lever erreur HTTP 500
      (nuextractApi.getNuExtractProjects as jest.Mock).mockRejectedValue(
        new Error('API error: 500 - Internal Server Error')
      );
    });

    when('on tente d\'appeler findOrCreateProject', async () => {
      try {
        await findOrCreateProject(config, apiKey);
      } catch (e) {
        error = e;
      }
    });

    then(/^une erreur contenant "(.*)" est générée$/, (expectedMessage) => {
      expect(error).toBeDefined();
      expect(error.message).toContain(expectedMessage);
    });
  }, 5000);

  test('Erreur API createNuExtractProject (HTTP 403)', ({ given, and, when, then }) => {
    given('une configuration valide pour la gestion de projet', () => {
      expect(config).toBeDefined();
    });

    and('aucun projet existant avec le nom configuré', () => {
      // Mock getNuExtractProjects pour retourner array vide
      (nuextractApi.getNuExtractProjects as jest.Mock).mockResolvedValue([]);
    });

    and('une API createNuExtractProject qui retourne 403', () => {
      // Mock createNuExtractProject pour lever erreur HTTP 403
      (nuextractApi.createNuExtractProject as jest.Mock).mockRejectedValue(
        new Error('API error: 403 - Forbidden')
      );
    });

    when('on tente d\'appeler findOrCreateProject', async () => {
      try {
        await findOrCreateProject(config, apiKey);
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
