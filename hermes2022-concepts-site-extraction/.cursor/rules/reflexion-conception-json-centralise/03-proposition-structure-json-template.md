# Proposition de structure JSON - Template

> Date : 2025-10-31
> Phase : 1 - Template uniquement

## Objectif

Concevoir la structure JSON pour intégrer les instructions de génération de template NuExtract dans `extraction-config.json` sous `nuextract` via `templateTransformationInstructions` (SRP : génération template = implémentation NuExtract).

## Structure proposée

### `extraction-config.json` avec `templateTransformationInstructions` sous `nuextract`

**Approche** : Remplacer `templateTransformationInstructionFile` (fichier Markdown) par `templateTransformationInstructions.instructions` (array avec enum dans JSON) dans `extraction-config.json` sous `nuextract`.

**Structure proposée pour la seule transformation, le reste présent est inchangé** :

**Schéma JSON Schema pour `extraction-config.json`** (source de paramétrage dans `/config/extraction-config.schema.json`) :

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/micwic/hermes2022-to-archimate/hermes2022-concepts-site-extraction/config/extraction-config.schema.json",
  "title": "Extraction Configuration Schema",
  "description": "Schéma de validation pour extraction-config.json (configuration technique NuExtract)",
  "type": "object",
  "properties": {
    "nuextract": {
      "type": "object",
      "properties": {
        ...
        "templateTransformationInstructions": {
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
                  "- considères les énumérations JSON comme par exemple \"language\": {\"type\": \"string\",\"enum\": [\"de\", \"fr\", \"it\", \"en\"]} comme des énumérations dans le format de template NuExtract \"language\": [\"de\", \"fr\", \"it\", \"en\"]"
                ]
              }
            }
          },
          "required": ["instructions"]
        }
        ...
      }
    }
  }
}
```

**Dans `extraction-config.json` (historisation dans répertoire des données extraites)** :

```json
{
  "nuextract": {
    ...
    "templateTransformationInstructions": {
      "description": "Instructions pour génération de template NuExtract depuis le schéma JSON",
      "instructions": [
        "- transformes le schéma JSON en template NuExtract",
        "- considères les énumérations JSON comme par exemple \"language\": {\"type\": \"string\",\"enum\": [\"de\", \"fr\", \"it\", \"en\"]} comme des énumérations dans le format de template NuExtract \"language\": [\"de\", \"fr\", \"it\", \"en\"]"
      ]
    },
    ...
    "templateMode": "sync",
    "infer-templatePath": "/api/infer-template",
    "infer-templateAsyncPath": "/api/infer-template-async"
    ...
  }
}
```

**Élégance du pattern** :
- **Dans le schéma JSON Schema** (`/config/extraction-config.schema.json` - structure et paramétrage) : 
  - `instructions.items.enum` définit toutes les instructions possibles (pile de textes libres, paramètres)
- **Dans extraction-config.json** (historisation dans répertoire des données extraites) :
  - Array avec valeurs effectivement utilisées lors de l'extraction (validé par l'enum du schéma JSON Schema utilisé à la création)
  - **Localisation** : Répertoire défini par `artifactBaseDirectory` dans la configuration (transformée depuis le schéma JSON Schema) (ex: `"shared/hermes2022-extraction-files/data"`)
- **Cohérence garantie** : Les valeurs dans `extraction-config.json` (historisation) sont forcément conformes aux enums du schéma JSON Schema utilisé au moment de la création

**Justification SRP (Single Responsibility Principle)** :
- **Génération de template = implémentation NuExtract** : La génération de template est liée à l'implémentation technique NuExtract, pas à l'extraction conceptuelle
- **Extraction conceptuelle vs implémentation** : Le schéma JSON (`hermes2022-concepts.json`) définit la structure conceptuelle, tandis que `extraction-config.json` définit l'implémentation technique NuExtract dans la propriété adhoc nuextract
- **Séparation des responsabilités** : Instructions de génération template = configuration technique NuExtract → doit être dans `extraction-config.json` sous `nuextract`
- **Localisation schéma JSON Schema** : Reste dans `/config` (pas dans `/shared` - pas partageable avec autres modules, pas besoin de le placer dans `/shared`)

## Détails de la structure `templateTransformationInstructions`

### Propriétés

**`description`** (string, optionnel) :
- Description humaine des instructions
- Exemple : `"Instructions pour génération de template NuExtract depuis le schéma JSON"`
- MaxLength : 500 caractères recommandé

**`instructions`** (array de strings, obligatoire) :
- **Pattern `enum` avec array** : S'applique uniquement aux `instructions` (plusieurs valeurs possibles simultanément)
- **Dans le schéma JSON Schema** (`/config/extraction-config.schema.json` - structure et paramétrage, pas partagé) : `instructions.items.enum` définit toutes les instructions possibles (pile de textes libres, paramètres)
- **Dans extraction-config.json** (historisation dans répertoire des données extraites) : Array avec valeurs effectivement utilisées lors de l'extraction (validé par l'enum du schéma JSON Schema utilisé à la création)
- **Localisation historisation** : Répertoire défini par `artifactBaseDirectory` dans le schéma JSON Schema (ex: `"shared/hermes2022-extraction-files/data"`)
- **Élégance** : Les valeurs dans `extraction-config.json` (historisation) sont forcément conformes aux enums du schéma JSON Schema utilisé au moment de la création
- **Remplacement** : `templateTransformationInstructionFile` (fichier Markdown) → `templateTransformationInstructions.instructions` (array avec enum dans JSON)

### Exemple complet

**Instructions actuelles (Markdown)** :
```
## Instructions complémentaires pour /api/infer-template /api/infer-template-async de NuExtract

- transformes le schéma JSON en template NuExtract
- considères les énumérations JSON comme par exemple "language": {"type": "string","enum": ["de", "fr", "it", "en"]} comme des énumérations dans le format de template NuExtract "language": ["de", "fr", "it", "en"]
```

**Intégration dans `extraction-config.schema.json` sous `nuextract`** :

Le schéma JSON Schema définit la structure et le paramétrage via le pattern `enum` :

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/micwic/hermes2022-to-archimate/hermes2022-concepts-site-extraction/config/extraction-config.schema.json",
  "title": "Extraction Configuration Schema",
  "description": "Schéma de validation pour extraction-config.json (configuration technique NuExtract)",
  "type": "object",
  "properties": {
    "nuextract": {
      "type": "object",
      "properties": {
        "templateTransformationInstructions": {
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
                  "- considères les énumérations JSON comme par exemple \"language\": {\"type\": \"string\",\"enum\": [\"de\", \"fr\", \"it\", \"en\"]} comme des énumérations dans le format de template NuExtract \"language\": [\"de\", \"fr\", \"it\", \"en\"]"
                ]
              }
            }
          },
          "required": ["instructions"]
        }
      }
    }
  }
}
```

**Rôle du schéma JSON Schema** :
- **Structure** : Définit la structure de `extraction-config.json` pour l'historisation
- **Paramétrage** : Le pattern `enum` dans `instructions.items.enum` définit toutes les instructions possibles (pile de textes libres, paramètres)
- **Validation** : Valide que les valeurs dans `extraction-config.json` (historisation) sont conformes à l'enum du schéma JSON Schema

**Intégration dans `extraction-config.json` (historisation dans répertoire des données extraites)** :
```json
{
  "nuextract": {
    "templateTransformationInstructions": {
      "description": "Instructions pour génération de template NuExtract depuis le schéma JSON",
      "instructions": [
        "- transformes le schéma JSON en template NuExtract",
        "- considères les énumérations JSON comme par exemple \"language\": {\"type\": \"string\",\"enum\": [\"de\", \"fr\", \"it\", \"en\"]} comme des énumérations dans le format de template NuExtract \"language\": [\"de\", \"fr\", \"it\", \"en\"]"
      ]
    }
  }
}
```

**Pattern `enum` appliqué pour `templateTransformationInstructions.instructions`** :

**Pour `instructions` (array avec enum)** :
- **Schéma JSON Schema** (`/config/extraction-config.schema.json` - structure et paramétrage, pas partagé) : `instructions.items.enum` définit toutes les instructions possibles (pile de textes libres, paramètres) - Le schéma JSON Schema fait office de structure et de gestion du paramétrage
- **extraction-config.json** (historisation dans répertoire des données extraites) : Array avec valeurs effectivement utilisées lors de l'extraction (validé par l'enum du schéma JSON Schema utilisé à la création) - Le fichier JSON créé à des fins d'historisation
- **Localisation historisation** : Répertoire défini par `artifactBaseDirectory` dans le schéma JSON Schema (ex: `"shared/hermes2022-extraction-files/data"`)
- **Remplacement** : `templateTransformationInstructionFile` (fichier Markdown) → `templateTransformationInstructions.instructions` (array avec enum dans JSON)

**Élégance du pattern** : Les valeurs dans `extraction-config.json` (historisation) sont forcément conformes aux enums du schéma JSON Schema utilisé au moment de la création

## Critères de conception

### 1. SRP : Extraction conceptuelle vs implémentation NuExtract

**Séparation claire** :
- **Extraction conceptuelle** : Schéma JSON (`hermes2022-concepts.json`) définit la structure conceptuelle
- **Implémentation NuExtract** : `extraction-config.json` définit l'implémentation technique NuExtract
- **Instructions de génération template** : Configuration technique NuExtract → doit être dans `extraction-config.json` sous `nuextract`

**Validation JSON Schema** :
- Schéma JSON Schema pour `extraction-config.json` dans `/config/extraction-config.schema.json` (structure et paramétrage, pas partagé)
- Validation `extraction-config.json` (historisation dans répertoire des données extraites) avec le schéma JSON Schema

### 2. Deux fichiers uniquement : schéma JSON Schema et fichier JSON d'historisation

**Schéma JSON Schema** (`/config/extraction-config.schema.json`) :
- **Structure** : Définit la structure de `extraction-config.json` pour l'historisation
- **Paramétrage** : Le pattern `enum` dans `instructions.items.enum` définit toutes les instructions possibles (pile de textes libres, paramètres)
- **Localisation** : Reste dans `/config` (pas dans `/shared` - pas partageable avec autres modules, pas besoin de le placer dans `/shared`)
- **Rôle** : Fait office de structure et de gestion du paramétrage

**Fichier JSON d'historisation** (`extraction-config.json` dans répertoire des données extraites) :
- **Historisation** : Paramètres techniques effectivement utilisés lors de l'extraction
- **Localisation** : Répertoire défini par `artifactBaseDirectory` dans la configuration (transformée depuis le schéma JSON Schema) (ex: `"shared/hermes2022-extraction-files/data"`)
- **Validation** : Validé par le schéma JSON Schema (`/config/extraction-config.schema.json`)
- **Note** : Le script `nuextract-client.js` ne sauvegarde pas encore le fichier JSON résultant de l'extraction (pas encore fonctionnelle)

### 3. Format instructions avec pattern `enum`

**Structure avec enum** :

**Dans le schéma JSON Schema** (`/config/extraction-config.schema.json` - structure et paramétrage, pas partagé) :
- `instructions.items.enum` : Définit toutes les instructions possibles (pile de textes libres, paramètres)
- Chaque valeur de l'enum : String libre pour lisibilité IA (support newlines `\n`, format Markdown possible)
- Validation : JSON Schema valide que chaque valeur dans l'array est dans l'enum
- **Rôle** : Fait office de structure et de gestion du paramétrage

**Dans extraction-config.json** (historisation dans répertoire des données extraites) :
- Array avec valeurs effectivement utilisées lors de l'extraction (validé par l'enum du schéma JSON Schema utilisé à la création)
- **Localisation** : Répertoire défini par `artifactBaseDirectory` dans la configuration (transformée depuis le schéma JSON Schema) (ex: `"shared/hermes2022-extraction-files/data"`)
- **Rôle** : Fichier JSON créé à des fins d'historisation

**Élégance** : Les valeurs dans `extraction-config.json` (historisation) sont forcément conformes aux enums du schéma JSON Schema utilisé au moment de la création

**Combinaison des instructions** :
- Array `instructions` contient valeurs sélectionnées (dans l'ordre, conformes à l'enum du schéma JSON Schema)
- Joindre les valeurs de l'array avec `\n` pour concaténation
- Format combiné final : Schéma + Instructions concaténées dans `description` API

**Contenu** :
- Instructions extraites de `instructions-template-nuextract.md`
- Chaque instruction comme valeur dans l'enum du schéma JSON Schema (pile de textes libres possibles)
- Section opérationnelle uniquement (sans documentation humaine)

### 4. Remplacement direct `templateTransformationInstructionFile`

**Remplacement** :
- `templateTransformationInstructionFile` (fichier Markdown) → `templateTransformationInstructions.instructions` (array avec enum dans JSON)
- Plus besoin de charger fichier Markdown séparé
- Plus besoin de parsing Markdown

**Chargement instructions** :
- Le code lit les valeurs depuis la configuration en mémoire (objet config transformé depuis le schéma JSON Schema par `loadGlobalConfig()`)
- `loadInstructions(config)` extrait depuis `config.nuextract.templateTransformationInstructions.instructions` (array)
- Joindre les valeurs de l'array avec `\n` pour concaténation
- Utilisation directe dans `generateTemplate()`

## Avantages

### 1. Configuration technique NuExtract centralisée

- Instructions et configuration NuExtract co-localisés dans `extraction-config.json` (historisation) sous `nuextract` (SRP)
- Validation JSON Schema unique pour `extraction-config.json` via schéma JSON Schema (`/config/extraction-config.schema.json` - structure et paramétrage)
- Maintenance simplifiée (schéma JSON Schema pour structure/paramétrage, fichier JSON pour historisation)

### 2. Pas de parsing Markdown

- Instructions directement dans JSON (array avec enum)
- Pas de parsing Markdown nécessaire
- Accès direct depuis `extraction-config.json` (historisation) sous `nuextract.templateTransformationInstructions.instructions`

### 3. Historisation structurée

- Historisation dans `extraction-config.json` placée dans le répertoire des données extraites (paramètres techniques effectivement utilisés lors de l'extraction)
- **Localisation** : Répertoire défini par `artifactBaseDirectory` dans la configuration (transformée depuis le schéma JSON Schema) (ex: `"shared/hermes2022-extraction-files/data"`)
- Validation avec le même schéma JSON Schema que le paramétrage

### 4. Pattern généralisable

- Structure `templateTransformationInstructions` réplicable pour autres configurations techniques NuExtract
- Pattern `enum` avec array pour `instructions` : Réplicable pour toutes configurations nécessitant plusieurs valeurs (simplicité et cohérence)
- **SRP** : Extraction conceptuelle (schémas JSON) vs implémentation NuExtract (`extraction-config.json` sous `nuextract`)

## Contraintes

### 1. Instructions Markdown vs JSON string

- Instructions en string (pas de formatage Markdown riche dans JSON)
- Format Markdown possible dans string (IA interprète)
- Lisibilité préservée avec newlines (`\n`)

### 2. Taille fichiers JSON

- Instructions peuvent être longues (string accepte)
- Pas de limite JSON Schema pour string (limite API NuExtract : 32k caractères total)
- Format compact recommandé

### 3. Migration et sauvegarde historisation

- Instructions Markdown à migrer vers JSON (array avec enum dans `extraction-config.json`)
- Conversion nécessaire (format Markdown → array avec enum dans JSON)
- Tests de validation après migration
- **Sauvegarde historisation** : Fonctionnalité à implémenter dans `nuextract-client.js` pour sauvegarder `extraction-config.json` (historisation) dans le répertoire défini par `artifactBaseDirectory` lors de l'extraction
- **Note** : Le script `nuextract-client.js` ne sauvegarde pas encore le fichier JSON résultant de l'extraction (pas encore fonctionnelle)

## Conclusion

**Structure proposée** : `templateTransformationInstructions` dans `extraction-config.json` sous `nuextract` (SRP : génération template = implémentation NuExtract)

**Avantages principaux** :
- Configuration technique NuExtract centralisée dans `extraction-config.json` (historisation) sous `nuextract`
- Pas de parsing Markdown nécessaire (instructions dans JSON)
- Validation par schéma JSON Schema dédié (`/config/extraction-config.schema.json` - structure et paramétrage, pas partagé)
- Historisation dans `extraction-config.json` placée dans le répertoire des données extraites (valeurs effectivement utilisées lors de l'extraction)

**Deux fichiers uniquement** :
- **Schéma JSON Schema** (`/config/extraction-config.schema.json`) : Fait office de structure et de gestion du paramétrage (définit les valeurs possibles avec pattern `enum`) - reste dans `/config`, pas partagé
- **extraction-config.json** (dans répertoire des données extraites) : Fichier JSON créé à des fins d'historisation des paramètres techniques effectivement utilisés lors de l'extraction (placé dans le répertoire défini par `artifactBaseDirectory` dans la configuration, ex: `"shared/hermes2022-extraction-files/data"`)
