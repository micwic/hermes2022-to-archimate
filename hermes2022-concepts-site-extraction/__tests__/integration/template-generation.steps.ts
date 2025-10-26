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
} from '../../src/nuextract-client.js';
import { resolveFromRepoRoot } from '../../src/path-resolver.js';

const feature = loadFeature(__dirname + '/template-generation.feature');

defineFeature(feature, (test) => {
  // Test d'intégration API avec timeout étendu (30s sleep initial + 60s polling max)
  test('Génération de template NuExtract avec infer-template-async', ({ given, when, then, and }) => {
    let config;
    let apiKey;
    let template;
    
    given('des paramètres de configuration NuExtract pour la génération du template', async () => {
      // 1. Charger la configuration en premier
      config = await loadGlobalConfig();
      
      // 2. Vérifier que la configuration contient les paramètres nécessaires
      expect(config).toBeDefined();
      expect(config.nuextract).toBeDefined();
      expect(config.nuextract.templateMode).toBe('async');
      expect(config.nuextract.templateTransformationInstructionFile).toBeDefined();
      expect(config.nuextract.mainJSONConfigurationFile).toBeDefined();
      expect(config.nuextract.templateOutputDirectory).toBeDefined();
      expect(config.nuextract.apiKeyFile).toBeDefined();
    });

    and('une clé API NuExtract', async () => {
      // Charger la clé API en utilisant config déjà chargée
      apiKey = await loadApiKey(config);
      
      // Vérifier que la clé API est définie et non vide
      expect(apiKey).toBeDefined();
      expect(apiKey).not.toBe('');
    });

    and('des instructions de transformation markdown', () => {
      // Vérifier que le fichier d'instructions existe (en utilisant config déjà chargée)
      const instPath = resolveFromRepoRoot(config.nuextract.templateTransformationInstructionFile);
      expect(fs.existsSync(instPath)).toBe(true);
    });

    and('un schéma JSON de concepts HERMES2022', () => {
      // Vérifier que le fichier de schéma existe (en utilisant config déjà chargée)
      const schemaPath = resolveFromRepoRoot(config.nuextract.mainJSONConfigurationFile);
      expect(fs.existsSync(schemaPath)).toBe(true);
    });

    when('on génère un template NuExtract avec infer-template-async', async () => {
      template = await generateTemplate(config, apiKey);
    });

    then('le template est créé avec succès dans le répertoire de sortie des templates NuExtract', () => {
      // Vérifier que le fichier existe
      const templateDirConfig = config?.nuextract?.templateOutputDirectory || 'shared/hermes2022-extraction-files/config/nuextract-template-generated';
      const templatePath = resolveFromRepoRoot(path.join(templateDirConfig, 'nuextract-template.json'));
      
      expect(fs.existsSync(templatePath)).toBe(true);
      
      // Vérifier que le contenu est du JSON valide et correspond au template
      const templateContent = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
      expect(templateContent).toBeDefined();
      expect(template).toEqual(templateContent);
    });

    and('le template contient les champs principaux attendus', () => {
      // Vérifier la structure du template
      expect(template).toHaveProperty('config');
      expect(template).toHaveProperty('method');
      expect(template).toHaveProperty('concepts');
    });

    and('le template respecte le format NuExtract', () => {
      // Vérifier que c'est un objet JSON valide
      expect(typeof template).toBe('object');
      expect(template).not.toBeNull();
      
      // Vérifier que les énumérations sont converties en tableaux
      expect(Array.isArray(template.config.extractionSource.language)).toBe(true);
      expect(template.config.extractionSource.language).toContain('de');
      expect(template.config.extractionSource.language).toContain('fr');
      expect(template.config.extractionSource.language).toContain('it');
      expect(template.config.extractionSource.language).toContain('en');
      
      expect(Array.isArray(template.method.hermesVersion)).toBe(true);
      expect(template.method.hermesVersion).toContain('5');
      expect(template.method.hermesVersion).toContain('5.1');
      expect(template.method.hermesVersion).toContain('2022');
      
      // Vérifier que les types NuExtract sont présents
      expect(template.config.extractionSource.baseUrl).toBe('verbatim-string');
      expect(template.config.extractionSource.description).toBe('string');
      expect(template.method.publicationDate).toBe('date-time');
      expect(template.method.lastChecked).toBe('date-time');
      
      // Vérifier que concept-phases est intégré (pas de $ref)
      expect(template.concepts).toHaveProperty('concept-phases');
      expect(template.concepts['concept-phases']).toHaveProperty('phases');
      expect(Array.isArray(template.concepts['concept-phases'].phases)).toBe(true);
      
      // Vérifier que les énumérations de sourceUrl sont converties en tableaux
      expect(Array.isArray(template.concepts.sourceUrl)).toBe(true);
      expect(template.concepts.sourceUrl).toContain('/project-management/method-overview.html');
      expect(template.concepts.sourceUrl).toContain('/project-management/method-overview/preface.html');
      
      // Vérifier la structure d'une phase (premier élément du tableau)
      const phaseTemplate = template.concepts['concept-phases'].phases[0];
      expect(phaseTemplate).toHaveProperty('id');
      expect(phaseTemplate).toHaveProperty('name');
      expect(phaseTemplate).toHaveProperty('order');
      expect(phaseTemplate).toHaveProperty('type');
      expect(Array.isArray(phaseTemplate.type)).toBe(true);
      expect(phaseTemplate.type).toContain('simple');
      expect(phaseTemplate.type).toContain('composite');
      
      // Vérifier que toutes les approches sont présentes dans l'énumération
      expect(Array.isArray(phaseTemplate.approach)).toBe(true);
      expect(phaseTemplate.approach).toContain('traditional');
      expect(phaseTemplate.approach).toContain('agile');
      expect(phaseTemplate.approach).toContain('both');
      
      // Vérifier que les sourceUrl des phases sont converties en tableaux
      expect(Array.isArray(phaseTemplate.sourceUrl)).toBe(true);
      expect(phaseTemplate.sourceUrl).toContain('/project-management/phases/initiation.html');
      expect(phaseTemplate.sourceUrl).toContain('/project-management/phases/concept.html');
      expect(phaseTemplate.sourceUrl).toContain('/project-management/phases/deployment.html');
      expect(phaseTemplate.sourceUrl).toContain('/project-management/phases/implementation.html');
      expect(phaseTemplate.sourceUrl).toContain('/project-management/phases/execution.html');
      expect(phaseTemplate.sourceUrl).toContain('/project-management/phases/closure.html');
    });
  }, 120000);  // Timeout de 2 minutes pour ce test d'intégration API uniquement

  // Test d'intégration API mode sync avec timeout réduit (35s max)
  test('Génération de template NuExtract avec infer-template', ({ given, when, then, and }) => {
    let config;
    let apiKey;
    let template;
    
    given('des paramètres de configuration NuExtract pour la génération du template', async () => {
      config = await loadGlobalConfig();
      
      // Forcer mode sync pour ce test
      config.nuextract.templateMode = 'sync';
      
      expect(config).toBeDefined();
      expect(config.nuextract).toBeDefined();
      expect(config.nuextract.templateMode).toBe('sync');
      expect(config.nuextract.templateTransformationInstructionFile).toBeDefined();
      expect(config.nuextract.mainJSONConfigurationFile).toBeDefined();
      expect(config.nuextract.templateOutputDirectory).toBeDefined();
      expect(config.nuextract.apiKeyFile).toBeDefined();
    });

    and('une clé API NuExtract', async () => {
      apiKey = await loadApiKey(config);
      expect(apiKey).toBeDefined();
      expect(apiKey).not.toBe('');
    });

    and('des instructions de transformation markdown', () => {
      const instPath = resolveFromRepoRoot(config.nuextract.templateTransformationInstructionFile);
      expect(fs.existsSync(instPath)).toBe(true);
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
      
      // Vérifier que les énumérations sont converties en tableaux
      expect(Array.isArray(template.config.extractionSource.language)).toBe(true);
      expect(template.config.extractionSource.language).toContain('de');
      expect(template.config.extractionSource.language).toContain('fr');
      expect(template.config.extractionSource.language).toContain('it');
      expect(template.config.extractionSource.language).toContain('en');
      
      expect(Array.isArray(template.method.hermesVersion)).toBe(true);
      expect(template.method.hermesVersion).toContain('5');
      expect(template.method.hermesVersion).toContain('5.1');
      expect(template.method.hermesVersion).toContain('2022');
      
      // Vérifier que les types NuExtract sont présents
      expect(template.config.extractionSource.baseUrl).toBe('verbatim-string');
      expect(template.config.extractionSource.description).toBe('string');
      expect(template.method.publicationDate).toBe('date-time');
      expect(template.method.lastChecked).toBe('date-time');
      
      // Vérifier que concept-phases est intégré (pas de $ref)
      expect(template.concepts).toHaveProperty('concept-phases');
      expect(template.concepts['concept-phases']).toHaveProperty('phases');
      expect(Array.isArray(template.concepts['concept-phases'].phases)).toBe(true);
      
      // Vérifier que les énumérations de sourceUrl sont converties en tableaux
      expect(Array.isArray(template.concepts.sourceUrl)).toBe(true);
      expect(template.concepts.sourceUrl).toContain('/project-management/method-overview.html');
      expect(template.concepts.sourceUrl).toContain('/project-management/method-overview/preface.html');
      
      // Vérifier la structure d'une phase (premier élément du tableau)
      const phaseTemplate = template.concepts['concept-phases'].phases[0];
      expect(phaseTemplate).toHaveProperty('id');
      expect(phaseTemplate).toHaveProperty('name');
      expect(phaseTemplate).toHaveProperty('order');
      expect(phaseTemplate).toHaveProperty('type');
      expect(Array.isArray(phaseTemplate.type)).toBe(true);
      expect(phaseTemplate.type).toContain('simple');
      expect(phaseTemplate.type).toContain('composite');
      
      // Vérifier que toutes les approches sont présentes dans l'énumération
      expect(Array.isArray(phaseTemplate.approach)).toBe(true);
      expect(phaseTemplate.approach).toContain('traditional');
      expect(phaseTemplate.approach).toContain('agile');
      expect(phaseTemplate.approach).toContain('both');
      
      // Vérifier que les sourceUrl des phases sont converties en tableaux
      expect(Array.isArray(phaseTemplate.sourceUrl)).toBe(true);
      expect(phaseTemplate.sourceUrl).toContain('/project-management/phases/initiation.html');
      expect(phaseTemplate.sourceUrl).toContain('/project-management/phases/concept.html');
      expect(phaseTemplate.sourceUrl).toContain('/project-management/phases/deployment.html');
      expect(phaseTemplate.sourceUrl).toContain('/project-management/phases/implementation.html');
      expect(phaseTemplate.sourceUrl).toContain('/project-management/phases/execution.html');
      expect(phaseTemplate.sourceUrl).toContain('/project-management/phases/closure.html');
    });
  }, 45000);  // Timeout de 45 secondes pour mode sync
});
