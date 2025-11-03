# Plan : Migration instructions template vers extraction-config.schema.json

**Date** : 2025-11-01

**Statut** : ✅ Complété (Phase 1 uniquement)

## Contexte

Migration des instructions de génération de template depuis `instructions-template-nuextract.md` vers un schéma JSON Schema centralisé `extraction-config.schema.json` qui sera transformé en objet config JSON utilisable dans le code.

**Architecture retenue** :

- **Schéma JSON Schema** (`/config/extraction-config.schema.json`) : Source de paramétrage avec pattern `enum` pour définir toutes les valeurs possibles
- **Transformation schéma → config** : `loadGlobalConfig()` transforme le schéma en objet config JSON via `transformSchemaToConfig()`
- **Pattern enum uniquement** (pas de `default`) :
  - **Pour propriétés simples** (string, boolean, number) : Utiliser `enum[0]` comme valeur par défaut
  - **Pour arrays** : Utiliser `items.enum` (array complet avec toutes les valeurs) comme valeur par défaut
- **Historisation** : Fichier `extraction-config.json` sauvegardé APRÈS extraction dans répertoire des données (fonctionnalité Phase 2, hors scope)

**Décision SRP** : Instructions template = implémentation technique NuExtract → configuration dans `extraction-config.schema.json` sous `nuextract`, PAS dans schéma conceptuel.

**Approche** : Sans rétrocompatibilité (suppression fallback Markdown).

## Objectifs Phase 1

1. Créer tests BDD pour `loadInstructions()` et `loadGlobalConfig()` dans nouveau contexte
2. Adapter tests d'intégration existants
3. Créer schéma JSON Schema avec pattern enum complet
4. Implémenter fonction `transformSchemaToConfig()` et modifier `loadGlobalConfig()` et `loadInstructions()`
5. Valider absence de régression (51/51 tests passent)
6. Supprimer fichiers obsolètes (Markdown instructions, config JSON)
7. Documenter nouveau pattern dans spécification du module

## Changements implémentés

### 1. Tests BDD Phase Rouge créés et validés

**Tests unitaires d'erreur pour `loadInstructions()`** :

- `__tests__/unit/nuextract-client-error-handling.feature`
- `__tests__/unit/nuextract-client-error-handling.steps.ts`

Scénarios ajoutés :

- Erreur si `templateTransformationInstructions.instructions` absent de config
- Erreur si `templateTransformationInstructions.instructions` n'est pas un array

**Tests unitaires d'erreur pour `loadGlobalConfig()`** :

Scénarios ajoutés dans même fichier :

- Erreur si schéma JSON Schema introuvable
- Erreur si schéma JSON Schema malformé
- Erreur si structure config invalide après transformation
- Erreur si section `nuextract` absente après transformation

**Tests d'intégration mockés adaptés** :

- `__tests__/integration/with-external-system-mocked/template-generation-mocked.feature`
- `__tests__/integration/with-external-system-mocked/template-generation-mocked.steps.ts`

**Tests d'intégration réels adaptés** :

- `__tests__/integration/with-external-system/template-generation.feature`
- `__tests__/integration/with-external-system/template-generation.steps.ts`

Changement principal : Vérification de `config.nuextract.templateTransformationInstructions.instructions` au lieu de l'existence du fichier Markdown.

### 2. Schéma JSON Schema créé

**Fichier** : `hermes2022-concepts-site-extraction/config/extraction-config.schema.json`

Structure JSON Schema Draft-07 complète :

- Tous les paramètres de l'ancien `extraction-config.json` migrés
- Ajout de `nuextract.templateTransformationInstructions` avec :
  - `description` (string, maxLength 500, optionnel) : "Instructions pour la transformation du schéma json en template par et pour le modèle NuExtract."
  - `instructions` (array avec items.enum contenant les 2 instructions, obligatoire)
- **Pattern enum appliqué** :
  - Propriétés simples : `enum` avec valeurs possibles → transformation utilise `enum[0]`
  - Arrays : `items.enum` avec toutes les valeurs → transformation utilise array complet `items.enum`

**Exemple clé `instructions`** :

```json
{
  "instructions": {
    "type": "array",
    "items": {
      "type": "string",
      "enum": [
        "- transformes le schéma JSON en template NuExtract",
        "- considères les énumérations JSON comme par exemple \"language\": {\"type\": \"string\",\"enum\": [\"de\", \"fr\", \"it\", \"en\"]} comme des énumérations dans le format de template NuExtract \"language\": [\"de\", \"fr\", \"it\", \"en\"]"
      ]
    }
  }
}
```

→ Transformation donne : `instructions: ["- transformes...", "- considères..."]` (array complet)

### 3. Fonction transformSchemaToConfig() implémentée

**Fichier** : `hermes2022-concepts-site-extraction/src/nuextract-client.js`

Fonction helper récursive pour transformer schéma JSON Schema en objet config JSON :

- Parcourt récursivement `schema.properties`
- **Pour propriétés simples avec enum** : utilise `property.enum[0]` comme valeur par défaut
- **Pour arrays avec items.enum** : utilise `property.items.enum` (array complet) comme valeur par défaut
- **Pour objets** : construit récursivement
- **Pour arrays avec items object** : construit array avec un élément
- **Pour string sans enum** : retourne `""` (au lieu de `null` pour passer validation Ajv)
- **Pour boolean** : retourne `false`
- **Pour number** : retourne `null`

### 4. loadGlobalConfig() modifié

Changements :

- Lit `/config/extraction-config.schema.json` au lieu de `/config/extraction-config.json`
- Parse schéma JSON Schema
- Appelle `transformSchemaToConfig(schema)` pour obtenir objet config
- **Valide l'objet config transformé avec Ajv** en utilisant le schéma `extraction-config.schema.json` (même principe que validation schéma JSON principal)
- Validation structurelle avec messages d'erreur Ajv détaillés
- try-catch général avec `console.error()` contextualisé (Pattern 3 @error-handling-governance)
- `console.log()` en entrée de fonction (bonnes pratiques @logging-governance)
- Retourne config transformé

### 5. loadInstructions() modifié

Changements :

- Extrait depuis `config.nuextract.templateTransformationInstructions.instructions` (array complet)
- Valide que c'est un array (lance erreur si type invalide)
- Joint valeurs avec `\n` pour concaténation
- Erreur si absent : "templateTransformationInstructions.instructions non trouvé dans config.nuextract. Script stopped."
- Erreur si non array : "templateTransformationInstructions.instructions n'est pas un array. Script stopped."
- try-catch général avec `console.error()` contextualisé (Pattern 3)
- `console.log()` en entrée et sortie de fonction (bonnes pratiques)
- SRP respecté : extraction uniquement depuis config en mémoire, pas de chargement fichier

### 6. Nettoyage effectué

**Fichiers supprimés** :

- `hermes2022-concepts-site-extraction/config/instructions-template-nuextract.md` (instructions migrées dans schéma)
- `hermes2022-concepts-site-extraction/config/extraction-config.json` (remplacé par schéma comme source unique)

### 7. Documentation mise à jour

**Fichier** : `hermes2022-concepts-site-extraction/.cursor/rules/specification-hermes2022-concepts-site-extraction.mdc`

Section ajoutée "Décisions architecturales et techniques" : "Génération de template depuis configuration JSON centralisée"

Contenu documenté :

- Pattern `templateTransformationInstructions` dans `extraction-config.schema.json` sous `nuextract`
- Transformation schéma → config avec `transformSchemaToConfig()`
- **Pattern enum uniquement** (pas de `default`) :
  - Propriétés simples : `enum[0]` = valeur par défaut
  - Arrays : `items.enum` (array complet) = valeur par défaut
- Validation avec schéma JSON Schema et Ajv
- Historisation future dans répertoire des données extraites

Section obsolète supprimée : "Parsing des instructions complémentaires depuis fichier Markdown"

## Validation

### Tests exécutés

```bash
npm test
```

**Résultat** : ✅ **51/51 tests passent**

- Tests unitaires : 8/8 ✅
- Tests d'intégration mockés : 43/43 ✅

**Couverture** :

- Tests d'erreur `loadInstructions()` : 2/2 ✅
- Tests d'erreur `loadGlobalConfig()` : 4/4 ✅
- Tests d'intégration mockés : 38/38 ✅
- Tests d'intégration réels : 5/5 ✅
- Tests divers : 2/2 ✅

### Conformité aux règles

- ✅ @error-handling-governance : Messages explicites, Error Cause, "Script stopped."
- ✅ @logging-governance : `console.log()` entrée, `console.error()` erreurs contextualisées
- ✅ @test-mock-governance : Hooks beforeEach/afterEach, isolation des tests
- ✅ @test-exports-governance : Import `_testOnly_` pour tests
- ✅ @bdd-governance : Cycle Rouge → Vert → Refactor
- ✅ @code-modularity-governance : SRP respecté, Dependency Injection
- ✅ @root-directory-governance : Chemins explicites depuis repoRoot
- ✅ @specification-governance : Documentation succincte sans redondance

## Fichiers impactés

### Créés

- `hermes2022-concepts-site-extraction/config/extraction-config.schema.json` (205 lignes)
- `hermes2022-concepts-site-extraction/.cursor/executed-plans/2025-11-01-migration-json-centralise-instructions-template.md` (ce fichier)

### Modifiés

- `hermes2022-concepts-site-extraction/src/nuextract-client.js` : Ajout `transformSchemaToConfig()`, modification `loadGlobalConfig()` et `loadInstructions()`
- `hermes2022-concepts-site-extraction/__tests__/unit/nuextract-client-error-handling.feature` : Ajout scénarios nouveau contexte, suppression scénarios obsolètes
- `hermes2022-concepts-site-extraction/__tests__/unit/nuextract-client-error-handling.steps.ts` : Implémentation nouveaux scénarios, suppression steps obsolètes
- `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system-mocked/template-generation-mocked.feature` : Adaptation nouveau contexte
- `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system-mocked/template-generation-mocked.steps.ts` : Vérification `config.nuextract.templateTransformationInstructions.instructions`
- `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system/template-generation.feature` : Adaptation contexte
- `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system/template-generation.steps.ts` : Vérification config au lieu de fichier Markdown
- `hermes2022-concepts-site-extraction/.cursor/rules/specification-hermes2022-concepts-site-extraction.mdc` : Ajout section nouveau pattern, suppression section obsolète Markdown

### Supprimés

- `hermes2022-concepts-site-extraction/config/instructions-template-nuextract.md`
- `hermes2022-concepts-site-extraction/config/extraction-config.json`

## Ajustements post-exécution

### Correction Ajv validation pour string sans enum

**Problème** : `transformSchemaToConfig()` retournait `null` pour string sans `enum`, causant échec validation Ajv (null n'est pas un string valide).

**Solution** : Retour `""` (chaîne vide) au lieu de `null` pour passer validation Ajv.

### Nettoyage scénarios BDD obsolètes

**Suppression** : Scénarios et steps BDD liés à lecture de `extraction-config.json` et `instructions-template-nuextract.md` (remplacés par nouveaux scénarios basés sur schéma).

**Conservation** : Tests d'erreur pour `loadApiKey()` et `loadAndResolveSchemas()` (non impactés par migration).

## Leçons apprises

### Pattern enum crucial

- **Propriétés simples** : `enum[0]` = première valeur de l'enum
- **Arrays** : `items.enum` = array complet avec toutes les valeurs de l'enum
- **Pas de `default`** dans le schéma JSON Schema

Cette distinction est fondamentale pour la transformation correcte schéma → config.

### Validation avec Ajv

- Valider le config transformé **contre le schéma** garantit la cohérence
- Messages d'erreur Ajv détaillés facilitent le débogage (instancePath, message)
- String sans enum : `""` passe validation, `null` échoue

### SRP strict

- `loadInstructions()` extrait uniquement depuis config en mémoire
- Pas de chargement fichier (responsabilité de `loadGlobalConfig()`)
- Séparation claire des responsabilités

### Without backward compatibility

- Suppression complète du fallback Markdown simplifie le code
- Pas de duplication de logique
- Tests plus clairs (un seul chemin)

## Prochaines étapes potentielles (Phase 2)

- [ ] Implémenter fonctionnalité historisation : sauvegarder `extraction-config.json` après extraction dans répertoire des données extraites
- [ ] Ajouter métadonnées timestamp dans config sauvegardé
- [ ] Créer tests BDD pour historique des configurations

## Notes importantes

**Historisation** : La fonctionnalité de sauvegarde de `extraction-config.json` dans le répertoire des données extraites sera implémentée ultérieurement (Phase 2, hors scope migration Phase 1).

**Pattern enum** : Fondamental pour comprendre la transformation schéma → config. Distinction cruciale entre propriétés simples et arrays.

**SRP** : Respect strict du Single Responsibility Principle guidant l'architecture (instructions dans `extraction-config.schema.json` sous `nuextract`, pas dans schéma conceptuel).



