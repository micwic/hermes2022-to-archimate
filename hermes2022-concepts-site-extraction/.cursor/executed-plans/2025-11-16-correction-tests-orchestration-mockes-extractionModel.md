# Correction tests d'orchestration mockés - Propriété paramétrique extractionModel

**Date** : 2025-11-16  
**Contexte** : Refactoring tests intégration mockés après architecture multi-LLM par blocs  
**Fichiers principaux** :
- `__tests__/integration/with-external-system-mocked/extract-hermes2022-concepts-mocked.steps.ts`
- `__tests__/support/mocks/https-mock-helper.js`
- `src/concepts-site-extraction-orchestrator.js`
- `shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json`

## Problème initial

Les tests d'orchestration mockés (`extract-hermes2022-concepts-mocked`) échouaient avec une erreur de validation Ajv :

```
Extracted JSON does not conform to schema: 
/method: must have required property 'extractionModel'
/concepts: must have required property 'extractionModel'
/concepts/concept-phases: must have required property 'extractionModel'
/concepts/concept-phases/phases/0-5: must have required property 'extractionModel'
```

**Cause racine** : La propriété `extractionModel` est une **propriété paramétrique** (comme `sourceUrl` et `extractionInstructions`) qui doit être ajoutée par le script via `normalizeEnumValues()`, mais cette fonction ne gérait que les propriétés de type `array` avec `items.enum`, pas les propriétés de type `string` avec `enum` direct.

## Analyse effectuée

### 1. Structure du schéma JSON pour `extractionModel`

```json
"extractionModel": {
  "type": "string",
  "enum": ["nuextract", "claude"],
  "default": "nuextract",
  "description": "Modèle LLM à utiliser pour l'extraction de ce bloc"
}
```

**Différence avec `sourceUrl`** :
- `sourceUrl` : `type: "array"` avec `items.enum: [...]`
- `extractionModel` : `type: "string"` avec `enum: [...]` + `default`

### 2. Fonction `normalizeEnumValues()` existante

La fonction ne gérait que 3 cas :
1. ❌ ~~String avec enum + default~~ (MANQUANT)
2. ✅ Array avec items.enum (sourceUrl, extractionInstructions)
3. ✅ Objet imbriqué (récursion)
4. ✅ Array d'objets (phases)

## Solutions appliquées

### Correction 1 : Ajout du cas `string` avec `enum` dans `normalizeEnumValues()`

**Fichier** : `src/concepts-site-extraction-orchestrator.js`

**Avant** :
```javascript
// Cas 1 : Array avec items.enum (sourceUrl, extractionInstructions)
if (schemaProp.type === 'array' && schemaProp.items?.enum && Array.isArray(schemaProp.items.enum)) {
  const expectedArray = schemaProp.items.enum;
  console.log(`[debug] Normalisation items.enum pour ${currentPointer} : forcer ${JSON.stringify(expectedArray)}`);
  artifact[key] = expectedArray;
}
```

**Après** :
```javascript
// Cas 1 : String avec enum + default (extractionModel)
if (schemaProp.type === 'string' && schemaProp.enum && schemaProp.default) {
  const expectedValue = schemaProp.default;
  console.log(`[debug] Normalisation enum pour ${currentPointer} : forcer "${expectedValue}"`);
  artifact[key] = expectedValue;
}
// Cas 2 : Array avec items.enum (sourceUrl, extractionInstructions)
else if (schemaProp.type === 'array' && schemaProp.items?.enum && Array.isArray(schemaProp.items.enum)) {
  const expectedArray = schemaProp.items.enum;
  console.log(`[debug] Normalisation items.enum pour ${currentPointer} : forcer ${JSON.stringify(expectedArray)}`);
  artifact[key] = expectedArray;
}
```

**Validation des logs** :
```
[debug] Normalisation enum pour /method/extractionModel : forcer "nuextract"
[debug] Normalisation enum pour /concepts/extractionModel : forcer "nuextract"
[debug] Normalisation enum pour /concepts/concept-phases/extractionModel : forcer "nuextract"
[debug] Normalisation enum pour /concepts/concept-phases/phases/0/extractionModel : forcer "nuextract"
...
```

### Correction 2 : Suppression de `extractionModel` des données mockées

**Fichier** : `__tests__/support/mocks/https-mock-helper.js`

**Raison** : Les données mockées ne doivent PAS inclure `extractionModel` car cette propriété est ajoutée par le script (`normalizeEnumValues()`), pas par l'extraction LLM.

**Avant** :
```javascript
const mockDataByBlock = {
  '/config': {
    extractionSource: { ... },
    extractionModel: 'nuextract'  // ❌ À SUPPRIMER
  },
  '/method': {
    hermesVersion: '2022',
    extractionModel: 'nuextract'  // ❌ À SUPPRIMER
  }
};
```

**Après** :
```javascript
const mockDataByBlock = {
  '/config': {
    extractionSource: { ... }
    // extractionModel sera ajouté par normalizeEnumValues()
  },
  '/method': {
    hermesVersion: '2022'
    // extractionModel sera ajouté par normalizeEnumValues()
  }
};
```

### Correction 3 : Appel de `saveArtifact()` dans les tests

**Fichier** : `extract-hermes2022-concepts-mocked.steps.ts`

**Problème** : Le test validait `result.artifactPath` et `result.approvalPath`, mais `extractHermes2022Concepts()` retourne l'artefact JSON, pas un objet avec ces propriétés.

**Solution** :
```javascript
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
```

**Import ajouté** :
```javascript
import { 
  loadGlobalConfig,
  loadAndResolveSchemas,
  loadApiKeys,
  initializeLLMProjects,
  extractHermes2022Concepts,
  saveArtifact  // ✅ AJOUTÉ
} from '@src/concepts-site-extraction-orchestrator.js';
```

### Correction 4 : Fichier d'approbation `approvals` vs `items`

**Problème** : Le test cherchait `approval.items` mais le fichier d'approbation utilise `approval.approvals`.

**Code saveArtifact (ligne 716-726)** :
```javascript
const approvalPayload = {
  artifact: artifactFileName,
  approvals: [  // ← Nom de la propriété
    {
      target: '/concepts/overview',
      rule: 'overview-quality',
      status: 'pending',
      lastChecked: extractionDate
    }
  ]
};
```

**Correction dans le test** :
```javascript
// Avant
const overviewItem = approval.items.find(...);

// Après
const overviewItem = approval.approvals.find(...);
```

### Correction 5 : Messages d'erreur dans les assertions

**Test 1 : Erreur collecte HTML**
```javascript
// Accepter message wrappé
const hasNetworkError = error.message.includes('Network error') || 
                        error.message.includes('Error loading HTML');
expect(hasNetworkError).toBe(true);
```

**Test 2 : Erreur HTTP 500**
```javascript
// Vérifier code HTTP plutôt que message exact
expect(error.message).toContain('500');
```

### Correction 6 : Mock `dataNull` pour recomposition

**Problème** : Le mock retournait `null` directement, causant une erreur de parsing JSON.

**Solution** : Retourner un JSON valide avec `result: null` :
```javascript
else if (scenario === 'dataNull') {
  // Retourner un JSON valide avec result: null pour simuler data null
  responseData = { result: null };
}
```

### Correction 7 : Test Claude skippé

**Raison** : Claude n'est pas encore implémenté, le test est tagué `@future` dans le `.feature`.

**Solution** :
```javascript
test.skip('Erreur lors de l\'extraction avec Claude ...', ({ given, and, when, then }) => {
  // Test skippé en attendant l'implémentation de Claude
});
```

## Résultats obtenus

### Tests passants

```
✓ Extraction complète réussie avec workflow par blocs (112 ms)
✓ Erreur lors de la collecte HTML (fetch hermes.admin.ch échoue) (29 ms)
✓ Erreur lors de l'extraction d'un bloc (nuextract.ai retourne erreur HTTP 500) (36 ms)
✓ Erreur lors de la recomposition (nuextract.ai retourne data null) (40 ms)

Test Suites: 1 passed, 1 total
Tests:       1 skipped, 4 passed, 5 total
Snapshots:   0 total
Time:        3.217 s
```

**Exit code** : 0 ✅

### Propriétés paramétriques normalisées

Les 3 propriétés paramétriques sont maintenant correctement gérées par `normalizeEnumValues()` :

1. ✅ **`extractionModel`** : `type: "string"`, `enum: ["nuextract", "claude"]`, `default: "nuextract"`
2. ✅ **`sourceUrl`** : `type: "array"`, `items.enum: [...]`
3. ✅ **`extractionInstructions`** : `type: "array"`, `items.enum: [...]`

## Leçons apprises

### 1. Propriétés paramétriques : Uniformité de traitement

**Constat** : Les propriétés paramétriques peuvent avoir des structures JSON Schema différentes :
- Type `array` avec `items.enum`
- Type `string` avec `enum` direct + `default`

**Bonne pratique** : La fonction `normalizeEnumValues()` doit gérer tous les patterns de propriétés paramétriques rencontrés dans les schémas.

### 2. Séparation responsabilités mocks vs script

**Principe établi** :
- **Mocks** : Retournent uniquement les données extraites par le LLM
- **Script** : Ajoute les propriétés paramétriques via `normalizeEnumValues()`

**Application** : Ne jamais inclure `extractionModel`, `sourceUrl` ou `extractionInstructions` dans les données mockées.

### 3. Validation des logs de debug

**Méthode efficace** : Utiliser les logs de debug pour confirmer que les propriétés sont bien normalisées :
```bash
npm test -- --testPathPatterns="extract-hermes2022-concepts-mocked" 2>&1 | grep "Normalisation.*extractionModel"
```

Cette approche permet de vérifier rapidement si la normalisation fonctionne avant même de regarder les erreurs Ajv.

### 4. Structure des tests d'orchestration

**Pattern validé** :
```javascript
when('on exécute l\'orchestrateur', async () => {
  try {
    const artifact = await extractHermes2022Concepts(...);
    result = await saveArtifact(config, artifact);  // ✅ IMPORTANT
  } catch (e) {
    error = e;
  }
});
```

**Raison** : Les tests doivent valider le workflow complet incluant la sauvegarde de l'artefact et la création du fichier d'approbation.

### 5. Gestion des tests futurs avec `test.skip()`

**Approche** : Pour les fonctionnalités non encore implémentées (Claude), utiliser `test.skip()` au lieu de supprimer le test.

**Avantages** :
- Le test reste documenté dans le code
- Facile à réactiver lors de l'implémentation
- Aligné avec le tag `@future` dans le `.feature`

## Fichiers modifiés

1. ✅ `src/concepts-site-extraction-orchestrator.js` (normalizeEnumValues)
2. ✅ `__tests__/support/mocks/https-mock-helper.js` (suppression extractionModel, correction dataNull)
3. ✅ `__tests__/integration/with-external-system-mocked/extract-hermes2022-concepts-mocked.steps.ts` (saveArtifact, assertions)

## Prochaines étapes

- ✅ Tests d'orchestration mockés : **COMPLÉTÉS**
- ⏭️ Tests d'orchestration réels (`with-external-system/extract-hermes2022-concepts.feature`)
- ⏭️ Tests E2E (`hermes2022-concepts-workflow.feature`)
- ⏭️ Implémentation Claude LLM et réactivation du test skippé

