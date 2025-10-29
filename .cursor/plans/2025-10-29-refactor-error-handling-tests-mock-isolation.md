# Plan : Refactor error-handling tests avec isolation mocks

**Date** : 2025-10-29  
**Statut** : ✅ Complété et commité

## Objectif

Réorganiser les tests unitaires error-handling avec isolation complète des mocks selon les bonnes pratiques Jest/BDD.

## Étapes exécutées

### 1. ✅ Implémenter beforeEach/afterEach global
- Hooks au niveau du fichier error-handling.steps.ts
- Sauvegarde des fonctions originales avant chaque test
- Restauration après chaque test

### 2. ✅ Retirer le cleanup manuel dans chaque test
- Suppression des déclarations locales `originalReadFileSync`
- Suppression des restaurations manuelles `fs.readFileSync = originalReadFileSync`
- Suppression des `jest.clearAllMocks()` dans les steps individuels

### 3. ✅ Utiliser la configuration réelle pour tests non-erreur
- Principe appliqué : mocker uniquement ce qui est testé pour erreur
- Utiliser comportements réels (config, API) pour tout le reste
- Validation réaliste (15 clés minimum dans config)

### 4. ✅ Retester pour validation
- Tests exécutés : 21/22 passent (95.5%)
- Test non validé exclu : conforme aux attentes

### 5. ✅ Créer test-mock-governance.mdc
- Fichier : `.cursor/rules/new-for-testing/test-mock-governance.mdc`
- Contenu : Hooks obligatoires, mocking ciblé, patterns validés
- Références : @bdd-governance, @test-exports-governance, @code-modularity-governance

### 6. ✅ Vérifier cohérence règles de gouvernance
- Vérification références croisées : ✅ Cohérentes
- Pas de duplication : ✅ Périmètres distincts
- Patterns alignés : ✅ Terminologie cohérente

### 7. ✅ Commit état final
- **Commit 1 (hermes2022-to-archimate)** : Tests refactorés (9 fichiers, +800/-218)
- **Commit 2 (cursor-ws)** : Règle test-mock-governance.mdc (+192 lignes)

## Résultats

### Tests
- **21/22 tests passent** (95.5%)
- Isolation complète entre tests garantie
- Pas d'effets de bord

### Documentation
- Nouvelle règle : `test-mock-governance.mdc`
- Mise à jour : `cursor-rules-governance.mdc` (section spécifications tests)
- Nouvelle spec : `specification-hermes2022-concepts-site-extraction-tests.mdc`

### Patterns appliqués

**Hooks global** :
```typescript
beforeEach(() => {
  originalReadFileSync = fs.readFileSync;
  jest.clearAllMocks();
});

afterEach(() => {
  fs.readFileSync = originalReadFileSync;
  jest.restoreAllMocks();
});
```

**Mock module API** :
```typescript
jest.mock('../../src/nuextract-api.js', () => {
  const actual = jest.requireActual('../../src/nuextract-api.js');
  return {
    ...actual,
    inferTemplateAsync: jest.fn(actual.inferTemplateAsync)
  };
});
```

## Références

- @test-mock-governance
- @bdd-governance
- @test-exports-governance
- @code-modularity-governance

