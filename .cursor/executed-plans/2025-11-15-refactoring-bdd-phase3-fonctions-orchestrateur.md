# Plan d'exécution : Refactoring BDD - Phase 3 (Migration de fonctions vers l'orchestrateur)

## Date : 2025-11-15

## Objectif

Migrer les fonctions `loadApiKey()`, `saveArtifact()` et `extractHermes2022ConceptsWithNuExtract()` du module `nuextract-client.js` vers `concepts-site-extraction-orchestrator.js` en suivant les principes du BDD (Rouge -> Vert -> Refactor).

## Fonctions migrées

1. **`loadApiKey()`** : La logique de chargement des clés API est désormais gérée de manière centralisée et multi-LLM par `loadApiKeys()` dans l'orchestrateur.
2. **`saveArtifact()`** : La sauvegarde de l'artefact et l'initialisation du fichier d'approbation sont des responsabilités de l'orchestrateur.
3. **`extractHermes2022ConceptsWithNuExtract()`** : Cette fonction représente l'ancienne logique d'extraction complète par NuExtract. Elle est remplacée par l'orchestration hybride dans `concepts-site-extraction-orchestrator.js` qui délègue à `nuextract-client.js` pour l'extraction de blocs individuels (`extractSingleBlock`).
4. **`main()`** : Point d'entrée du workflow, remplacé par l'orchestrateur.
5. **`recomposeArtifact()` et `normalizeEnumValues()`** : Fonctions d'orchestration déjà présentes dans l'orchestrateur comme nested functions.

## Étapes exécutées

### 1. ROUGE ✅ : Suppression des fonctions dans `nuextract-client.js`

- **Action** : Les fonctions `loadApiKey`, `saveArtifact`, `extractHermes2022ConceptsWithNuExtract`, et `main` ainsi que leurs exports `_testOnly_` ont été **supprimées complètement** (pas commentées) de `src/nuextract-client.js`.
- **Justification** : Suite à la suggestion de l'utilisateur ("Il vaut mieux supprimer que commenter, nous perdons du temps et de l'énergie, nous avons git pour récupérer la version précédente si nécessaire"), suppression propre pour gagner en clarté.
- **Lignes supprimées** : ~500 lignes au total
  - loadGlobalConfig() : lignes 25-145 (~120 lignes) - déjà supprimée en Phase 2
  - loadApiKey() : lignes 147-200 (~50 lignes)
  - loadAndResolveSchemas() : lignes 201-257 (~56 lignes) - déjà supprimée en Phase 1
  - extractHermes2022ConceptsWithNuExtract() : lignes 490-888 (~400 lignes)
  - saveArtifact() : lignes 491-539 (~50 lignes)
  - main() : lignes 539-580 (~40 lignes)

### 2. REFACTOR ✅ : Suppression des imports inutilisés (Phase 4)

- **Action** : Imports `$RefParser`, `Ajv`, et `ajv-formats` commentés car plus utilisés (toute la logique de validation JSON Schema est dans l'orchestrateur).
- **Justification** : Ces imports étaient uniquement utilisés dans les fonctions supprimées.

### 3. VERT 🚧 : Mettre à jour les fichiers de tests

- **État actuel** : 
  - ✅ Tests retirés de `nuextract-client-error-handling.feature` et `.steps.ts` : Scénarios pour `extractHermes2022ConceptsWithNuExtract` supprimés
  - ✅ Imports mis à jour dans `nuextract-client-error-handling.steps.ts` : `_testOnly_loadApiKey`, `_testOnly_saveArtifact`, `_testOnly_extractHermes2022ConceptsWithNuExtract` commentés
  - ✅ Module `nuextract-client.js` charge sans erreur de syntaxe
  - 🚧 **Tests en échec** : 9/28 tests échouent (19 passent)
    - Tests qui échouent : Tests de `generateTemplate` qui appellent `loadGlobalConfig()` et `loadAndResolveSchemas()` en setup
    - **Cause** : Ces fonctions sont maintenant dans l'orchestrateur et nécessitent un mock de `fs.readFileSync` approprié

### 4. État actuel des tests

**Tests qui passent (19)** :
- ✅ Erreur racine repository introuvable
- ✅ Erreur paramètre projectName manquant ou vide
- ✅ Erreur création nouveau projet sans template
- ✅ Erreur mise à jour projet existant avec mise à jour demandée sans template fourni
- ✅ Erreur validation conformité projet existant sans template fourni
- ✅ Erreur projet existant sans template valide
- ✅ Erreur template existant non conforme au JSON schema
- ✅ Erreur réseau lors d'appel fetchHtmlContent (x4 scénarios)
- ✅ Schéma invalide pour collectHtmlSourcesAndInstructions (x2 scénarios)
- ✅ Profondeur maximale atteinte
- ✅ Instructions manquantes/invalides (x5 scénarios)

**Tests qui échouent (9)** :
- ❌ Erreur instructions absentes dans generateTemplate
- ❌ Erreur instructions type invalide dans generateTemplate
- ❌ Erreur templateMode invalide
- ❌ Erreur jobId null en mode async
- ❌ Erreur parse JSON templateData invalide en mode async
- ❌ Erreur type templateData invalide en mode async
- ❌ Erreur template vide retourné par l'API
- ❌ Erreur timeout API génération template mode sync
- ❌ Erreur API NuExtract infer-template inaccessible

**Cause des échecs** : Tous ces tests appellent `loadGlobalConfig()` dans leur setup, qui tente de valider la config avec Ajv, mais le schéma JSON n'est pas mocké correctement.

## Prochaines actions

### Option 1 : Mocker `fs.readFileSync` pour les tests `generateTemplate`

Ajouter des mocks appropriés dans les tests qui utilisent `loadGlobalConfig()` pour que la lecture du fichier de schéma fonctionne.

### Option 2 : Simplifier les tests en fournissant directement une config mockée

Au lieu d'appeler `loadGlobalConfig()`, créer directement un objet `config` mocké pour les tests de `generateTemplate`.

## Résultats attendus (à compléter)

- ✅ `loadApiKey()`, `saveArtifact()`, `extractHermes2022ConceptsWithNuExtract()`, `main()` supprimées de `nuextract-client.js`
- ✅ Exports `_testOnly_` correspondants supprimés
- ✅ Scénarios et implémentations de tests pour `extractHermes2022ConceptsWithNuExtract` retirés de `nuextract-client-error-handling`
- ✅ Tous les fichiers de tests mis à jour pour les imports
- 🚧 **En cours** : Résolution des 9 tests en échec liés à `loadGlobalConfig()`
- ❌ À faire : Aucune régression introduite
- ❌ À faire : Préparation pour validation finale (Phase 5)

## Notes

- **Approche "Suppression > Commentaires"** : Suite à la suggestion de l'utilisateur, le code a été supprimé directement au lieu d'être commenté, rendant le fichier plus propre et lisible.
- **Git pour l'historique** : Si nécessaire, les versions précédentes peuvent être récupérées via Git.
- **`recomposeArtifact` et `normalizeEnumValues`** : Ces fonctions étaient déjà présentes dans l'orchestrateur comme nested functions dans `extractHermes2022Concepts`, donc elles ont été simplement supprimées de `nuextract-client.js`.
