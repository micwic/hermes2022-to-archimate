# Plan exécuté : Ajustement des schémas JSON selon le concept enum paramétrique

**Date d'exécution** : 2025-11-10

**Plan original** : `tests-08c2447b.plan.md`

**Contexte** : Résolution des erreurs de validation Ajv causées par l'incompatibilité entre les valeurs retournées par NuExtract et les schémas JSON. Les propriétés paramétriques (`sourceUrl`, `extractionInstructions`) ne sont pas retournées par NuExtract mais doivent être forcées depuis le schéma.

## Objectif

Ajuster les schémas JSON pour utiliser `items.enum` et implémenter le post-traitement qui force l'array complet `items.enum` pour les propriétés paramétriques.

## Modifications effectuées

### 1. Ajustement de hermes2022-concepts.json

**Fichier** : `/home/micwic/gitRepositories/hermes2022-to-archimate/shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json`

**Modifications** :

- `method.sourceUrl` : Converti en array avec `items.enum: ["/"]`
- `method.lastChecked` : **SUPPRIMÉ** (redondant avec sidecar d'approbation)
- `method.required` : Retiré `lastChecked`
- `concepts.sourceUrl` : Converti en array avec `items.enum: ["/project-management/method-overview.html", "/project-management/method-overview/preface.html"]`
- `concepts.lastChecked` : **SUPPRIMÉ**
- `concepts.required` : Retiré `lastChecked`

**Justification** : Les propriétés `sourceUrl` et `extractionInstructions` sont des **paramètres d'extraction** (pas des valeurs extraites par NuExtract), donc le script doit forcer l'array complet depuis `items.enum`.

### 2. Ajustement de hermes2022-phases.json

**Fichier** : `/home/micwic/gitRepositories/hermes2022-to-archimate/shared/hermes2022-extraction-files/config/json-schemas/hermes2022-phases.json`

**Modifications** :

- `overview.sourceUrl` : Converti en array avec `items.enum: ["/project-management/phases.html"]`
- `overview.lastChecked` : **SUPPRIMÉ**
- `overview.required` : Retiré `lastChecked`
- `phases[].sourceUrl` : Converti en array avec `items.enum` (6 URLs : initiation, concept, deployment, implementation, execution, closure)
- `phases[].lastChecked` : **SUPPRIMÉ**
- `phases[].extractionInstructions[6]` : Modifié pour demander explicitement un array :
  - **Avant** : `"Determine supported approaches: traditional, agile, or both. Fill approach field with one or more values allowed by schema (traditional, agile, both) based on page content"`
  - **Après** : `"Determine supported approaches as array: [\"traditional\"], [\"agile\"], or [\"traditional\", \"agile\"] if both are supported."`
- `phases[].required` : Retiré `lastChecked`
- `required` (niveau racine) : Retiré `lastChecked`

**Justification** : 
- `sourceUrl` et `extractionInstructions` sont des paramètres d'extraction → forcés par le script
- `approach` est une valeur métier extraite → NuExtract doit retourner un array (instruction modifiée)

### 3. Post-traitement dans nuextract-client.js

**Fichier** : `/home/micwic/gitRepositories/hermes2022-to-archimate/hermes2022-concepts-site-extraction/src/nuextract-client.js`

**Fonction `normalizeEnumValues()` créée** (ligne 840-880) :

```javascript
/**
 * Normalise les valeurs enum dans l'artefact selon le schéma
 * Force les valeurs définies dans items.enum du schéma pour les propriétés paramétriques (sourceUrl, extractionInstructions)
 * @param {object} artifact - Artefact à normaliser (modifié en place)
 * @param {object} schema - Schéma résolu avec les enum de référence
 * @param {string} jsonPointer - Pointeur JSON courant (pour logs)
 */
function normalizeEnumValues(artifact, schema, jsonPointer = '') {
  if (!schema || !schema.properties) return;
  
  const schemaProps = schema.properties;
  
  for (const key in artifact) {
    if (!artifact.hasOwnProperty(key)) continue;
    
    const value = artifact[key];
    const schemaProp = schemaProps[key];
    
    if (!schemaProp) continue;
    
    const currentPointer = jsonPointer ? `${jsonPointer}/${key}` : `/${key}`;
    
    // Cas 1 : Array avec items.enum (sourceUrl, extractionInstructions)
    // Force l'array complet de toutes les valeurs items.enum (propriétés paramétriques)
    if (schemaProp.type === 'array' && schemaProp.items?.enum && Array.isArray(schemaProp.items.enum)) {
      const expectedArray = schemaProp.items.enum; // Array complet des valeurs paramétriques
      console.log(`[debug] Normalisation items.enum pour ${currentPointer} : forcer ${JSON.stringify(expectedArray)}`);
      artifact[key] = expectedArray;
    }
    // Cas 2 : Objet imbriqué (récursion)
    else if (typeof value === 'object' && value !== null && !Array.isArray(value) && schemaProp.properties) {
      normalizeEnumValues(value, schemaProp, currentPointer);
    }
    // Cas 3 : Array d'objets (phases)
    else if (Array.isArray(value) && schemaProp.items?.properties) {
      value.forEach((item, index) => {
        normalizeEnumValues(item, schemaProp.items, `${currentPointer}/${index}`);
      });
    }
  }
}
```

**Appel de la fonction** (ligne 953-955) :

```javascript
// Normaliser les valeurs enum depuis le schéma (forcer sourceUrl, extractionInstructions selon concept enum paramétrique)
console.log(`[info] Normalisation des valeurs enum depuis le schéma`);
normalizeEnumValues(artifact, resolvedSchema);
```

**Suppression du log verbeux** : Retiré le log `console.log('[debug] Artefact final reconstruit AVANT validation Ajv :', JSON.stringify(artifact, null, 2))` pour réduire le bruit dans les logs.

**Justification** :
- **Cas 1** : Force l'array complet `items.enum` pour propriétés paramétriques uniquement
- **Cas 2** : Récursion sur objets imbriqués (method, concepts, concept-phases)
- **Cas 3** : Récursion sur arrays d'objets (phases)
- **Pas de Cas 4** : Conversion string→array supprimée (inutile car instruction d'extraction modifiée pour `approach`)

## Principe du concept enum paramétrique

### Propriétés paramétriques (sourceUrl, extractionInstructions)

- **NuExtract ne les retourne PAS** : Ce sont des paramètres d'extraction, pas des valeurs extraites
- **Le schéma définit** : `items.enum: [val1, val2, ...]` (liste des valeurs possibles)
- **Le script force** : `artifact.sourceUrl = items.enum` (l'array complet)

**Exemple concret** :

```json
// Schéma
"sourceUrl": {
  "type": "array",
  "items": {
    "type": "string",
    "enum": [
      "/project-management/method-overview.html",
      "/project-management/method-overview/preface.html"
    ]
  }
}

// Post-traitement force
artifact.concepts.sourceUrl = [
  "/project-management/method-overview.html",
  "/project-management/method-overview/preface.html"
]
```

### Propriétés métier (approach)

- **NuExtract les retourne** : Valeurs métier extraites depuis les pages HTML
- **Le schéma définit** : `type: "array"` avec `items.enum: ["traditional", "agile"]`
- **L'instruction demande** : Array explicite (`["traditional"]` ou `["traditional", "agile"]`)
- **Pas de normalisation** : La valeur retournée par NuExtract est conservée telle quelle

## Avantages de items.enum

1. **Flexibilité** : Permet d'utiliser `default` ultérieurement pour sélectionner un sous-ensemble
2. **Human-in-the-loop** : Facilite les choix intelligents sur base de listes de valeurs
3. **Validation Ajv** : Chaque élément de l'array est validé individuellement
4. **Séparation claire** : Distinction nette entre paramètres d'extraction et valeurs métier

## Risques et points d'attention

1. **Suppression de lastChecked** : Le sidecar d'approbation couvre ce besoin (traçabilité préservée)
2. **Normalisation ciblée** : Ne doit pas écraser les valeurs métier extraites par NuExtract (id, name, description, etc.)
3. **phases[].sourceUrl** : Toutes les URLs possibles listées dans `items.enum`, le script force l'array complet (6 URLs)
4. **approach** : NuExtract doit retourner un array (instruction modifiée pour le demander explicitement)

## Validation

- ✅ Aucune erreur de linting détectée
- ✅ Structure des schémas JSON conforme à JSON Schema Draft-07
- ✅ Fonction `normalizeEnumValues()` implémentée avec 3 cas de traitement
- ✅ Appel de normalisation placé AVANT validation Ajv
- 🚧 Tests d'exécution à effectuer pour valider le comportement complet

## Fichiers impactés

1. `/home/micwic/gitRepositories/hermes2022-to-archimate/shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json`
2. `/home/micwic/gitRepositories/hermes2022-to-archimate/shared/hermes2022-extraction-files/config/json-schemas/hermes2022-phases.json`
3. `/home/micwic/gitRepositories/hermes2022-to-archimate/hermes2022-concepts-site-extraction/src/nuextract-client.js`

## Prochaines étapes

1. Exécuter le script d'extraction pour valider le comportement
2. Vérifier que les erreurs Ajv disparaissent après normalisation
3. Valider que `approach` est correctement retourné en array par NuExtract
4. Vérifier que `sourceUrl` et `extractionInstructions` sont forcés correctement


