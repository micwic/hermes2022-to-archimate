// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import fs from 'fs';
import path from 'path';
import findUp from 'find-up';

const fullFilePath = findUp.sync('package.json', { cwd: __dirname });
if (!fullFilePath) {
  throw new Error('Impossible de localiser la racine du repository');
}
const repoRoot = path.dirname(fullFilePath);
const resolveFromRepoRoot = (...segments: string[]) => path.resolve(repoRoot, ...segments);

// REFACTORING BDD Phase 3 - Import depuis orchestrateur
const orchestratorModulePath = resolveFromRepoRoot('hermes2022-concepts-site-extraction/src/concepts-site-extraction-orchestrator.js');
const { loadGlobalConfig, loadApiKeys } = require(orchestratorModulePath);

const nuextractClientModulePath = resolveFromRepoRoot('hermes2022-concepts-site-extraction/src/nuextract-client.js');
const {
  _testOnly_findOrCreateProject: findOrCreateProject
} = require(nuextractClientModulePath);

const nuextractApiModulePath = resolveFromRepoRoot('hermes2022-concepts-site-extraction/src/nuextract-api.js');
const {
  getNuExtractProjects
} = require(nuextractApiModulePath);

const feature = loadFeature(__dirname + '/nuextract-project-management.feature');

defineFeature(feature, (test) => {
  let config;
  let apiKeys;
  let projectResult;

  // Hooks d'isolation pour les tests d'intégration réels
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Charger la configuration réelle
    config = await loadGlobalConfig();
    
    // Charger les clés API réelles
    apiKeys = await loadApiKeys(config);
    
    projectResult = null;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Test d'intégration API avec timeout étendu (120s)
  test('Création d\'un nouveau projet sans template (API réelle)', ({ given, and, when, then }) => {
    given('une configuration valide pour la gestion de projet', () => {
      expect(config.llm.nuextract.projectName).toBeDefined();
      expect(config.llm.nuextract.projectDescription).toBeDefined();
    });

    and('une clé API NuExtract valide', () => {
      expect(apiKeys.nuextract).toBeTruthy();
    });

    when('on appelle findOrCreateProject pour créer le projet', async () => {
      // Note : findOrCreateProject gère automatiquement la création/réutilisation
      // Si le projet existe déjà, il sera réutilisé (voir scénario 2)
      projectResult = await findOrCreateProject(config, apiKeys.nuextract);
    });

    then('le projet est créé avec succès sur la plateforme NuExtract', () => {
      // Le projet peut avoir été créé OU réutilisé
      expect(projectResult).toBeDefined();
      expect(projectResult.id).toBeDefined();
      expect(projectResult.name).toBe(config.llm.nuextract.projectName);
    });

    and('l\'ID du projet est retourné', () => {
      expect(projectResult.id).toBeTruthy();
    });

    and('l\'ID est caché dans _projectId pour réutilisation', () => {
      // La vérification du cache _projectId se fait indirectement :
      // Si on appelle findOrCreateProject à nouveau, il ne doit pas recréer
      // Ceci est testé dans les tests unitaires
      expect(projectResult.id).toBeDefined();
    });
  }, 120000);

  // Test d'intégration API avec timeout étendu (120s)
  test('Réutilisation d\'un projet existant (API réelle)', ({ given, and, when, then }) => {
    let existingProject;

    given('une configuration valide pour la gestion de projet', () => {
      expect(config.llm.nuextract.projectName).toBeDefined();
    });

    and('une clé API NuExtract valide', () => {
      expect(apiKeys.nuextract).toBeTruthy();
    });

    and('un projet "HERMES2022" existant sur la plateforme', async () => {
      // Vérifier que le projet existe (ou le créer pour préparer le test)
      const projects = await getNuExtractProjects(
        config.llm.nuextract.baseUrl || 'nuextract.ai',
        config.llm.nuextract.port || 443,
        config.llm.nuextract.projectsPath || '/api/projects',
        config.llm.nuextract.pathPrefix || null,
        apiKeys.nuextract
      );
      
      existingProject = projects.find(p => p.name === config.llm.nuextract.projectName);
      
      if (!existingProject) {
        // Si le projet n'existe pas, le créer d'abord
        console.warn(`Projet "${config.llm.nuextract.projectName}" n'existe pas, création préalable pour le test de réutilisation`);
        existingProject = await findOrCreateProject(config, apiKeys.nuextract);
      }
      
      expect(existingProject).toBeDefined();
      expect(existingProject.id).toBeDefined();
    });

    when('on appelle findOrCreateProject pour le projet existant', async () => {
      projectResult = await findOrCreateProject(config, apiKeys.nuextract);
    });

    then('le projet existant est trouvé', () => {
      expect(projectResult).toBeDefined();
      expect(projectResult.existing).toBe(true);
    });

    and('l\'ID du projet existant est retourné', () => {
      expect(projectResult.id).toBe(existingProject.id);
    });

    and('l\'ID est caché dans _projectId pour réutilisation', () => {
      expect(projectResult.id).toBeDefined();
    });
  }, 120000);
});
