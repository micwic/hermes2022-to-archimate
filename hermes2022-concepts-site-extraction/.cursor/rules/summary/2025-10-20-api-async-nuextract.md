# Résumé de session : Migration vers API asynchrone NuExtract

> Date : 2025-10-20
> Module : hermes2022-concepts-site-extraction
> Impact : Modification majeure de l'intégration API NuExtract

## Contexte

Les tests d'intégration BDD Cucumber échouaient lors des appels à l'API NuExtract pour la génération de templates à partir du schéma JSON `hermes2022-concepts.json` (4442 caractères). L'erreur HTTP 206 (Partial Content) était retournée avec un body vide.

## Problème identifié

### Symptômes observés

- L'API synchrone `/api/infer-template` timeout systématiquement à ~11 secondes avec le schéma complexe `hermes2022-concepts.json` (4442 caractères)
- Erreur HTTP 206 (Partial Content) retournée avec body JSON vide `{}`
- Le code 206 n'est pas documenté pour `/api/infer-template` dans l'OpenAPI spec NuExtract
- Schémas simples (<200 caractères) fonctionnent correctement avec l'API synchrone

### Analyse technique

Tests réalisés avec `curl` manuel :

1. **API synchrone `/api/infer-template`** :
   - Schéma simple (nom/email) : Succès en <5 secondes
   - Schéma `hermes2022-concepts.json` : Erreur 206 avec body vide après ~11 secondes

2. **API asynchrone `/api/infer-template-async`** :
   - Même schéma complexe : Succès après 44 secondes
   - Statut job : **`"timeout"`** (minuscules) avec `completedAt` défini et `outputData` présent
   - Template généré conforme aux attentes
   - **Vérification par curl direct** : `curl /api/jobs/0dfba16b-80ab-4bba-b8e8-6584a05d15a9` confirme `"status": "timeout"`

### Référence documentation officielle

Selon `nuextract-platform.yaml` (OpenAPI spec NuExtract) :

- Code 206 réservé uniquement à `/api/projects/{projectId}/extract`
- Signification : "Raw model output did not conform to the template"
- Observation : 206 retourné par `/api/infer-template` = comportement non documenté indiquant un timeout interne
- **Schéma JobResponse** : Le champ `status` est défini comme `type: string` sans enum explicite des valeurs possibles
- **Exemples OpenAPI** : Montrent uniquement `status: completed` dans les exemples
- **Statuts vérifiés par API réelle** :
  - `"timeout"` (minuscules) : Job terminé avec dépassement timeout mais outputData présent
  - `"completed"` : Succès normal (présumé d'après exemples OpenAPI)
  - `"failed"` : Échec (présumé, à confirmer)
- **Méthode de vérification** : Curl direct sur `/api/jobs/{jobId}` pour valider les statuts réels

## Solution retenue

### Workflow asynchrone implémenté

1. **Soumission** : POST `/api/infer-template-async?timeout=60s`
   - Envoi du schéma complexe avec `{"description": "..."}`
   - Réception du `jobId` pour suivi

2. **Initialisation** : Sleep 30 secondes
   - Permet au job de s'initialiser côté serveur

3. **Polling** : GET `/api/jobs/{jobId}` toutes les 3 secondes
   - Maximum 20 tentatives (30s + 20×3s = 90 secondes max)
   - Statuts acceptés pour succès : **`"completed"`** ET **`"timeout"`** (avec outputData)
   - Statut pour échec : **`"failed"`**

4. **Récupération** : Extraction de `outputData`
   - Parsing JSON si nécessaire (peut être string ou object)
   - Sauvegarde dans `shared/hermes2022-extraction-files/config/nuextract-template-generated/nuextract-template.json`

### Paramètres validés

| Paramètre | Valeur | Justification |
|-----------|--------|---------------|
| Timeout API | 60s | Permet traitement schémas complexes |
| Sleep initial | 30s | Job initialization côté serveur |
| Polling interval | 3s | Équilibre réactivité/charge API |
| Max attempts | 20 | Total 90s (30s + 60s polling) |
| Statuts succès | `"completed"`, `"timeout"` | Vérifiés par curl direct sur API - timeout avec outputData = succès |
| Statut échec | `"failed"` | Présumé (non observé, à confirmer lors d'erreur réelle) |

## Actions réalisées

### 1. Décision architecturale documentée

Ajout dans `specification-hermes2022-concepts-site-extraction.mdc` :

- Section "Utilisation de l'API asynchrone /api/infer-template-async"
- Description détaillée du workflow async avec timings validés
- Patterns validés et anti-patterns identifiés
- État d'implémentation marqué 🚧 [En cours de réalisation]

### 2. Modifications code `nuextract-client.js`

**Nouvelles fonctions** :

```javascript
async function inferTemplateFromDescriptionAsync(apiKey, description, timeout = 60)
async function getJobStatus(apiKey, jobId)
async function pollJobUntilComplete(apiKey, jobId, maxAttempts = 20, interval = 3000)
```

**Fonction modifiée** :

```javascript
async function generateTemplate()
// Utilise maintenant le workflow async complet :
// - Soumission async avec timeout 60s
// - Sleep initial 30s
// - Polling toutes les 3s (max 20 tentatives)
// - Accepte statuts "completed" ET "timeout" comme succès (vérifiés par curl API)
// - Parse outputData (string ou object)
// - Sauvegarde template dans shared/hermes2022-extraction-files/config/nuextract-template-generated/
// - Retourne TEMPLATE pour compatibilité tests
```

### 3. Compatibilité tests BDD

**Tests existants vérifiés** :

- `template-generation.steps.ts` : Compatible sans modification
- `error-handling.steps.ts` : Compatible (erreurs encapsulées identiques)
- `nuextract-project-management.steps.ts` : Compatible (template retourné correctement)

**Comportement préservé** :

- `generateTemplate()` retourne toujours le template pour les tests
- Gestion d'erreurs identique avec encapsulation "Template generation failed"
- Condition `if (process.env.NUEXTRACT_API_KEY)` respectée

### 4. Optimisation format description et parsing instructions

**Amélioration `buildTemplateDescription`** :

```javascript
// Avant : Headers + instructions + schéma (perturbait l'API)
// Après : Schéma + instructions (format optimal)
function buildTemplateDescription(instructions, mainSchema) {
  return [
    mainSchema,        // 1. Schéma JSON en premier
    '\n',
    instructions       // 2. Instructions après (sans headers)
  ].join('\n');
}
```

**Amélioration `loadInstructions`** :

- Parsing Markdown pour extraire uniquement section opérationnelle
- Heading standard : `## Instructions complémentaires pour /api/infer-template /api/infer-template-async de NuExtract`
- Exclusion documentation humaine (Objectif, Mode d'utilisation)
- Fallback robuste avec warning si heading non trouvé

**Fichier `instructions-template-nuextract.md` structuré** :

- Documentation humaine préservée pour lisibilité
- Instructions opérationnelles isolées sous heading standard
- Parsing automatique évite pollution contexte API

**Nouvelle section spécification** :

- Section "Parsing des instructions complémentaires depuis fichier Markdown"
- Patterns validés, anti-patterns, justifications documentés
- État implémentation : ✅ [Fonctionnalité réalisée]

## Références officielles

- **OpenAPI NuExtract** : `hermes2022-concepts-site-extraction/.cursor/rules/nuextract-platform.yaml`
- **Spécification module** : `specification-hermes2022-concepts-site-extraction.mdc`
- **Règle gouvernance résumés** : `@cursor-rules-summary-governance.mdc`
- **Scripts de test** : `test-infer-template-async.sh` (supprimé après validation)

## Leçons apprises

### Importance de la vérification directe des APIs réelles

**Erreur initiale** : Interprétation du script bash affichant "Terminated" sans vérification que c'était le statut API réel.

**Méthodologie de correction appliquée** :

1. **Consultation OpenAPI** : Vérification de `nuextract-platform.yaml` → `status` défini comme `string` sans enum
2. **Exemples OpenAPI** : Montrent uniquement `status: completed`
3. **Vérification API réelle** : `curl /api/jobs/{jobId}` → Statut réel = **`"timeout"`** (minuscules)

**Statut réel vérifié** : `"timeout"` avec `completedAt` défini et `outputData` présent = traiter comme succès.

**Règle fondamentale** : En l'absence de documentation complète, toujours vérifier le comportement réel de l'API par curl/test direct.

**Correction appliquée** :

- Code accepte `"completed"` ET `"timeout"` comme statuts de succès
- Warning explicite quand statut `"timeout"` pour traçabilité
- Validation par curl direct documentée dans la spécification
- Statut `"failed"` présumé pour échecs (à confirmer lors d'erreur réelle)

**Impact** : Sans vérification curl, le code aurait cherché "Terminated" qui n'existe pas dans l'API.

### Format critique de la description : Schéma d'abord, instructions après

**Problème observé sur plateforme SaaS NuExtract** :

- **Instructions AVANT schéma** → Génération template perturbée/incomplète
- **Instructions APRÈS schéma** → Génération template réussie et conforme

**Tests validés sur interface web NuExtract** :

1. **Schéma seul** : Template généré avec succès (quelques secondes)
2. **Instructions + Schéma** : Template perturbé
3. **Schéma + Instructions** : Template généré correctement avec énumérations conformes

**Format correct appliqué dans `buildTemplateDescription`** :

```javascript
function buildTemplateDescription(instructions, mainSchema) {
  return [
    mainSchema,        // 1. Schéma JSON en premier
    '\n',
    instructions       // 2. Instructions après (sans headers)
  ].join('\n');
}
```

**Éléments retirés** :

- ❌ Headers/commentaires explicatifs (perturbent le modèle)
- ❌ Structure "# Instructions" / "# Target JSON structures"
- ❌ Nom de fichier schéma dans la description

**Instructions conservées** (depuis `instructions-template-nuextract.md`) :

- Transformation schéma JSON → template NuExtract
- Traitement correct des énumérations JSON

**Limite de taille** : 32k caractères pour le champ `description` (support NuMind)

**Impact** : Cette découverte permet d'utiliser l'API async efficacement avec le schéma complet tout en guidant la génération avec les instructions appropriées placées au bon endroit.

### Parsing des instructions complémentaires depuis fichier Markdown

**Problème adressé** :

- Documentation humaine (Objectif, Mode d'utilisation) polluait le contexte envoyé à l'API
- Nécessité de séparer documentation lisible et instructions opérationnelles

**Solution implémentée dans `loadInstructions`** :

```javascript
function loadInstructions() {
  const fullContent = fs.readFileSync(instPath, 'utf8');
  
  // Extraire uniquement le contenu sous le heading ciblé
  const targetHeading = '## Instructions complémentaires pour /api/infer-template /api/infer-template-async de NuExtract';
  const lines = fullContent.split('\n');
  const startIdx = lines.findIndex(line => line.trim() === targetHeading);
  
  if (startIdx === -1) {
    console.warn(`⚠️  Heading "${targetHeading}" non trouvé, utilisation fichier complet`);
    return fullContent;
  }
  
  // Extraire jusqu'au prochain heading de niveau 1 ou 2
  const contentLines = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^#{1,2}\s+/)) break; // Arrêt sur heading niveau 1-2
    contentLines.push(line);
  }
  
  return contentLines.join('\n').trim();
}
```

**Structure fichier `instructions-template-nuextract.md`** :

```markdown
# Prompt génération de template NuExtract à partir des formats JSON

## Objectif
[Documentation pour humains - EXCLU de l'API]

## Mode d'utilisation des instructions complémentaires
[Documentation pour humains - EXCLU de l'API]

## Instructions complémentaires pour /api/infer-template /api/infer-template-async de NuExtract
[Instructions opérationnelles - ENVOYÉ à l'API]
```

**Avantages** :

- ✅ Fichier unique bien documenté pour les humains
- ✅ API reçoit uniquement les instructions pertinentes
- ✅ Pas de duplication documentation/instructions
- ✅ Fallback robuste si heading non trouvé
- ✅ Convention de nommage claire et documentée

## Recommandations

### Pour les schémas complexes

- ✅ Utiliser API async pour schémas >2000 caractères
- ✅ Accepter statuts `"completed"` ET `"timeout"` comme succès (vérifiés par curl direct)
- ✅ Prévoir sleep initial 30s minimum
- ✅ Sauvegarder template généré pour traçabilité
- ✅ Warning explicite lors de statut `"timeout"` pour traçabilité
- ✅ **Format description** : Schéma JSON en premier, puis instructions (sans headers/commentaires)
- ✅ **Parsing instructions** : Extraire uniquement section opérationnelle depuis fichier Markdown documenté

### Pour l'évolutivité

- Monitoring : Ajouter logs temps d'exécution réels
- Métriques : Tracker taille schéma vs temps génération
- Configuration : Rendre timings configurables si nécessaire
- Tests : Ajouter tests d'intégration avec mocks API async

## Validation finale

- ✅ Décision architecturale documentée
- ✅ Code modifié avec workflow async complet
- ✅ Tests BDD compatibles sans modification
- ✅ Template sauvegardé automatiquement
- ✅ Fichiers temporaires supprimés
- 🚧 Exécution tests BDD à valider (nécessite NUEXTRACT_API_KEY)

## État d'implémentation

**Statut** : 🚧 Migration complétée, tests en attente de validation

**Prochaines étapes** :

1. Exécuter tests BDD avec `NUEXTRACT_API_KEY` défini
2. Valider génération template avec schéma réel
3. Marquer décision comme ✅ [Fonctionnalité réalisée]
