# Prompt d'extraction - Phase Initiation HERMES2022

## Objectif
Extraire les informations de la phase Initiation depuis la page [https://www.hermes.admin.ch/en/project-management/phases/initiation.html](https://www.hermes.admin.ch/en/project-management/phases/initiation.html)

## Instructions d'extraction

### 1. Informations de base
- **Nom de la phase** : "Initiation"
- **Ordre hiérarchique** : "1"
- **Type** : "simple"

### 2. Description principale
Extraire la description principale de la phase Initiation. Cette description doit expliquer :
- L'objectif principal de la phase
- Le rôle dans le cycle de vie du projet
- Les fondements créés

### 3. Contexte et articulation
Extraire le contexte qui explique :
- Comment la phase s'intègre dans le cycle de vie
- Sa relation avec les autres phases
- Son importance dans la méthodologie HERMES2022

### 4. Résultats attendus (outcomes)
Identifier et lister les résultats principaux de la phase Initiation, notamment :
- Les documents produits
- Les décisions prises
- Les fondations établies

### 5. Jalons (milestones)
Identifier les points de contrôle et jalons de la phase, notamment :
- Les décisions de phase release
- Les validations requises
- Les critères de réussite

### 6. Approches supportées
Déterminer si la phase supporte :
- Approche traditionnelle
- Approche agile
- Les deux approches

## Format de sortie attendu

```json
{
  "id": "ph_init01",
  "name": "Initiation",
  "order": "1",
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
