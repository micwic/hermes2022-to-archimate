# Prompt d'extraction - Phase Execution HERMES2022

## Objectif
Extraire les informations de la phase Execution depuis la page [https://www.hermes.admin.ch/en/project-management/phases/execution.html](https://www.hermes.admin.ch/en/project-management/phases/execution.html)

## Instructions d'extraction

### 1. Informations de base
- **Nom de la phase** : "Execution"
- **Ordre hiérarchique** : "2"
- **Type** : "composite"

### 2. Description principale
Extraire la description principale de la phase Execution. Cette description doit expliquer :
- L'objectif principal de la phase composite
- Le rôle dans le cycle de vie du projet
- Comment elle regroupe les phases Concept, Implementation et Deployment

### 3. Contexte et articulation
Extraire le contexte qui explique :
- Comment la phase s'intègre dans le cycle de vie
- Sa relation avec les phases Initiation et Closure
- Son importance dans l'approche agile
- La différence avec l'approche traditionnelle

### 4. Sous-phases incluses
Identifier et décrire les sous-phases :
- **2.1 Concept** : Conception de la solution
- **2.2 Implementation** : Réalisation du produit
- **2.3 Deployment** : Déploiement et mise en production

### 5. Résultats attendus (outcomes)
Identifier et lister les résultats principaux de la phase Execution, notamment :
- Les livrables de chaque sous-phase
- Les décisions prises
- Les validations effectuées

### 6. Jalons (milestones)
Identifier les points de contrôle et jalons de la phase, notamment :
- Les décisions de phase release
- Les validations requises
- Les critères de réussite
- Les releases intermédiaires (optionnels)

### 7. Approches supportées
Déterminer si la phase supporte :
- Approche traditionnelle
- Approche agile
- Les deux approches

## Format de sortie attendu

```json
{
  "id": "ph_exec01",
  "name": "Execution",
  "order": "2",
  "type": "composite",
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
  "approach": ["agile"],
  "subPhases": [
    {
      "order": "2.1",
      "name": "Concept",
      "description": "Conception de la solution"
    },
    {
      "order": "2.2", 
      "name": "Implementation",
      "description": "Réalisation du produit"
    },
    {
      "order": "2.3",
      "name": "Deployment", 
      "description": "Déploiement et mise en production"
    }
  ]
}
```

## Notes importantes
- Extraire uniquement les informations présentes sur la page
- Respecter la structure JSON définie
- Maintenir la cohérence avec le schéma de validation
- Privilégier la précision sur la quantité d'informations
- Noter que cette phase est spécifique à l'approche agile
