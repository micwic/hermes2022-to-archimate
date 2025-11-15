# Plan exécuté : Application de la gouvernance BDD aux tests de succès

**Date** : 2025-11-15  
**Contexte** : Refactoring des tests de succès selon la gouvernance BDD mise à jour

## Objectif

Appliquer les règles de gouvernance BDD définies dans `@bdd-governance.mdc` aux tests de succès existants, en clarifiant la distinction entre tests unitaires, tests d'intégration mockés et tests d'intégration réels.

## Problème identifié

Les tests de succès de l'orchestrateur étaient trop complexes car ils mockaient les **API** (niveau trop bas) au lieu des **clients** (niveau approprié pour un test unitaire de l'orchestrateur).

## Solution implémentée

### 1. Clarification architecturale : Mocker au bon niveau

**Question clé de l'utilisateur** : "Nous n'avons pas encore implémenté claude-client.js avec sa logique que nous ne connaissons pas encore, comment se fait-il que cela soit complexe en l'état. Les tests devraient se contenter de tester le résultat retourné par claude non ?"

**Réponse** : Vous aviez absolument raison ! Dans un test **unitaire** de l'orchestrateur, nous devons mocker les **clients** (niveau supérieur), pas les **API** (niveau inférieur).

**Changement de mocking** :

```typescript
// ❌ AVANT : Mock des API (trop bas pour l'orchestrateur)
jest.mock('../../src/nuextract-api.js');
jest.mock('../../src/claude-api.js');
const nuextractApi = require('../../src/nuextract-api.js');
const claudeApi = require('../../src/claude-api.js');
const inferTextMock = nuextractApi.inferTextFromContent as jest.Mock;
const inferTextClaudeMock = claudeApi.inferText as jest.Mock;

// ✅ APRÈS : Mock des CLIENTS (niveau approprié)
jest.mock('../../src/nuextract-client.js');
jest.mock('../../src/claude-client.js');
const nuextractClient = require('../../src/nuextract-client.js');
const claudeClient = require('../../src/claude-client.js');
const extractSingleBlockMock = nuextractClient._testOnly_extractSingleBlock as jest.Mock;
const extractBlockClaudeMock = claudeClient.extractBlock as jest.Mock;
```

**Justification** :
- L'orchestrateur **délègue** aux clients (niveau d'abstraction supérieur)
- Les clients retournent des résultats **simples** : `{ jsonPointer, data }`
- Le test unitaire valide l'**orchestration**, pas l'extraction elle-même

### 2. Correction de `recomposeArtifact()` : Accepter les primitives

**Problème** : La validation dans `recomposeArtifact()` rejetait les **primitives** (string, number, boolean) alors que le schéma JSON attend que `/concepts/overview` soit une **string**.

**Code avant** :

```javascript
// Ligne 519-521 dans concepts-site-extraction-orchestrator.js
if (data === null || typeof data !== 'object') {
  throw new Error(`Invalid data in partial result for ${jsonPointer}. Script stopped.`);
}
```

**Code après** :

```javascript
// Accepter objets ET primitives (string, number, boolean) pour les feuilles du schéma
if (data === null || data === undefined) {
  throw new Error(`Invalid data in partial result for ${jsonPointer}. Script stopped.`);
}
```

**Justification** : Les feuilles du schéma JSON peuvent être des types primitifs (ex: `/concepts/overview` est une `string`), pas uniquement des objets.

### 3. Simplification des mocks clients

**Mock simplifié** :

```typescript
extractBlockClaudeMock.mockImplementation(async (block, config, apiKey) => {
  if (block.jsonPointer === '/method') {
    return {
      jsonPointer: '/method',
      data: { hermesVersion: '2022' }
    };
  }
  if (block.jsonPointer === '/concepts/overview') {
    return {
      jsonPointer: '/concepts/overview',
      data: overviewText // String directe (primitive) pour feuille du schéma
    };
  }
  throw new Error(`Bloc Claude inattendu: ${block.jsonPointer}`);
});
```

**Caractéristiques** :
- Retourne directement le **résultat attendu**
- Pas besoin de simuler les API internes (HTTP, parsing JSON)
- Le test valide l'**orchestration** (collecte, délégation, recomposition)

### 4. Correction du scope des variables de test

**Problème** : `overviewText` était déclaré avec `const` dans `given()`, donc inaccessible dans `then()`.

**Solution** :

```typescript
test('Extraction réussie avec agrégation des blocs', ({ given, when, then, and }) => {
  let overviewText; // ✅ Déclarer dans le scope du test
  
  given('des blocs collectés pour l\'extraction', () => {
    overviewText = 'Synthèse méthodologique '.repeat(40); // Assignation sans const
    // ...
  });
  
  then('un artefact est reconstruit avec succès', () => {
    expect(extractionResult.concepts.overview).toBe(overviewText); // ✅ Accessible
  });
});
```

## Résultats

✅ **Tous les tests de succès passent** :

```
Test Suites: 2 passed, 2 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        1.204 s
```

### Tests unitaires de succès (`unit/`)

- ✅ `nuextract-client-success` : 5 tests passent (vides pour l'instant, à compléter)
- ✅ `concepts-site-extraction-orchestrator-success` : 1 test passe
  - Scénario : "Extraction réussie avec agrégation des blocs"
  - Mock : `nuextract-client.extractSingleBlock()`, `claude-client.extractBlock()`, `collectHtmlSourcesAndInstructions()`
  - Validation : Artefact reconstruit avec `/method` et `/concepts/overview`

### Tests d'intégration mockés (`integration/with-external-system-mocked/`)

- ✅ Tests existants conservés et cohérents avec la nouvelle gouvernance

## Leçons apprises

### 1. Mocker au bon niveau d'abstraction

**Principe** : Dans un test **unitaire**, mocker les **dépendances directes** (clients), pas les dépendances indirectes (API).

**Analogie** :
- **Orchestrateur** → Mock **clients** (niveau N-1)
- **Client** → Mock **API** (niveau N-1)
- **API** → Mock **https.request** (niveau N-1)

### 2. Validation des données selon le schéma JSON

**Principe** : La validation doit accepter tous les types JSON valides (objects, arrays, strings, numbers, booleans, null).

**Erreur fréquente** : Valider uniquement `typeof data === 'object'` → rejette les primitives légitimes.

### 3. Scope des variables dans les tests BDD

**Bonne pratique** : Déclarer les variables partagées au niveau du `test()`, pas dans les `given()` individuels.

```typescript
test('...', ({ given, when, then }) => {
  let sharedVar; // ✅ Accessible dans tous les steps
  
  given('...', () => { sharedVar = 'value'; });
  then('...', () => { expect(sharedVar).toBe('value'); });
});
```

## Documentation mise à jour

- ✅ `@bdd-governance.mdc` : Section "Tests unitaires vs Tests d'intégration" clarifiée avec exemples génériques
- ✅ TODOs complétés : `refactor-success-tests`, `orchestrator-unit-success`, `fix-recompose-primitives`

## Prochaines étapes

1. Compléter `nuextract-client-success.feature` et `.steps.ts` avec scénarios pour :
   - `findOrCreateProject()` (création, connexion existant)
   - `generateTemplateForBlock()` (succès avec différents types de schémas)
   - `extractSingleBlock()` (extraction réussie avec différents modèles de templates)

2. Implémenter les tests d'intégration mockés pour le workflow complet de l'orchestrateur

3. Vérifier la cohérence avec les tests d'intégration réels (`with-external-system/`)

## Références

- `@bdd-governance.mdc` : Gouvernance BDD générale (cycle Rouge→Vert→Refactor, organisation des tests)
- `@code-modularity-governance.mdc` : Principes SOLID et nested functions
- `.cursor/executed-plans/2025-11-15-refactoring-bdd-phase1-loadandresolveschemas.md` : Phase 1 du refactoring BDD

