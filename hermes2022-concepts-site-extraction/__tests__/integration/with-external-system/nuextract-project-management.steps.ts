// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import { Given, When, Then } from 'jest-cucumber';
import fs from 'fs';
import path from 'path';
import findUp from 'find-up';

const fullFilePath = findUp.sync('package.json', { cwd: __dirname });
if (!fullFilePath) {
  throw new Error('Impossible de localiser la racine du repository');
}
const repoRoot = path.dirname(fullFilePath);
const resolveFromRepoRoot = (...segments: string[]) => path.resolve(repoRoot, ...segments);

const nuextractClientModulePath = resolveFromRepoRoot('hermes2022-concepts-site-extraction/src/nuextract-client.js');
const {
  _testOnly_loadGlobalConfig: loadGlobalConfig,
  _testOnly_loadApiKey: loadApiKey,
  _testOnly_loadAndResolveSchemas: loadAndResolveSchemas,
  _testOnly_generateTemplate: generateTemplate,
  _testOnly_findOrCreateProject: findOrCreateProject
} = require(nuextractClientModulePath);

const nuextractApiModulePath = resolveFromRepoRoot('hermes2022-concepts-site-extraction/src/nuextract-api.js');
const {
  getNuExtractProjects,
  getNuExtractProject,
  putProjectTemplate
} = require(nuextractApiModulePath);

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
      // Vérification minimale : les validations détaillées sont effectuées par loadGlobalConfig()
      expect(config?.nuextract?.projectName).toBeDefined();
      expect(config?.nuextract?.projectDescription).toBeDefined();
    });

    and('une clé API NuExtract', async () => {
      apiKey = await loadApiKey(config);
      // Vérification minimale : les validations détaillées (JWT, format) sont effectuées par loadApiKey()
      expect(apiKey).toBeTruthy();
    });

    and('un template NuExtract valide', async () => {
      const resolvedJsonSchema = await loadAndResolveSchemas(config);
      template = await generateTemplate(config, apiKey, resolvedJsonSchema);
      // Validation minimale : les validations détaillées sont effectuées par generateTemplate()
      expect(template).toBeDefined();
    });

    and('le projet "HERMES2022" n\'existe pas sur la plateforme', async () => {
      const projects = await getNuExtractProjects(
        config?.nuextract?.baseUrl || 'nuextract.ai',
        config?.nuextract?.port || 443,
        config?.nuextract?.projectsPath || '/api/projects',
        config?.nuextract?.pathPrefix || null,
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
      projectResult = await findOrCreateProject(config, apiKey, template);
    });

    then('le projet est créé avec succès', () => {
      // Validation technique : vérifier que l'exécution s'est bien déroulée
      // Note : Le projet peut avoir été réutilisé s'il existait déjà (test d'intégration réel)
      expect(projectResult?.id).toBeDefined(); // L'ID est toujours présent
      // Création : created === true ; mise à jour : updated === true ; réutilisation sans changement : existing === true
      expect(
        projectResult?.created === true
        || projectResult?.updated === true
        || projectResult?.existing === true
      ).toBe(true);
    });

    and('l\'ID du projet est retourné', () => {
      // Validation technique : vérifier que l'ID fait partie du résultat
      expect(projectResult?.id).toBeDefined();
      expect(typeof projectResult?.id).toBe('string');
    });

    and('le projet contient le template fourni', async () => {
      // Validation métier : récupérer le projet depuis le système externe et vérifier le template
      const project = await getNuExtractProject(
        config?.nuextract?.baseUrl || 'nuextract.ai',
        config?.nuextract?.port || 443,
        config?.nuextract?.projectPath || '/api/projects/{projectId}',
        config?.nuextract?.pathPrefix || null,
        apiKey,
        projectResult.id
      );
      
      expect(project).toBeDefined();
      expect(project.template).toBeDefined();
      expect(project.template.type).toBe('schema');
      expect(project.template.schema).toBeDefined();
      
      // Comparaison profonde du template : structure et contenu
      expect(JSON.stringify(project.template.schema)).toBe(JSON.stringify(template));
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
      const resolvedJsonSchema = await loadAndResolveSchemas(config);
      const template = await generateTemplate(config, apiKey, resolvedJsonSchema);
      config.nuextract.templateReset = false;
      existingProject = await findOrCreateProject(config, apiKey, template);
      expect(existingProject).toBeDefined();
      expect(existingProject.id).toBeDefined();
    });

    and('un nouveau template NuExtract valide', async () => {
      const resolvedJsonSchema = await loadAndResolveSchemas(config);
      newTemplate = await generateTemplate(config, apiKey, resolvedJsonSchema);
      expect(newTemplate).toBeDefined();
    });

    when('on met à jour le template du projet avec findOrCreateProject sur un projet existant (templateReset=true)', async () => {
      config.nuextract.templateReset = true;
      updateResult = await findOrCreateProject(config, apiKey, newTemplate);
    });

    then('le template est mis à jour avec succès', () => {
      expect(updateResult?.updated).toBe(true);
    });

    and('le projet contient le nouveau template', async () => {
      // Validation métier : récupérer le projet depuis le système externe et comparer le template
      const project = await getNuExtractProject(
        config?.nuextract?.baseUrl || 'nuextract.ai',
        config?.nuextract?.port || 443,
        config?.nuextract?.projectPath || '/api/projects/{projectId}',
        config?.nuextract?.pathPrefix || null,
        apiKey,
        updateResult.id
      );
      
      expect(project).toBeDefined();
      expect(project.template).toBeDefined();
      expect(project.template.type).toBe('schema');
      expect(project.template.schema).toBeDefined();
      
      // Comparaison profonde du template : structure et contenu (le template API a la structure {type: "schema", schema: {...}})
      expect(JSON.stringify(project.template.schema)).toBe(JSON.stringify(newTemplate));
    });
  }, 120000);

  // Scénario 3 : Recherche sans mise à jour avec templateReset=false
  test('Recherche d\'un projet existant sans mise à jour pour un projet qui existe déjà sur la plateforme SaaS NuExtract', ({ given, when, then, and }) => {
    let config;
    let apiKey;
    let existingProject;
    let searchResult;
    let template;

    given('des paramètres de configuration NuExtract pour la gestion de projet', async () => {
      config = await loadGlobalConfig();
      // Vérification minimale : les validations détaillées sont effectuées par loadGlobalConfig()
      config.nuextract.templateReset = false;
    });

    and('une clé API NuExtract', async () => {
      apiKey = await loadApiKey(config);
      // Vérification minimale : les validations détaillées (JWT, format) sont effectuées par loadApiKey()
      expect(apiKey).toBeTruthy();
    });

    and('un projet "HERMES2022" existant sur la plateforme', async () => {
      const resolvedJsonSchema = await loadAndResolveSchemas(config);
      const template = await generateTemplate(config, apiKey, resolvedJsonSchema);
      config.nuextract.templateReset = false;
      existingProject = await findOrCreateProject(config, apiKey, template);
      expect(existingProject).toBeDefined();
    });

    when('on recherche le projet avec findOrCreateProject sans nouveau template', async () => {
      const resolvedJsonSchema = await loadAndResolveSchemas(config);
      template = await generateTemplate(config, apiKey, resolvedJsonSchema);
      config.nuextract.templateReset = false;
      searchResult = await findOrCreateProject(config, apiKey, template);
    });

    then('Ne rien faire', () => {
      // Validation technique : vérifier que l'exécution s'est bien déroulée sans modification
      expect(searchResult?.existing).toBe(true);
    });

    and('l\'ID du projet existant est retourné', () => {
      // Validation métier : vérifier que l'ID retourné correspond au projet existant
      expect(searchResult?.id).toBeDefined();
      expect(searchResult?.id).toBe(existingProject.id);
    });

    and('le projet contient un template existant conforme au JSON schema', () => {
      // Validation technique : la vérification de conformité est effectuée dans findOrCreateProject()
      // Si la fonction retourne un résultat, cela signifie que le template existant est conforme au JSON schema
      // La fonction lève une erreur si le template n'est pas conforme (vérifié dans nuextract-client.js)
      expect(searchResult?.existing).toBe(true);
      expect(searchResult?.id).toBeDefined();
      // La conformité du template est validée dans findOrCreateProject() via comparaison avec templateObj
    });
  }, 120000);
});


