<!-- ac1398a8-f4ee-45af-92a8-c6e925190c5f a7350308-50ac-46a9-a401-0cc1e808a835 -->
# Plan d'exécution : Finalisation et amélioration des tests d'intégration

## Contexte

Le module `hermes2022-concepts-site-extraction` dispose d'une structure de tests d'intégration réorganisée selon la gouvernance BDD (`with-external-system/` et `with-external-system-mocked/`). Il est nécessaire de finaliser et améliorer ces tests pour assurer une couverture complète et robuste.

## Préconditions

1. Structure BDD en place (`with-external-system/` et `with-external-system-mocked/`)
2. Gouvernance BDD définie dans `/.cursor/rules/bdd-governance.mdc`
3. Séparation API/Client réalisée (`nuextract-api.js` et `nuextract-client.js`)
4. Hooks d'isolation (`beforeEach/afterEach`) implémentés

## Objectif

Finaliser et améliorer les tests d'intégration pour garantir une couverture complète des scénarios réels et mockés, conformément à la gouvernance BDD.

## Mise en œuvre

### Phase 1 : Vérification et consolidation des tests d'intégration réels

1. **Vérifier la couverture des scénarios réels** :

- Valider que tous les scénarios `.feature` ont des implémentations `.steps.ts` correspondantes
- Vérifier les timeouts (async: 120s, sync: 45s) conformes à la gouvernance
- S'assurer que les hooks d'isolation sont présents

2. **Améliorer les assertions et la validation** :

- Vérifier l'utilisation de `toContain()` pour les messages d'erreur
- Assurer la cohérence des assertions avec les patterns validés
- Valider les imports depuis `nuextract-api.js` (exports normaux) et `nuextract-client.js` (exports `_testOnly_`)

### Phase 2 : Vérification et consolidation des tests d'intégration mockés

1. **Vérifier la couverture des scénarios mockés** :

- Valider que tous les scénarios `.feature` avec suffixe `-mocked` ont des implémentations correspondantes
- Vérifier les timeouts (< 5s par scénario) conformes à la gouvernance
- S'assurer que les mocks ciblent uniquement les frontières (APIs NuExtract, réseau, I/O distants)

2. **Harmoniser le pattern regex pour les messages d'erreur** :

- Utiliser `/^une erreur contenant "(.*)" est générée$/` avec capture
- Éviter la duplication littérale des messages entre `.feature` et `.steps.ts`
- Appliquer le pattern DRY selon la gouvernance BDD

### Phase 3 : Validation et exécution

1. **Exécuter tous les tests d'intégration** :

- Tests réels : Vérifier que tous passent avec configuration valide
- Tests mockés : Vérifier que tous passent sans dépendance réseau
- Mesurer les temps d'exécution et valider les timeouts

2. **Documenter les résultats** :

- Enregistrer les statistiques d'exécution (suites, tests PASS, temps)
- Identifier les éventuels problèmes ou améliorations nécessaires
- Valider la conformité avec la gouvernance BDD

## Critères de validation

- [x] Tous les scénarios `.feature` ont des implémentations `.steps.ts` correspondantes
- [x] Les timeouts sont conformes à la gouvernance (réels: async 120s/sync 45s, mockés: < 5s)
- [x] Les hooks d'isolation (`beforeEach/afterEach`) sont présents dans tous les fichiers
- [x] Le pattern regex avec capture est utilisé pour tous les messages d'erreur
- [x] Les imports respectent la séparation API/Client (exports normaux vs `_testOnly_`)
- [x] Tous les tests passent (réels et mockés) : **11/11 tests passent (5 réels + 6 mockés)**
- [x] La couverture des erreurs clés est complète (HTTP/timeout/JSON/propagation/orchestration)

## Résultats d'exécution — Synthèse globale

**Exécution complète de tous les tests d'intégration :**
- **Test Suites** : 4 passed, 4 total (2 réels + 2 mockés)
- **Tests** : 11 passed, 11 total (5 réels + 6 mockés)
- **Time** : ~82s total (réels ~81s + mockés ~0.75s)

### Tests mockés (`with-external-system-mocked/`)

**Exécution complète :**

- **Test Suites** : 2 passed, 2 total
- **Tests** : 6 passed, 6 total
- **Time** : 0.747 s
- **Timeouts** : Tous les tests mockés ont un timeout de 5s (< 5s conforme à la gouvernance)

**Détails par fichier :**

- `template-generation-mocked.*` : 4/4 tests passent (HTTP 500, Timeout 10s, JSON invalide, Type invalide)
- `nuextract-project-management-mocked.*` : 2/2 tests passent (Création sans template, Mise à jour sans template)

### Tests réels (`with-external-system/`)

**Exécution complète :**

- **Test Suites** : 2 passed, 2 total
- **Tests** : 5 passed, 5 total
- **Time** : ~81s total (template-generation: 38.889s, nuextract-project-management: 42.108s)
- **Timeouts** : Conformes à la gouvernance (async: 120s, sync: 45s)

**Détails par fichier :**

- `template-generation.*` : 2/2 tests passent
  - Génération avec infer-template-async : 30.845s
  - Génération avec infer-template : 7.678s
- `nuextract-project-management.*` : 3/3 tests passent
  - Création nouveau projet : 8.479s
  - Mise à jour projet existant : 16.896s
  - Recherche projet existant : 16.346s

## Actions réalisées

1. ✅ **Vérification de la couverture des scénarios** : Tous les scénarios `.feature` ont des implémentations `.steps.ts` correspondantes (réels et mockés)

2. ✅ **Ajout des timeouts manquants** : Timeouts de 5s ajoutés à tous les tests mockés (6 tests au total) pour conformité avec la gouvernance BDD

3. ✅ **Validation des hooks d'isolation** : Vérifié la présence de `beforeEach` et `afterEach` dans tous les fichiers de tests

4. ✅ **Validation du pattern regex** : Confirmé l'utilisation du pattern `/^une erreur contenant "(.*)" est générée$/` avec capture dans tous les tests mockés

5. ✅ **Validation des imports** : Vérifié que les imports respectent la séparation API/Client :

- Tests réels : exports normaux depuis `nuextract-api.js`, exports `_testOnly_` depuis `nuextract-client.js`
- Tests mockés : `import * as nuextractApi` pour mocker, exports `_testOnly_` depuis `nuextract-client.js`

6. ✅ **Exécution des tests mockés** : Tous les tests mockés passent (6/6) en 0.747s

7. ✅ **Exécution des tests réels** : Tous les tests réels passent (5/5) en ~81s
   - Tests template-generation : 2/2 passent (async 30.8s, sync 7.7s)
   - Tests nuextract-project-management : 3/3 passent (création 8.5s, mise à jour 16.9s, recherche 16.3s)

8. ✅ **Validation de la couverture des erreurs** : Couverture complète des erreurs clés :

- HTTP 500 (test mocké)
- Timeout 10s (test mocké)
- JSON invalide (test mocké)
- Type invalide (test mocké)
- Orchestration sans template (2 tests mockés)

## Fichiers concernés

- `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system/template-generation.*`
- `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system/nuextract-project-management.*`
- `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system-mocked/template-generation-mocked.*`
- `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system-mocked/nuextract-project-management-mocked.*`

## Références

- Gouvernance BDD : `/.cursor/rules/bdd-governance.mdc`
- Gouvernance erreurs : `error-handling-governance.mdc` (règle workspace)
- Plans précédents : `2025-10-30-refactor-integration-tests-structure-and-mocks.md`, `2025-10-30-harmonisation-messages-erreur-bdd-regex-capture.md`

### To-dos

- [x] Vérifier que tous les scénarios réels ont des implémentations et que les timeouts sont conformes
- [x] Améliorer les assertions et valider les imports selon la séparation API/Client
- [x] Vérifier que tous les scénarios mockés ont des implémentations et que les mocks ciblent uniquement les frontières
- [x] Harmoniser le pattern regex pour les messages d'erreur dans tous les tests mockés
- [x] Exécuter tous les tests d'intégration (réels et mockés) et documenter les résultats
- [x] Valider la conformité avec la gouvernance BDD et documenter les résultats finaux
