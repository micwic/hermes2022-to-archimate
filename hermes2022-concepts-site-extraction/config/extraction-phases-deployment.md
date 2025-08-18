# Prompt d'extraction - Phase Deployment HERMES2022

## Objectif
Extraire les informations de la phase Deployment depuis la page [https://www.hermes.admin.ch/en/project-management/phases/deployment.html](https://www.hermes.admin.ch/en/project-management/phases/deployment.html)

## Instructions d'extraction

### 1. Informations de base
- **Nom de la phase** : "Deployment"
- **Ordre hiérarchique** : "2.3"
- **Type** : "simple"

### 2. Description principale
Extraire la description principale de la phase Deployment. Cette description doit expliquer :
- L'objectif principal de la phase
- Le rôle dans la mise en production
- Les activités de déploiement et de transition

### 3. Contexte et articulation
Extraire le contexte qui explique :
- Comment la phase s'intègre dans l'approche traditionnelle
- Sa relation avec les phases Implementation et Closure
- Son importance dans la transition vers l'exploitation
- La différence avec l'approche agile

### 4. Résultats attendus (outcomes)
Identifier et lister les résultats principaux de la phase Deployment, notamment :
- Le produit ou système déployé en production
- L'organisation d'exploitation opérationnelle
- La documentation d'exploitation
- La formation des utilisateurs
- La transition des responsabilités

### 5. Jalons (milestones)
Identifier les points de contrôle et jalons de la phase, notamment :
- Les validations de déploiement
- Les acceptations finales
- Les transferts de responsabilité
- Les validations d'exploitation

### 6. Approches supportées
Déterminer si la phase supporte :
- Approche traditionnelle
- Approche agile
- Les deux approches

## Format de sortie attendu

```json
{
  "id": "ph_depl01",
  "name": "Deployment",
  "order": "2.3",
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
