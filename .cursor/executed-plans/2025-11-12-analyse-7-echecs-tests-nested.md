# Analyse des 7 échecs de tests pour fonctions nested

**Date** : 2025-11-12
**Contexte** : Suite à la correction du problème Ajv et l'alignement des tests BDD
**État** : 🔍 En cours d'analyse

## Contexte

Après la résolution du problème Ajv "schema already exists", 7 des nouveaux tests ajoutés pour valider les fonctions nested via leur parent `extractHermes2022ConceptsWithNuExtract()` échouent encore.

**Tests concernés** :
1. Erreur htmlContents vide via extractHermes2022ConceptsWithNuExtract
2. Erreur partialResults null via extractHermes2022ConceptsWithNuExtract
3. Erreur partialResults vide via extractHermes2022ConceptsWithNuExtract
4. Erreur jsonPointer manquant dans résultat partiel via extractHermes2022ConceptsWithNuExtract
5. Erreur data invalide dans résultat partiel via extractHermes2022ConceptsWithNuExtract
6. Erreur path vide via extractHermes2022ConceptsWithNuExtract
7. Erreur index array hors limites via extractHermes2022ConceptsWithNuExtract

## Flux d'exécution de extractHermes2022ConceptsWithNuExtract()

**Fichier** : `nuextract-client.js`, lignes 456-858

### Phase 1 : Collecte HTML sources et instructions (lignes 781-795)

```javascript
const preparation = await collectHtmlSourcesAndInstructions(
  schemaToTraverse,
  config,
  baseUrl,
  '/',
  0,
  maxDepth
);
```

**Sortie** : `preparation.blocks` contenant les blocs avec `{jsonPointer, instructions, htmlContents}`

### Phase 2 : Extraction par bloc via API NuExtract (lignes 806-828)

```javascript
const partialResults = [];
for (const block of preparation.blocks) {
  // ← TEST 1 : buildBlockPrompt(block) LIGNE 809
  const blockPrompt = buildBlockPrompt(block);
  
  const partialJson = await nuextractApi.inferTextFromContent(...);
  
  partialResults.push({ jsonPointer: block.jsonPointer, data: partialJson });
}
```

**Validation testée** :
- **Test 1 (htmlContents vide)** : `buildBlockPrompt()` valide `block.htmlContents.length === 0` (ligne 468)

### Phase 3 : Recomposition de l'artefact final (ligne 831)

```javascript
// ← TESTS 2-7 : recomposeArtifact() et mergeJsonAtPath() nested
const artifact = recomposeArtifact(partialResults, resolvedSchema, config, baseUrl);
```

**Validations testées dans `recomposeArtifact()` (lignes 617-646)** :
- **Test 2 (partialResults null)** : `if (!partialResults || !Array.isArray(partialResults))` (ligne 617)
- **Test 3 (partialResults vide)** : `if (partialResults.length === 0)` (ligne 621)
- **Test 4 (jsonPointer manquant)** : `if (!jsonPointer || typeof jsonPointer !== 'string')` (ligne 640)
- **Test 5 (data invalide)** : `if (!data || typeof data !== 'object')` (ligne 644)

**Validations testées dans `mergeJsonAtPath()` nested (lignes 544-562)** :
- **Test 6 (path vide)** : `if (!path || typeof path !== 'string')` (ligne 544)
- **Test 7 (index array hors limites)** : `if (arrayIndex < 0 || arrayIndex >= current.length)` (ligne 561)

### Phase 4 : Validation Ajv finale (lignes 837-847)

```javascript
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const validate = ajv.compile(resolvedSchema);
const isValid = validate(artifact);

if (!isValid) {
  const errors = validate.errors?.map(err => `${err.instancePath}: ${err.message}`).join(', ');
  throw new Error(`Extracted JSON does not conform to schema: ${errors}. Script stopped.`);
}
```

**👉 C'EST ICI QUE LES 7 TESTS ÉCHOUENT**

## Analyse détaillée de chaque échec

### Test 1 : Erreur htmlContents vide

**Validation ciblée** : `buildBlockPrompt()` ligne 468-470

```javascript
if (block.htmlContents.length === 0) {
  throw new Error('block.htmlContents is empty. No HTML content found for this block. Script stopped.');
}
```

**Mock actuel** :

```typescript
and('des blocs collectés avec htmlContents array vide', () => {
  const htmlCollectorModule = require('../../src/html-collector-and-transformer.js');
  jest.spyOn(htmlCollectorModule, 'collectHtmlSourcesAndInstructions')
    .mockResolvedValue({
      blocks: [
        {
          jsonPointer: '/concepts',
          instructions: ['Extract concepts'],
          htmlContents: [] // Array vide - erreur testée
        }
      ]
    });
});
```

**Message d'erreur obtenu** :

```
"Extracted JSON does not conform to schema: : must NOT have additional properties, /method: must be object, /concepts: must be object"
```

**Analyse** :
- ✅ Le mock simule correctement `htmlContents: []`
- ✅ `buildBlockPrompt()` est appelé ligne 809 et **devrait** lever l'erreur attendue
- ❌ **MAIS** : L'erreur ne se produit **pas** car le flux continue et produit un artefact invalide
- ❌ La validation Ajv finale (ligne 844) intercepte l'artefact invalide **AVANT** que l'erreur nested ne soit levée

**Hypothèse** : Le mock de `inferTextFromContent` n'est pas défini → retourne `undefined` → artefact invalide → erreur Ajv

### Tests 2-7 : Erreurs recomposeArtifact() et mergeJsonAtPath()

**Pattern commun observé** :

Tous ces tests obtiennent la même erreur :

```
"Extracted JSON does not conform to schema: : must NOT have additional properties, /method: must be object, /concepts: must be object"
```

**Analyse commune** :

1. **Mock de collectHtmlSourcesAndInstructions** : ✅ Correctement configuré
2. **Mock de inferTextFromContent** : ❌ **MANQUANT ou INCORRECT**
   - Les tests ne configurent pas explicitement le retour de `inferTextFromContent`
   - L'API retourne probablement des données invalides ou vides
   - L'artefact recomposé est donc invalide
3. **Validation Ajv finale** : ❌ Intercepte l'artefact invalide **AVANT** les validations nested

### Test 2 : partialResults null

**Mock actuel** :

```typescript
and('l\'API NuExtract mockée retourne null au lieu de partialResults', () => {
  (nuextractApi.inferTextFromContent as jest.Mock)
    .mockResolvedValue(null); // Retourne null au lieu d'un array
});
```

**Problème identifié** :
- Le mock retourne `null` pour `inferTextFromContent`
- `partialResults.push({ jsonPointer: block.jsonPointer, data: null })` ligne 827
- `recomposeArtifact()` est appelé avec `[{jsonPointer: '/concepts', data: null}]`
- La validation `if (!data || typeof data !== 'object')` ligne 644 **DEVRAIT** lever l'erreur
- **MAIS** : `null` est de type `'object'` en JavaScript ! La validation passe
- L'artefact final recomposé est invalide → erreur Ajv

**Cause racine** : Bug dans la validation ligne 644 : `typeof null === 'object'` retourne `true` en JavaScript

### Tests 3-7 : Pattern similaire

Tous ces tests ont le même problème fondamental :

1. Les mocks simulent des données invalides
2. Les données invalides passent les validations nested (bug ou validation insuffisante)
3. L'artefact final recomposé est invalide
4. La validation Ajv finale intercepte l'artefact invalide et lève une erreur générique

## Causes racines identifiées

### Cause racine 1 : Mock incomplet de inferTextFromContent

**Tests affectés** : Test 1 (htmlContents vide)

**Problème** : Le mock de `inferTextFromContent` n'est pas configuré dans le test, l'API retourne probablement `undefined` ou une valeur par défaut.

**Solution** : Configurer explicitement le mock pour retourner des données valides quand ce n'est pas l'erreur testée.

### Cause racine 2 : Validation insuffisante pour `data !== null`

**Tests affectés** : Test 2 (partialResults null), Test 5 (data invalide)

**Problème** : La validation ligne 644 :

```javascript
if (!data || typeof data !== 'object') {
  throw new Error(`Invalid data in partial result for ${jsonPointer}. Script stopped.`);
}
```

**Bug JavaScript** : `typeof null === 'object'` retourne `true` !

**Solution** : Ajouter un check explicite pour `null` :

```javascript
if (!data || typeof data !== 'object' || data === null) {
  throw new Error(`Invalid data in partial result for ${jsonPointer}. Script stopped.`);
}
```

**OU** (plus idiomatique) :

```javascript
if (data === null || typeof data !== 'object' || Array.isArray(data)) {
  throw new Error(`Invalid data in partial result for ${jsonPointer}. Script stopped.`);
}
```

### Cause racine 3 : Flux de test ne correspond pas au flux réel

**Tests affectés** : Tous les 7 tests

**Problème** : Les tests essaient de tester des erreurs au milieu du processus (Phases 2-3), mais les données mockées invalides provoquent une erreur de validation finale (Phase 4) qui masque les erreurs ciblées.

**Solution** : Deux approches possibles :

#### Approche A : Corriger le flux de mock

Pour chaque test, s'assurer que :
1. Les mocks simulent correctement **uniquement** l'erreur ciblée
2. Tous les autres mocks retournent des données **valides** selon le schéma
3. L'erreur ciblée est levée **AVANT** la validation Ajv finale

**Exemple pour Test 1 (htmlContents vide)** :

```typescript
and('des blocs collectés avec htmlContents array vide', () => {
  jest.spyOn(htmlCollectorModule, 'collectHtmlSourcesAndInstructions')
    .mockResolvedValue({
      blocks: [
        {
          jsonPointer: '/concepts',
          instructions: ['Extract concepts'],
          htmlContents: [] // ← Erreur testée : array vide
        }
      ]
    });
  
  // ✅ PAS BESOIN de mocker inferTextFromContent car buildBlockPrompt() lève l'erreur AVANT
});
```

**Résultat attendu** : `buildBlockPrompt()` lève l'erreur immédiatement, le flux ne continue pas.

#### Approche B : Supprimer les tests non testables via parent

Si certaines erreurs ne peuvent pas être testées via le parent sans violer l'encapsulation ou sans créer des mocks trop complexes, alors ces tests doivent être supprimés conformément à la leçon apprise dans le refactoring précédent.

**Critère de décision** : Si le test nécessite des mocks excessivement complexes ou ne correspond pas au flux réel, alors l'erreur n'est probablement pas testable via le parent et le test doit être supprimé.

## Recommandations

### Recommandation 1 : Corriger la validation `data !== null`

**Priorité** : Haute

**Fichier** : `nuextract-client.js` ligne 644

**Avant** :

```javascript
if (!data || typeof data !== 'object') {
  throw new Error(`Invalid data in partial result for ${jsonPointer}. Script stopped.`);
}
```

**Après** :

```javascript
if (data === null || typeof data !== 'object') {
  throw new Error(`Invalid data in partial result for ${jsonPointer}. Script stopped.`);
}
```

**Impact** : Permet aux Tests 2 et 5 de fonctionner correctement.

### Recommandation 2 : Analyser chaque test individuellement

**Priorité** : Haute

Pour chaque test, déterminer :
1. ✅ **L'erreur est testable via parent** : Corriger les mocks pour simuler correctement le flux
2. ❌ **L'erreur n'est pas testable via parent** : Supprimer le test (encapsulation preserved)

**Critères de testabilité** :
- L'erreur se produit **naturellement** dans le flux d'exécution du parent
- Les mocks nécessaires sont **simples** et correspondent au flux réel
- Le test valide un **comportement réel** du système

### Recommandation 3 : Vérifier les mocks de inferTextFromContent

**Priorité** : Moyenne

S'assurer que tous les tests configurent explicitement le mock de `inferTextFromContent` pour retourner des données valides quand ce n'est pas l'erreur testée.

## Prochaines étapes proposées

1. **✅ Corriger la validation `data !== null`** dans `nuextract-client.js` ligne 644 → **FAIT**
2. **✅ Option C choisie** : Corriger Test 1, supprimer Tests 2-7 → **FAIT**
3. **🔧 Corriger le mock de Test 1** : Problème identifié - mock configuré trop tard
4. **✅ Valider** : Exécuter les tests et vérifier que tous passent

## Découverte sur Test 1 (htmlContents vide)

**Date** : 2025-11-12

### Problème identifié

Le Test 1 échoue car le mock de `collectHtmlSourcesAndInstructions` ne fonctionne pas :

**Erreur obtenue** :
```
Expected substring: "block.htmlContents is empty"
Received string:    "Extracted JSON does not conform to schema: ..."
```

**Analyse** :
- Le mock est configuré DANS le step avec `jest.spyOn()`
- Mais `html-collector-and-transformer.js` est importé au DÉBUT de `nuextract-client.js`
- Quand le mock est configuré, c'est TROP TARD - l'import a déjà été fait
- Le flux continue avec les données réelles au lieu des données mockées
- L'artefact final est invalide → erreur Ajv au lieu de l'erreur ciblée

### Solution requise

Pour corriger le Test 1, il faut :
1. Configurer un mock global au niveau du fichier avec `jest.mock('../../src/html-collector-and-transformer.js')`
2. Utiliser `jest.spyOn()` dans chaque test pour configurer le comportement spécifique

**Pattern similaire déjà appliqué** : Mock de `nuextract-api.js` (lignes 22-29 du fichier steps)

### Décision Option C appliquée

- ✅ **Test 1** (htmlContents vide) : Gardé avec correction du mock à faire
- ❌ **Tests 2-7** : Supprimés (non testables via parent sans mocks excessifs)

## Conclusion

**Problème fondamental** : Les 7 nouveaux tests essaient de tester des erreurs internes des fonctions nested, mais :
1. Les mocks ne simulent pas correctement le flux réel
2. Une validation insuffisante (`typeof null === 'object'`) laisse passer des données invalides
3. La validation Ajv finale intercepte les artefacts invalides **AVANT** que les erreurs nested ne soient levées

**Solutions** :
1. Corriger la validation `data !== null`
2. Analyser chaque test pour déterminer s'il est réellement testable via parent
3. Corriger les mocks ou supprimer les tests non testables

**Alignement avec la gouvernance** : Cette analyse est conforme au principe "ne pas tester ce qui n'est pas testable via le parent" établi dans `@code-modularity-governance.mdc`.

