# Impact sur le code existant - Template

> Date : 2025-10-31
> Phase : 1 - Template uniquement

## Objectif

Analyser l'impact sur le code existant pour intégrer les instructions de génération de template depuis le schéma JSON Schema (`/config/extraction-config.schema.json`) qui sera créé à partir de la configuration actuelle, au lieu du fichier Markdown.

## Fichiers concernés

### 1. `nuextract-client.js`

**Fichier** : `hermes2022-concepts-site-extraction/src/nuextract-client.js`

**Fonctions à modifier** :

#### A. `loadInstructions(config)` (lignes 114-158)

**Code actuel** :
```javascript
async function loadInstructions(config) {
  const instFile = config?.nuextract?.templateTransformationInstructionFile || 'hermes2022-concepts-site-extraction/config/instructions-template-nuextract.md';
  const instPath = resolveFromRepoRoot(instFile);
  
  // Lecture fichier Markdown
  let fullContent;
  try {
    fullContent = fs.readFileSync(instPath, 'utf8');
  } catch (error) {
    // ...
  }
  
  // Parsing Markdown pour extraire section
  const targetHeading = '## Instructions complémentaires pour /api/infer-template /api/infer-template-async de NuExtract';
  const lines = fullContent.split('\n');
  const startIdx = lines.findIndex(line => line.trim() === targetHeading);
  // ... extraction section
  
  return extractedContent;
}
```

**Modification proposée** :
```javascript
async function loadInstructions(config) {
  console.log(`[info] Chargement des instructions depuis config.nuextract.templateTransformationInstructions.instructions`);
  
  try {
    // Instructions depuis config déjà chargée (SRP : extraction uniquement, pas de chargement fichier)
    if (!config?.nuextract?.templateTransformationInstructions?.instructions) {
      throw new Error('templateTransformationInstructions.instructions non trouvé dans config.nuextract. Script stopped.');
    }
    
    const instructionsArray = config.nuextract.templateTransformationInstructions.instructions;
    
    // Valider que c'est un array (Pattern 1 : erreur de validation selon @error-handling-governance)
    if (!Array.isArray(instructionsArray)) {
      const actualType = typeof instructionsArray;
      throw new Error(`templateTransformationInstructions.instructions invalide: type "${actualType}". Format attendu: array de strings. Script stopped.`);
    }
    
    // Joindre les valeurs de l'array avec \n pour concaténation
    const instructions = instructionsArray.join('\n');
    console.log(`[info] Instructions chargées depuis config.nuextract.templateTransformationInstructions.instructions (${instructionsArray.length} instructions)`);
    return instructions;
  } catch (error) {
    // Pattern 3 : Propagation d'erreur dans fonctions d'orchestration
    // Message contextualisé pour identifier facilement la fonction (bonne pratique reconnue)
    console.error(`Erreur lors du chargement des instructions: ${error.message}`);
    throw error; // Propagation simple avec préservation de la stack trace
  }
}
```

**Changements** :
1. **SRP respecté** : Extraire uniquement depuis `config.nuextract.templateTransformationInstructions.instructions` (configuration en mémoire, pas de chargement fichier)
2. Valider présence des instructions dans config (lever erreur si absent)
3. Supprimer lecture et parsing du fichier Markdown (remplacement direct, plus de fallback)

**Conformité règles de gouvernance** :
- ✅ **Modularité (@code-modularity-governance)** : Fonction pure avec Dependency Injection (paramètre `config`), pas d'état global, SRP respecté
- ✅ **Gestion d'erreurs (@error-handling-governance)** :
  - Pattern 1 (erreurs de validation) avec messages explicites, mention des valeurs attendues, terminaison "Script stopped."
  - Pattern 3 (propagation d'erreur dans fonctions d'orchestration) : try-catch général avec `console.error()` contextualisé et propagation simple (`throw error`)
- ✅ **Bonnes pratiques reconnues** :
  - `console.log()` en entrée de fonction pour traçabilité (bonne pratique reconnue)
  - Message d'erreur contextualisé dans le catch pour identifier facilement la fonction (bonne pratique reconnue)

**Note SRP** : `loadInstructions()` s'intéresse uniquement à extraire les instructions de la configuration en mémoire. Elle ne charge pas de fichier, respectant ainsi le Single Responsibility Principle.

**Note impact** : Aucun impact sur les autres fonctions. `generateTemplate()` appelle toujours `loadInstructions(config)` de la même manière. Le changement est interne à `loadInstructions()` uniquement.

#### B. `loadGlobalConfig()` (lignes 18-61)

**Code actuel** :
```javascript
async function loadGlobalConfig() {
  const configPath = resolveFromRepoRoot('hermes2022-concepts-site-extraction/config/extraction-config.json');
  console.log(`[info] Chargement de la configuration à partir de : ${configPath}`);
  
  // Étape 1: Lire le fichier
  let configContent;
  try {
    configContent = fs.readFileSync(configPath, 'utf8');
  } catch (error) {
    console.error(`Erreur lors de la lecture du schéma JSON Schema : ${error.message}`);
    throw new Error('Configuration file not found. Script stopped');
  }
  
  // Étape 2: Parser le JSON
  let config;
  try {
    config = JSON.parse(configContent);
  } catch (error) {
    console.error(`Erreur lors du parsing JSON de la configuration : ${error.message}`);
    throw new Error('Invalid JSON in main configuration file. Script stopped');
  }
  
  // Étape 3: Validation structurelle minimale
  // ... validations ...
  
  return config;
}
```

**Modification proposée** :
```javascript
async function loadGlobalConfig() {
  console.log(`[info] Chargement de la configuration à partir du schéma JSON Schema`);
  
  try {
    // Étape 1: Lire le schéma JSON Schema
    const schemaPath = resolveFromRepoRoot('hermes2022-concepts-site-extraction/config/extraction-config.schema.json');
    let schemaContent;
    try {
      schemaContent = fs.readFileSync(schemaPath, 'utf8');
    } catch (error) {
      console.error(`Erreur lors de la lecture du schéma JSON Schema : ${error.message}`);
      throw new Error('Schema file not found. Script stopped.', { cause: error });
    }
    
    // Étape 2: Parser le schéma JSON Schema
    let schema;
    try {
      schema = JSON.parse(schemaContent);
    } catch (error) {
      console.error(`Erreur lors du parsing JSON du schéma : ${error.message}`);
      throw new Error('Invalid JSON in schema file. Script stopped.', { cause: error });
    }
    
    // Étape 3: Transformer le schéma en objet config JSON utilisable dans le code
    // Le schéma JSON Schema définit la structure et les contraintes, on doit créer un objet config JSON
    // à partir des enum (première valeur enum[0] pour propriétés simples, items.enum pour arrays) du schéma
    const config = transformSchemaToConfig(schema);
    
    // Étape 4: Validation structurelle minimale (inchangée)
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new Error('Invalid config structure: expected an object. Script stopped.');
    }
    
    if (!config.nuextract || typeof config.nuextract !== 'object') {
      throw new Error('Invalid config structure: missing "nuextract" section. Script stopped.');
    }
    
    console.log('[info] Configuration chargée avec succès depuis le schéma JSON Schema');
    return config;
  } catch (error) {
    // Pattern 3 : Propagation d'erreur dans fonctions d'orchestration
    console.error(`Erreur lors du chargement de la configuration: ${error.message}`);
    throw error; // Propagation simple avec préservation de la stack trace
  }
}

// Fonction helper pour transformer le schéma JSON Schema en objet config JSON
function transformSchemaToConfig(schema) {
  // Le schéma JSON Schema définit la structure et les contraintes, pas les valeurs
  // Il faut extraire les valeurs par défaut depuis les enum et construire l'objet config JSON complet
  // 
  // Stratégie d'extraction :
  // 1. Pour propriétés simples (string, boolean, etc.) avec enum :
  //    - Utiliser `property.enum[0]` comme valeur par défaut
  //    - `enum` sert à la fois à la validation et aux valeurs par défaut
  // 
  // 2. Pour arrays avec enum (ex: templateTransformationInstructions.instructions) :
  //    - Extraire `items.enum` (liste des valeurs possibles)
  //    - Sélectionner toutes les valeurs de l'enum ou appliquer logique de sélection
  //    - Pas de `default` nécessaire car c'est un array (sélection multiple)
  // 
  // Construction récursive de l'objet config à partir de la structure du schéma
  // avec application des valeurs enum[0] pour les propriétés simples
  // 
  // Exemples d'extraction :
  // - schema.properties.nuextract.properties.templateMode.enum[0] → "sync" (valeur par défaut)
  // - schema.properties.nuextract.properties.templateTransformationInstructions.properties.instructions.items.enum → array des instructions possibles
  // 
  // Algorithme :
  // 1. Parcourir récursivement schema.properties
  // 2. Pour chaque propriété :
  //    a. Si enum présent → utiliser enum[0] (valeur par défaut)
  //    b. Sinon si type === "array" et items.enum présent → utiliser items.enum (array complet ou sélection)
  //    c. Sinon → null ou valeur vide selon le type
  // 3. Construire l'objet config avec les valeurs extraites
  // ...
}
```

**Changements** :
1. **Lecture depuis schéma** : Lire `/config/extraction-config.schema.json` au lieu de `/config/extraction-config.json`
2. **Transformation schéma → config** : Transformer le schéma JSON Schema (structure) en objet config JSON (valeurs) utilisable dans le code
3. **Extraction valeurs** : Extraire les valeurs depuis le schéma (voir section [Décision : utilisation de `enum` uniquement](#décision--utilisation-de-enum-uniquement-pour-validation-et-valeurs-par-défaut) ci-dessous) :
   - Utiliser `property.enum[0]` pour les propriétés simples (string, boolean, etc.) avec enum
   - Extraire `items.enum` pour arrays (ex: `templateTransformationInstructions.instructions`)
   - `enum` sert à la fois à la validation (toutes les valeurs possibles) et aux valeurs par défaut (`enum[0]`)
   - Construction récursive de l'objet config à partir de la structure du schéma
4. **Sauvegarde optionnelle** : Décision à prendre : sauvegarder le config transformé immédiatement ou uniquement en fin de déroulement avec les données extraites
5. **try-catch général** : Ajouter try-catch général avec message contextualisé selon Pattern 3 (@error-handling-governance)
6. **console.log en entrée** : Ajouter console.log en entrée selon bonnes pratiques reconnues
7. **Validation** : Le config transformé devra être validé avec le schéma JSON Schema (voir [Validation extraction-config.json (historisation)](#validation-extraction-configjson-historisation))

**Décision à prendre** :
- **Option A** : Sauvegarder le config transformé immédiatement dans le répertoire des données extraites lors de `loadGlobalConfig()`
- **Option B** : Sauvegarder uniquement en fin de déroulement avec les données extraites (dans la fonction d'historisation)

#### Décision : utilisation de `enum` uniquement pour validation et valeurs par défaut

**Analyse** :

1. **`default` dans JSON Schema** :
   - Permet de spécifier une valeur par défaut explicite pour chaque propriété
   - **Avantage** : Simplifie l'extraction dans `transformSchemaToConfig()` : `schema.properties.xxx.default` est directement accessible
   - **Inconvénient** : Duplication des valeurs (doivent être définies à la fois dans `enum` pour validation et dans `default` pour valeur par défaut)

2. **`enum` uniquement (première valeur)** :
   - Pas de duplication : on utilise `schema.properties.xxx.enum[0]` comme valeur par défaut
   - **Avantage** : Pas de duplication, valeur par défaut toujours alignée avec l'enum
   - **Avantage** : `enum` sert à la fois à la validation (toutes les valeurs possibles) et aux valeurs par défaut (`enum[0]`)
   - Une seule source de vérité (l'enum)

**Réponses aux questions** :

1. **Est-ce que le fait de considérer `default` simplifie la création du fichier JSON à partir du JSON Schema ?**
   - **Non** : `default` ne procure **aucun avantage réel** car il faut quand même implémenter l'extraction manuellement dans `transformSchemaToConfig()`
   - **Duplication inutile** : Les valeurs doivent être définies à la fois dans `enum` pour validation et dans `default` pour valeur par défaut

2. **Est-ce que ces valeurs par défaut sont automatiquement chargées lors de la transformation du schéma en fichier JSON ?**
   - **Non** : Les valeurs `default` ne sont **pas automatiquement chargées** lors de la transformation du schéma en fichier JSON
   - Il faut implémenter explicitement l'extraction des valeurs `default` dans `transformSchemaToConfig()` en parcourant récursivement `schema.properties` et en extrayant `property.default` pour chaque propriété

**Conclusion** :
- `default` ne procure **aucun avantage réel** : il faut quand même implémenter l'extraction manuellement
- `enum[0]` peut servir à la fois pour validation et valeur par défaut, évitant la duplication
- **Plus simple et cohérent** : une seule source de vérité (l'enum)

**Décision adoptée** :
- **Utiliser `enum` uniquement** pour la validation ET les valeurs par défaut
- **Valeur par défaut = `enum[0]`** (première valeur de l'enum)
- **Pas de `default`** : Évite la duplication et simplifie le schéma
- **Rationale** : 
  - `enum` sert à la fois à la validation (toutes les valeurs possibles) et aux valeurs par défaut (`enum[0]`)
  - Pas de duplication nécessaire
  - Plus simple et cohérent : une seule source de vérité (l'enum)

### 2. Tests BDD

**Principe BDD Rouge → Vert → Refactor** (selon @bdd-governance) :
- **Rouge** : Écrire/scénariser un comportement en Gherkin (`.feature`) qui échoue ; ajouter le minimum de steps pour reproduire l'échec
- **Vert** : Implémenter le minimum dans les steps pour faire passer le scénario ; viser le plus simple qui fonctionne
- **Refactor** : Factoriser les steps, mutualiser dans `__tests__/shared/`, améliorer la lisibilité sans changer le comportement

**Ordre d'implémentation** :
1. **Tests unitaires et d'intégration d'abord** : Écrire les scénarios Gherkin (`.feature`) et les step definitions (`.steps.ts`) qui échouent (Rouge)
2. **Adaptations au code ensuite** : Implémenter le code nécessaire pour faire passer les tests (Vert), puis refactoriser si nécessaire

**Fichiers concernés** :

**Tests unitaires** (avec mocking) :
- `__tests__/unit/nuextract-client-error-handling.steps.ts` : Tests unitaires de gestion d'erreur pour `loadInstructions()` et `loadGlobalConfig()`
- `__tests__/unit/nuextract-client-error-handling.feature` : Scénarios Gherkin pour gestion d'erreur
- `__tests__/unit/nuextract-client-logging-handling.steps.ts` : Tests unitaires de logging pour `loadInstructions()` et `loadGlobalConfig()` (expérimentation)
- `__tests__/unit/nuextract-client-logging-handling.feature` : Scénarios Gherkin pour validation des logs (expérimentation)

Principe : Uniquement des scénarios d'erreur pour valider la gestion d'erreur robuste selon @error-handling-governance (messages explicites, Error Cause, terminaison "Script stopped"). Les scénarios de succès sont testés dans les tests d'intégration.

**Tests d'intégration** (avec système externe mocké) :
- `__tests__/integration/with-external-system-mocked/template-generation-mocked.steps.ts`
- `__tests__/integration/with-external-system-mocked/template-generation-mocked.feature`

**Tests d'intégration** (avec système externe réel) :
- `__tests__/integration/with-external-system/template-generation.steps.ts`
- `__tests__/integration/with-external-system/template-generation.feature`

**Pour `loadInstructions(config)`** :
- **Scénario** : Erreur si `templateTransformationInstructions.instructions` absent de config
  - Étant donné une configuration sans `templateTransformationInstructions.instructions`
  - Quand on tente de charger les instructions
  - Alors une erreur "templateTransformationInstructions.instructions non trouvé dans config.nuextract. Script stopped." est générée
  - Et l'erreur est contextualisée avec `console.error()` selon Pattern 3 (@error-handling-governance)
  - Et le processus s'arrête proprement

- **Scénario** : Erreur si `templateTransformationInstructions.instructions` n'est pas un array
  - Étant donné une configuration avec `templateTransformationInstructions.instructions` de type string (au lieu d'array)
  - Quand on tente de charger les instructions
  - Alors une erreur "templateTransformationInstructions.instructions invalide: type \"string\". Format attendu: array de strings. Script stopped." est générée
  - Et l'erreur est contextualisée avec `console.error()` selon Pattern 3 (@error-handling-governance)
  - Et le processus s'arrête proprement

**Pour `loadGlobalConfig()`** :
- **Scénario** : Erreur si schéma JSON Schema introuvable
  - Étant donné que le fichier `/config/extraction-config.schema.json` n'existe pas
  - Quand on tente de charger la configuration globale
  - Alors une erreur "Schema file not found. Script stopped." est générée avec Error Cause selon Pattern 2 (@error-handling-governance)
  - Et l'erreur est contextualisée avec `console.error()` selon Pattern 3 (@error-handling-governance)
  - Et le processus s'arrête proprement

- **Scénario** : Erreur si schéma JSON Schema malformé
  - Étant donné un fichier `/config/extraction-config.schema.json` avec JSON invalide
  - Quand on tente de charger la configuration globale
  - Alors une erreur "Invalid JSON in schema file. Script stopped." est générée avec Error Cause selon Pattern 2 (@error-handling-governance)
  - Et l'erreur est contextualisée avec `console.error()` selon Pattern 3 (@error-handling-governance)
  - Et le processus s'arrête proprement

- **Scénario** : Erreur si structure config invalide après transformation
  - Étant donné un schéma JSON Schema avec structure invalide (pas d'objet)
  - Quand on tente de charger la configuration globale
  - Alors une erreur "Invalid config structure: expected an object. Script stopped." est générée selon Pattern 1 (@error-handling-governance)
  - Et l'erreur est contextualisée avec `console.error()` selon Pattern 3 (@error-handling-governance)
  - Et le processus s'arrête proprement

- **Scénario** : Erreur si section `nuextract` absente après transformation
  - Étant donné un schéma JSON Schema sans section `nuextract`
  - Quand on tente de charger la configuration globale
  - Alors une erreur "Invalid config structure: missing \"nuextract\" section. Script stopped." est générée selon Pattern 1 (@error-handling-governance)
  - Et l'erreur est contextualisée avec `console.error()` selon Pattern 3 (@error-handling-governance)
  - Et le processus s'arrête proprement

**Tests unitaires de logging à ajouter** (`nuextract-client-logging-handling.feature` + `.steps.ts`) - Expérimentation :

**Principe** : Tests spécifiques pour valider la présence des logs (`console.log()` en entrée et en sortie de fonction, `console.error()` en cas d'erreur) selon les bonnes pratiques reconnues (@error-handling-governance Pattern 3). Ces tests sont séparés des tests de gestion d'erreur pour permettre l'expérimentation et l'exploration des patterns de logging.

**Validation flexible** : Les tests valident la présence et le type des logs plutôt que leur contenu exact pour éviter des refactorings de tests excessifs lors de la maintenance corrective et évolutive. Utilisation de patterns/partial matching plutôt que de chaînes exactes.

**Pour `loadInstructions(config)`** :
- **Scénario** : Vérification présence `console.log()` en entrée de fonction
  - Étant donné une configuration valide avec `templateTransformationInstructions.instructions`
  - Quand on charge les instructions
  - Alors un message `console.log()` est émis en entrée de fonction
  - Et le message contient un indicateur d'information (ex: "[info]" ou similaire)
  - Et le message contient une référence à "instructions" ou "chargement" (validation flexible avec `toContain()`)

- **Scénario** : Vérification présence `console.error()` contextualisé en cas d'erreur
  - Étant donné une configuration sans `templateTransformationInstructions.instructions`
  - Quand on tente de charger les instructions
  - Alors un message `console.error()` est émis
  - Et le message contient une référence à "instructions" ou "chargement" (validation flexible avec `toContain()`)
  - Et le message identifie la fonction de manière claire (validation flexible, ex: contient "instructions" ou fonction identifiable par contexte)

- **Scénario** : Vérification message de log pour chargement réussi
  - Étant donné une configuration valide avec `templateTransformationInstructions.instructions` (array de 2 instructions)
  - Quand on charge les instructions
  - Alors un message `console.log()` est émis
  - Et le message contient un indicateur de succès ou d'information (validation flexible avec `toContain()`)

**Pour `loadGlobalConfig()`** :
- **Scénario** : Vérification présence `console.log()` en entrée de fonction
  - Étant donné un schéma JSON Schema valide
  - Quand on charge la configuration globale
  - Alors un message `console.log()` est émis en entrée de fonction
  - Et le message contient un indicateur d'information (ex: "[info]" ou similaire)
  - Et le message contient une référence à "configuration" ou "chargement" (validation flexible avec `toContain()`)

- **Scénario** : Vérification présence `console.error()` contextualisé en cas d'erreur
  - Étant donné que le fichier `/config/extraction-config.schema.json` n'existe pas
  - Quand on tente de charger la configuration globale
  - Alors un message `console.error()` est émis
  - Et le message contient une référence à "configuration" ou "chargement" (validation flexible avec `toContain()`)
  - Et le message identifie la fonction de manière claire (validation flexible, ex: contient "configuration" ou fonction identifiable par contexte)

- **Scénario** : Vérification message de log pour chargement réussi
  - Étant donné un schéma JSON Schema valide avec structure complète
  - Quand on charge la configuration globale
  - Alors un message `console.log()` est émis
  - Et le message contient un indicateur de succès ou d'information (validation flexible avec `toContain()`)

**Tests fonctionnels de succès** (dans tests d'intégration) :

**Tests d'intégration mockés** (`template-generation-mocked.feature` + `.steps.ts`) :
- **Scénario** : Chargement réussi avec instructions valides depuis configuration en mémoire
  - Étant donné une configuration valide avec `templateTransformationInstructions.instructions` (array de strings)
  - Quand on charge les instructions
  - Alors les instructions sont retournées comme string (valeurs de l'array jointes avec `\n`)
  - Et les instructions sont correctement utilisées dans la génération de template

**Tests d'intégration réels** (`template-generation.feature` + `.steps.ts`) :
- **Scénario** : Chargement réussi avec schéma valide et génération de template complète
  - Étant donné un schéma JSON Schema valide avec structure complète
  - Quand on charge la configuration globale et génère le template
  - Alors la configuration est retournée comme objet JSON avec valeurs extraites depuis les `enum`
  - Et le template est généré avec succès en utilisant les instructions depuis la configuration

**Tests d'intégration à adapter** :

**Tests d'intégration mockés** :
- Adapter tests pour valider nouveau chemin (instructions depuis `config.nuextract.templateTransformationInstructions.instructions`)
- Tester erreur si instructions absentes de config
- Valider extraction `templateTransformationInstructions` depuis configuration en mémoire

**Tests d'intégration réels** :
- Valider que le workflow complet fonctionne avec instructions depuis configuration en mémoire
- Valider que les instructions sont correctement utilisées dans la génération de template

**Tests de validation JSON Schema** :
- Test validation avec schéma JSON Schema pour `extraction-config.json` (historisation) - cette validation se fait lors de la sauvegarde de l'historisation, pas dans `loadInstructions()`

## Impact sur configuration

### 3. Schéma JSON Schema et fichier JSON d'historisation

**Schéma JSON Schema** (`/config/extraction-config.schema.json`) :
- **Rôle** : Fait office de structure et de gestion du paramétrage
- **Localisation** : Reste dans `/config` (pas partagé avec les autres modules)
- **Contenu** : Définit la structure de `extraction-config.json` avec TOUS les paramètres repris dans le schéma, incluant le pattern `enum` pour `templateTransformationInstructions.instructions`
- **Utilisation** : 
  - Schéma source pour paramétrage (définition des valeurs possibles avec enum)
  - Schéma source pour validation de `extraction-config.json` (historisation) créé lors de l'extraction
  - Il n'y a qu'un seul `extraction-config.json` par extraction, créé à partir du schéma dans le répertoire des données extraites

**Fichier JSON d'historisation** (`extraction-config.json` dans répertoire des données extraites) :
- **Rôle** : Fichier JSON unique créé à des fins d'historisation des paramètres techniques effectivement utilisés lors de l'extraction
- **Localisation** : Répertoire défini par `artifactBaseDirectory` (ex: `"shared/hermes2022-extraction-files/data"`)
- **Contenu** : Paramètres techniques effectivement utilisés lors de l'extraction, dont `templateTransformationInstructions.instructions` (array avec valeurs conformes à l'enum du schéma JSON Schema)
- **Création** : Créé à partir de `/config/extraction-config.schema.json` lors de l'extraction et sauvegardé après l'extraction (fonctionnalité à implémenter dans `nuextract-client.js`)
- **Validation** : Validé avec `/config/extraction-config.schema.json` lors de la sauvegarde
- **Note** : Il n'y a qu'un seul `extraction-config.json` par extraction, créé dans le répertoire des données extraites

**Modifications** :
- **`extraction-config.schema.json`** : Créer schéma JSON Schema dans `/config` qui définit la structure de `extraction-config.json` avec TOUS les paramètres, incluant le pattern `enum` pour `templateTransformationInstructions.instructions`
- **`extraction-config.json` (historisation)** :
  - `templateTransformationInstructionFile` : Supprimé (remplacement direct par `templateTransformationInstructions.instructions`)
  - `templateTransformationInstructions` : Ajouté sous `nuextract` pour les instructions à utiliser
  - Les autres paramètres (`templateMode`, `infer-templatePath`, `infer-templateAsyncPath`, etc.) restent inchangés
- **Historisation** : Les valeurs effectivement utilisées seront sauvegardées dans `extraction-config.json` (historisation dans répertoire des données extraites) après l'extraction

**Structure dans `extraction-config.json` (historisation)** :
```json
{
  "nuextract": {
    "templateTransformationInstructions": {
      "description": "Instructions pour génération de template NuExtract depuis le schéma JSON",
      "instructions": [
        "- transformes le schéma JSON en template NuExtract",
        "- considères les énumérations JSON..."
      ]
    },
    "templateMode": "sync",
    "infer-templatePath": "/api/infer-template",
    "infer-templateAsyncPath": "/api/infer-template-async"
  }
}
```

## Validation

### Validation extraction-config.json (historisation)

**Code à ajouter** :

```javascript
// Validation extraction-config.json (historisation) avec schéma JSON Schema
async function validateExtractionConfig(extractionConfigPath) {
  const schemaPath = resolveFromRepoRoot('hermes2022-concepts-site-extraction/config/extraction-config.schema.json');
  const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const extractionConfigContent = JSON.parse(fs.readFileSync(extractionConfigPath, 'utf8'));
  
  const ajv = new Ajv({ strict: false, allErrors: true });
  const validate = ajv.compile(schemaContent);
  
  const valid = validate(extractionConfigContent);
  if (!valid) {
    const errorMessages = validate.errors.map(err => `${err.instancePath} ${err.message}`).join('; ');
    throw new Error(`Invalid extraction-config.json (historisation): ${errorMessages}. Script stopped.`, { cause: validate.errors });
  }
  
  console.log(`[info] extraction-config.json (historisation) validé avec succès`);
}
```

**Intégration** :
- Appeler après création/sauvegarde de `extraction-config.json` (historisation) dans le répertoire des données extraites
- Valider avant utilisation des instructions depuis l'historisation

## Résumé des changements

### Fichiers à modifier

1. **`nuextract-client.js`** :
   - `loadGlobalConfig()` : Lire `/config/extraction-config.schema.json` au lieu de `/config/extraction-config.json`, transformer le schéma en objet config JSON utilisable dans le code
   - `loadInstructions()` : Extraire depuis `config.nuextract.templateTransformationInstructions.instructions` (SRP : extraction uniquement depuis configuration en mémoire, erreur si absent), supprimer fallback Markdown
   - **Sauvegarde historisation** : Fonction à implémenter pour créer et sauvegarder `extraction-config.json` (historisation) dans le répertoire des données extraites après l'extraction, créé à partir de `/config/extraction-config.schema.json` (ou à partir de la configuration en mémoire transformée depuis le schéma)

2. **Tests BDD** :
   - Adapter tests pour nouveau chemin (instructions depuis `config.nuextract.templateTransformationInstructions.instructions`)
   - Ajouter test erreur si `templateTransformationInstructions.instructions` absent de config
   - Valider extraction `templateTransformationInstructions` depuis configuration en mémoire

3. **Schéma JSON Schema** :
   - Créer schéma JSON Schema (`/config/extraction-config.schema.json`) qui définit la structure de `extraction-config.json` avec TOUS les paramètres, incluant le pattern `enum` pour `templateTransformationInstructions.instructions`
   - Schéma fait office de structure et de gestion du paramétrage
   - Schéma reste dans `/config` (pas partagé avec les autres modules)

### Changements majeurs

**Changement principal** : Instructions depuis `config.nuextract.templateTransformationInstructions.instructions` (configuration en mémoire) au lieu de fichier Markdown séparé

**Bénéfices** :
- Configuration technique NuExtract centralisée dans le schéma JSON Schema (`/config/extraction-config.schema.json`) sous `nuextract` (SRP)
- Pas de parsing Markdown nécessaire (instructions dans JSON)
- Validation par schéma JSON Schema dédié (`/config/extraction-config.schema.json` - structure et paramétrage)
- `loadInstructions()` respecte SRP : extraction uniquement depuis configuration en mémoire, pas de chargement fichier, erreur si instructions absents
- Historisation structurée dans `extraction-config.json` (historisation dans répertoire des données extraites) sauvegardée après l'extraction

**Contraintes** :
- Migration instructions Markdown → JSON (array avec enum dans `extraction-config.json`)
- Validation `extraction-config.json` (historisation) avec schéma JSON Schema supplémentaire
- Tests BDD à adapter
- Fonctionnalité de sauvegarde de `extraction-config.json` (historisation) à implémenter

## Conclusion

**Impact modéré à important** : Changements dans `loadGlobalConfig()` (lecture schéma et transformation) et `loadInstructions()` (extraction depuis config en mémoire), avec remplacement direct (plus de fallback Markdown)

**Deux fichiers** :
- **Schéma JSON Schema** (`/config/extraction-config.schema.json`) : Structure et paramétrage (définit TOUS les paramètres), reste dans `/config`. Utilisé pour paramétrage (enum) et validation de l'historisation. Source pour créer le fichier d'historisation
- **Fichier JSON d'historisation** (`extraction-config.json` dans répertoire des données extraites) : Historisation unique des paramètres techniques effectivement utilisés lors de l'extraction. Créé à partir de `/config/extraction-config.schema.json` et validé avec `/config/extraction-config.schema.json`

**Prochaines étapes** :
1. Créer schéma JSON Schema (`/config/extraction-config.schema.json`) qui définit la structure de `extraction-config.json` avec TOUS les paramètres, incluant le pattern `enum` pour `templateTransformationInstructions.instructions`
2. Supprimer `templateTransformationInstructionFile` du schéma (remplacement direct par `templateTransformationInstructions`)
3. Implémenter modifications `loadGlobalConfig()` pour lire `/config/extraction-config.schema.json` au lieu de `/config/extraction-config.json`, transformer le schéma en objet config JSON utilisable dans le code (fonction `transformSchemaToConfig()`)
4. Implémenter modifications `loadInstructions()` pour extraire depuis `config.nuextract.templateTransformationInstructions.instructions` (SRP : extraction uniquement depuis configuration en mémoire, erreur si absent)
5. Adapter tests BDD pour valider nouveau chemin (instructions depuis config) et test erreur si absent
6. Migrer instructions Markdown → JSON (array avec enum dans `extraction-config.json`)
7. Implémenter fonctionnalité de sauvegarde de `extraction-config.json` (historisation) dans le répertoire défini par `artifactBaseDirectory` lors de l'extraction
8. Ajouter validation `extraction-config.json` (historisation) avec schéma JSON Schema lors de la sauvegarde

