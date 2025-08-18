# Prompt d'extraction - Phase Closure HERMES2022

## Objectif

Extraire les informations de la phase Closure depuis la page [https://www.hermes.admin.ch/en/project-management/phases/closure.html](https://www.hermes.admin.ch/en/project-management/phases/closure.html)

## Instructions d'extraction

### 1. Informations de base

- **Nom de la phase** : "Closure"
- **Ordre hiérarchique** : "3"
- **Type** : "simple"

### 2. Description principale

Extraire la description principale de la phase Closure. Cette description doit expliquer :

- L'objectif principal de la phase
- Le rôle dans le cycle de vie du projet
- Les finalités de la clôture

### 3. Contexte et articulation

Extraire le contexte qui explique :

- Comment la phase s'intègre dans le cycle de vie
- Sa relation avec les phases précédentes
- Son importance dans la transition vers l'organisation d'application
- L'uniformité des interfaces indépendamment de l'approche
- Intégrer, si pertinent, des éléments d'articulation tirés de la page générale des phases : <https://www.hermes.admin.ch/en/project-management/phases.html>

### 4. Résultats attendus (outcomes)

Identifier et lister les résultats principaux de la phase Closure, notamment :

- Les documents de clôture
- Les transferts de responsabilité
- Les archives et désactivations
- Les interfaces de transition

### 5. Jalons (milestones)

Identifier les points de contrôle et jalons de la phase, notamment :

- Les validations finales
- Les transferts organisationnels
- Les archivages
- Les désactivations

### 6. Approches supportées

Déterminer si la phase supporte :

- Approche traditionnelle
- Approche agile
- Les deux approches

## Format de sortie attendu

```json
{
  "id": "ph_pqr678",
  "name": "Closure",
  "order": "3",
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
  "approach": ["traditional", "agile"]
}
```

## Notes importantes

- Extraire uniquement les informations présentes sur la page
- Respecter la structure JSON définie
- Maintenir la cohérence avec le schéma de validation
- Privilégier la précision sur la quantité d'informations
- Noter que cette phase est commune aux deux approches
- La sortie attendue est un objet Phase (unitaire). L'agrégation et les métadonnées de niveau fichier (champ "metadata" et tableau "phases") sont réalisées en aval lors de la consolidation.
