# 2025-11-16 : Refactoring tests d'intégration mockés - État d'avancement

## Contexte

Refactoring des tests d'intégration mockés (`extract-hermes2022-concepts-mocked`) pour s'adapter à la nouvelle architecture multi-LLM orchestrée par blocs.

## Travail accompli

### ✅ Infrastructure de mock créée

1. **Abandon de MSW** : Incompatibilité avec Jest (modules ESM) → Solution alternative adoptée
2. **Mock `https.request` direct** : Création de `__tests__/support/mocks/https-mock-helper.js`
   - Mock centralisé pour `nuextract.ai`, `api.anthropic.com`, et `hermes.admin.ch`
   - Scénarios conditionnels : `success`, `error500`, `dataNull`, `networkError`, `error429`
   - Simulation séquentielle des 4 blocs extraits (/config, /method, /concepts, /concepts/concept-phases)

3. **Fichiers mis à jour** :
   - `extract-hermes2022-concepts-mocked.feature` : Steps Gherkin corrigés (sans "que")
   - `extract-hermes2022-concepts-mocked.steps.ts` : Utilisation du helper de mock
   - `jest.config.js` : Configuration nettoyée (pas de transformIgnorePatterns MSW)

### ✅ Tests exécutables

- **5/5 scénarios s'exécutent** (plus d'erreurs de parsing ou de syntaxe)
- Les mocks sont appliqués correctement

## Problèmes identifiés

### ❌ Tous les tests échouent (5 failed)

**Erreur principale** : `artifact.concepts.concept-phases.phases is not iterable`

**Cause racine** : Les données mockées ne correspondent pas exactement aux attentes de l'orchestrateur pour la recomposition de l'artefact final.

**Détails techniques** :
- Le mock retourne 4 blocs de données séquentiellement (via compteur `extractCallCount`)
- L'orchestrateur recompose l'artefact avec `recomposeArtifact()` selon les JSON Pointers
- Le post-traitement essaie d'itérer sur `artifact.concepts['concept-phases'].phases` (ligne 648 orchestrator)
- Cette structure n'est pas correctement créée par la recomposition

**Tests échouant** :
1. ✗ Extraction complète réussie : `artifact.concepts.concept-phases.phases is not iterable`
2. ✗ Erreur collecte HTML : Expected "Network error", Received "Error loading HTML..."
3. ✗ Erreur extraction bloc : Expected "API error: 500", Received "artifact.concepts.concept-phases.phases is not iterable"
4. ✗ Erreur recomposition : Expected "Invalid data in partial result", Received "artifact.concepts.concept-phases.phases is not iterable"
5. ✗ Erreur Claude (future) : Expected "Rate limit exceeded", Received "artifact.concepts.concept-phases.phases is not iterable"

## Solutions à implémenter

### 1. Corriger les données mockées pour chaque bloc

**Problème** : Le mock retourne des données brutes qui ne correspondent pas à ce que l'orchestrateur attend après recomposition.

**Solution** : Analyser précisément comment `recomposeArtifact()` utilise les JSON Pointers et ajuster les données mockées pour chaque bloc :

```javascript
// Bloc 1 : /config → artifact.config
{ extractionSource: { baseUrl: '...', language: 'en' } }

// Bloc 2 : /method → artifact.method
{ hermesVersion: '2022', publicationDate: '2023-04-01' }

// Bloc 3 : /concepts → artifact.concepts
{ overview: 'HERMES is...' }

// Bloc 4 : /concepts/concept-phases → artifact.concepts['concept-phases']
{ 
  overview: 'HERMES phases...',
  phases: [
    { id: 'ph_init001', name: 'Initiation', order: 1, context: '...' },
    ...
  ]
}
```

**Vérification nécessaire** : Lire le code de `recomposeArtifact()` pour comprendre exactement comment il place les données selon le JSON Pointer.

### 2. Corriger la propagation des erreurs réseau

**Problème** : L'erreur réseau mockée (`Network error: ECONNREFUSED`) est encapsulée par l'orchestrateur en "Error loading HTML from...".

**Solution** : Soit :
- Ajuster le mock pour que l'erreur finale contienne "Network error"
- Ajuster les assertions pour accepter "Error loading HTML" comme valide (car c'est le comportement réel)

### 3. Corriger les scénarios d'erreur (error500, dataNull)

**Problème** : Les erreurs devraient survenir PENDANT l'extraction d'un bloc, pas APRÈS la recomposition au post-traitement.

**Solution** : S'assurer que :
- Le scénario `error500` génère une erreur HTTP 500 DÈS le premier appel `/extract`
- Le scénario `dataNull` retourne `null` DÈS le premier appel `/extract`
- Ces erreurs doivent être capturées AVANT d'arriver au post-traitement

## Prochaines étapes prioritaires

1. **[URGENT]** Lire et comprendre `recomposeArtifact()` dans l'orchestrateur
2. **[URGENT]** Ajuster les données mockées pour correspondre à la structure attendue
3. **[MOYEN]** Corriger la propagation d'erreur réseau ou ajuster les assertions
4. **[MOYEN]** S'assurer que les scénarios d'erreur échouent au bon moment (pendant extraction, pas après)

## État final

**Couverture** : 0/5 tests passent (mais tous s'exécutent)

**Blocking issue** : Données mockées incompatibles avec la recomposition de l'artefact

**Temps estimé** : 2-3h pour corriger complètement (analyse `recomposeArtifact` + ajustement mocks + validation)

## Références

- Code orchestrateur : `src/concepts-site-extraction-orchestrator.js` (lignes 640-656 pour post-traitement)
- Helper de mock : `__tests__/support/mocks/https-mock-helper.js`
- Feature file : `__tests__/integration/with-external-system-mocked/extract-hermes2022-concepts-mocked.feature`
- Step definitions : `__tests__/integration/with-external-system-mocked/extract-hermes2022-concepts-mocked.steps.ts`

