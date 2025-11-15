# Analyse comparative de couverture des tests de gestion d'erreur

## Vue d'ensemble

| Fichier | Nombre de scénarios | Fonctions testées |
|---------|---------------------|-------------------|
| `nuextract-client-error-handling` | ~42 scénarios | 10 fonctions |
| `concepts-site-extraction-orchestrator-error-handling` | 22 scénarios | 6 fonctions |

## Analyse par fonction

### 1. `loadGlobalConfig`

**nuextract-client** : 4 scénarios
- ✅ Erreur schéma JSON Schema introuvable
- ✅ Erreur schéma JSON Schema malformé
- ✅ Erreur structure config invalide après transformation
- ✅ Erreur section nuextract absente après transformation

**orchestrator** : 4 scénarios
- ✅ Erreur schéma JSON Schema introuvable
- ✅ Erreur schéma JSON Schema malformé
- ✅ Erreur structure config invalide après transformation
- ✅ Erreur section llm absente après transformation

**Verdict** : ✅ Couverture équivalente (adaptée au contexte orchestrator avec `llm` au lieu de `nuextract`)

---

### 2. `loadApiKey` vs `loadApiKeys`

**nuextract-client** (`loadApiKey`) : 4 scénarios
- ✅ Erreur si variable d'environnement et fichier tous deux absents
- ✅ Erreur si clé vide après trim (whitespace uniquement)
- ✅ Erreur si clé n'est pas au format JWT valide
- ✅ Chargement réussi avec trim appliqué

**orchestrator** (`loadApiKeys`) : 7 scénarios
- ✅ Erreur configuration LLM manquante
- ✅ Erreur configuration LLM invalide (non objet)
- ✅ Erreur fichier clé API NuExtract inexistant
- ✅ Erreur fichier clé API Claude inexistant
- ✅ Erreur clé API NuExtract vide après trim
- ✅ Erreur clé API NuExtract format JWT invalide
- ✅ Chargement réussi avec trim appliqué

**Verdict** : ✅ Couverture supérieure (gestion multi-LLM + validation configuration)

---

### 3. `loadAndResolveSchemas`

**nuextract-client** : 4 scénarios
- ✅ Erreur schéma JSON manquant
- ✅ Erreur fichier $ref manquant
- ✅ Erreur JSON malformé
- ✅ Erreur schéma JSON non conforme à JSON Schema Draft-07

**orchestrator** : 4 scénarios
- ✅ Erreur schéma JSON manquant
- ✅ Erreur fichier $ref manquant
- ✅ Erreur JSON malformé
- ✅ Erreur schéma JSON non conforme à JSON Schema Draft-07 (ajouté)

**Verdict** : ✅ Couverture équivalente

**Code concerné** (lignes 238-259 de `concepts-site-extraction-orchestrator.js`) :
```javascript
// Bloc 2: Validation de conformité JSON Schema avec Ajv
try {
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  
  // Valider que resolvedSchema est conforme à JSON Schema Draft-07
  const valid = ajv.validateSchema(resolvedSchema);
  
  if (!valid) {
    const errorMessages = ajv.errors.map(err => `${err.instancePath} ${err.message}`).join('; ');
    const validationError = new Error(`Schema validation failed: ${errorMessages}`);
    console.error(`Erreur critique : Le schéma résolu n'est pas conforme à JSON Schema Draft-07: ${errorMessages}`);
    throw new Error('Invalid JSON schema structure or content. Script stopped.', { cause: validationError });
  }
}
```

---

### 4. `initializeLLMProjects` (nouvelle fonction orchestrator)

**orchestrator** : 2 scénarios
- ✅ Erreur initialisation projet NuExtract échouée
- ✅ Erreur validation clé API Claude échouée

**Verdict** : ✅ Couverture appropriée pour une fonction d'orchestration (délègue aux clients)

---

### 5. `saveArtifact`

**nuextract-client** : Section vide (pas de tests)

**orchestrator** : 2 scénarios
- ✅ Erreur répertoire de sauvegarde non accessible
- ✅ Erreur écriture fichier artefact échouée

**Verdict** : ✅ Couverture supérieure (orchestrator teste cette fonction)

**Cas d'erreur potentiels supplémentaires à considérer** :
- ❓ Erreur JSON.stringify échoue (objet circulaire, BigInt, etc.)
- ❓ Erreur mkdirSync échoue avec code autre que EACCES/ENOENT

---

### 6. `extractHermes2022Concepts` vs `extractHermes2022ConceptsWithNuExtract`

**nuextract-client** (`extractHermes2022ConceptsWithNuExtract`) : 2 scénarios
- ✅ Erreur validation Ajv échouée
- ✅ Erreur htmlContents vide

**orchestrator** (`extractHermes2022Concepts`) : 4 scénarios
- ✅ Erreur collecte HTML échouée
- ✅ Erreur extraction bloc NuExtract échouée
- ✅ Erreur extraction bloc Claude échouée
- ✅ Erreur validation artefact échouée

**Verdict** : ✅ Couverture supérieure (gestion multi-LLM + erreurs de collecte HTML)

---

## Fonctions spécifiques à nuextract-client (non pertinentes pour orchestrator)

Ces fonctions sont testées dans `nuextract-client-error-handling` mais ne sont pas dans l'orchestrateur :

- `generateTemplate` : 6 scénarios (fonction interne à nuextract-client)
- `findOrCreateProject` : 6 scénarios (fonction interne à nuextract-client)
- `fetchHtmlContent` : 4 scénarios (fonction dans html-collector, testée séparément)
- `collectHtmlSourcesAndInstructions` : 8 scénarios (fonction dans html-collector, testée séparément)

**Verdict** : ✅ Approprié - Ces fonctions sont déléguées aux modules spécialisés

---

## Résumé des écarts identifiés

### ✅ Écarts critiques (corrigés)

1. **`loadAndResolveSchemas`** : Test de validation JSON Schema Draft-07 ajouté ✅
   - **Impact** : Code maintenant testé (lignes 238-259)
   - **Statut** : Corrigé

### ⚠️ Écarts mineurs (à considérer)

1. **`saveArtifact`** : Cas d'erreur supplémentaires possibles
   - JSON.stringify avec objet circulaire
   - mkdirSync avec codes d'erreur autres que EACCES/ENOENT
   - **Priorité** : Basse (cas rares)

---

## Recommandations

### ✅ 1. Test manquant pour `loadAndResolveSchemas` - AJOUTÉ

**Scénario ajouté** :
```gherkin
Scénario: Erreur schéma JSON non conforme à JSON Schema Draft-07
  Etant donné un JSON valide mais non conforme à JSON Schema Draft-07
  Quand on tente de charger et résoudre le schéma JSON
  Alors une erreur contenant "Schema validation failed" est générée
  Et le processus s'arrête proprement
```

**Statut** : ✅ Implémenté dans `concepts-site-extraction-orchestrator-error-handling.steps.ts` (lignes 598-668)

### 2. Considérer les cas d'erreur supplémentaires pour `saveArtifact` (optionnel)

Si le temps le permet, ajouter des tests pour :
- Erreur JSON.stringify avec objet circulaire
- Erreur mkdirSync avec codes d'erreur variés

---

## Conclusion

**Niveau de couverture global** : ✅ **Excellent** (23 scénarios pour 6 fonctions vs 42 scénarios pour 10 fonctions)

**Écart principal** : ✅ **Aucun** - Tous les tests critiques ont été ajoutés

**Statut final** : ✅ **Couverture équivalente atteinte** - Le niveau de couverture est maintenant équivalent à `nuextract-client-error-handling` pour les fonctions communes, avec une couverture adaptée aux spécificités de l'orchestrateur (multi-LLM, délégation aux clients spécialisés).

