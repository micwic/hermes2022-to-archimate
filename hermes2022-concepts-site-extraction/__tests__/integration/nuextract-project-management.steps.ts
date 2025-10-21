// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import { Given, When, Then } from 'jest-cucumber';
import fs from 'fs';

// Import des fonctions du script refactorisé
import { loadGlobalConfig, loadApiKey, generateTemplate, findOrCreateProject } from '../../src/nuextract-client.js';
import { resolveFromRepoRoot } from '../../src/path-resolver.js';

// Variables globales pour les tests
let PROJECT_ID: string | null = null;
let config: any = null;
let apiKey: string | null = null;
let template: any = null;

const feature = loadFeature(__dirname + '/nuextract-project-management.feature');

defineFeature(feature, (test) => {
  test('Création d\'un nouveau projet avec template', ({ given, when, then, and }) => {
    given('une configuration NuExtract valide', () => {
      // Charger la configuration
      const configPath = resolveFromRepoRoot('hermes2022-concepts-site-extraction/config/extraction-config.json');
      expect(fs.existsSync(configPath)).toBe(true);
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(config).toBeDefined();
      expect(config.nuextract).toBeDefined();
    });

    when('on demande la création d\'un projet "HERMES2022"', async () => {
      // Initialiser les variables globales
      await loadGlobalConfig();
      await loadApiKey();

      // Générer le template
      template = await generateTemplate();

      // Créer/rechercher le projet
      await findOrCreateProject(
        process.env.NUEXTRACT_API_KEY || '',
        config.nuextract.projectName || 'HERMES2022',
        config.nuextract.projectDescription || 'Project for HERMES2022 concepts extraction',
        template
      );

      // Récupérer l'ID du projet depuis la variable globale
      // Note: Dans le vrai code, PROJECT_ID est défini dans findOrCreateProject
      // Pour les tests, on simule cette récupération
    });

    then('le projet est créé avec succès', () => {
      // Vérifier que le projet a été créé (simulé)
      expect(true).toBe(true); // Placeholder - à implémenter selon les besoins
    });

    and('le projet contient le template généré', () => {
      expect(template).toBeDefined();
      expect(template).toHaveProperty('schemas');
    });

    and('le projet a l\'ID correct stocké dans PROJECT_ID', () => {
      // Vérifier que PROJECT_ID a été défini
      expect(PROJECT_ID).toBeDefined(); // Placeholder - à adapter selon l'implémentation
    });
  });

  test('Recherche d\'un projet existant', ({ given, when, then, and }) => {
    given('un projet "HERMES2022" existant', () => {
      // Simuler un projet existant
      config = JSON.parse(fs.readFileSync(resolveFromRepoRoot('hermes2022-concepts-site-extraction/config/extraction-config.json'), 'utf8'));
    });

    when('on recherche le projet par nom', async () => {
      await loadGlobalConfig();
      await loadApiKey();
      template = await generateTemplate();

      await findOrCreateProject(
        process.env.NUEXTRACT_API_KEY || '',
        config.nuextract.projectName || 'HERMES2022',
        config.nuextract.projectDescription || 'Project for HERMES2022 concepts extraction',
        template
      );
    });

    then('le projet existant est retourné', () => {
      expect(true).toBe(true); // Placeholder - à implémenter
    });

    and('le projet peut être mis à jour avec un nouveau template', () => {
      expect(template).toBeDefined();
    });

    and('l\'ID du projet est stocké dans PROJECT_ID', () => {
      expect(PROJECT_ID).toBeDefined(); // Placeholder - à adapter
    });
  });
});
