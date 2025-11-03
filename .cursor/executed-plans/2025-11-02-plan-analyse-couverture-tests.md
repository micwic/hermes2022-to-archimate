# Plan : Analyse comparative de la couverture des tests - 31.10.2025 vs actuel

**Date** : 2025-11-02  
**Statut** : ✅ Complété  
**Référence gouvernance** : @agent-ai-generation-governance

## Contexte

Demande d'établir un plan d'analyse du niveau de couverture des tests par rapport à la version précédente au 31 octobre au soir (dernier commit au 31.10.2025, commit 7022f90 : "Finalisation des tests d'intégration - Tous les tests ont été revus et passent").

Comparer la couverture en termes de périmètre, de profondeur et d'effectivité.

## Objectifs

1. Extraire les métadonnées des tests au 31 octobre (commit 7022f90)
2. Extraire les métadonnées des tests actuels (HEAD)
3. Comparer la couverture selon trois dimensions :
   - **Périmètre** : Nombre de fichiers .feature, nombre de scénarios par fichier et total
   - **Profondeur** : Nombre de fonctions testées par module, couverture des chemins d'erreur/succès/cas limites
   - **Effectivité** : Isolation des tests, qualité des mocks, assertions flexibles vs strictes, timeouts selon type de test
4. Distinguer clairement les analyses pour :
   - **Tests unitaires** : focalisés sur la gestion des erreurs et le logging (répertoire `unit/`)
   - **Tests d'intégration** : centrés sur le fonctionnel (répertoire `integration/`)
5. Présenter le résultat sous forme de tableaux comparatifs ligne par ligne avec :
   - .feature, .step.ts et code nuextract-client ou nuextract-api
   - Évaluation niveau de couverture
   - Commentaire analyse niveau couverture
   - Recommandation

## Mise en œuvre

### Phase 1 : Extraction des métadonnées au 31 octobre (commit 7022f90)

1. **Lister tous les fichiers .feature et .steps.ts au 31 octobre** :
   - Distinguer `unit/` vs `integration/`
   - Commande : `git ls-tree -r 7022f90 --name-only | grep "__tests__.*\.feature"`

2. **Compter les scénarios Gherkin par fichier .feature** :
   - Commande : `git show 7022f90:hermes2022-concepts-site-extraction/__tests__/**/*.feature | grep -c "^  Scénario:"`
   - Séparer les résultats par type (unitaires vs intégration)

3. **Identifier les fonctions testées dans les .steps.ts** :
   - Extraire les imports `_testOnly_` pour tests unitaires
   - Extraire les scénarios fonctionnels pour tests d'intégration

4. **Extraire les exports _testOnly_ de nuextract-client.js et nuextract-api.js** :
   - Commande : `git show 7022f90:hermes2022-concepts-site-extraction/src/nuextract-client.js | grep -E "module\.exports|_testOnly_"`

### Phase 2 : Extraction des métadonnées actuelles (HEAD)

1. **Analyser les fichiers tests unitaires actuels** :
   - `hermes2022-concepts-site-extraction/__tests__/unit/nuextract-client-error-handling.feature`
   - `hermes2022-concepts-site-extraction/__tests__/unit/nuextract-api-error-handling.feature`
   - Compter les scénarios par fichier
   - Identifier les fonctions couvertes (gestion d'erreurs et logging)

2. **Analyser les fichiers tests d'intégration actuels** :
   - `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system/template-generation.feature`
   - `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system/nuextract-project-management.feature`
   - `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system-mocked/template-generation-mocked.feature`
   - `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system-mocked/nuextract-project-management-mocked.feature`
   - Compter les scénarios par fichier
   - Identifier les scénarios fonctionnels couverts

### Phase 3 : Analyse comparative - Tests unitaires (gestion d'erreurs et logging)

#### 3.1 Périmètre - Tests unitaires

Comparer :
- Nombre de fichiers `.feature` dans `unit/` : version 31.10 vs actuel
- Nombre de scénarios Gherkin par fichier unitaire : comparaison par fichier et total
- Modules de code couverts : nuextract-client vs nuextract-api (focus erreurs)

#### 3.2 Profondeur - Tests unitaires

Comparer :
- Nombre de fonctions testées pour gestion d'erreurs par module
- Couverture des chemins d'erreur (error handling) : types d'erreurs couvertes par fonction
- Couverture du logging : vérification des messages console.log() et console.error()

#### 3.3 Effectivité - Tests unitaires

Comparer :
- Isolation des tests (présence de `beforeEach`/`afterEach`) pour éviter effets de bord
- Qualité des mocks (utilisation de `jest.mock()` vs mocking manuel)
- Assertions flexibles pour messages d'erreur (utilisation de `toContain()` vs `toBe()`)
- Validation des messages d'erreur (capture regex vs duplication littérale)
- Vérification du logging (console.log() et console.error())

### Phase 4 : Analyse comparative - Tests d'intégration (fonctionnel)

#### 4.1 Périmètre - Tests d'intégration

Comparer :
- Nombre de fichiers `.feature` dans `integration/` : version 31.10 vs actuel
- Nombre de scénarios Gherkin par fichier intégration : comparaison par fichier et total
- Distinction tests avec système externe réel vs mocké
- Scénarios fonctionnels couverts : génération de template, gestion de projet

#### 4.2 Profondeur - Tests d'intégration

Comparer :
- Scénarios fonctionnels couverts : génération de template (sync vs async), gestion de projet (création, mise à jour, recherche)
- Cas de succès couverts (happy path) : comparaison par fonctionnalité
- Cas d'erreur fonctionnels couverts : erreurs API, timeouts, erreurs métier

#### 4.3 Effectivité - Tests d'intégration

Comparer :
- Isolation des tests (présence de `beforeEach`/`afterEach`) pour tests d'intégration
- Configuration des timeouts selon type de test (réel vs mocké) : conforme à la gouvernance (120s async réels, 45s sync réels, 5s mockés)
- Qualité des mocks pour tests mockés (isolation des frontières uniquement)
- Utilisation config réelle vs mocks ciblés selon type de test

### Phase 5 : Génération des tableaux comparatifs et synthèse

1. **Générer les tableaux comparatifs pour tests unitaires** :
   - Tableau périmètre (fichiers .feature et scénarios)
   - Tableau profondeur (fonctions par module focus erreurs/logging)
   - Tableau effectivité (isolation, mocks, assertions)

2. **Générer les tableaux comparatifs pour tests d'intégration** :
   - Tableau périmètre (fichiers .feature et scénarios réel vs mocké)
   - Tableau profondeur (scénarios fonctionnels par fonctionnalité)
   - Tableau effectivité (isolation, timeouts, mocks)

3. **Créer la synthèse et recommandations** :
   - Synthèse tests unitaires : tableau récapitulatif (périmètre + profondeur + effectivité) pour gestion d'erreurs et logging
   - Synthèse tests d'intégration : tableau récapitulatif (périmètre + profondeur + effectivité) pour couverture fonctionnelle
   - Identification des lacunes de couverture par type de test
   - Recommandations prioritaires d'amélioration (séparées par type de test)
   - Score de couverture global (qualitatif) par type de test

### Phase 6 : Sauvegarde du document d'analyse

1. **Créer le document d'analyse** :
   - Format : Markdown avec tableaux comparatifs séparés (unitaires vs intégration)
   - Localisation : `.cursor/executed-plans/YYYY-MM-DD-analyse-couverture-tests.md`
   - Contenu : Tous les tableaux comparatifs et recommandations

2. **Créer le document de plan** :
   - Format : Markdown selon format des autres plans exécutés
   - Localisation : `.cursor/executed-plans/YYYY-MM-DD-plan-analyse-couverture-tests.md`
   - Contenu : Structure du plan avec contexte, objectifs, mise en œuvre

## Résultats

### Document d'analyse généré

**Fichier** : `.cursor/executed-plans/2025-11-02-analyse-couverture-tests.md`

**Contenu** :
- Synthèse globale : 52 → 51 scénarios (-1)
- Analyse détaillée tests unitaires : périmètre, profondeur, effectivité
- Analyse détaillée tests d'intégration : périmètre, profondeur, effectivité
- Tableaux comparatifs ligne par ligne avec évaluation, commentaires et recommandations
- Synthèse et recommandations prioritaires

### Document de plan généré

**Fichier** : `.cursor/executed-plans/2025-11-02-plan-analyse-couverture-tests.md` (ce document)

**Contenu** :
- Contexte et objectifs
- Structure du plan d'analyse (6 phases)
- Résultats et validation

## Validation

### Conformité aux règles

- ✅ @agent-ai-generation-governance : Plan sauvegardé dans `.cursor/executed-plans/` du projet principal
- ✅ Distinction claire tests unitaires vs tests d'intégration
- ✅ Comparaison sur trois dimensions : périmètre, profondeur, effectivité
- ✅ Tableaux comparatifs ligne par ligne avec évaluation, commentaires et recommandations

### Résultats de l'analyse

**Synthèse globale** :
- Tests unitaires : 41 → 40 scénarios (-1)
- Tests d'intégration : 11 → 11 scénarios (stable)
- Total : 52 → 51 scénarios (-1)

**Évaluation** : Couverture globale maintenue et excellente, conforme aux bonnes pratiques.

## Fichiers créés

1. `.cursor/executed-plans/2025-11-02-analyse-couverture-tests.md`
   - Document d'analyse complet avec tous les tableaux comparatifs

2. `.cursor/executed-plans/2025-11-02-plan-analyse-couverture-tests.md`
   - Document de plan selon gouvernance

## Recommandations principales

1. **Tests unitaires** : Vérifier que la diminution d'un scénario dans `loadInstructions` (3 → 2) n'a pas causé de perte de couverture
2. **Tests d'intégration** : Aucune recommandation critique - couverture stable et complète
3. **Global** : Aucune action critique nécessaire - couverture excellente maintenue


