# Plan : Tests BDD pour loadInstructions avec gestion d'erreur robuste

**Date** : 2025-10-29
**Statut** : ✅ Complété

## Contexte

Ajout de tests BDD pour la fonction `loadInstructions()` dans `nuextract-client.js` avec gestion d'erreur robuste selon @error-handling-governance. La fonction charge les instructions de transformation NuExtract depuis un fichier Markdown en extrayant uniquement le contenu sous un heading spécifique.

## Objectifs

1. Ajouter des scénarios BDD pour valider les 3 étapes de traitement de `loadInstructions()`
2. Refactoriser `loadInstructions()` pour lever des erreurs explicites au lieu de retourner une chaîne vide
3. Valider la conformité avec @error-handling-governance (messages explicites, Error Cause, terminaison "Script stopped")
4. Maintenir la cohérence avec les tests existants (mocking, isolation, cleanup)

## Changements implémentés

### 1. Refactorisation de `loadInstructions()` dans `nuextract-client.js`

**Avant** :
- Retournait `''` en cas d'erreur
- Pas de validation de contenu vide après extraction

**Après** :
- **Étape 1** : Lecture du fichier - Lance `Error` avec `cause` en cas d'ENOENT
- **Étape 2** : Recherche du heading - Lance `Error` si heading absent
- **Étape 3** : Validation du contenu - Lance `Error` si contenu vide après extraction
- Fonction devenue `async` pour cohérence avec autres fonctions de chargement
- Messages d'erreur conformes : `"Instructions file not found. Script stopped."`, `"Instructions heading not found in file. Script stopped."`, `"Instructions content is empty after extraction. Script stopped."`

### 2. Ajout de 3 scénarios BDD dans `error-handling.feature`

```gherkin
Scénario: Erreur fichier instructions manquant
  Etant donné un fichier d'instructions inexistant
  Quand on tente de charger les instructions
  Alors une erreur "Instructions file not found" est générée
  Et le processus s'arrête proprement

Scénario: Erreur heading absent dans le fichier d'instructions
  Etant donné un fichier d'instructions sans le heading requis
  Quand on tente de charger les instructions
  Alors une erreur "Instructions heading not found in file" est générée
  Et le processus s'arrête proprement

Scénario: Erreur contenu vide après extraction du heading
  Etant donné un fichier d'instructions avec heading mais contenu vide
  Quand on tente de charger les instructions
  Alors une erreur "Instructions content is empty after extraction" est générée
  Et le processus s'arrête proprement
```

### 3. Implémentation des steps dans `error-handling.steps.ts`

- Import de `_testOnly_loadInstructions`
- 3 tests avec mocking de `fs.readFileSync` :
  - **Test 1** : Simulation ENOENT avec `err.code = 'ENOENT'`
  - **Test 2** : Simulation fichier sans heading requis
  - **Test 3** : Simulation fichier avec heading mais uniquement lignes vides
- Assertions conformes aux patterns existants (`.toContain()`, validation `error.cause`)
- Cleanup systématique dans step réutilisable "le processus s'arrête proprement"

### 4. Mise à jour de la spécification

Section ajoutée dans `specification-hermes2022-concepts-site-extraction-tests.mdc` :
- Description succincte (3 étapes de traitement)
- Justification (criticité des instructions, détection précoce, exhaustivité)
- Patterns validés (mocking fs.readFileSync, Error Cause, messages explicites)
- Anti-patterns (validation laxiste)
- État d'implémentation : ✅ Fonctionnalité réalisée

## Validation

### Tests exécutés

```bash
npm test -- --testPathPattern=error-handling
```

**Résultat** : ✅ 14/14 tests passent

- 4 scénarios loadGlobalConfig ✅
- 4 scénarios loadApiKey ✅
- **3 scénarios loadInstructions ✅** (nouveaux)
- 3 scénarios loadAndResolveSchemas ✅

### Conformité aux règles

- ✅ @error-handling-governance : Messages explicites, Error Cause, "Script stopped."
- ✅ @test-mock-governance : Hooks beforeEach/afterEach, isolation des tests
- ✅ @test-exports-governance : Import `_testOnly_loadInstructions`
- ✅ @bdd-governance : Cycle Rouge → Vert (tests écrits avant refactorisation)

## Fichiers modifiés

1. `hermes2022-concepts-site-extraction/src/nuextract-client.js`
   - Refactorisation `loadInstructions()` : fonction async, gestion d'erreur robuste
   - Mise à jour appel dans `generateTemplate()` : `await loadInstructions(config)`

2. `hermes2022-concepts-site-extraction/__tests__/unit/error-handling.feature`
   - Ajout 3 scénarios loadInstructions (lignes 78-103)

3. `hermes2022-concepts-site-extraction/__tests__/unit/error-handling.steps.ts`
   - Import `_testOnly_loadInstructions`
   - Ajout 3 tests avec mocking fs.readFileSync

4. `hermes2022-concepts-site-extraction/__tests__/.cursor/rules/specification-hermes2022-concepts-site-extraction-tests.mdc`
   - Ajout section "Tests de validation loadInstructions"

## Ajustements post-exécution

### Clarification du principe de non-redondance BDD

Suite à remarque utilisateur sur redondance entre spécifications générales et détaillées :

1. **Ajout dans `bdd-governance.mdc`** :
   - Section "Principe : Spécifications générales vs spécifications détaillées"
   - Règle de non-redondance : spécifications générales succinctes, .feature/.steps.ts exhaustifs

2. **Simplification dans `specification-hermes2022-concepts-site-extraction-tests.mdc`** :
   - Section loadInstructions réduite de ~70 lignes à ~20 lignes
   - Suppression des exemples de code détaillés (déjà dans .steps.ts)
   - Suppression des scénarios détaillés (déjà dans .feature)
   - Conservation uniquement : description succincte, justification, patterns, anti-patterns

## Leçons apprises

1. **Instructions critiques** : Les instructions de transformation NuExtract sont essentielles pour gérer correctement les énumérations JSON Schema, justifiant une gestion d'erreur stricte
2. **Validation en 3 étapes** : Séparer lecture fichier, recherche heading, validation contenu pour messages d'erreur précis
3. **Spécifications succinctes** : Les spécifications générales documentent les décisions, les fichiers BDD contiennent les détails exécutables

## Prochaines étapes potentielles

- [ ] Ajouter tests d'intégration pour vérifier que les instructions sont effectivement utilisées par l'API NuExtract
- [ ] Valider le format du heading avec une constante partagée entre code et tests
- [ ] Envisager extraction du heading dans configuration pour flexibilité

