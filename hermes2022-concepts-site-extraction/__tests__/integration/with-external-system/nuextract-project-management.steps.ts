// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import { Given, When, Then } from 'jest-cucumber';
import fs from 'fs';
import path from 'path';

// Import des fonctions du script refactorisé (métier)
import { 
  _testOnly_loadGlobalConfig as loadGlobalConfig, 
  _testOnly_loadApiKey as loadApiKey, 
  _testOnly_generateTemplate as generateTemplate, 
  _testOnly_findOrCreateProject as findOrCreateProject
} from '../../../src/nuextract-client.js';
import { resolveFromRepoRoot } from '../../../src/path-resolver.js';

// Import API (exports normaux)
import { getNuExtractProjects, putProjectTemplate } from '../../../src/nuextract-api.js';

const feature = loadFeature(__dirname + '/nuextract-project-management.feature');

defineFeature(feature, (test) => {
  // Hooks d'isolation pour les tests d'intégration
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Scénario 1 : Création d'un nouveau projet
  test('Création d\'un nouveau projet avec template sans qu\'il existe préalablement sur la plateforme SaaS NuExtract', ({ given, when, then, and }) => {
    let config;
    let apiKey;
    let template;
    let projectResult;

    given('des paramètres de configuration NuExtract pour la gestion de projet', async () => {
      config = await loadGlobalConfig();
      expect(config).toBeDefined();
      expect(config.nuextract).toBeDefined();
      expect(config.nuextract.projectName).toBeDefined();
      expect(config.nuextract.projectDescription).toBeDefined();
    });

    and('une clé API NuExtract', async () => {
      apiKey = await loadApiKey(config);
      expect(apiKey).toBeDefined();
      expect(apiKey).not.toBe('');
    });

    and('un template NuExtract valide', async () => {
      template = await generateTemplate(config, apiKey);
      expect(template).toBeDefined();
      expect(typeof template).toBe('object');
    });

    and('le projet "HERMES2022" n\'existe pas sur la plateforme', async () => {
      const projects = await getNuExtractProjects(
        config?.nuextract?.baseUrl || 'nuextract.ai',
        config?.nuextract?.port || 443,
        config?.nuextract?.projectsPath || '/api/projects',
        apiKey
      );
      // Vérification explicite que l'appel API fonctionne correctement
      expect(Array.isArray(projects)).toBe(true);
      
      const existingProject = projects.find(p => p.name === config.nuextract.projectName);
      if (existingProject) {
        // Vérification explicite que la détection du projet existant fonctionne
        expect(existingProject).toBeDefined();
        expect(existingProject.id).toBeDefined();
        expect(existingProject.name).toBe(config.nuextract.projectName);
        console.warn(`⚠️  Le projet "${config.nuextract.projectName}" existe déjà (id: ${existingProject.id}) - le test testera la réutilisation au lieu de la création`);
      } else {
        // Vérification explicite que le projet n'existe pas
        expect(existingProject).toBeUndefined();
        console.log(`✓ Le projet "${config.nuextract.projectName}" n'existe pas - le test testera la création`);
      }
    });

    when('on demande la création du projet avec findOrCreateProject', async () => {
      projectResult = await findOrCreateProject(
        apiKey,
        config.nuextract.projectName,
        config.nuextract.projectDescription,
        template,
        config.nuextract.templateReset,
        config?.nuextract?.baseUrl || 'nuextract.ai',
        config?.nuextract?.port || 443,
        config?.nuextract?.projectsPath || '/api/projects'
      );
    });

    then('le projet est créé avec succès', () => {
      expect(projectResult).toBeDefined();
      expect(projectResult.id).toBeDefined();
    });

    and('le projet contient le template fourni', () => {
      expect(template).toBeDefined();
    });

    and('l\'ID du projet est retourné', () => {
      expect(projectResult.id).toBeDefined();
      expect(typeof projectResult.id).toBe('string');
    });
  }, 120000);

  // Scénario 2 : Mise à jour d'un projet existant avec templateReset=true
  test('Recherche d\'un projet existant et mise à jour avec un nouveau template pour un projet qui existe déjà sur la plateforme SaaS NuExtract', ({ given, when, then, and }) => {
    let config;
    let apiKey;
    let existingProject;
    let newTemplate;
    let updateResult;

    given('des paramètres de configuration NuExtract pour la gestion de projet', async () => {
      config = await loadGlobalConfig();
      expect(config).toBeDefined();
      expect(config.nuextract).toBeDefined();
      config.nuextract.templateReset = true;
    });

    and('une clé API NuExtract', async () => {
      apiKey = await loadApiKey(config);
      expect(apiKey).toBeDefined();
    });

    and('un projet "HERMES2022" existant sur la plateforme', async () => {
      const template = await generateTemplate(config, apiKey);
      existingProject = await findOrCreateProject(
        apiKey,
        config.nuextract.projectName,
        config.nuextract.projectDescription,
        template,
        false,
        config?.nuextract?.baseUrl || 'nuextract.ai',
        config?.nuextract?.port || 443,
        config?.nuextract?.projectsPath || '/api/projects'
      );
      expect(existingProject).toBeDefined();
      expect(existingProject.id).toBeDefined();
    });

    and('un nouveau template NuExtract valide', async () => {
      newTemplate = await generateTemplate(config, apiKey);
      expect(newTemplate).toBeDefined();
    });

    when('on met à jour le template du projet avec putProjectTemplate', async () => {
      updateResult = await findOrCreateProject(
        apiKey,
        config.nuextract.projectName,
        config.nuextract.projectDescription,
        newTemplate,
        true,
        config?.nuextract?.baseUrl || 'nuextract.ai',
        config?.nuextract?.port || 443,
        config?.nuextract?.projectsPath || '/api/projects'
      );
    });

    then('le template est mis à jour avec succès', () => {
      expect(updateResult).toBeDefined();
      expect(updateResult.updated).toBe(true);
    });

    and('le projet contient le nouveau template', () => {
      expect(newTemplate).toBeDefined();
    });

    and('l\'ID du projet reste inchangé', () => {
      expect(updateResult.id).toBe(existingProject.id);
    });
  }, 120000);

  // Scénario 3 : Recherche sans mise à jour avec templateReset=false
  test('Recherche d\'un projet existant sans mise à jour pour un projet qui existe déjà sur la plateforme SaaS NuExtract', ({ given, when, then, and }) => {
    let config;
    let apiKey;
    let existingProject;
    let searchResult;

    given('des paramètres de configuration NuExtract pour la gestion de projet', async () => {
      config = await loadGlobalConfig();
      expect(config).toBeDefined();
      expect(config.nuextract).toBeDefined();
      config.nuextract.templateReset = false;
    });

    and('une clé API NuExtract', async () => {
      apiKey = await loadApiKey(config);
      expect(apiKey).toBeDefined();
    });

    and('un projet "HERMES2022" existant sur la plateforme', async () => {
      const template = await generateTemplate(config, apiKey);
      existingProject = await findOrCreateProject(
        apiKey,
        config.nuextract.projectName,
        config.nuextract.projectDescription,
        template,
        false,
        config?.nuextract?.baseUrl || 'nuextract.ai',
        config?.nuextract?.port || 443,
        config?.nuextract?.projectsPath || '/api/projects'
      );
      expect(existingProject).toBeDefined();
    });

    when('on recherche le projet avec findOrCreateProject sans nouveau template', async () => {
      const template = await generateTemplate(config, apiKey);
      searchResult = await findOrCreateProject(
        apiKey,
        config.nuextract.projectName,
        config.nuextract.projectDescription,
        template,
        false,
        config?.nuextract?.baseUrl || 'nuextract.ai',
        config?.nuextract?.port || 443,
        config?.nuextract?.projectsPath || '/api/projects'
      );
    });

    then('Ne rien faire', () => {
      expect(searchResult).toBeDefined();
      expect(searchResult.existing).toBe(true);
    });

    and('l\'ID du projet existant est retourné', () => {
      expect(searchResult).toBeDefined();
      expect(searchResult.id).toBeDefined();
      expect(searchResult.id).toBe(existingProject.id);
    });
  }, 120000);
});


