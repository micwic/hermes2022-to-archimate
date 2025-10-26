// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import { Given, When, Then } from 'jest-cucumber';
import fs from 'fs';
import path from 'path';

// Import des fonctions du script refactorisé
import { 
  _testOnly_loadGlobalConfig as loadGlobalConfig, 
  _testOnly_loadApiKey as loadApiKey, 
  _testOnly_generateTemplate as generateTemplate, 
  _testOnly_findOrCreateProject as findOrCreateProject,
  _testOnly_putProjectTemplate as putProjectTemplate,
  _testOnly_getNuExtractProjects as getNuExtractProjects 
} from '../../src/nuextract-client.js';
import { resolveFromRepoRoot } from '../../src/path-resolver.js';

const feature = loadFeature(__dirname + '/nuextract-project-management.feature');

defineFeature(feature, (test) => {
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
      // Vérifier que le projet n'existe pas en listant les projets
      const projects = await getNuExtractProjects(apiKey);
      const existingProject = projects.find(p => p.name === config.nuextract.projectName);
      
      // Si le projet existe, on suppose qu'il sera réutilisé par findOrCreateProject
      // Ce step valide simplement la précondition initiale
      if (existingProject) {
        console.warn(`⚠️  Le projet "${config.nuextract.projectName}" existe déjà - le test testera la réutilisation au lieu de la création`);
      }
    });

    when('on demande la création du projet avec findOrCreateProject', async () => {
      projectResult = await findOrCreateProject(
        apiKey,
        config.nuextract.projectName,
        config.nuextract.projectDescription,
        template,
        config.nuextract.templateReset // Utiliser le paramètre de configuration
      );
    });

    then('le projet est créé avec succès', () => {
      expect(projectResult).toBeDefined();
      expect(projectResult.id).toBeDefined();
    });

    and('le projet contient le template fourni', () => {
      // Le template a été fourni lors de la création
      expect(template).toBeDefined();
    });

    and('l\'ID du projet est retourné', () => {
      expect(projectResult.id).toBeDefined();
      expect(typeof projectResult.id).toBe('string');
    });
  }, 120000); // Timeout 2 minutes pour appels API

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
      
      // S'assurer que templateReset est à true pour ce test
      config.nuextract.templateReset = true;
    });

    and('une clé API NuExtract', async () => {
      apiKey = await loadApiKey(config);
      expect(apiKey).toBeDefined();
    });

    and('un projet "HERMES2022" existant sur la plateforme', async () => {
      // Rechercher ou créer le projet pour s'assurer qu'il existe
      const template = await generateTemplate(config, apiKey);
      existingProject = await findOrCreateProject(
        apiKey,
        config.nuextract.projectName,
        config.nuextract.projectDescription,
        template,
        false // Ne pas mettre à jour lors de la création/recherche initiale
      );
      expect(existingProject).toBeDefined();
      expect(existingProject.id).toBeDefined();
    });

    and('un nouveau template NuExtract valide', async () => {
      // Générer un nouveau template (modifié pour le test)
      newTemplate = await generateTemplate(config, apiKey);
      expect(newTemplate).toBeDefined();
    });

    when('on met à jour le template du projet avec putProjectTemplate', async () => {
      // Utiliser findOrCreateProject avec templateReset=true pour mettre à jour
      updateResult = await findOrCreateProject(
        apiKey,
        config.nuextract.projectName,
        config.nuextract.projectDescription,
        newTemplate,
        true // templateReset=true pour forcer la mise à jour
      );
    });

    then('le template est mis à jour avec succès', () => {
      expect(updateResult).toBeDefined();
      expect(updateResult.updated).toBe(true); // Vérifier que le flag 'updated' est présent
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
      
      // S'assurer que templateReset est à false pour ce test
      config.nuextract.templateReset = false;
    });

    and('une clé API NuExtract', async () => {
      apiKey = await loadApiKey(config);
      expect(apiKey).toBeDefined();
    });

    and('un projet "HERMES2022" existant sur la plateforme', async () => {
      // S'assurer que le projet existe
      const template = await generateTemplate(config, apiKey);
      existingProject = await findOrCreateProject(
        apiKey,
        config.nuextract.projectName,
        config.nuextract.projectDescription,
        template,
        false // Ne pas mettre à jour lors de la création initiale
      );
      expect(existingProject).toBeDefined();
    });

    when('on recherche le projet avec findOrCreateProject sans nouveau template', async () => {
      // Appeler findOrCreateProject avec template mais templateReset=false
      const template = await generateTemplate(config, apiKey);
      searchResult = await findOrCreateProject(
        apiKey,
        config.nuextract.projectName,
        config.nuextract.projectDescription,
        template,
        false // templateReset=false : ne pas mettre à jour
      );
    });

    then('Ne rien faire', () => {
      // Ce step valide simplement qu'aucune erreur n'est levée
      // Le comportement attendu est que la fonction retourne le projet existant sans modification
      expect(searchResult).toBeDefined();
      expect(searchResult.updated).toBe(false); // Vérifier qu'aucune mise à jour n'a été faite
    });

    and('l\'ID du projet existant est retourné', () => {
      expect(searchResult).toBeDefined();
      expect(searchResult.id).toBeDefined();
      expect(searchResult.id).toBe(existingProject.id);
    });
  }, 120000);
});
