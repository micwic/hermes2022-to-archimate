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
  _testOnly_generateTemplate: generateTemplate
} = require(nuextractClientModulePath);

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
      // Vérification minimale : les validations détaillées sont effectuées par loadGlobalConfig()
      expect(config?.nuextract?.templateMode).toBe('async');
    });

    and('une clé API NuExtract', async () => {
      apiKey = await loadApiKey(config);
      // Vérification minimale : les validations détaillées (JWT, format) sont effectuées par loadApiKey()
      expect(apiKey).toBeTruthy();
    });

    and('des instructions de transformation depuis config', () => {
      // Validation redondante supprimée : loadTemplateTransformationInstructions() valide déjà la présence et le type array
      // Si les instructions sont absentes ou invalides, loadTemplateTransformationInstructions() lèvera une erreur
    });

    and('un schéma JSON de concepts HERMES2022', () => {
      // Validation redondante supprimée : loadAndResolveSchemas() valide déjà l'existence et la conformité du schéma
      // Si le schéma est absent ou invalide, loadAndResolveSchemas() lèvera une erreur
    });

    when('on génère un template NuExtract avec infer-template-async', async () => {
      const resolvedJsonSchema = await loadAndResolveSchemas(config);
      template = await generateTemplate(config, apiKey, resolvedJsonSchema);
    });

    then('le template est créé avec succès dans le répertoire de sortie des templates NuExtract', () => {
      // Validation métier : vérifier que le fichier a été créé et correspond au template retourné
      const templateDirConfig = config?.nuextract?.templateOutputDirectory || 'shared/hermes2022-extraction-files/config/nuextract-template-generated';
      const templatePath = resolveFromRepoRoot(path.join(templateDirConfig, 'nuextract-template.json'));
      expect(fs.existsSync(templatePath)).toBe(true);
      const templateContent = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
      // Comparaison profonde : le template sauvegardé correspond au template retourné
      expect(template).toEqual(templateContent);
    });

    and('le template contient les champs principaux attendus', () => {
      expect(template).toHaveProperty('config');
      expect(template).toHaveProperty('method');
      expect(template).toHaveProperty('concepts');
    });

    and('le template respecte le format NuExtract', () => {
      // Validation métier : vérifier que le template respecte le format NuExtract attendu
      expect(template).toBeDefined();
      expect(Array.isArray(template?.config?.extractionSource?.language)).toBe(true);
      expect(Array.isArray(template?.method?.hermesVersion)).toBe(true);
      expect(template?.config?.extractionSource?.baseUrl).toBe('verbatim-string');
      expect(template?.method?.publicationDate).toBe('date-time');
      // lastChecked a été supprimé car il fait double emploi avec le sidecar d'approbation
      expect(template?.concepts).toHaveProperty('concept-phases');
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
      // Vérification minimale : les validations détaillées sont effectuées par loadGlobalConfig()
      expect(config?.nuextract?.templateMode).toBe('sync');
    });

    and('une clé API NuExtract', async () => {
      apiKey = await loadApiKey(config);
      // Vérification minimale : les validations détaillées (JWT, format) sont effectuées par loadApiKey()
      expect(apiKey).toBeTruthy();
    });

    and('des instructions de transformation depuis config', () => {
      // Validation redondante supprimée : loadTemplateTransformationInstructions() valide déjà la présence et le type array
      // Si les instructions sont absentes ou invalides, loadTemplateTransformationInstructions() lèvera une erreur
    });

    and('un schéma JSON de concepts HERMES2022', () => {
      // Validation redondante supprimée : loadAndResolveSchemas() valide déjà l'existence et la conformité du schéma
      // Si le schéma est absent ou invalide, loadAndResolveSchemas() lèvera une erreur
    });

    when('on génère un template NuExtract avec infer-template', async () => {
      const resolvedJsonSchema = await loadAndResolveSchemas(config);
      template = await generateTemplate(config, apiKey, resolvedJsonSchema);
    });

    then('le template est créé avec succès dans le répertoire de sortie des templates NuExtract', () => {
      // Validation métier : vérifier que le fichier a été créé et correspond au template retourné
      const templateDirConfig = config?.nuextract?.templateOutputDirectory || 'shared/hermes2022-extraction-files/config/nuextract-template-generated';
      const templatePath = resolveFromRepoRoot(path.join(templateDirConfig, 'nuextract-template.json'));
      expect(fs.existsSync(templatePath)).toBe(true);
      const templateContent = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
      // Comparaison profonde : le template sauvegardé correspond au template retourné
      expect(template).toEqual(templateContent);
    });

    and('le template contient les champs principaux attendus', () => {
      expect(template).toHaveProperty('config');
      expect(template).toHaveProperty('method');
      expect(template).toHaveProperty('concepts');
    });

    and('le template respecte le format NuExtract', () => {
      // Validation métier : vérifier que le template respecte le format NuExtract attendu
      expect(template).toBeDefined();
      expect(Array.isArray(template?.config?.extractionSource?.language)).toBe(true);
      expect(Array.isArray(template?.method?.hermesVersion)).toBe(true);
      expect(template?.config?.extractionSource?.baseUrl).toBe('verbatim-string');
      expect(template?.method?.publicationDate).toBe('date-time');
      // lastChecked a été supprimé car il fait double emploi avec le sidecar d'approbation
      expect(template?.concepts).toHaveProperty('concept-phases');
    });
  }, 45000);
});


