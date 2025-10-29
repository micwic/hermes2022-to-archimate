<!-- Plan exécuté le 2025-10-29 -->
# Refactorisation des tests unitaires de gestion d'erreur par module

## 1. Renommer les fichiers existants (nuextract-client)

**Fichiers à renommer dans `__tests__/unit/`** :

- `error-handling.feature` → `nuextract-client-error-handling.feature`
- `error-handling.steps.ts` → `nuextract-client-error-handling.steps.ts`

**Ajustement dans `nuextract-client-error-handling.steps.ts`** :

- Ligne 33 : Modifier `const feature = loadFeature(__dirname + '/error-handling.feature');`
- En : `const feature = loadFeature(__dirname + '/nuextract-client-error-handling.feature');`

## 2. Créer les nouveaux fichiers de tests pour nuextract-api

**Créer `__tests__/unit/nuextract-api-error-handling.feature`** :

- Structure : `# language: fr` + `Fonctionnalité: Gestion d'erreur robuste du module nuextract-api`
- 16 scénarios couvrant les 7 fonctions API :
  - inferTemplateFromDescription : 4 scénarios (réseau, timeout, HTTP non-200, JSON invalide)
  - inferTemplateFromDescriptionAsync : 3 scénarios (réseau, timeout, HTTP non-200)
  - getJobStatus : 3 scénarios (réseau, timeout, JSON invalide)
  - pollJobUntilComplete : 3 scénarios (outputData manquant, job failed, timeout polling)
  - getNuExtractProjects : 2 scénarios (réseau, timeout)
  - createNuExtractProject : 1 scénario (réseau)

**Créer `__tests__/unit/nuextract-api-error-handling.steps.ts`** :

- Imports : https, EventEmitter, fonctions de nuextract-api.js
- Variables mocks : `let originalHttpsRequest: typeof https.request;`
- Hooks beforeEach/afterEach pour isolation (sauvegarder/restaurer https.request)
- 16 test definitions avec mocking EventEmitter pour simuler requêtes HTTP

## 3. Mettre à jour la spécification des tests

**Fichier `__tests__/.cursor/rules/specification-hermes2022-concepts-site-extraction-tests.mdc`** :

**Modifications dans "Structure de répertoire"** (lignes 67-68) :

| `/nuextract-client-error-handling.feature` | Feature Gherkin | Scénarios gestion d'erreur nuextract-client (unit/) |
| `/nuextract-client-error-handling.steps.ts` | Step definitions | Implémentation steps nuextract-client (unit/) |
| `/nuextract-api-error-handling.feature` | Feature Gherkin | Scénarios gestion d'erreur nuextract-api (unit/) |
| `/nuextract-api-error-handling.steps.ts` | Step definitions | Implémentation steps nuextract-api (unit/) |

**Ajouter nouvelle section après "Tests de validation loadInstructions"** :

### Tests de validation nuextract-api (module nuextract-api.js)

#### Description détaillée

[2025-10-29] Les tests unitaires du module `nuextract-api.js` valident la gestion d'erreur robuste des 7 fonctions d'appel HTTP vers l'API NuExtract avec simulation des cas d'erreur réseau, timeout, codes HTTP non-200, et JSON invalide.

#### Justification

- Couche critique : Module API/I/O isolant tous les appels HTTP externes
- Gestion d'erreur stricte : Conformité @error-handling-governance avec Error Cause
- Testabilité améliorée : Mocking du module https pour simuler tous les cas d'erreur
- Couverture exhaustive : Tous les chemins d'erreur de chaque fonction testés

#### Patterns validés

- Mock https.request : Simulation EventEmitter pour req et res
- Error Cause préservée : Validation que error.cause contient l'erreur originale
- Messages explicites : Conformité messages d'erreur avec code nuextract-api.js

#### État d'implémentation

✅ [Fonctionnalité réalisée - 2025-10-29] - 16 scénarios BDD dans nuextract-api-error-handling.feature

**Mettre à jour la ligne 212** :

- De : `✅ [Fonctionnalité réalisée - 2025-10-29] - 3 scénarios BDD dans error-handling.feature`
- En : `✅ [Fonctionnalité réalisée - 2025-10-29] - 3 scénarios BDD dans nuextract-client-error-handling.feature`

**Mettre à jour les exemples de structure (lignes 380-381)** :

```text
├── unit/
│   ├── nuextract-client-error-handling.feature
│   ├── nuextract-client-error-handling.steps.ts
│   ├── nuextract-api-error-handling.feature
│   └── nuextract-api-error-handling.steps.ts
```

**Mettre à jour exemple imports (ligne 396)** :

- De : `// Dans __tests__/unit/error-handling.steps.ts`
- En : `// Dans __tests__/unit/nuextract-client-error-handling.steps.ts`

## 4. Validation finale

Vérifier que tous les tests passent :

```bash
npm run test:unit
```

## Résultat de l'exécution

✅ **Plan exécuté avec succès le 2025-10-29**

- ✅ Étape 1 : Fichiers renommés avec succès
- ✅ Étape 2 : Nouveaux fichiers créés (16 scénarios BDD pour nuextract-api)
- ✅ Étape 3 : Spécification mise à jour
- ✅ Étape 4 : 41 tests unitaires passent avec succès

**Fichiers créés/modifiés** :
- `__tests__/unit/nuextract-client-error-handling.feature` (renommé)
- `__tests__/unit/nuextract-client-error-handling.steps.ts` (renommé + ajusté)
- `__tests__/unit/nuextract-api-error-handling.feature` (nouveau)
- `__tests__/unit/nuextract-api-error-handling.steps.ts` (nouveau)
- `__tests__/.cursor/rules/specification-hermes2022-concepts-site-extraction-tests.mdc` (mis à jour)

**Tests** : 41 tests passent (17 tests nuextract-client + 16 tests nuextract-api + 8 autres)

