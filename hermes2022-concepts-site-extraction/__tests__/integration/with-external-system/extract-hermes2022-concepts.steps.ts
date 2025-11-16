// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import * as fs from 'fs';

// REFACTORING BDD Phase 3 - Import depuis orchestrateur
import { 
  loadGlobalConfig,
  loadAndResolveSchemas,
  loadApiKeys,
  initializeLLMProjects,
  extractHermes2022Concepts,
  saveArtifact
} from '@src/concepts-site-extraction-orchestrator.js';

const feature = loadFeature(__dirname + '/extract-hermes2022-concepts.feature');

defineFeature(feature, (test) => {
  let config;
  let apiKeys;
  let resolvedSchema;
  let result;
  let error;

  // Hooks d'isolation (conforme @test-mock-governance)
  beforeEach(() => {
    jest.clearAllMocks();
    config = undefined;
    apiKeys = undefined;
    resolvedSchema = undefined;
    result = undefined;
    error = undefined;
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
      expect(config.llm).toBeDefined();
      expect(config.llm.nuextract).toBeDefined();
      expect(config.extractionSource).toBeDefined();
    });

    and('une clé API NuExtract valide', async () => {
      // Chargement des clés API réelles (validation JWT déjà effectuée par loadApiKeys)
      apiKeys = await loadApiKeys(config);
      expect(apiKeys).toBeDefined();
      expect(apiKeys.nuextract).toBeDefined();
    });

    and('un schéma JSON de concepts HERMES2022 résolu', async () => {
      // Résolution et validation du schéma (déjà effectuées par loadAndResolveSchemas)
      resolvedSchema = await loadAndResolveSchemas(config);
      expect(resolvedSchema).toBeDefined();
      expect(resolvedSchema.properties).toBeDefined();
    });

    and('un projet NuExtract existant avec template', async () => {
      // Initialisation des projets LLM (génération template + création/mise à jour projet)
      await initializeLLMProjects(config, apiKeys, resolvedSchema);
      
      // Validation technique : vérifier que l'initialisation s'est bien déroulée
      // (initializeLLMProjects lève une erreur en cas d'échec)
      expect(true).toBe(true);
    });

    when('on exécute l\'extraction des concepts avec extractHermes2022ConceptsWithNuExtract', async () => {
      try {
        // Exécution de l'extraction orchestrée complète
        const artifact = await extractHermes2022Concepts(config, resolvedSchema, apiKeys);
        
        // Sauvegarde de l'artefact et création du fichier d'approbation
        result = await saveArtifact(config, artifact);
      } catch (e) {
        error = e;
      }
    });

    then('un artefact est reconstruit avec succès', () => {
      // Validation technique : pas d'erreur, résultat défini
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
      expect(result.artifactPath).toBeDefined();
    });

    and('l\'artefact contient les propriétés principales attendues', () => {
      // Validation métier : vérifier que l'artefact a été sauvegardé
      expect(fs.existsSync(result.artifactPath)).toBe(true);
      
      // Lire et valider la structure de l'artefact
      const artifact = JSON.parse(fs.readFileSync(result.artifactPath, 'utf8'));
      expect(artifact.config).toBeDefined();
      expect(artifact.config.extractionSource).toBeDefined();
      expect(artifact.method).toBeDefined();
      expect(artifact.concepts).toBeDefined();
    });

    and('l\'artefact est conforme au schéma JSON Schema', () => {
      // Validation métier : conformité au schéma (déjà validée par extractHermes2022Concepts avec Ajv)
      // Lire l'artefact et vérifier les propriétés minimales
      const artifact = JSON.parse(fs.readFileSync(result.artifactPath, 'utf8'));
      
      expect(artifact.concepts.overview).toBeDefined();
      expect(artifact.concepts.overview.length).toBeGreaterThan(10);
    });

    and('chaque bloc a été traité par l\'API NuExtract', () => {
      // Validation métier : vérifier que les blocs principaux ont été traités
      const artifact = JSON.parse(fs.readFileSync(result.artifactPath, 'utf8'));
      
      // (method, concepts/overview sont les blocs minimaux attendus)
      expect(artifact.method.hermesVersion).toBeDefined();
      expect(artifact.concepts.overview).toBeDefined();
    });
  }, 180000); // Timeout 3 minutes pour extraction complète (collecte HTML + appels API multiples)
});

