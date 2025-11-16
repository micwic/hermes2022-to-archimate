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
const { 
  loadAndResolveSchemas,
  loadGlobalConfig,
  loadApiKeys
} = require(orchestratorModulePath);

const nuextractClientModulePath = resolveFromRepoRoot('hermes2022-concepts-site-extraction/src/nuextract-client.js');
const {
  _testOnly_generateTemplateForBlock: generateTemplateForBlock
} = require(nuextractClientModulePath);

const feature = loadFeature(__dirname + '/template-generation.feature');

defineFeature(feature, (test) => {
  let config;
  let apiKeys;
  let blockSchema;
  let template;

  // Hooks d'isolation pour les tests d'intégration réels
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Charger la configuration réelle
    config = await loadGlobalConfig();
    
    // Charger les clés API réelles
    apiKeys = await loadApiKeys(config);
    
    // Charger le schéma résolu complet
    const mainSchemaFile = config.llm.nuextract.mainJSONConfigurationFile;
    const resolvedSchema = await loadAndResolveSchemas(mainSchemaFile);
    
    // Extraire le schéma du bloc /concepts/overview pour les tests
    blockSchema = resolvedSchema.properties.concepts.properties.overview;
    
    template = null;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Test d'intégration API avec timeout étendu (120s pour mode async)
  test('Génération de template bloc en mode async (API réelle)', ({ given, and, when, then }) => {
    given('une configuration valide pour la génération de template par bloc', () => {
      // Forcer le mode async pour ce scénario réel
      config.llm.nuextract.templateMode = 'async';
      expect(config.llm.nuextract.templateMode).toBe('async');
    });

    and('une clé API NuExtract valide', () => {
      expect(apiKeys.nuextract).toBeTruthy();
    });

    and('un schéma de bloc pour /concepts/overview', () => {
      expect(blockSchema).toBeDefined();
      expect(blockSchema.type).toBe('string');
    });

    when('on génère un template pour le bloc avec generateTemplateForBlock en mode async', async () => {
      template = await generateTemplateForBlock(blockSchema, config, apiKeys.nuextract);
    });

    then('le template est créé avec succès', () => {
      expect(template).toBeDefined();
      expect(typeof template).toBe('object');
    });

    and('le template contient les champs attendus du schéma de bloc', () => {
      // Le template NuExtract pour un bloc string doit être "string"
      expect(template.overview).toBe('string');
    });

    and('le template respecte le format NuExtract', () => {
      expect(template).toBeDefined();
      // Vérifier que le template est conforme au format NuExtract
      expect(typeof template).toBe('object');
    });
  }, 120000);

  // Test d'intégration API mode sync avec timeout réduit (45s)
  test('Génération de template bloc en mode sync (API réelle)', ({ given, and, when, then }) => {
    given('une configuration valide pour la génération de template par bloc', () => {
      // Forcer le mode sync pour ce scénario réel
      config.llm.nuextract.templateMode = 'sync';
      expect(config.llm.nuextract.templateMode).toBe('sync');
    });

    and('une clé API NuExtract valide', () => {
      expect(apiKeys.nuextract).toBeTruthy();
    });

    and('un schéma de bloc pour /concepts/overview', () => {
      expect(blockSchema).toBeDefined();
      expect(blockSchema.type).toBe('string');
    });

    when('on génère un template pour le bloc avec generateTemplateForBlock en mode sync', async () => {
      template = await generateTemplateForBlock(blockSchema, config, apiKeys.nuextract);
    });

    then('le template est créé avec succès', () => {
      expect(template).toBeDefined();
      expect(typeof template).toBe('object');
    });

    and('le template contient les champs attendus du schéma de bloc', () => {
      // Le template NuExtract pour un bloc string doit être "string"
      expect(template.overview).toBe('string');
    });

    and('le template respecte le format NuExtract', () => {
      expect(template).toBeDefined();
      // Vérifier que le template est conforme au format NuExtract
      expect(typeof template).toBe('object');
    });
  }, 45000);
});
