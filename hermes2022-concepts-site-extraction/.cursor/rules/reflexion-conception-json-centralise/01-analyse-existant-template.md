# Analyse de l'existant - Génération Template NuExtract

> Date : 2025-10-31
> Phase : 1 - Template uniquement

## Objectif

Analyser l'existant pour la génération de template NuExtract afin d'identifier :
- Structure et contenu des instructions actuelles
- Relation entre instructions Markdown et schéma JSON
- Code de chargement et utilisation
- Pattern `enum` existant pour paramétrage/validation/historisation
- Opportunités de consolidation dans le JSON

## Fichiers analysés

### 1. Instructions Markdown actuelle

**Fichier** : `hermes2022-concepts-site-extraction/config/instructions-template-nuextract.md`

**Structure actuelle** :
- Section documentation humaine : Objectif, Mode d'utilisation
- Section opérationnelle : Instructions sous heading `## Instructions complémentaires pour /api/infer-template /api/infer-template-async de NuExtract`
- Contenu instructions : 2 lignes de bullet points

**Contenu instructions extrait** :
```
- transformes le schéma JSON en template NuExtract
- considères les énumérations JSON comme par exemple "language": {"type": "string","enum": ["de", "fr", "it", "en"]} comme des énumérations dans le format de template NuExtract "language": ["de", "fr", "it", "en"]
```

**Points à noter** :
- Instructions très concises (2 points)
- Format Markdown pour lisibilité humaine
- Parsing nécessaire pour extraire section opérationnelle

### 2. Schéma JSON principal

**Fichier** : `shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json`

**Structure actuelle** :
- Schéma JSON Schema Draft-07 complet
- Propriétés `properties` : `config`, `method`, `concepts`
- Références `$ref` : `"concept-phases": {"$ref": "./hermes2022-phases.json"}`
- Pas de métadonnées d'extraction actuellement

**Pattern `enum` existant** :
- `baseUrl` : enum avec 4 URLs possibles (de, fr, it, en)
- `language` : enum avec 4 codes (de, fr, it, en)
- `hermesVersion` : enum avec 3 versions (5, 5.1, 2022)
- `sourceUrl` : enum avec URLs spécifiques selon contexte

**Usage `enum` pour paramétrage/validation/historisation** :
- Paramétrage : Liste des valeurs possibles pour l'extraction
- Validation : Valeur doit être dans l'enum (JSON Schema)
- Historisation : Valeur effectivement utilisée enregistrée dans JSON produit

### 3. Code de chargement actuel

**Fichier** : `hermes2022-concepts-site-extraction/src/nuextract-client.js`

**Fonction `loadInstructions(config)` (lignes 114-158)** :
- Lit fichier Markdown depuis `config.nuextract.templateTransformationInstructionFile`
- Parse Markdown pour extraire section sous heading ciblé
- Retourne instructions comme string

**Fonction `generateTemplate(config, apiKey)` (lignes 213-305)** :
- Appelle `loadInstructions()` et `loadAndResolveSchemas()` séparément
- Combine : `mainSchema + '\n' + instructions`
- Envoie description combinée à API NuExtract

**Fonction `loadAndResolveSchemas(config)` (lignes 161-210)** :
- Charge et résout schéma JSON avec `$RefParser.dereference()`
- Valide conformité JSON Schema Draft-07 avec Ajv
- Retourne schéma résolu comme JSON stringifié

### 4. Configuration actuelle

**Fichier** : `hermes2022-concepts-site-extraction/config/extraction-config.json`

**Paramètres template** :
- `templateTransformationInstructionFile` : Référence fichier Markdown
- `mainJSONConfigurationFile` : Référence schéma JSON principal
- `templateMode` : Mode sync/async
- `templateGenerationDuration` : Durée estimée (ms)

## Analyse des dépendances

### Flux actuel

1. **Chargement instructions** : `loadInstructions()` → Lit Markdown → Parse → Extrait section
2. **Chargement schéma** : `loadAndResolveSchemas()` → Charge JSON → Résout `$ref` → Valide → Stringifie
3. **Génération template** : Combine schéma + instructions → Appel API

### Points de consolidation

**Opportunité 1** : Instructions et configuration NuExtract sont chargés séparément alors qu'ils pourraient être co-localisés dans `extraction-config.json`
- Actuellement : Instructions dans Markdown séparé, configuration NuExtract dans `extraction-config.json`
- Proposition : Instructions dans `extraction-config.json` sous `nuextract` via propriété `templateTransformationInstructions` (SRP : génération template = implémentation NuExtract)

**Opportunité 2** : Création d'un schéma JSON Schema pour `extraction-config.json` avec pattern `enum` pour paramétrage/validation/historisation
- Actuellement : Pas de schéma JSON Schema pour `extraction-config.json` (validation manuelle)
- Proposition : Créer schéma JSON Schema pour `extraction-config.json` avec pattern `enum` sur `templateTransformationInstructions.instructions` selon le principe établi

**Opportunité 3** : Pattern `enum` déjà utilisé pour paramétrage/validation/historisation dans schémas JSON
- Pattern `enum` utilisé ailleurs pour paramétrage (liste valeurs) + validation (JSON Schema) + historisation (JSON produit)
- Pattern réplicable pour `templateTransformationInstructions.instructions` dans `extraction-config.json` via schéma JSON Schema dédié

## Redondances identifiées

### Redondance Markdown/JSON

- Instructions Markdown : Documentation humaine + Instructions opérationnelles
- Schéma JSON : Structure de données
- **Redondance** : Pas de redondance directe, mais séparation inutile

### Redondance parsing

- Parsing Markdown nécessaire pour extraire section opérationnelle
- Parsing JSON nécessaire pour charger schéma
- **Opportunité** : Un seul format JSON = un seul parser

## Opportunités de consolidation

### 1. Intégration instructions dans extraction-config.json sous nuextract (SRP)

**Justification SRP (Single Responsibility Principle)** :
- **Génération de template = implémentation NuExtract** : La génération de template est liée à l'implémentation technique NuExtract, pas à l'extraction conceptuelle
- **Extraction conceptuelle vs implémentation** : Le schéma JSON (`hermes2022-concepts.json`) définit la structure conceptuelle, tandis que `extraction-config.json` définit l'implémentation technique NuExtract
- **Séparation des responsabilités** : Instructions de génération template = configuration technique NuExtract → doit être dans `extraction-config.json` sous `nuextract`

**Distinction paramétrage vs historisation** :
- **Schéma JSON Schema** (`/config/extraction-config.schema.json`) : Source du paramétrage (définit les valeurs possibles avec pattern `enum`) - reste dans `/config`, pas partagé
- **extraction-config.json** (dans répertoire des données extraites) : Historisation des paramètres techniques effectivement utilisés lors de l'extraction (placé dans le répertoire défini par `artifactBaseDirectory`, ex: `"shared/hermes2022-extraction-files/data"`)
- **Note** : Le script `nuextract-client.js` ne sauvegarde pas encore le fichier JSON résultant de l'extraction (pas encore fonctionnelle)
- **Création** : Le fichier d'historisation est créé à partir du schéma JSON Schema (`/config/extraction-config.schema.json`) lors de l'extraction

**Avantage** :
- Configuration technique NuExtract centralisée dans le schéma JSON Schema (`/config/extraction-config.schema.json`) sous `nuextract`
- Pas de parsing Markdown nécessaire (instructions dans JSON)
- Validation par schéma JSON Schema dédié pour `extraction-config.json` (historisation)
- Historisation dans `extraction-config.json` placée dans le répertoire des données extraites (paramètres techniques effectivement utilisés lors de l'extraction, dans le répertoire défini par `artifactBaseDirectory`, ex: `"shared/hermes2022-extraction-files/data"`)
- **Note** : Le script `nuextract-client.js` ne sauvegarde pas encore le fichier JSON résultant de l'extraction (pas encore fonctionnelle)

**Structure proposée dans extraction-config.json** :
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

**Schéma JSON Schema à créer pour extraction-config.json** :
- **Fichier** : `hermes2022-concepts-site-extraction/config/extraction-config.schema.json`
- **Localisation** : Reste dans `/config` (pas dans `/shared` - pas partageable avec autres modules, pas besoin de le placer dans `/shared`)
- **Usage** : Source du paramétrage (définit les valeurs possibles avec pattern `enum`)
- **Pattern `enum` avec array** pour `instructions` dans `templateTransformationInstructions` (plusieurs valeurs possibles simultanément)
- **Validation** : JSON Schema Draft-07 pour `extraction-config.json` avec pattern `enum` sur `templateTransformationInstructions.instructions`
- **Usage** : Utilisé pour valider `extraction-config.json` (historisation dans répertoire des données extraites)

**Pattern `enum` avec array appliqué pour `templateTransformationInstructions.instructions`** :
- **Schéma JSON Schema** (`/config/extraction-config.schema.json` - source de paramétrage, pas partagé) :
  - `instructions.items.enum` définit toutes les instructions possibles (pile de textes libres, paramètres)
- **extraction-config.json** (historisation dans répertoire des données extraites) :
  - Array avec valeurs effectivement utilisées lors de l'extraction (validé par l'enum du schéma JSON Schema utilisé à la création)
  - **Localisation** : Répertoire défini par `artifactBaseDirectory` (ex: `"shared/hermes2022-extraction-files/data"`)
  - **Création** : Créé à partir du schéma JSON Schema (`/config/extraction-config.schema.json`) lors de l'extraction
  - **Note** : Le script `nuextract-client.js` ne sauvegarde pas encore le fichier JSON résultant de l'extraction (pas encore fonctionnelle)
- **Remplacement** : `templateTransformationInstructionFile` (fichier Markdown) → `templateTransformationInstructions.instructions` (array avec enum dans JSON)
- **Élégance** : Les valeurs dans `extraction-config.json` (historisation) sont forcément conformes aux enums du schéma JSON Schema utilisé au moment de la création

### 2. Création schéma JSON Schema pour extraction-config.json avec pattern `enum`

**Pattern établi avec `sourceUrl` dans schémas JSON** :
- Enum définit valeurs possibles (paramétrage)
- JSON Schema valide valeur dans enum (validation)
- JSON produit enregistre valeur utilisée (historisation)

**Application pour extraction-config.json** :
- Créer schéma JSON Schema Draft-07 pour `extraction-config.json` dans `/config/extraction-config.schema.json` (source de paramétrage, pas partagé, pas besoin de le placer dans `/shared`)
- Appliquer pattern `enum` avec array pour `instructions` dans `templateTransformationInstructions` sous `nuextract`
- Remplacement : `templateTransformationInstructionFile` → `templateTransformationInstructions.instructions` (array avec enum)
- **Historisation** : `extraction-config.json` représentera l'historisation des paramètres techniques effectivement utilisés pour l'extraction
- **Localisation historisation** : À placer dans le répertoire défini par `artifactBaseDirectory` dans `extraction-config.json` (ex: `"shared/hermes2022-extraction-files/data"`)
- **Note** : Le script `nuextract-client.js` ne sauvegarde pas encore le fichier JSON résultant de l'extraction (pas encore fonctionnelle)

**Application pour template** :

**Analyse approfondie - Pattern `enum` avec array pour `templateTransformationInstructions.instructions`** :

1. **Instructions comme array avec enum** :
   - **Schéma JSON Schema** (source de paramétrage dans `/config/extraction-config.schema.json`) : `instructions.items.enum` définit toutes les instructions possibles (pile de textes libres, paramètres)
   - **extraction-config.json** (historisation dans répertoire des données extraites) : Array avec valeurs effectivement utilisées lors de l'extraction (validé par l'enum du schéma JSON Schema utilisé à la création)
   - **Localisation historisation** : Répertoire défini par `artifactBaseDirectory` (ex: `"shared/hermes2022-extraction-files/data"`)
   - **Création** : Créé à partir du schéma JSON Schema (`/config/extraction-config.schema.json`) lors de l'extraction
   - **Note** : Le script `nuextract-client.js` ne sauvegarde pas encore le fichier JSON résultant de l'extraction (pas encore fonctionnelle)
   - **Élégance** : Les valeurs dans `extraction-config.json` (historisation) sont forcément conformes aux enums du schéma JSON Schema utilisé au moment de la création

   - **Exemple structure schéma JSON Schema pour extraction-config.json** :
     ```json
     {
       "nuextract": {
         "type": "object",
         "properties": {
           "templateTransformationInstructions": {
             "type": "object",
             "properties": {
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
           }
         }
       }
     }
     ```
   - **Exemple valeurs dans extraction-config.json** :
     ```json
     {
       "nuextract": {
         "templateTransformationInstructions": {
           "instructions": [
             "- transformes le schéma JSON en template NuExtract",
             "- considères les énumérations JSON comme par exemple \"language\": {\"type\": \"string\",\"enum\": [\"de\", \"fr\", \"it\", \"en\"]} comme des énumérations dans le format de template NuExtract \"language\": [\"de\", \"fr\", \"it\", \"en\"]"
           ]
         }
       }
     }
     ```

2. **Pattern array avec enum pour `templateTransformationInstructions.instructions`** :
   - **Schéma JSON Schema** (source de paramétrage dans `/config/extraction-config.schema.json`) : `instructions.items.enum` définit toutes les instructions possibles
   - **extraction-config.json** (historisation dans répertoire des données extraites) : Array avec valeurs effectivement utilisées lors de l'extraction (validé par l'enum du schéma JSON Schema utilisé à la création)
   - **Localisation historisation** : Répertoire défini par `artifactBaseDirectory` (ex: `"shared/hermes2022-extraction-files/data"`)
   - **Création** : Créé à partir du schéma JSON Schema (`/config/extraction-config.schema.json`) lors de l'extraction
   - **Remplacement** : `templateTransformationInstructionFile` (fichier Markdown) → `templateTransformationInstructions.instructions` (array avec enum dans JSON)
   - **Cohérence** : Pattern `enum` avec array pour paramétrage/validation/historisation (identique au pattern utilisé ailleurs)
   - **SRP** : Paramètres de génération template dans le schéma JSON Schema sous `nuextract` (configuration technique NuExtract)
   - **Localisation schéma JSON Schema** : Reste dans `/config` (pas dans `/shared` - pas partageable avec autres modules, pas besoin de le placer dans `/shared`)

### 3. Simplification code

**Changements proposés** :
- `loadInstructions()` : Extraire depuis `config.nuextract.templateTransformationInstructions.instructions` (array)
- Joindre les valeurs de l'array avec `\n` pour concaténation
- `generateTemplate()` : Instructions depuis configuration NuExtract (pas depuis schéma résolu)
- Plus besoin de charger fichier Markdown séparé (remplacement par `templateTransformationInstructions.instructions`)

## Compatibilité avec architecture actuelle

### Résolution `$ref`

- `$RefParser.dereference()` résout toutes les références
- Schéma résolu contient structure complète
- Instructions dans `extraction-config.json` sous `nuextract` (pas dans schéma résolu)

### Validation JSON Schema

- **Schéma JSON Schema** : `/config/extraction-config.schema.json` (source de paramétrage, pas partagé, pas besoin de le placer dans `/shared`)
- Pattern `enum` sur `templateTransformationInstructions.instructions` dans le schéma JSON Schema
- **Validation `extraction-config.json` (historisation)** : Fichier dans répertoire des données extraites validé avec le schéma JSON Schema (`/config/extraction-config.schema.json`) lors de la sauvegarde
- Validation séparée de validation schémas JSON concepts (`hermes2022-concepts.json`)
- Pattern `enum` pour paramétrage/validation/historisation dans `extraction-config.json` (`templateTransformationInstructions.instructions`)

### Remplacement direct

- `templateTransformationInstructionFile` (fichier Markdown) → `templateTransformationInstructions.instructions` (array avec enum dans JSON)
- Plus besoin de charger fichier Markdown séparé

## Conclusion

**État actuel** :
- Instructions Markdown séparées de la configuration NuExtract
- Chargement séparé (instructions + configuration)
- Parsing Markdown nécessaire
- Pas de schéma JSON Schema pour `extraction-config.json`

**Opportunité principale** :
- Intégrer instructions dans `extraction-config.json` sous `nuextract` via `templateTransformationInstructions` (SRP : génération template = implémentation NuExtract)
- Remplacer `templateTransformationInstructionFile` (fichier Markdown) par `templateTransformationInstructions.instructions` (array avec enum dans JSON)
- Créer schéma JSON Schema pour `extraction-config.json` dans `/config/extraction-config.schema.json` (source de paramétrage, pas partagé) avec pattern `enum` pour `templateTransformationInstructions.instructions`
- Éliminer parsing Markdown pour template
- Historisation dans `extraction-config.json` placée dans le répertoire des données extraites (valeurs effectivement utilisées lors de l'extraction, dans le répertoire défini par `artifactBaseDirectory`, ex: `"shared/hermes2022-extraction-files/data"`)
- **Note** : Le script `nuextract-client.js` ne sauvegarde pas encore le fichier JSON résultant de l'extraction (pas encore fonctionnelle)

**Pattern généralisable** :
- Pattern `enum` avec array pour paramétrage/validation/historisation dans `extraction-config.json` (exemple `templateTransformationInstructions.instructions`)
- Structure `templateTransformationInstructions` réplicable pour autres configurations techniques NuExtract
- **SRP** : Extraction conceptuelle (schémas JSON) vs implémentation NuExtract (`extraction-config.json` sous `nuextract`)
