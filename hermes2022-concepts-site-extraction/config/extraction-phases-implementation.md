# Prompt d'extraction - Phase Implementation HERMES2022

## Objectif

Extraire les informations de la phase Implementation depuis la page <{baseUrl}/project-management/phases/implementation.html>

## Instructions d'extraction

### 1. Informations de base

- **Nom de la phase** : "Implementation"
- **Ordre hiérarchique** : "2.2"
- **Type** : "simple"

### 2. Description principale

Extraire la description principale de la phase Implementation. Cette description doit expliquer :

- L'objectif principal de la phase
- Le rôle dans la réalisation du produit ou système
- Les activités de développement et d'intégration

### 3. Contexte et articulation

Extraire le contexte qui explique :

- Comment la phase s'intègre dans l'approche traditionnelle
- Sa relation avec les phases Concept et Deployment
- Son importance dans la validation technique
- La différence avec l'approche agile
- Intégrer, si pertinent, des éléments d'articulation tirés de la page générale des phases : <https://www.hermes.admin.ch/en/project-management/phases.html>

### 4. Résultats attendus (outcomes)

Identifier et lister les résultats principaux de la phase Implementation, notamment :

- Le produit ou système développé
- L'organisation implémentée
- L'intégration IT dans l'infrastructure
- L'acceptation préliminaire
- L'organisation d'exploitation
- La préparation du déploiement

### 5. Jalons (milestones)

Identifier les points de contrôle et jalons de la phase, notamment :

- Les décisions de déploiement release
- Les validations d'acceptation préliminaire
- Les évaluations de risques de déploiement
- Les validations de ressources

### 6. Approches supportées

Déterminer si la phase supporte :

- Approche traditionnelle
- Approche agile
- Les deux approches

## Format de sortie attendu

```json
{
  "id": "ph_ghi789",
  "name": "Implementation",
  "order": "2.2",
  "type": "simple",
  "description": "[Description extraite de la page]",
  "context": "[Contexte et articulation extraits]",
  "outcomes": [
    "[Résultat 1]",
    "[Résultat 2]",
    "[Résultat 3]"
  ],
  "milestones": [
    "[Jalon 1]",
    "[Jalon 2]",
    "[Jalon 3]"
  ],
  "approach": ["traditional"]
}
```

## Notes importantes

- Extraire uniquement les informations présentes sur la page
- Respecter la structure JSON définie
- Maintenir la cohérence avec le schéma de validation
- Privilégier la précision sur la quantité d'informations
- Noter que cette phase est spécifique à l'approche traditionnelle
- Cette phase fait partie de la phase composite Execution (2) dans l'approche agile
- La sortie attendue est un objet Phase (unitaire). L'agrégation et les métadonnées de niveau fichier (champ "metadata" et tableau "phases") sont réalisées en aval lors de la consolidation.
- Sortie : texte brut (pas de Markdown riche). Langue du site. Style factuel, neutre, sans extrapolation.
