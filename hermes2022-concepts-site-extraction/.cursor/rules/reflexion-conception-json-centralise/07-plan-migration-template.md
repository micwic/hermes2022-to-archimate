# Plan de migration - Template

> Date : 2025-10-31
> Phase : 1 - Template uniquement

## Objectif

Élaborer plan de migration pour intégrer instructions de génération de template dans schéma JSON avec rétrocompatibilité assurée.

## Stratégie de transition

### Approche hybride progressive

**Phase 1.1** : Préparation infrastructure
- Créer schéma `extraction-template-instructions.json` pour validation métadonnées
- Ajouter propriété `extractionTemplateInstructions` dans `hermes2022-concepts.json`
- Migrer instructions Markdown → JSON (format string)

**Phase 1.2** : Adaptation code avec fallback
- Modifier `loadInstructions()` pour priorité schéma > Markdown
- Modifier `loadAndResolveSchemas()` pour retourner objet optionnellement
- Adapter `generateTemplate()` pour utiliser schéma résolu comme objet
- Maintenir fallback Markdown pour rétrocompatibilité

**Phase 1.3** : Tests et validation
- Tests BDD avec nouveau chemin (instructions depuis schéma)
- Tests fallback Markdown (instructions absentes du schéma)
- Validation métadonnées avec schéma dédié
- Comparaison templates générés (ancien vs nouveau chemin)

**Phase 1.4** : Validation qualité
- Comparer template généré avec ancien vs nouveau chemin
- Vérifier identité templates (validation régression)
- Valider comportement fallback si métadonnées absentes

**Phase 1.5** : Dépréciation progressive
- Marquer `templateTransformationInstructionFile` comme optionnel (fallback uniquement)
- Documenter nouveau chemin (instructions depuis schéma)
- Maintenir support Markdown pendant période transition

**Phase 1.6** : Documentation généralisation
- Documenter pattern `extractionTemplateInstructions` pour réutilisation
- Préparer généralisation future (`extractionInstructions` pour autres extractions)
- Identifier schémas à migrer en phase 2

## Étapes détaillées

### Phase 1.1 : Préparation infrastructure

**Tâche 1.1.1** : Créer schéma `extraction-template-instructions.json`

**Fichier** : `shared/hermes2022-extraction-files/config/json-schemas/extraction-template-instructions.json`

**Contenu** :
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
          "- considères les énumérations JSON..."
        ]
      },
      "description": "Array d'instructions sélectionnées (valeurs conformes à l'enum du schéma, pile de textes libres possibles)"
    }
  },
  "required": ["instructions"],
  "additionalProperties": false
}
```

**Tâche 1.1.2** : Ajouter `extractionTemplateInstructions` dans `hermes2022-concepts.json`

**Fichier** : `shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json`

**Modification** :
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "...",
  "title": "...",
  "description": "...",
  "extractionTemplateInstructions": {
    "description": "Instructions pour génération de template NuExtract depuis ce schéma JSON Schema",
    "instructions": [
      "- transformes le schéma JSON en template NuExtract",
      "- considères les énumérations JSON comme par exemple \"language\": {\"type\": \"string\",\"enum\": [\"de\", \"fr\", \"it\", \"en\"]} comme des énumérations dans le format de template NuExtract \"language\": [\"de\", \"fr\", \"it\", \"en\"]"
    ]
  },
  "type": "object",
  "properties": {
    // ... reste inchangé
  }
}
```

**Tâche 1.1.3** : Migrer instructions Markdown → JSON

**Source** : `hermes2022-concepts-site-extraction/config/instructions-template-nuextract.md`

**Section à migrer** :
```
## Instructions complémentaires pour /api/infer-template /api/infer-template-async de NuExtract

- transformes le schéma JSON en template NuExtract
- considères les énumérations JSON comme par exemple "language": {"type": "string","enum": ["de", "fr", "it", "en"]} comme des énumérations dans le format de template NuExtract "language": ["de", "fr", "it", "en"]
```

**Cible** : `extractionTemplateInstructions.instructions` dans `hermes2022-concepts.json`

**Format** : Array de strings (valeurs dans `enum` du schéma JSON Schema)

### Phase 1.2 : Adaptation code avec fallback

**Tâche 1.2.1** : Modifier `loadInstructions()` dans `nuextract-client.js`

**Changement** :
- Ajouter paramètre `resolvedSchema`
- Vérifier `resolvedSchema.extractionTemplateInstructions.instructions` en priorité
- Fallback sur fichier Markdown si instructions absentes

**Tâche 1.2.2** : Modifier `loadAndResolveSchemas()` dans `nuextract-client.js`

**Changement** :
- Ajouter paramètre optionnel `returnObject` (défaut `false`)
- Retourner objet résolu si `returnObject === true`
- Retourner string si `returnObject === false` (compatibilité)

**Tâche 1.2.3** : Modifier `generateTemplate()` dans `nuextract-client.js`

**Changement** :
- Charger schéma résolu comme objet (`returnObject = true`)
- Passer schéma résolu à `loadInstructions()`
- Extraire instructions depuis array `resolvedSchema.extractionTemplateInstructions.instructions`
- Joindre les valeurs de l'array avec `\n` pour concaténation
- **Note** : Mode/endpoint depuis `extraction-config.json` uniquement (pas depuis métadonnées - SRP)

**Tâche 1.2.4** : Ajouter validation métadonnées

**Fonction à créer** :
```javascript
async function validateExtractionTemplateInstructions(resolvedSchema) {
  if (!resolvedSchema.extractionTemplateInstructions) {
    return; // Métadonnées optionnelles
  }
  
  const metadataSchema = require('./shared/hermes2022-extraction-files/config/json-schemas/extraction-template-instructions.json');
  const ajv = new Ajv({ strict: false, allErrors: true });
  const validate = ajv.compile(metadataSchema);
  
  const valid = validate(resolvedSchema.extractionTemplateInstructions);
  if (!valid) {
    // ... erreur
  }
}
```

**Intégration** : Appeler dans `loadAndResolveSchemas()` après résolution

### Phase 1.3 : Tests et validation

**Tâche 1.3.1** : Adapter tests BDD existants

**Fichiers** :
- `__tests__/integration/with-external-system/template-generation.steps.ts`
- `__tests__/integration/with-external-system-mocked/template-generation-mocked.steps.ts`

**Modifications** :
- Valider nouveau chemin (instructions depuis schéma)
- Valider fallback Markdown si métadonnées absentes
- Comparer templates générés (ancien vs nouveau chemin)

**Tâche 1.3.2** : Ajouter tests validation métadonnées

**Tests à ajouter** :
- Test instructions valides depuis schéma (array avec valeurs conformes à enum)
- Test instructions invalides (valeurs hors enum)
- Test métadonnées absentes (fallback Markdown)

**Tâche 1.3.3** : Tests régression

**Tests à exécuter** :
- Génération template avec nouveau chemin
- Génération template avec fallback Markdown
- Comparaison templates générés (validation identité)

### Phase 1.4 : Validation qualité

**Tâche 1.4.1** : Comparaison templates

**Action** : Générer template avec ancien chemin (Markdown) et nouveau chemin (schéma), comparer résultats

**Validation** : Templates identiques (pas de régression)

**Tâche 1.4.2** : Validation comportement fallback

**Action** : Tester avec schéma sans métadonnées `extractionTemplateInstructions`

**Validation** : Fallback Markdown fonctionne correctement

**Tâche 1.4.3** : Validation métadonnées

**Action** : Tester avec métadonnées invalides (valeurs hors enum dans array)

**Validation** : Erreurs validation détectées correctement (valeurs hors enum dans array `instructions`)

### Phase 1.5 : Dépréciation progressive

**Tâche 1.5.1** : Documenter nouveau chemin

**Fichier** : `specification-hermes2022-concepts-site-extraction.mdc`

**Documentation** :
- Nouveau chemin (instructions depuis schéma, array avec enum)
- Priorité : Instructions depuis schéma > Fallback Markdown
- Mode/endpoint depuis `extraction-config.json` uniquement (SRP)
- Fallback Markdown (rétrocompatibilité)

**Tâche 1.5.2** : Marquer `templateTransformationInstructionFile` comme optionnel

**Configuration** : `extraction-config.json`

**Documentation** : `templateTransformationInstructionFile` optionnel (fallback uniquement)

**Tâche 1.5.3** : Maintenir support Markdown

**Période** : Support hybride pendant transition (min 1 mois)

**Justification** : Rétrocompatibilité assurée pendant migration

### Phase 1.6 : Documentation généralisation

**Tâche 1.6.1** : Documenter pattern `extractionTemplateInstructions`

**Documentation** :
- Structure métadonnées (instructions avec array et enum)
- Validation schéma (array avec valeurs conformes à enum)
- Pattern `enum` avec array pour `instructions` et `sourceUrl` (AMÉLIORATION pour `sourceUrl`)
- SRP : Paramètres implémentation (`apiEndpoint`, `apiMode`) dans `extraction-config.json`
- Pattern réplicable pour autres extractions

**Tâche 1.6.2** : Préparer généralisation future

**Identification** :
- Schémas à migrer (`hermes2022-phases.json`, etc.)
- Structure `extractionInstructions` (sans "Template")
- Pattern `enum` pour paramétrage/validation/historisation

**Tâche 1.6.3** : Plan généralisation Phase 2

**Éléments** :
- Application pattern aux autres extractions
- Structure `extractionInstructions` généralisée
- Pattern `enum` réutilisé

## Critères de validation

### Validation Phase 1.1

- Schéma `extraction-template-instructions.json` créé et validé
- Métadonnées `extractionTemplateInstructions` ajoutées dans `hermes2022-concepts.json`
- Instructions migrées (Markdown → JSON string)

### Validation Phase 1.2

- Code modifié avec fallback Markdown
- Validation métadonnées implémentée
- Priorité métadonnées > config > défaut fonctionnelle

### Validation Phase 1.3

- Tests BDD passent (nouveau chemin)
- Tests fallback Markdown passent
- Tests validation métadonnées passent

### Validation Phase 1.4

- Templates générés identiques (ancien vs nouveau chemin)
- Fallback Markdown fonctionne si métadonnées absentes
- Validation métadonnées détecte erreurs correctement

### Validation Phase 1.5

- Documentation mise à jour
- `templateTransformationInstructionFile` marqué optionnel
- Support hybride maintenu

### Validation Phase 1.6

- Pattern documenté pour réutilisation
- Généralisation future planifiée
- Schémas Phase 2 identifiés

## Risques et mitigation

### Risque 1 : Régression template généré

**Mitigation** :
- Comparaison templates ancien vs nouveau chemin
- Tests régression avant déploiement
- Fallback Markdown en cas de problème

### Risque 2 : Validation métadonnées complexe

**Mitigation** :
- Schéma dédié pour validation métadonnées
- Tests validation exhaustifs
- Messages erreurs explicites

### Risque 3 : Migration instructions incomplète

**Mitigation** :
- Vérification manuelle migration Markdown → JSON
- Tests validation instructions extraites
- Fallback Markdown comme sécurité

## Conclusion

**Approche** : Hybride progressive avec fallback Markdown

**Phases** : 6 phases de migration avec validation à chaque étape

**Rétrocompatibilité** : Assurée pendant transition (fallback Markdown)

**Validation** : Critères clairs à chaque phase

**Risques** : Identifiés et mitigation en place

**Prochaines étapes** : Démarrage Phase 1.1 (Préparation infrastructure)

