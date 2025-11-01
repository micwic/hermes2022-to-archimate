# Extension schéma JSON Schema - Template

> Date : 2025-10-31
> Phase : 1 - Template uniquement

## ⚠️ Document obsolète

**Ce document est obsolète**. Il décrit une approche initiale qui a été abandonnée.

**Décision finale** (selon SRP) :
- Les instructions de génération de template sont dans `extraction-config.schema.json` sous `nuextract` (configuration technique NuExtract), **PAS** dans `hermes2022-concepts.json` (schéma conceptuel)
- Voir documents `01-analyse-existant-template.md`, `03-proposition-structure-json-template.md`, et `05-impact-code-template.md` pour la décision finale

## Objectif (OBSOLÈTE)

Définir le schéma JSON Schema Draft-07 pour validation des métadonnées `extractionTemplateInstructions` dans les schémas JSON.

**Note** : Cette approche a été abandonnée au profit de `templateTransformationInstructions` dans `extraction-config.schema.json` sous `nuextract` selon SRP.

## Schéma JSON Schema proposé

### Structure métadonnées `extractionTemplateInstructions`

**Schéma JSON Schema Draft-07** :

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/micwic/hermes2022-to-archimate/shared/hermes2022-extraction-files/config/json-schemas/extraction-template-instructions.json",
  "title": "Extraction Template Instructions Schema",
  "description": "Schéma de validation pour les métadonnées d'instructions de génération de template NuExtract",
  "type": "object",
  "properties": {
    "description": {
      "type": "string",
      "maxLength": 500,
      "description": "Description humaine des instructions de génération de template"
    },
    "instructions": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "- transformes le schéma JSON en template NuExtract",
          "- considères les énumérations JSON comme par exemple \"language\": {\"type\": \"string\",\"enum\": [\"de\", \"fr\", \"it\", \"en\"]} comme des énumérations dans le format de template NuExtract \"language\": [\"de\", \"fr\", \"it\", \"en\"]"
        ]
      },
      "description": "Array d'instructions sélectionnées (valeurs conformes à l'enum du schéma, pile de textes libres possibles)"
    }
  },
  "required": ["instructions"],
  "additionalProperties": false
}
```

## Utilisation dans schémas JSON

### Position dans schéma JSON

**Règle** : `extractionTemplateInstructions` en dehors de `properties` (métadonnées, pas partie schéma de données).

**Structure schéma JSON** :
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "...",
  "title": "...",
  "description": "...",
  "extractionTemplateInstructions": {
    // Métadonnées d'extraction (hors properties)
  },
  "type": "object",
  "properties": {
    // Structure de données validable
  },
  "required": [...],
  "additionalProperties": false
}
```

### Validation métadonnées

**Validation séparée** :
- Validation schéma JSON : Ignore `extractionTemplateInstructions` (hors `properties`)
- Validation métadonnées : Utilise schéma `extraction-template-instructions.json` séparément
- Validation données : Utilise schéma principal (sans métadonnées)

**Code validation proposé** :
```javascript
// 1. Validation schéma JSON (sans métadonnées)
const schemaValidator = ajv.compile(mainSchemaWithoutMetadata);

// 2. Validation métadonnées (séparée)
const metadataSchema = require('./extraction-template-instructions.json');
const metadataValidator = ajv.compile(metadataSchema);
const metadataValid = metadataValidator(schema.extractionTemplateInstructions);
```

## Propriétés détaillées

### `description` (optionnel)

**Type** : `string`

**Contraintes** :
- MaxLength : 500 caractères
- Texte libre pour description humaine

**Usage** :
- Documentation pour humains
- Pas envoyé à l'API NuExtract
- Optionnel (peut être omis)

### `instructions` (obligatoire)

**Type** : `array` de `string`

**Contraintes** :
- Items : `string` avec `enum` (pile de textes libres possibles, paramètres)
- Chaque valeur de l'enum : Texte libre pour instructions opérationnelles
- Supporte newlines (`\n`) pour formatage multi-lignes (dans string JSON)
- MinLength par instruction : 50 caractères recommandé

**Usage** :
- **Dans le schéma JSON Schema** : `items.enum` définit toutes les instructions possibles (pile de textes libres, paramètres)
- **Dans les métadonnées JSON** : Array contenant les instructions sélectionnées (valeurs conformes à l'enum du schéma)
- **Historisation** : Array avec valeurs effectivement utilisées enregistré (validé par l'enum du schéma utilisé à la création)
- Instructions combinées et envoyées à l'API NuExtract avec schéma JSON dans champ `description`
- Format : Texte libre dans enum (IA interprète naturellement)

**Pattern `enum` appliqué (pour `instructions` et `sourceUrl` uniquement)** :
- **Pour `instructions` (array avec enum)** :
  - Array avec enum dans schéma → Array avec valeurs dans JSON (conformes à enum) → Historisation array avec valeurs utilisées
- **Pour `sourceUrl` (array avec enum - AMÉLIORATION)** :
  - Array avec enum dans schéma → Array avec valeurs dans JSON (conformes à enum) → Historisation array avec valeurs utilisées
  - **Remplacement du pattern string** : `sourceUrl` passe de string avec enum → array avec enum (AMÉLIORATION pour permettre plusieurs URLs)
- **Élégance** : Les valeurs dans le JSON sont forcément conformes aux enums du schéma utilisé au moment de la création
- **Pattern array avec enum** : S'applique uniquement à `instructions` et `sourceUrl` (plusieurs valeurs possibles simultanément)
- **Paramètres implémentation (hors schéma)** : `apiEndpoint` et `apiMode` restent dans `extraction-config.json` (SRP - configuration technique NuExtract séparée de l'extraction conceptuelle)

**Exemple schéma** :
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

**Exemple valeurs métadonnées** :
```json
{
  "instructions": [
    "- transformes le schéma JSON en template NuExtract",
    "- considères les énumérations JSON comme par exemple \"language\": {\"type\": \"string\",\"enum\": [\"de\", \"fr\", \"it\", \"en\"]} comme des énumérations dans le format de template NuExtract \"language\": [\"de\", \"fr\", \"it\", \"en\"]"
  ]
}
```

### Paramètres liés à l'implémentation (hors schéma JSON)

**Type** : Configuration technique dans `extraction-config.json`

**Contraintes** :
- `apiEndpoint` : Endpoints API NuExtract (reste dans `extraction-config.json`)
- `apiMode` : Mode API NuExtract (reste dans `extraction-config.json`)

**Usage** :
- Configuration technique NuExtract dans `extraction-config.json`
- Exemples : `infer-templatePath`, `infer-templateAsyncPath`, `templateMode`
- **Justification SRP** : Ces paramètres sont liés à l'implémentation technique NuExtract, pas à l'extraction conceptuelle
- Si on change d'outil d'extraction (pas NuExtract), les endpoints changent, mais l'extraction conceptuelle reste

**Priorité** :
1. Configuration `extraction-config.json` (configuration technique NuExtract)
2. Valeurs par défaut code

## Compatibilité JSON Schema Draft-07

### Position métadonnées

**JSON Schema Draft-07** :
- Propriétés au niveau racine : `$schema`, `$id`, `title`, `description`, `type`, `properties`, `required`, etc.
- Métadonnées personnalisées autorisées : Propriétés au niveau racine non définies dans spec sont ignorées par validation

**Comportement validation** :
- Validateur JSON Schema ignore propriétés inconnues au niveau racine
- `extractionTemplateInstructions` non reconnu par validateur standard = ignoré
- Validation métadonnées séparée nécessaire

### Validation hybride

**Approche recommandée** :
1. Validation schéma JSON : Utiliser Ajv avec schéma standard (ignore métadonnées)
2. Validation métadonnées : Utiliser Ajv avec schéma `extraction-template-instructions.json`
3. Validation combinée : Les deux validations doivent passer

**Code proposé** :
```javascript
// Validation 1 : Schéma JSON (ignore métadonnées)
const schemaValid = ajvSchemaValidator.validate(resolvedSchema);

// Validation 2 : Métadonnées (séparée)
if (resolvedSchema.extractionTemplateInstructions) {
  const metadataValid = ajvMetadataValidator.validate(
    resolvedSchema.extractionTemplateInstructions
  );
  if (!metadataValid) {
    throw new Error('Invalid extractionTemplateInstructions metadata');
  }
}
```

## Exemple complet avec validation

### Schéma avec métadonnées

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/micwic/hermes2022-to-archimate/shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json",
  "title": "HERMES2022 Method Extraction Schema",
  "description": "Schéma de validation pour les fichiers intermédiaires d'extraction des concepts de la méthode HERMES2022",
  "extractionTemplateInstructions": {
    "description": "Instructions pour génération de template NuExtract depuis ce schéma JSON Schema",
    "instructions": [
      "- transformes le schéma JSON en template NuExtract",
      "- considères les énumérations JSON comme par exemple \"language\": {\"type\": \"string\",\"enum\": [\"de\", \"fr\", \"it\", \"en\"]} comme des énumérations dans le format de template NuExtract \"language\": [\"de\", \"fr\", \"it\", \"en\"]"
    ]
  },
  "type": "object",
  "properties": {
    // ... schéma existant
  }
}
```

### Validation

**Étape 1 : Validation schéma JSON** :
- Valide `type`, `properties`, `required`, etc.
- Ignore `extractionTemplateInstructions` (propriété inconnue)

**Étape 2 : Validation métadonnées** :
- Valide `extractionTemplateInstructions` avec schéma dédié
- Vérifie `instructions` (obligatoire, array avec valeurs conformes à enum)

## Conclusion

**Schéma JSON Schema proposé** : `extraction-template-instructions.json` pour validation métadonnées

**Validation hybride** :
- Schéma JSON : Validation standard (ignore métadonnées)
- Métadonnées : Validation séparée avec schéma dédié

**Compatibilité** :
- JSON Schema Draft-07 compatible (métadonnées ignorées par validation standard)
- Validation séparée nécessaire pour métadonnées

**Prochaines étapes** :
1. Créer fichier `extraction-template-instructions.json`
2. Adapter code validation pour métadonnées
3. Tester validation combinée

