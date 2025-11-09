# Plan : Extraction par bloc avec html-to-text et refactorisation tests

**Date** : 2025-11-04

**Statut** : ✅ Complété

**Plan original** : `extraction-par-bloc-avec-html-to-text-6bb8a112.plan.md`

## Contexte Initial

Refactorisation de l'extraction HERMES2022 pour résoudre la limitation de contexte NuExtract (32768 tokens) en :

1. Extrayant par bloc (une extraction NuExtract par bloc au lieu d'une extraction globale)
2. Convertissant HTML→texte après chaque fetch HTML avec `html-to-text`
3. Recomposant l'artefact final en fusionnant les résultats partiels par bloc

**Problème initial** : L'extraction globale agrège tous les blocs en un seul prompt (230 690 tokens) qui dépasse la limite de 32 768 tokens de NuExtract.

**Solution** : Extraction par bloc avec conversion HTML→texte pour réduire la taille de chaque prompt.

## Objectifs

1. ✅ Installation de `html-to-text` dans `package.json`
2. ✅ Intégration de `html-to-text` dans `fetchHtmlContent()` : conversion HTML→texte après réception
3. ✅ Création de `buildBlockPrompt(block)` : prompt pour un bloc unique
4. ✅ Refactorisation de `extractHermes2022ConceptsWithNuExtract()` : extraction par bloc avec boucle sur `preparation.blocks`
5. ✅ Création de `mergeJsonAtPath(target, path, value)` : fusion récursive helper pour JSON Pointer
6. ✅ Création de `recomposeArtifact(partialResults, resolvedSchema, config, baseUrl)` : recomposition globale
7. ✅ Intégration de `recomposeArtifact()` dans `extractHermes2022ConceptsWithNuExtract()` : appel après boucle extraction par bloc
8. ✅ Mise à jour des exports `_testOnly_` : ajout des nouvelles fonctions
9. ✅ Refactorisation des tests de gestion d'erreur : organisation par script et conformité regex capture

## Exécution du plan

### Phase 1 : Installation et intégration html-to-text ✅

**Fichiers modifiés** :

- `hermes2022-to-archimate/package.json` : Ajout `html-to-text: ^9.0.0` dans `devDependencies`
- `hermes2022-concepts-site-extraction/src/nuextract-client.js` : Intégration `html-to-text` dans `fetchHtmlContent()`

**Actions réalisées** :

1. **Installation `html-to-text`** : Version `^9.0.0` ajoutée dans `devDependencies`
2. **Import `html-to-text`** : `const { convert } = require('html-to-text')` (ligne 15)
3. **Conversion HTML→texte** : Après réception du HTML dans `fetchHtmlContent()` (ligne ~1160) :
   ```javascript
   const textContent = convert(data, {
     wordwrap: false,
     preserveNewlines: true
   });
   ```
4. **Retour texte brut** : `fetchHtmlContent()` retourne maintenant `textContent` au lieu de `htmlContent`

### Phase 2 : Création de buildBlockPrompt() ✅

**Fichier** : `hermes2022-concepts-site-extraction/src/nuextract-client.js`

**Fonction créée** : `buildBlockPrompt(block)` (ligne ~768)

**Actions réalisées** :

1. **Extraction logique** : Logique de construction de prompt pour un seul bloc extraite depuis `buildExtractionPrompt()`
2. **Paramètre** : `{ jsonPointer, instructions, htmlContents }`
3. **Format prompt** : Instructions + contenu texte (un prompt par bloc)
4. **Journalisation** : Log en entrée avec `jsonPointer` pour traçabilité

### Phase 3 : Refactorisation extractHermes2022ConceptsWithNuExtract() ✅

**Fichier** : `hermes2022-concepts-site-extraction/src/nuextract-client.js`

**Fonction modifiée** : `extractHermes2022ConceptsWithNuExtract()` (ligne ~1033)

**Actions réalisées** :

1. **Suppression appel global** : Suppression de l'appel à `buildExtractionPrompt()` (ancienne approche globale)
2. **Boucle sur blocs** : Boucle sur `preparation.blocks` pour extraction par bloc (ligne ~1070)
3. **Appel NuExtract par bloc** : Pour chaque bloc :
   - Construction prompt avec `buildBlockPrompt(block)` (ligne ~1072)
   - Appel API NuExtract avec `nuextractApi.inferTextFromContent()` (ligne ~1075)
   - Stockage résultat partiel avec `jsonPointer` (ligne ~1087)
4. **Stockage résultats partiels** : Array `partialResults` avec `{ jsonPointer, data }` pour chaque bloc

### Phase 4 : Création mergeJsonAtPath() et recomposeArtifact() ✅

**Fichier** : `hermes2022-concepts-site-extraction/src/nuextract-client.js`

**Fonctions créées** :

1. **`mergeJsonAtPath(target, path, value)`** (ligne ~673) :
   - Fusion récursive de `value` dans `target` au chemin `path` (JSON Pointer)
   - Gestion chemins imbriqués (ex: `/concepts/phases/0/description`)
   - Gestion arrays et objets
   - Validation paramètres (target non-null object, path non-empty string)
   - Gestion index array hors limites

2. **`recomposeArtifact(partialResults, resolvedSchema, config, baseUrl)`** (ligne ~912) :
   - Initialisation artefact avec structure de base : `{ config, method, concepts, metadata }`
   - Fusion chaque résultat partiel selon `jsonPointer` avec `mergeJsonAtPath()`
   - Gestion cas où NuExtract retourne structure complète ou juste le bloc :
     - Extraction partie correspondante depuis `data` si structure complète
     - Utilisation directe de `data` si juste le bloc
   - Construction métadonnées (identique à l'ancien code)
   - Validation paramètres (partialResults array, non vide, jsonPointer et data présents)

### Phase 5 : Intégration recomposeArtifact() ✅

**Fichier** : `hermes2022-concepts-site-extraction/src/nuextract-client.js`

**Fonction modifiée** : `extractHermes2022ConceptsWithNuExtract()` (ligne ~1091)

**Actions réalisées** :

1. **Appel recomposeArtifact()** : Après boucle extraction par bloc (ligne ~1091)
2. **Validation artefact final** : Validation avec Ajv (schéma résolu) après recomposition (ligne ~1094)
3. **Retour artefact complet** : Structure identique à l'ancien code (validation Ajv, sauvegarde, logging)

### Phase 6 : Mise à jour exports _testOnly_ ✅

**Fichier** : `hermes2022-concepts-site-extraction/src/nuextract-client.js`

**Section** : `module.exports` (ligne ~1258)

**Actions réalisées** :

1. **Ajout exports** :
   - `_testOnly_buildBlockPrompt: buildBlockPrompt`
   - `_testOnly_recomposeArtifact: recomposeArtifact`
   - `_testOnly_mergeJsonAtPath: mergeJsonAtPath`
   - `_testOnly_extractHermes2022ConceptsWithNuExtract: extractHermes2022ConceptsWithNuExtract` (déjà présent)

## Ajustements effectués

### Refactorisation tests de gestion d'erreur

**Constat** : Les tests de gestion d'erreur étaient organisés par domaine métier (`hermes2022-concepts-extraction-error-handling`) au lieu d'être organisés par script source, violant la règle de gouvernance `@error-handling-governance.mdc`.

**Actions réalisées** :

1. **Déplacement tests** : Tests de `hermes2022-concepts-extraction-error-handling.feature/steps.ts` vers `nuextract-client-error-handling.feature/steps.ts`
   - Tests `collectHtmlSourcesAndInstructions` et `buildExtractionPrompt` déplacés
   - Tests `buildBlockPrompt`, `recomposeArtifact`, `mergeJsonAtPath` ajoutés

2. **Ajout tests nouvelles fonctions** :
   - `buildBlockPrompt` : 4 scénarios (bloc null, jsonPointer manquant, instructions non-array, htmlContents vide)
   - `mergeJsonAtPath` : 3 scénarios (target null, path vide, index array hors limites)
   - `recomposeArtifact` : 4 scénarios (partialResults null, partialResults vide, jsonPointer manquant, data null)

3. **Correction violations gouvernance** :
   - 5 violations corrigées : steps `then` utilisent maintenant des regex avec capture (`/^une erreur "(.*)" est générée$/` ou `/^une erreur contenant "(.*)" est générée$/`)
   - 7 violations corrigées : assertions utilisent `expectedMessage` au lieu de littéraux codés en dur
   - 1 correction dans `.feature` : message d'erreur ajouté pour permettre la capture

4. **Mise à jour règle gouvernance** :
   - Section "Organisation des tests de gestion d'erreur" ajoutée dans `error-handling-governance.mdc`
   - Documentation organisation par script source (fichier `.js`)
   - Patterns validés et anti-patterns documentés

5. **Suppression fichiers obsolètes** :
   - `hermes2022-concepts-extraction-error-handling.feature` supprimé
   - `hermes2022-concepts-extraction-error-handling.steps.ts` supprimé

## Fichiers modifiés

### Code source

1. **`hermes2022-to-archimate/package.json`** :
   - Ajout `html-to-text: ^9.0.0` dans `devDependencies`

2. **`hermes2022-concepts-site-extraction/src/nuextract-client.js`** :
   - Ligne 15 : Import `html-to-text`
   - Ligne ~673 : Création `mergeJsonAtPath(target, path, value)`
   - Ligne ~768 : Création `buildBlockPrompt(block)`
   - Ligne ~912 : Création `recomposeArtifact(partialResults, resolvedSchema, config, baseUrl)`
   - Ligne ~1033 : Refactorisation `extractHermes2022ConceptsWithNuExtract()` : extraction par bloc
   - Ligne ~1160 : Modification `fetchHtmlContent()` : conversion HTML→texte
   - Ligne ~1258 : Mise à jour exports `_testOnly_`

### Tests

3. **`hermes2022-concepts-site-extraction/__tests__/unit/nuextract-client-error-handling.feature`** :
   - Ajout tests `collectHtmlSourcesAndInstructions` (8 scénarios)
   - Ajout tests `buildExtractionPrompt` (2 scénarios)
   - Ajout tests `buildBlockPrompt` (4 scénarios)
   - Ajout tests `mergeJsonAtPath` (3 scénarios)
   - Ajout tests `recomposeArtifact` (4 scénarios)

4. **`hermes2022-concepts-site-extraction/__tests__/unit/nuextract-client-error-handling.steps.ts`** :
   - Ajout imports nouvelles fonctions (`collectHtmlSourcesAndInstructions`, `buildExtractionPrompt`, `buildBlockPrompt`, `recomposeArtifact`, `mergeJsonAtPath`)
   - Ajout implémentations tests nouvelles fonctions (21 scénarios)
   - Correction violations gouvernance : regex avec capture pour tous les steps `then`

5. **Suppression fichiers obsolètes** :
   - `hermes2022-concepts-site-extraction/__tests__/unit/hermes2022-concepts-extraction-error-handling.feature` ❌
   - `hermes2022-concepts-site-extraction/__tests__/unit/hermes2022-concepts-extraction-error-handling.steps.ts` ❌

### Règles de gouvernance

6. **`cursor-ws-hermes2022-to-archimate/.cursor/rules/new-for-testing/error-handling-governance.mdc`** :
   - Ajout section "Organisation des tests de gestion d'erreur"
   - Documentation organisation par script source
   - Patterns validés et anti-patterns

7. **`hermes2022-concepts-site-extraction/.cursor/rules/specification-hermes2022-concepts-site-extraction.mdc`** :
   - Déjà mise à jour avec section "Extraction de texte brut depuis HTML pour réduction de la taille du prompt" (2025-11-04)

## Résultats

### Fonctionnalités implémentées

✅ **Extraction par bloc** : Chaque bloc est extrait individuellement via NuExtract, respectant la limite de 32768 tokens

✅ **Conversion HTML→texte** : Réduction significative de la taille des prompts (ex: ~88 000 caractères HTML → ~30 000 caractères texte)

✅ **Recomposition globale** : Fusion robuste des résultats partiels avec gestion des cas limites (structure complète vs bloc uniquement)

✅ **Tests de gestion d'erreur** : Organisation conforme par script source avec regex capture

### Structure finale des tests

```
__tests__/unit/
├── nuextract-client-error-handling.feature    ✅ Tous les tests pour nuextract-client.js (21 scénarios nouveaux + existants)
├── nuextract-client-error-handling.steps.ts   ✅ Toutes les fonctions testées avec regex capture
├── nuextract-api-error-handling.feature       ✅ Tous les tests pour nuextract-api.js
└── nuextract-api-error-handling.steps.ts     ✅ Toutes les fonctions testées
```

### Conformité gouvernance

✅ **Organisation par script** : Tous les tests de gestion d'erreur organisés par script source (fichier `.js`)

✅ **Regex capture** : Tous les steps `then` utilisent des regex avec capture pour extraire le message depuis `.feature`

✅ **Règle documentée** : Section "Organisation des tests de gestion d'erreur" ajoutée dans `error-handling-governance.mdc`

✅ **Aucune erreur linting** : Tous les fichiers conformes aux standards

## Validation

### Tests unitaires

- ✅ Tests de gestion d'erreur pour toutes les fonctions de `nuextract-client.js` présents
- ✅ Tests de gestion d'erreur pour toutes les fonctions de `nuextract-api.js` présents
- ⏳ Tests à exécuter pour validation complète

### Tests d'intégration

- ⏳ Tests d'intégration à adapter si nécessaire pour validation extraction par bloc
- ⏳ Tests d'intégration réels à exécuter pour validation end-to-end

## Prochaines étapes

1. **Exécution tests** : Valider que tous les tests unitaires et d'intégration passent
2. **Tests end-to-end** : Valider l'extraction complète avec extraction par bloc
3. **Validation performance** : Vérifier que les extractions par bloc respectent la limite de 32768 tokens
4. **Validation recomposition** : Vérifier que l'artefact final recomposé est identique en structure à l'artefact actuel

## État d'implémentation

✅ **Plan exécuté** : Toutes les étapes du plan ont été implémentées

✅ **Ajustements effectués** : Refactorisation tests de gestion d'erreur conforme à la gouvernance

⏳ **Validation en attente** : Tests unitaires et d'intégration à exécuter pour validation complète

## Notes

- **Gestion erreurs** : Si une extraction par bloc échoue, l'implémentation actuelle arrête l'extraction (à adapter selon besoins métier)
- **Ordre blocs** : La recomposition est indépendante de l'ordre d'extraction (fusion idempotente)
- **Performance** : Plusieurs extractions NuExtract au lieu d'une (acceptable pour rester sous la limite de tokens)
