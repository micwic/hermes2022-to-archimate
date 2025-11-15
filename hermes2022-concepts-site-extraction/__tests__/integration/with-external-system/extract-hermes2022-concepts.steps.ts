// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';

// REFACTORING BDD Phase 1 & 2 - Import depuis orchestrateur
const { 
  loadAndResolveSchemas,
  loadGlobalConfig
} = require('@src/concepts-site-extraction-orchestrator.js');

// Imports avec alias moduleNameMapper (conforme @root-directory-governance)
const {
  // _testOnly_loadGlobalConfig migrée vers orchestrateur (voir import ci-dessus)
  _testOnly_loadApiKey: loadApiKey,
  // _testOnly_loadAndResolveSchemas migrée vers orchestrateur (voir import ci-dessus)
  _testOnly_generateTemplate: generateTemplate,
  _testOnly_findOrCreateProject: findOrCreateProject,
  _testOnly_extractHermes2022ConceptsWithNuExtract: extractHermes2022ConceptsWithNuExtract
} = require('@src/nuextract-client.js');

const feature = loadFeature(__dirname + '/extract-hermes2022-concepts.feature');

defineFeature(feature, (test) => {
  let config;
  let apiKey;
  let resolvedSchema;
  let projectResult;
  let extractionResult;
  let extractionError;

  // Hooks d'isolation (conforme @test-mock-governance)
  beforeEach(() => {
    jest.clearAllMocks();
    config = undefined;
    apiKey = undefined;
    resolvedSchema = undefined;
    projectResult = undefined;
    extractionResult = undefined;
    extractionError = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Extraction réussie des concepts HERMES2022 avec NuExtract', ({ given, when, then, and }) => {
    given('une configuration d\'extraction hermes2022 complète', async () => {
      // Chargement de la configuration réelle depuis extraction-config.schema.json
      config = await loadGlobalConfig();
      
      // Vérifications minimales (validation détaillée déjà effectuée par loadGlobalConfig)
      expect(config).toBeDefined();
      expect(config.nuextract).toBeDefined();
      expect(config.extractionSource).toBeDefined();
    });

    given('une clé API NuExtract valide', async () => {
      // Chargement de la clé API réelle (validation JWT déjà effectuée par loadApiKey)
      apiKey = await loadApiKey(config);
      expect(apiKey).toBeDefined();
    });

    given('un schéma JSON de concepts HERMES2022 résolu', async () => {
      // Résolution et validation du schéma (déjà effectuées par loadAndResolveSchemas)
      resolvedSchema = await loadAndResolveSchemas(config);
      expect(resolvedSchema).toBeDefined();
      expect(resolvedSchema.properties).toBeDefined();
    });

    given('un projet NuExtract existant avec template', async () => {
      // Génération du template et gestion du projet (création ou mise à jour)
      const template = await generateTemplate(config, apiKey, resolvedSchema);
      
      // findOrCreateProject gère automatiquement création/mise à jour selon templateReset
      projectResult = await findOrCreateProject(config, apiKey, template);
      
      // Validation technique : vérifier que l'exécution s'est bien déroulée
      expect(projectResult).toBeDefined();
      expect(projectResult.id).toBeDefined();
      
      // Création : created === true ; mise à jour : updated === true ; réutilisation : existing === true
      expect(
        projectResult.created === true
        || projectResult.updated === true
        || projectResult.existing === true
      ).toBe(true);
    });

    when('on exécute l\'extraction des concepts avec extractHermes2022ConceptsWithNuExtract', async () => {
      try {
        extractionResult = await extractHermes2022ConceptsWithNuExtract(
          resolvedSchema,
          config,
          apiKey,
          projectResult.id
        );
      } catch (error) {
        extractionError = error;
      }
    });

    then('un artefact est reconstruit avec succès', () => {
      // Validation technique : pas d'erreur, artefact défini
      expect(extractionError).toBeUndefined();
      expect(extractionResult).toBeDefined();
    });

    and('l\'artefact contient les propriétés principales attendues', () => {
      // Validation métier : structure de l'artefact
      expect(extractionResult.config).toBeDefined();
      expect(extractionResult.config.extractionSource).toBeDefined();
      expect(extractionResult.method).toBeDefined();
      expect(extractionResult.concepts).toBeDefined();
    });

    and('l\'artefact est conforme au schéma JSON Schema', () => {
      // Validation métier : conformité au schéma (déjà validée par extractHermes2022ConceptsWithNuExtract avec Ajv)
      // Cette assertion vérifie que la fonction a bien retourné sans lever d'erreur de validation
      expect(extractionResult.concepts.overview).toBeDefined();
      expect(extractionResult.concepts.overview.length).toBeGreaterThan(10);
    });

    and('chaque bloc a été traité par l\'API NuExtract', () => {
      // Validation métier : vérifier que les blocs principaux ont été traités
      // (method, concepts/overview sont les blocs minimaux attendus)
      expect(extractionResult.method.hermesVersion).toBeDefined();
      expect(extractionResult.concepts.overview).toBeDefined();
    });
  }, 180000); // Timeout 3 minutes pour extraction complète (collecte HTML + appels API multiples)
});

