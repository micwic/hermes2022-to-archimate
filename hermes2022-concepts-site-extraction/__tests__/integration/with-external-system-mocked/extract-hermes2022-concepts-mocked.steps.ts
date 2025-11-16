// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import * as fs from 'fs';
import * as https from 'https';

// Import du helper de mock https (alternative simple à MSW)
const { createHttpsMock } = require('../../support/mocks/https-mock-helper.js');

// Mock global de https
jest.mock('https', () => ({
  request: jest.fn()
}));

// REFACTORING BDD Phase 2 - Import depuis orchestrateur
import { 
  loadGlobalConfig,
  loadAndResolveSchemas,
  loadApiKeys,
  initializeLLMProjects,
  extractHermes2022Concepts,
  saveArtifact
} from '@src/concepts-site-extraction-orchestrator.js';

const feature = loadFeature('hermes2022-concepts-site-extraction/__tests__/integration/with-external-system-mocked/extract-hermes2022-concepts-mocked.feature');

defineFeature(feature, (test) => {
  let config;
  let resolvedSchema;
  let apiKeys;
  let result;
  let error;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Charger la config, le schéma réel et les clés API
    config = await loadGlobalConfig();
    resolvedSchema = await loadAndResolveSchemas(config);
    apiKeys = await loadApiKeys(config);
    // Initialisation des autres variables
    result = undefined;
    error = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // === Scénario de succès ===

  test('Extraction complète réussie avec workflow par blocs', ({ given, and, when, then }) => {
    // Appliquer le contexte commun
    given('une configuration valide pour l\'extraction orchestrée', () => {
      expect(config).toBeDefined();
      expect(config.llm).toBeDefined();
      expect(config.llm.nuextract).toBeDefined();
      expect(config.llm.nuextract.baseUrl).toBeDefined();
      expect(config.llm.nuextract.projectName).toBeDefined();
      // Claude : vérifier seulement la propriété principale (non implémenté)
      expect(config.llm.claude).toBeDefined();
    });

    and('un schéma JSON résolu valide', () => {
      expect(resolvedSchema).toBeDefined();
      expect(resolvedSchema.properties).toBeDefined();
      expect(resolvedSchema.properties.config).toBeDefined();
      expect(resolvedSchema.properties.method).toBeDefined();
      expect(resolvedSchema.properties.concepts).toBeDefined();
    });

    and('les clés API sont chargées', () => {
      expect(apiKeys).toBeDefined();
      expect(apiKeys.nuextract).toBeDefined();
      expect(typeof apiKeys.nuextract).toBe('string');
      // Claude : ne pas vérifier (non implémenté)
    });

    and('nuextract.ai et api.anthropic.com sont mockés pour retourner des réponses valides', () => {
      // Configurer le mock https pour scénario succès (tous les systèmes)
      (https.request as jest.Mock).mockImplementation(createHttpsMock({
        hermes: 'success',
        nuextract: 'success',
        claude: 'success'
      }));
    });

    and('les pages HTML sources d\'information sont mockées pour retourner un contenu valable', () => {
      // Inclus dans le mock https ci-dessus (scénario 'success')
      expect(https.request).toBeDefined();
    });
    
    and('les projets LLM sont initialisés', async () => {
      // Initialisation des projets LLM (condition préalable)
      await initializeLLMProjects(config, apiKeys, resolvedSchema);
    });

    when('on exécute extractHermes2022Concepts avec l\'orchestrateur', async () => {
      try {
        // Exécuter l'extraction orchestrée
        const artifact = await extractHermes2022Concepts(config, resolvedSchema, apiKeys);
        
        // Sauvegarder l'artefact et créer le fichier d'approbation
        result = await saveArtifact(config, artifact);
      } catch (e) {
        error = e;
      }
    });

    then('l\'extraction se termine avec succès', () => {
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    and('l\'artefact final est recomposé correctement', () => {
      expect(result.artifactPath).toBeDefined();
      expect(result.approvalPath).toBeDefined();
      
      // Vérifier que l'artefact a été sauvegardé
      expect(fs.existsSync(result.artifactPath)).toBe(true);
    });

    and('les propriétés paramétriques sont normalisées (sourceUrl, extractionInstructions)', () => {
      // Vérifier que l'artefact contient les propriétés normalisées
      const artifact = JSON.parse(fs.readFileSync(result.artifactPath, 'utf8'));
      
      // sourceUrl et extractionInstructions doivent être des arrays
      if (artifact.method?.sourceUrl) {
        expect(Array.isArray(artifact.method.sourceUrl)).toBe(true);
      }
      if (artifact.concepts?.sourceUrl) {
        expect(Array.isArray(artifact.concepts.sourceUrl)).toBe(true);
      }
    });

    and('l\'artefact est sauvegardé dans le répertoire de sortie', () => {
      expect(result.artifactPath).toContain('shared/hermes2022-extraction-files/data');
    });

    and('le fichier d\'approbation est créé avec status "pending"', () => {
      expect(fs.existsSync(result.approvalPath)).toBe(true);
      
      const approval = JSON.parse(fs.readFileSync(result.approvalPath, 'utf8'));
      const overviewItem = approval.approvals.find(item => item.target === '/concepts/overview');
      expect(overviewItem?.status).toBe('pending');
    });
  }, 180000); // 3 minutes timeout

  // === Scénarios d'erreur ===

  test('Erreur lors de la collecte HTML (fetch hermes.admin.ch échoue)', ({ given, and, when, then }) => {
    given('une configuration valide pour l\'extraction orchestrée', () => {
      expect(config).toBeDefined();
      expect(config.llm).toBeDefined();
      expect(config.llm.nuextract).toBeDefined();
      expect(config.llm.nuextract.baseUrl).toBeDefined();
      expect(config.llm.nuextract.projectName).toBeDefined();
      // Claude : vérifier seulement la propriété principale (non implémenté)
      expect(config.llm.claude).toBeDefined();
    });

    and('un schéma JSON résolu valide', () => {
      expect(resolvedSchema).toBeDefined();
      expect(resolvedSchema.properties).toBeDefined();
      expect(resolvedSchema.properties.config).toBeDefined();
      expect(resolvedSchema.properties.method).toBeDefined();
      expect(resolvedSchema.properties.concepts).toBeDefined();
    });

    and('les clés API sont chargées', () => {
      expect(apiKeys).toBeDefined();
      expect(apiKeys.nuextract).toBeDefined();
      expect(typeof apiKeys.nuextract).toBe('string');
      // Claude : ne pas vérifier (non implémenté)
    });

    and('nuextract.ai et api.anthropic.com sont mockés pour retourner des réponses valides', () => {
      // Configurer le mock https : hermes en erreur, APIs en succès
      (https.request as jest.Mock).mockImplementation(createHttpsMock({
        hermes: 'networkError',
        nuextract: 'success',
        claude: 'success'
      }));
    });

    and('le fetch HTML vers hermes.admin.ch échoue avec erreur réseau', () => {
      // Inclus dans le mock ci-dessus (hermes: 'networkError')
      expect(https.request).toBeDefined();
    });
    
    and('les projets LLM sont initialisés', async () => {
      await initializeLLMProjects(config, apiKeys, resolvedSchema);
    });

    when('on tente d\'exécuter extractHermes2022Concepts avec l\'orchestrateur', async () => {
      try {
        await extractHermes2022Concepts(config, resolvedSchema, apiKeys);
      } catch (e) {
        error = e;
      }
    });

    then('une erreur contenant "Network error" est générée', () => {
      expect(error).toBeDefined();
      // L'erreur peut être wrappée : vérifier le message ou la cause
      const hasNetworkError = error.message.includes('Network error') || 
                              error.message.includes('Error loading HTML');
      expect(hasNetworkError).toBe(true);
    });
  }, 60000);

  test('Erreur lors de l\'extraction d\'un bloc (nuextract.ai retourne erreur HTTP 500)', ({ given, and, when, then }) => {
    given('une configuration valide pour l\'extraction orchestrée', () => {
      expect(config).toBeDefined();
      expect(config.llm).toBeDefined();
      expect(config.llm.nuextract).toBeDefined();
      expect(config.llm.nuextract.baseUrl).toBeDefined();
      expect(config.llm.nuextract.projectName).toBeDefined();
      // Claude : vérifier seulement la propriété principale (non implémenté)
      expect(config.llm.claude).toBeDefined();
    });

    and('un schéma JSON résolu valide', () => {
      expect(resolvedSchema).toBeDefined();
      expect(resolvedSchema.properties).toBeDefined();
      expect(resolvedSchema.properties.config).toBeDefined();
      expect(resolvedSchema.properties.method).toBeDefined();
      expect(resolvedSchema.properties.concepts).toBeDefined();
    });

    and('les clés API sont chargées', () => {
      expect(apiKeys).toBeDefined();
      expect(apiKeys.nuextract).toBeDefined();
      expect(typeof apiKeys.nuextract).toBe('string');
      // Claude : ne pas vérifier (non implémenté)
    });

    and('nuextract.ai est mocké pour retourner erreur HTTP 500', () => {
      // Configurer le mock https : NuExtract en erreur 500, autres en succès
      (https.request as jest.Mock).mockImplementation(createHttpsMock({
        hermes: 'success',
        nuextract: 'error500',
        claude: 'success'
      }));
    });

    and('api.anthropic.com est mocké pour retourner des réponses valides', () => {
      // Inclus dans le mock ci-dessus (claude: 'success')
      expect(https.request).toBeDefined();
    });

    and('les pages HTML sources d\'information sont mockées pour retourner un contenu valable', () => {
      // Inclus dans le mock ci-dessus (hermes: 'success')
      expect(https.request).toBeDefined();
    });
    
    and('les projets LLM sont initialisés', async () => {
      await initializeLLMProjects(config, apiKeys, resolvedSchema);
    });

    when('on tente d\'exécuter extractHermes2022Concepts avec l\'orchestrateur', async () => {
      try {
        await extractHermes2022Concepts(config, resolvedSchema, apiKeys);
      } catch (e) {
        error = e;
      }
    });

    then('une erreur contenant "API error: 500" est générée', () => {
      expect(error).toBeDefined();
      // Vérifier le code d'erreur HTTP 500
      expect(error.message).toContain('500');
    });
  }, 60000);

  test('Erreur lors de la recomposition (nuextract.ai retourne data null)', ({ given, and, when, then }) => {
    given('une configuration valide pour l\'extraction orchestrée', () => {
      expect(config).toBeDefined();
      expect(config.llm).toBeDefined();
      expect(config.llm.nuextract).toBeDefined();
      expect(config.llm.nuextract.baseUrl).toBeDefined();
      expect(config.llm.nuextract.projectName).toBeDefined();
      // Claude : vérifier seulement la propriété principale (non implémenté)
      expect(config.llm.claude).toBeDefined();
    });

    and('un schéma JSON résolu valide', () => {
      expect(resolvedSchema).toBeDefined();
      expect(resolvedSchema.properties).toBeDefined();
      expect(resolvedSchema.properties.config).toBeDefined();
      expect(resolvedSchema.properties.method).toBeDefined();
      expect(resolvedSchema.properties.concepts).toBeDefined();
    });

    and('les clés API sont chargées', () => {
      expect(apiKeys).toBeDefined();
      expect(apiKeys.nuextract).toBeDefined();
      expect(typeof apiKeys.nuextract).toBe('string');
      // Claude : ne pas vérifier (non implémenté)
    });

    and('nuextract.ai est mocké pour retourner data null', () => {
      // Configurer le mock https : NuExtract retourne null, autres en succès
      (https.request as jest.Mock).mockImplementation(createHttpsMock({
        hermes: 'success',
        nuextract: 'dataNull',
        claude: 'success'
      }));
    });

    and('api.anthropic.com est mocké pour retourner des réponses valides', () => {
      // Inclus dans le mock ci-dessus (claude: 'success')
      expect(https.request).toBeDefined();
    });

    and('les pages HTML sources d\'information sont mockées pour retourner un contenu valable', () => {
      // Inclus dans le mock ci-dessus (hermes: 'success')
      expect(https.request).toBeDefined();
    });
    
    and('les projets LLM sont initialisés', async () => {
      await initializeLLMProjects(config, apiKeys, resolvedSchema);
    });

    when('on tente d\'exécuter extractHermes2022Concepts avec l\'orchestrateur', async () => {
      try {
        await extractHermes2022Concepts(config, resolvedSchema, apiKeys);
      } catch (e) {
        error = e;
      }
    });

    then('une erreur contenant "Invalid data in partial result" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid data in partial result');
    });
  }, 60000);

  // === Scénarios d'erreur Claude (préparation intégration future) ===

  test.skip('Erreur lors de l\'extraction avec Claude (api.anthropic.com retourne erreur HTTP 429)', ({ given, and, when, then }) => {
    given('une configuration valide pour l\'extraction orchestrée', () => {
      expect(config).toBeDefined();
      expect(config.llm).toBeDefined();
      expect(config.llm.nuextract).toBeDefined();
      expect(config.llm.nuextract.baseUrl).toBeDefined();
      expect(config.llm.nuextract.projectName).toBeDefined();
      // Claude : vérifier seulement la propriété principale (non implémenté)
      expect(config.llm.claude).toBeDefined();
    });

    and('un schéma JSON résolu valide', () => {
      expect(resolvedSchema).toBeDefined();
      expect(resolvedSchema.properties).toBeDefined();
      expect(resolvedSchema.properties.config).toBeDefined();
      expect(resolvedSchema.properties.method).toBeDefined();
      expect(resolvedSchema.properties.concepts).toBeDefined();
    });

    and('les clés API sont chargées', () => {
      expect(apiKeys).toBeDefined();
      expect(apiKeys.nuextract).toBeDefined();
      expect(typeof apiKeys.nuextract).toBe('string');
      // Claude : ne pas vérifier (non implémenté)
    });

    and('nuextract.ai est mocké pour retourner des réponses valides', () => {
      // Configurer le mock https : Claude en erreur 429, autres en succès
      (https.request as jest.Mock).mockImplementation(createHttpsMock({
        hermes: 'success',
        nuextract: 'success',
        claude: 'error429'
      }));
    });

    and('api.anthropic.com est mocké pour retourner erreur HTTP 429 (rate limit)', () => {
      // Inclus dans le mock ci-dessus (claude: 'error429')
      expect(https.request).toBeDefined();
    });

    and('les pages HTML sources d\'information sont mockées pour retourner un contenu valable', () => {
      // Inclus dans le mock ci-dessus (hermes: 'success')
      expect(https.request).toBeDefined();
    });
    
    and('les projets LLM sont initialisés', async () => {
      await initializeLLMProjects(config, apiKeys, resolvedSchema);
    });

    when('on tente d\'exécuter extractHermes2022Concepts avec l\'orchestrateur', async () => {
      try {
        await extractHermes2022Concepts(config, resolvedSchema, apiKeys);
      } catch (e) {
        error = e;
      }
    });

    then('une erreur contenant "Rate limit exceeded" est générée', () => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Rate limit exceeded');
    });
  }, 60000);
});
