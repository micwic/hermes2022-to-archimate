// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import { Given, When, Then } from 'jest-cucumber';
import fs from 'fs';
import path from 'path';

// Import des fonctions du script refactorisé
import { 
  _testOnly_loadGlobalConfig as loadGlobalConfig, 
  _testOnly_loadApiKey as loadApiKey, 
  _testOnly_generateTemplate as generateTemplate 
} from '../../../src/nuextract-client.js';
import { resolveFromRepoRoot } from '../../../src/path-resolver.js';

const feature = loadFeature(__dirname + '/template-generation.feature');

defineFeature(feature, (test) => {
  // Hooks d'isolation pour les tests d'intégration
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Test d'intégration API avec timeout étendu (30s sleep initial + 60s polling max)
  test('Génération de template NuExtract avec infer-template-async', ({ given, when, then, and }) => {
    let config;
    let apiKey;
    let template;
    
    given('des paramètres de configuration NuExtract pour la génération du template', async () => {
      config = await loadGlobalConfig();
      // Forcer le mode async pour ce scénario réel
      config.nuextract.templateMode = 'async';
      expect(config).toBeDefined();
      expect(config.nuextract).toBeDefined();
      expect(config.nuextract.templateMode).toBe('async');
      expect(config.nuextract.templateTransformationInstructions).toBeDefined();
      expect(config.nuextract.templateTransformationInstructions.instructions).toBeDefined();
      expect(Array.isArray(config.nuextract.templateTransformationInstructions.instructions)).toBe(true);
      expect(config.nuextract.mainJSONConfigurationFile).toBeDefined();
      expect(config.nuextract.templateOutputDirectory).toBeDefined();
      expect(config.nuextract.apiKeyFile).toBeDefined();
    });

    and('une clé API NuExtract', async () => {
      apiKey = await loadApiKey(config);
      expect(apiKey).toBeDefined();
      expect(apiKey).not.toBe('');
    });

    and('des instructions de transformation depuis config', () => {
      expect(config.nuextract.templateTransformationInstructions.instructions.length).toBeGreaterThan(0);
    });

    and('un schéma JSON de concepts HERMES2022', () => {
      const schemaPath = resolveFromRepoRoot(config.nuextract.mainJSONConfigurationFile);
      expect(fs.existsSync(schemaPath)).toBe(true);
    });

    when('on génère un template NuExtract avec infer-template-async', async () => {
      template = await generateTemplate(config, apiKey);
    });

    then('le template est créé avec succès dans le répertoire de sortie des templates NuExtract', () => {
      const templateDirConfig = config?.nuextract?.templateOutputDirectory || 'shared/hermes2022-extraction-files/config/nuextract-template-generated';
      const templatePath = resolveFromRepoRoot(path.join(templateDirConfig, 'nuextract-template.json'));
      expect(fs.existsSync(templatePath)).toBe(true);
      const templateContent = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
      expect(templateContent).toBeDefined();
      expect(template).toEqual(templateContent);
    });

    and('le template contient les champs principaux attendus', () => {
      expect(template).toHaveProperty('config');
      expect(template).toHaveProperty('method');
      expect(template).toHaveProperty('concepts');
    });

    and('le template respecte le format NuExtract', () => {
      expect(typeof template).toBe('object');
      expect(template).not.toBeNull();
      expect(Array.isArray(template.config.extractionSource.language)).toBe(true);
      expect(Array.isArray(template.method.hermesVersion)).toBe(true);
      expect(template.config.extractionSource.baseUrl).toBe('verbatim-string');
      expect(template.method.publicationDate).toBe('date-time');
      expect(template.method.lastChecked).toBe('date-time');
      expect(template.concepts).toHaveProperty('concept-phases');
    });
  }, 120000);

  // Test d'intégration API mode sync avec timeout réduit (35s max)
  test('Génération de template NuExtract avec infer-template', ({ given, when, then, and }) => {
    let config;
    let apiKey;
    let template;
    
    given('des paramètres de configuration NuExtract pour la génération du template', async () => {
      config = await loadGlobalConfig();
      config.nuextract.templateMode = 'sync';
      expect(config).toBeDefined();
      expect(config.nuextract).toBeDefined();
      expect(config.nuextract.templateMode).toBe('sync');
      expect(config.nuextract.templateTransformationInstructions).toBeDefined();
      expect(config.nuextract.templateTransformationInstructions.instructions).toBeDefined();
      expect(Array.isArray(config.nuextract.templateTransformationInstructions.instructions)).toBe(true);
      expect(config.nuextract.mainJSONConfigurationFile).toBeDefined();
      expect(config.nuextract.templateOutputDirectory).toBeDefined();
      expect(config.nuextract.apiKeyFile).toBeDefined();
    });

    and('une clé API NuExtract', async () => {
      apiKey = await loadApiKey(config);
      expect(apiKey).toBeDefined();
      expect(apiKey).not.toBe('');
    });

    and('des instructions de transformation depuis config', () => {
      expect(config.nuextract.templateTransformationInstructions.instructions.length).toBeGreaterThan(0);
    });

    and('un schéma JSON de concepts HERMES2022', () => {
      const schemaPath = resolveFromRepoRoot(config.nuextract.mainJSONConfigurationFile);
      expect(fs.existsSync(schemaPath)).toBe(true);
    });

    when('on génère un template NuExtract avec infer-template', async () => {
      template = await generateTemplate(config, apiKey);
    });

    then('le template est créé avec succès dans le répertoire de sortie des templates NuExtract', () => {
      const templateDirConfig = config?.nuextract?.templateOutputDirectory || 'shared/hermes2022-extraction-files/config/nuextract-template-generated';
      const templatePath = resolveFromRepoRoot(path.join(templateDirConfig, 'nuextract-template.json'));
      expect(fs.existsSync(templatePath)).toBe(true);
      const templateContent = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
      expect(templateContent).toBeDefined();
      expect(template).toEqual(templateContent);
    });

    and('le template contient les champs principaux attendus', () => {
      expect(template).toHaveProperty('config');
      expect(template).toHaveProperty('method');
      expect(template).toHaveProperty('concepts');
    });

    and('le template respecte le format NuExtract', () => {
      expect(typeof template).toBe('object');
      expect(template).not.toBeNull();
      expect(Array.isArray(template.config.extractionSource.language)).toBe(true);
      expect(Array.isArray(template.method.hermesVersion)).toBe(true);
      expect(template.config.extractionSource.baseUrl).toBe('verbatim-string');
      expect(template.method.publicationDate).toBe('date-time');
      expect(template.method.lastChecked).toBe('date-time');
      expect(template.concepts).toHaveProperty('concept-phases');
    });
  }, 45000);
});


