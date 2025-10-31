# 2025-10-30 — Refactor tests d’intégration: structure réel vs mocké, gestion d’erreurs validée

## Contexte
- Projet: `hermes2022-to-archimate/hermes2022-concepts-site-extraction`
- Objectif: Aligner les tests d’intégration avec la séparation `nuextract-api.js` (API) / `nuextract-client.js` (métier), formaliser la structure BDD et valider la gestion d’erreurs au niveau intégration.

## Actions réalisées
1) Imports d’intégration alignés SOLID
   - `getNuExtractProjects`/`putProjectTemplate` importés depuis `src/nuextract-api.js` (exports normaux).
2) Hooks d’isolation ajoutés
   - `beforeEach/afterEach` dans les steps d’intégration.
3) Réorganisation par dépendance externe
   - Création `__tests__/integration/with-external-system/` (réel) et déplacement des scénarios.
   - Création `__tests__/integration/with-external-system-mocked/` (mocké) avec suffixe `-mocked`.
4) Scénarios d’erreurs d’intégration (mockés) ajoutés
   - HTTP 500, timeout 10s, JSON invalide, type invalide (templateData), orchestration sans template.
5) Correctifs d’assertions et de mode
   - Scénario réel async: `templateMode='async'` forcé.
   - Réutilisation projet: assertion `existing` (au lieu de `updated`).
6) Gouvernance BDD mise à jour
   - Fichier `/.cursor/rules/bdd-governance.mdc` créé: structure `with-external-system/` vs `with-external-system-mocked/`, suffixe `-mocked`, portée des mocks (frontières), timeouts.

## Résultats d’exécution (mesurables)
- Intégration mockée: 2 suites, 6/6 tests PASS (≈1.3s)
  - `__tests__/integration/with-external-system-mocked/template-generation-mocked.*`
  - `__tests__/integration/with-external-system-mocked/nuextract-project-management-mocked.*`
- Intégration réelle: 2 suites, 5/5 tests PASS (≈41s)
  - `__tests__/integration/with-external-system/template-generation.*`
  - `__tests__/integration/with-external-system/nuextract-project-management.*`

## Fichiers impactés (extraits)
- Créés (réel):
  - `__tests__/integration/with-external-system/template-generation.feature`
  - `__tests__/integration/with-external-system/template-generation.steps.ts`
  - `__tests__/integration/with-external-system/nuextract-project-management.feature`
  - `__tests__/integration/with-external-system/nuextract-project-management.steps.ts`
- Créés (mocké):
  - `__tests__/integration/with-external-system-mocked/template-generation-mocked.feature`
  - `__tests__/integration/with-external-system-mocked/template-generation-mocked.steps.ts`
  - `__tests__/integration/with-external-system-mocked/nuextract-project-management-mocked.feature`
  - `__tests__/integration/with-external-system-mocked/nuextract-project-management-mocked.steps.ts`
- Gouvernance: `/.cursor/rules/bdd-governance.mdc`

## Références internes
- Séparation API/Client: `src/nuextract-api.js`, `src/nuextract-client.js`
- Gouvernance erreurs: `error-handling-governance.mdc` (règle workspace)
- Gouvernance BDD: `/.cursor/rules/bdd-governance.mdc`

## Observations
- Timeouts mockés <5s et réels (async 120s, sync 45s) conformes à la gouvernance.
- Les messages d’erreur intègrent des fragments stables, testés avec `toContain()`.


