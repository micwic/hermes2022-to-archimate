# État d'avancement - Réflexion conception JSON centralisée

> Date : 2025-10-31
> Statut : Phase réflexion terminée, prêt pour implémentation

## Contexte

Réflexion sur une nouvelle conception pour centraliser dans le JSON :
- Les instructions d'extraction (actuellement dans fichiers Markdown `extraction-*.md`)
- Les URLs sources de données (actuellement en `enum` dans les schémas JSON)
- Les structures de données structurées (déjà dans les schémas JSON)

**Approche progressive** : Appliquer d'abord le principe sur la génération de template NuExtract (`instructions-template-nuextract.md`), puis généraliser aux autres éléments (phases, concepts, etc.)

## Compréhension finale du pattern `enum`

### Pattern `enum` avec array (plusieurs valeurs possibles simultanément) - AMÉLIORATION

**S'applique à** :
- `instructions` : Array avec enum (pile de textes libres possibles, paramètres)
- `sourceUrl` : Array avec enum (remplacement du pattern string - AMÉLIORATION, plusieurs URLs possibles simultanément)

**Structure** :
- **Dans le schéma JSON Schema** : `instructions.items.enum` ou `sourceUrl.items.enum` définit toutes les valeurs possibles (paramètres)
- **Dans les métadonnées JSON** : Array contenant les valeurs sélectionnées (conformes à l'enum du schéma)
- **Historisation** : Array avec valeurs effectivement utilisées enregistré (validé par l'enum du schéma utilisé à la création)

**Exemple schéma** :
```json
{
  "instructions": {
    "type": "array",
    "items": {
      "type": "string",
      "enum": [
        "- transformes le schéma JSON en template NuExtract",
        "- considères les énumérations JSON..."
      ]
    }
  },
  "sourceUrl": {
    "type": "array",
    "items": {
      "type": "string",
      "enum": ["https://www.hermes.admin.ch/en/concepts", "..."]
    }
  }
}
```

**Exemple métadonnées** :
```json
{
  "instructions": [
    "- transformes le schéma JSON en template NuExtract",
    "- considères les énumérations JSON..."
  ],
  "sourceUrl": ["https://www.hermes.admin.ch/en/concepts", "https://www.hermes.admin.ch/en/phases"]
}
```

### Paramètres liés à l'implémentation (hors schéma JSON)

**S'applique à** :
- `apiEndpoint` : Endpoints API NuExtract (restent dans `extraction-config.json`)
- `apiMode` : Mode API NuExtract (reste dans `extraction-config.json`)

**Justification SRP (Single Responsibility Principle)** :
- Les endpoints API NuExtract sont liés à l'implémentation technique NuExtract, pas à l'extraction conceptuelle
- Si on change d'outil d'extraction (pas NuExtract), les endpoints changent, mais l'extraction conceptuelle reste
- Configuration technique reste dans `extraction-config.json` (séparation des responsabilités)

**Élégance du pattern** : Les valeurs dans le JSON sont forcément conformes aux enums du schéma utilisé au moment de la création

## Documents créés

### 1. Analyse de l'existant (Terminé)
- **Fichier** : `01-analyse-existant-template.md`
- **Contenu** : Analyse complète de la structure actuelle (Markdown, schémas JSON, code, pattern `enum`)
- **Statut** : ✅ Terminé avec pattern `enum` finalisé

### 2. Documentation APIs NuExtract (Terminé)
- **Fichier** : `02-documentation-apis-nuextract-template.md`
- **Contenu** : Documentation `/api/infer-template` et `/api/infer-template-async` avec cas d'usage
- **Statut** : ✅ Terminé

### 3. Proposition structure JSON (Terminé)
- **Fichier** : `03-proposition-structure-json-template.md`
- **Contenu** : Structure proposée avec `extractionTemplateInstructions` dans schéma JSON
- **Pattern `enum`** : Array avec enum pour `instructions` et `apiEndpoint`, string avec enum pour `sourceUrl`, enum simple pour `apiMode`
- **Statut** : ✅ Terminé avec pattern `enum` finalisé

### 4. Extension schéma JSON Schema (Terminé)
- **Fichier** : `04-extension-schema-json-schema-template.md`
- **Contenu** : Schéma JSON Schema Draft-07 pour validation métadonnées `extractionTemplateInstructions`
- **Statut** : ✅ Terminé avec pattern `enum` finalisé

### 5. Impact sur le code (Terminé)
- **Fichier** : `05-impact-code-template.md`
- **Contenu** : Analyse impact sur `nuextract-client.js` avec changements proposés
- **Statut** : ✅ Terminé

### 6. Analyse SWOT (Terminé)
- **Fichier** : `06-analyse-swot-template.md`
- **Contenu** : Analyse forces/faiblesses/opportunités/menaces avec recommandation de procéder
- **Statut** : ✅ Terminé

### 7. Plan de migration (Terminé)
- **Fichier** : `07-plan-migration-template.md`
- **Contenu** : Plan de migration en 6 phases avec rétrocompatibilité assurée
- **Statut** : ✅ Terminé

## Structure finale validée

### Schéma JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "extractionTemplateInstructions": {
    "type": "object",
    "properties": {
      "description": {
        "type": "string",
        "maxLength": 500
      },
      "instructions": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": [
            "- transformes le schéma JSON en template NuExtract",
            "- considères les énumérations JSON..."
          ]
        }
      }
    },
    "required": ["instructions"]
  }
}
```

### Métadonnées JSON (valeurs conformes à l'enum du schéma)

```json
{
  "extractionTemplateInstructions": {
    "description": "Instructions pour génération de template NuExtract",
    "instructions": [
      "- transformes le schéma JSON en template NuExtract",
      "- considères les énumérations JSON..."
    ]
  }
}
```

### Configuration technique (extraction-config.json)

```json
{
  "nuextract": {
    "infer-templatePath": "/api/infer-template",
    "infer-templateAsyncPath": "/api/infer-template-async",
    "templateMode": "sync"
  }
}
```

## Points clés retenus

1. **Pattern `enum` avec array** : S'applique uniquement à `instructions` et `sourceUrl` (remplacement du pattern string pour `sourceUrl` - AMÉLIORATION)
2. **Paramètres implémentation** : `apiEndpoint` et `apiMode` restent dans `extraction-config.json` (SRP - séparation responsabilités)
3. **Élégance** : Les valeurs dans le JSON sont forcément conformes aux enums du schéma utilisé au moment de la création
4. **Historisation** : Les valeurs effectivement utilisées sont enregistrées et validées par l'enum du schéma utilisé à la création
5. **SRP** : Configuration technique NuExtract séparée de l'extraction conceptuelle (schéma JSON)

## Prochaines étapes (pour reprise demain)

### Phase 1.1 : Préparation infrastructure

1. **Créer schéma `extraction-template-instructions.json`** :
   - Fichier : `shared/hermes2022-extraction-files/config/json-schemas/extraction-template-instructions.json`
   - Structure : Schéma JSON Schema Draft-07 avec `instructions` (array avec enum uniquement)
   - **Note** : `apiEndpoint` et `apiMode` restent dans `extraction-config.json` (SRP)

2. **Ajouter `extractionTemplateInstructions` dans `hermes2022-concepts.json`** :
   - Fichier : `shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json`
   - Ajouter propriété `extractionTemplateInstructions` en dehors de `properties` (métadonnées)
   - Structure : `instructions` (array avec enum uniquement)
   - **Note** : Pas de `apiEndpoint` ni `apiMode` (restent dans `extraction-config.json`)

3. **Migrer instructions Markdown → JSON** :
   - Source : `hermes2022-concepts-site-extraction/config/instructions-template-nuextract.md`
   - Cible : Valeurs dans `instructions.items.enum` du schéma JSON Schema
   - Format : Chaque instruction comme valeur dans l'enum

### Phase 1.2 : Adaptation code

4. **Modifier `loadInstructions()` dans `nuextract-client.js`** :
   - Ajouter paramètre `resolvedSchema`
   - Priorité : Extraire depuis `resolvedSchema.extractionTemplateInstructions.instructions` (array)
   - Fallback : Fichier Markdown si instructions absentes du schéma

5. **Modifier `loadAndResolveSchemas()` dans `nuextract-client.js`** :
   - Ajouter paramètre optionnel `returnObject` (défaut `false`)
   - Retourner objet résolu si `returnObject === true` (pour accès métadonnées)
   - Retourner string si `returnObject === false` (compatibilité)

6. **Adapter `generateTemplate()` dans `nuextract-client.js`** :
   - Charger schéma résolu comme objet (`returnObject = true`)
   - Extraire instructions depuis array `resolvedSchema.extractionTemplateInstructions.instructions`
   - Joindre les valeurs de l'array avec `\n` pour concaténation
   - **Note** : Mode/endpoint depuis `extraction-config.json` uniquement (pas depuis métadonnées)

7. **Ajouter validation métadonnées** :
   - Fonction `validateExtractionTemplateInstructions(resolvedSchema)`
   - Utiliser schéma `extraction-template-instructions.json`
   - Intégrer dans `loadAndResolveSchemas()`

### Phase 1.3 : Tests et validation

8. **Adapter tests BDD** :
   - Valider nouveau chemin (instructions depuis schéma résolu)
   - Valider fallback Markdown si métadonnées absentes
   - Valider extraction depuis array `instructions`
   - Valider concaténation des instructions

9. **Tests validation métadonnées** :
   - Test instructions valides (array avec valeurs dans enum)
   - Test instructions invalides (valeurs hors enum)
   - Test métadonnées absentes (fallback Markdown)

## Fichiers à modifier lors de l'implémentation

1. **Schémas JSON** :
   - `shared/hermes2022-extraction-files/config/json-schemas/extraction-template-instructions.json` (créer)
   - `shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json` (modifier)

2. **Code source** :
   - `hermes2022-concepts-site-extraction/src/nuextract-client.js` (modifier `loadInstructions()`, `loadAndResolveSchemas()`, `generateTemplate()`)

3. **Tests BDD** :
   - `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system/template-generation.steps.ts` (adapter)
   - `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system-mocked/template-generation-mocked.steps.ts` (adapter)

## Notes importantes

- **Rétrocompatibilité** : Maintenir fallback Markdown pendant transition (support hybride)
- **Pattern `enum` avec array** : S'applique uniquement à `instructions` et `sourceUrl` (remplacement du pattern string pour `sourceUrl` - AMÉLIORATION)
- **SRP** : `apiEndpoint` et `apiMode` restent dans `extraction-config.json` (configuration technique NuExtract séparée de l'extraction conceptuelle)
- **Historisation** : Arrays avec valeurs effectivement utilisées enregistrés (validés par enum du schéma utilisé à la création)

## État final

✅ **Phase réflexion terminée** : Tous les documents de réflexion sont créés et validés

🔄 **Prêt pour implémentation** : Tous les éléments nécessaires sont documentés pour démarrer Phase 1.1 demain matin

