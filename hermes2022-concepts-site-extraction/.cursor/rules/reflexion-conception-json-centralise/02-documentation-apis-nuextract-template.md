# Documentation des APIs NuExtract pour génération Template

> Date : 2025-10-31
> Phase : 1 - Template uniquement

## Objectif

Documenter les APIs NuExtract pertinentes pour la génération de template NuExtract depuis un schéma JSON Schema avec instructions intégrées.

## APIs identifiées

### 1. POST /api/infer-template (mode synchrone)

**Description** :
- Génère un template NuExtract depuis une description textuelle naturelle
- Traitement synchrone avec timeout HTTP
- Retourne directement le template généré

**Endpoint** : `POST https://nuextract.ai/api/infer-template`

**Request Body** :
```json
{
  "description": "Schéma JSON Schema + Instructions pour transformation en template NuExtract"
}
```

**Schéma `TemplateRequest`** :
```yaml
TemplateRequest:
  type: object
  required:
    - description
  properties:
    description:
      type: string
      description: Natural language description including JSON Schema and instructions
```

**Response 200** :
```json
{
  // Template NuExtract généré (objet JSON)
  "orderId": "verbatim-string",
  "customerId": "verbatim-string",
  // ... structure conforme au template
}
```

**Response 400** : Invalid value for body

**Limitations connues** :
- Timeout à ~11 secondes avec schémas complexes (>4000 caractères)
- Retourne erreur 206 (Partial Content) avec body vide `{}` en cas de timeout
- Non documenté dans OpenAPI spec (comportement observé empiriquement)

**Cas d'usage** :
- Schémas JSON simples (<200 caractères)
- Génération rapide (<5 secondes)
- Pas de polling nécessaire

### 2. POST /api/infer-template-async (mode asynchrone)

**Description** :
- Génère un template NuExtract depuis une description textuelle naturelle
- Traitement asynchrone avec job ID et polling
- Supporte schémas complexes (>4000 caractères)

**Endpoint** : `POST https://nuextract.ai/api/infer-template-async?timeout=60s`

**Paramètres query** :
- `timeout` (optionnel) : Temps max d'attente pour completion (ex: "60s")

**Request Body** :
```json
{
  "description": "Schéma JSON Schema + Instructions pour transformation en template NuExtract"
}
```

**Response 200** :
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Polling via GET /api/jobs/{jobId}** :
```json
{
  "status": "completed" | "timeout" | "failed",
  "outputData": { /* Template NuExtract généré */ },
  "completedAt": "2024-01-22T16:45:00.000Z"
}
```

**Statuts acceptés** :
- `"completed"` : Succès normal
- `"timeout"` : Dépassement timeout mais `outputData` présent (traiter comme succès)
- `"failed"` : Échec du job

**Cas d'usage** :
- Schémas JSON complexes (>4000 caractères)
- Génération longue (>11 secondes)
- Workflow avec polling (job ID + statut)

## Format de description

### Structure actuelle (Markdown)

**Format envoyé** :
```
[Schéma JSON Schema complet résolu]
[Instructions textuelles]
```

**Exemple** :
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "properties": {
    "language": {
      "type": "string",
      "enum": ["de", "fr", "it", "en"]
    }
  }
}

- transformes le schéma JSON en template NuExtract
- considères les énumérations JSON comme par exemple "language": {"type": "string","enum": ["de", "fr", "it", "en"]} comme des énumérations dans le format de template NuExtract "language": ["de", "fr", "it", "en"]
```

**Point critique** : Schéma d'abord, instructions après (format validé empiriquement)

### Structure proposée (JSON intégré)

**Format proposé** :
- Schéma JSON contient métadonnées `extractionTemplateInstructions`
- Instructions extraites depuis schéma résolu
- Format combiné identique : Schéma + Instructions (string)

**Avantage** :
- Instructions co-localisées avec schéma
- Pas de parsing Markdown nécessaire
- Validation JSON Schema unique

## Limitations API NuExtract v3

### Pas de séparation prompts/contenu

**Contrainte actuelle** :
- API v3 ne supporte pas la séparation prompts/contenu
- Un seul champ `description` combine schéma + instructions
- Pas de champs séparés `prompt` et `content`

**Impact sur conception** :
- Instructions doivent être combinées avec schéma dans `description`
- Format actuel (schéma + instructions) reste nécessaire
- Intégration dans JSON n'élimine pas la combinaison finale

### Limite taille description

**Contrainte** :
- Limite de 32k caractères pour champ `description` (selon support NuMind)
- Schémas complexes avec `$ref` résolues peuvent être volumineux

**Impact** :
- Schéma résolu + instructions doit rester <32k caractères
- Instruction concise recommandée

## Cas d'usage recommandés

### Pour génération template HERMES2022

**Endpoint recommandé** : `/api/infer-template-async`

**Justification** :
- Schéma `hermes2022-concepts.json` avec `$ref` résolues = ~4442 caractères
- Mode sync timeout systématiquement (~11 secondes)
- Mode async réussit en ~44 secondes

**Workflow recommandé** :
1. POST `/api/infer-template-async?timeout=60s` avec `description` (schéma + instructions)
2. Obtenir `jobId`
3. Sleep initial `templateGenerationDuration` ms (défaut 30000ms)
4. Polling GET `/api/jobs/{jobId}` toutes les 3 secondes
5. Max 20 tentatives
6. Accepter statuts `"completed"` ET `"timeout"` (si `outputData` présent)

## Format template NuExtract généré

### Types de base

- `"type": "string"` → `"string"`
- `"type": "string", "pattern": "..."` → `"verbatim-string"`
- `"type": "string", "format": "date"` → `"date-time"`

### Énumérations

**JSON Schema** :
```json
{
  "language": {
    "type": "string",
    "enum": ["de", "fr", "it", "en"]
  }
}
```

**Template NuExtract** :
```json
{
  "language": ["de", "fr", "it", "en"]
}
```

**Règle** : Les `enum` JSON Schema sont converties en tableaux dans template NuExtract

### Références $ref

**JSON Schema** :
```json
{
  "concept-phases": {
    "$ref": "./hermes2022-phases.json"
  }
}
```

**Template NuExtract** :
```json
{
  "concept-phases": {
    /* Structure complète intégrée, pas de $ref */
  }
}
```

**Règle** : Les `$ref` sont résolues et intégrées dans le template final

### Tableaux

**JSON Schema** :
```json
{
  "phases": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "pattern": "^ph_[a-z0-9]{6}$" },
        "name": { "type": "string" }
      }
    }
  }
}
```

**Template NuExtract** :
```json
{
  "phases": [{
    "id": "verbatim-string",
    "name": "string"
  }]
}
```

**Règle** : Les `array` JSON Schema sont représentés avec un seul élément type dans template

## Conclusion

**APIs pertinentes** :
- `/api/infer-template` : Mode sync (petits schémas <200 caractères)
- `/api/infer-template-async` : Mode async (schémas complexes >4000 caractères) - **RECOMMANDÉ pour HERMES2022**

**Format description** :
- Schéma JSON résolu + Instructions textuelles
- Format : String combinée (pas de séparation prompts/contenu en v3)

**Limitations** :
- Pas de séparation prompts/contenu dans API v3
- Limite 32k caractères pour `description`
- Instructions doivent être combinées avec schéma