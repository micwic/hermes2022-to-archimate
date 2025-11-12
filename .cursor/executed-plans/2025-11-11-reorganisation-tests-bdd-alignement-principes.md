# Réorganisation des tests BDD selon principes de gouvernance

> Date : 2025-11-11
> Contexte : Alignement de la structure des tests avec les principes BDD (distinction unit/integration par portée, pas par présence de mocks)

## Objectif

Réorganiser les tests pour clarifier la distinction entre tests unitaires et tests d'intégration selon leur portée (unité isolée vs interaction entre composants), et non selon la présence ou l'absence de mocks.

## Phases exécutées

### ✅ Phase 1 : Vérification de la couverture des scénarios d'erreurs

**Résultat** : Tous les scénarios d'erreurs de `with-external-system-mocked/` sont **déjà couverts** dans `__tests__/unit/nuextract-client-error-handling`.

#### Analyse détaillée

**Fichier : `template-generation-mocked.feature` (4 scénarios d'erreur)**

- ✅ "Erreur HTTP 500 en mode async" → Couvert dans `nuextract-api-error-handling.feature:48` (Code HTTP non-200)
- ✅ "Timeout 10s en mode async" → Couvert dans `nuextract-api-error-handling.feature:42` (Timeout)
- ✅ "JSON invalide retourné par le polling" → Couvert dans `nuextract-client-error-handling.feature:113` (parse JSON templateData invalide)
- ✅ "Type templateData invalide (array)" → Couvert dans `nuextract-client-error-handling.feature:120` (type templateData non-object)

**Fichier : `nuextract-project-management-mocked.feature` (2 scénarios d'erreur)**

- ✅ "Création projet sans template" → Couvert dans `nuextract-client-error-handling.feature:140` (template undefined en création)
- ✅ "Mise à jour projet sans template" → Couvert dans `nuextract-client-error-handling.feature:147` (template undefined en mise à jour)

**Fichier : `extract-hermes2022-concepts-mocked.feature` (1 scénario d'erreur + 1 succès)**

- ✅ "Erreur lors de l'extraction" → Couvert dans `nuextract-client-error-handling.feature` (erreurs collectHtmlSourcesAndInstructions, inferTextFromContent)
- ⚠️ "Extraction réussie avec agrégation des blocs NuExtract" → **Scénario de succès à migrer**

**Conclusion Phase 1** : Aucun scénario d'erreur manquant. Migration nécessaire uniquement pour le scénario de succès.

### ⚠️ Phase 2 : Création tests unitaires de succès - REMPLACÉE PAR MIGRATION

**Décision** : Les tests synthétiques créés initialement avaient des erreurs de compréhension métier (hypothèses incorrectes sur format données).

**Alternative adoptée** : Migration du test de succès existant fonctionnel depuis `with-external-system-mocked/` vers `unit/`.

### ✅ Phase 3 : Migration des scénarios existants

**Actions effectuées** :

1. ✅ **Suppression des tests synthétiques erronés** :
   - `__tests__/unit/nuextract-client-success.feature` (supprimé)
   - `__tests__/unit/nuextract-client-success.steps.ts` (supprimé)

2. ✅ **Migration du scénario de succès existant** :
   - Depuis : `__tests__/integration/with-external-system-mocked/extract-hermes2022-concepts-mocked`
   - Vers : `__tests__/unit/nuextract-client-extraction-success.feature` et `.steps.ts`
   - **Test migré passe avec succès** ✅

**Détails du test migré** :

- **Scénario** : "Extraction réussie avec agrégation des blocs NuExtract"
- **Mocks utilisés** : **Uniquement frontières externes** (`nuextract-api.js`, `html-collector-and-transformer.js`)
- **Conformité** : Le test respecte les principes de gouvernance (mocks uniquement sur frontières)

### ⏸️ Phase 4 : Suppression du répertoire mocké - EN ATTENTE VALIDATION MANUELLE

**État** : En attente de validation par l'utilisateur avant suppression.

**Analyse de redondance pour validation** :

#### Fichiers dans `__tests__/integration/with-external-system-mocked/`

1. **`template-generation-mocked.feature` / `.steps.ts`** :
   - 4 scénarios d'erreur
   - ✅ Tous couverts dans `nuextract-api-error-handling.feature`
   - **Statut** : Redondant (peut être supprimé après validation)

2. **`nuextract-project-management-mocked.feature` / `.steps.ts`** :
   - 2 scénarios d'erreur
   - ✅ Tous couverts dans `nuextract-client-error-handling.feature`
   - **Statut** : Redondant (peut être supprimé après validation)

3. **`extract-hermes2022-concepts-mocked.feature` / `.steps.ts`** :
   - 1 scénario de succès → ✅ Migré vers `nuextract-client-extraction-success`
   - 1 scénario d'erreur → ✅ Couvert dans `nuextract-client-error-handling.feature`
   - **Statut** : Redondant (peut être supprimé après validation)

**Recommandation** : Tous les scénarios sont soit migrés, soit déjà couverts ailleurs. Le répertoire `with-external-system-mocked/` peut être supprimé en toute sécurité après validation manuelle par l'utilisateur.

**Commande pour suppression (après validation)** :

```bash
rm -rf hermes2022-concepts-site-extraction/__tests__/integration/with-external-system-mocked/
```

### ✅ Phase 5 : Mise à jour de la gouvernance BDD

**Fichier modifié** : `.cursor/rules/new-for-testing/bdd-governance.mdc`

**Changements effectués** :

1. **Section "Structure des tests d'intégration" → "Organisation des tests BDD"** :
   - Suppression des détails d'implémentation spécifiques (structure répertoires, nommage précis, timeouts exacts)
   - Remplacement par principes généraux de gouvernance
   - Clarification : distinction unit/integration par **portée** (unité vs interaction), **pas par présence de mocks**

2. **Section "Distinction validation technique vs validation métier" → "Profondeur des assertions BDD"** :
   - Suppression des exemples de code spécifiques au projet (NuExtract API)
   - Remplacement par principes généraux de validation en deux temps

3. **Section "Principe de non-redondance" et "Profondeur assertions Then"** :
   - Simplification et généralisation (suppression des exemples spécifiques)
   - Focus sur les principes DRY généraux

4. **Corrections de linting** :
   - Ajout d'espaces vides autour des listes (MD032)
   - Résolution des titres dupliqués (MD024) en rendant les titres plus spécifiques

**Principe clé clarifié** :

> La présence ou l'absence de mocks ne définit PAS le type de test. Ce qui distingue unit/integration est la **portée du test** (unité isolée vs interaction entre composants).

**Usage des mocks** :

- **Tests unitaires mockés** : Pour isoler l'unité testée de ses dépendances
- **Tests d'intégration mockés** : Pour simuler des systèmes externes (coût, quota, disponibilité, déterminisme)
- **Tests d'intégration réels** : Pour valider avec les systèmes réels (validation end-to-end)

## Résultats

### Tests créés/migrés

- ✅ **`nuextract-client-extraction-success.feature` et `.steps.ts`** : Scénario de succès migré depuis `with-external-system-mocked/`
- ✅ Test passe avec succès (1/1 passed)

### Tests supprimés

- ✅ **`nuextract-client-success.feature` et `.steps.ts`** : Tests synthétiques erronés supprimés

### Gouvernance mise à jour

- ✅ **`bdd-governance.mdc`** : Règle généralisée et clarifiée (suppression détails d'implémentation spécifiques)
- ✅ Erreurs de linting résolues (MD032, MD024)

### Statut final

| Phase | Statut | Résultat |
|:------|:-------|:---------|
| Phase 1 : Vérification couverture | ✅ Complétée | Tous scénarios d'erreurs couverts |
| Phase 2 : Tests synthétiques | ⚠️ Annulée | Remplacée par migration existants |
| Phase 3 : Migration scénarios | ✅ Complétée | 1 scénario de succès migré vers `unit/` |
| Phase 4 : Suppression mocké | ⏸️ En attente | Nécessite validation manuelle utilisateur |
| Phase 5 : Gouvernance BDD | ✅ Complétée | Règle clarifiée et généralisée |

## Actions recommandées

### Pour l'utilisateur

1. **Valider l'analyse de redondance** (Phase 4) ci-dessus
2. **Supprimer manuellement** `with-external-system-mocked/` si validation OK
3. **Vérifier** que le test migré `nuextract-client-extraction-success` fonctionne correctement dans son nouveau contexte

### Commande de vérification

```bash
# Vérifier que le test migré fonctionne
npm test -- --testPathPatterns="nuextract-client-extraction-success"
```

## Fichiers modifiés

### Nouveaux fichiers

- `hermes2022-concepts-site-extraction/__tests__/unit/nuextract-client-extraction-success.feature`
- `hermes2022-concepts-site-extraction/__tests__/unit/nuextract-client-extraction-success.steps.ts`

### Fichiers supprimés (tests synthétiques erronés)

- `hermes2022-concepts-site-extraction/__tests__/unit/nuextract-client-success.feature`
- `hermes2022-concepts-site-extraction/__tests__/unit/nuextract-client-success.steps.ts`

### Fichiers en attente de suppression (après validation)

- `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system-mocked/` (tout le répertoire)

### Fichiers modifiés

- `.cursor/rules/new-for-testing/bdd-governance.mdc` : Règle clarifiée et généralisée

## Références

- Plan initial : `cursor-ws-hermes2022-to-archimate/.cursor/plans/restructuration-tests-bdd-alignement-principes-4a2ab5af.plan.md`
- Règle BDD mise à jour : `.cursor/rules/new-for-testing/bdd-governance.mdc`

