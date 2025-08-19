# Prompt d'extraction - Introduction aux concepts de HERMES2022

## Objectif

Extraire une description générale structurée des concepts de HERMES2022
depuis les pages <https://www.hermes.admin.ch/en/project-management/method-overview.html> et <https://www.hermes.admin.ch/en/project-management/method-overview/preface.html>

## Instructions d'extraction

- Produire un texte synthétique (overview) couvrant la gestion de projet en mode traditionnel ou agile, les autres utilisations sont hors contexte :
  - ???
  - ???
- Longueur cible : 600–1500 mots, style factuel et fidèle à la source
- Intégrer les points saillants utiles à l'IA pour le contexte et la méthodologie dans son ensemble sans créer des redondances inutiles avec les concepts sous-jacents décrits pour eux-mêmes

## Format de sortie attendu

Structure selon @shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json

```json
{
...    
"extractionSource": {
    "baseUrl": {
      "type": "string",
      "enum": [
        "https://www.hermes.admin.ch/de/",
        "https://www.hermes.admin.ch/fr/",
        "https://www.hermes.admin.ch/it/",
        "https://www.hermes.admin.ch/en/"
      ],
      "description": "URL de base utilisée pour l'extraction, enregistrée au moment de l'extraction"
    },
    "language": {
      "type": "string",
      "enum": ["de", "fr", "it", "en"],
      "description": "Code de langue utilisé pour l'extraction, enregistré au moment de l'extraction"
    },
    "description": {
      "type": "string",
      "maxLength": 500,
      "pattern": "^[\\p{L}\\p{N}\\s\\-\\.,;:!?()\\[\\]{}'\"`~@#$%^&*+=|\\\\/<>]+$",
      "description": "Description de la source d'extraction, enregistrée au moment de l'extraction. Contient uniquement des caractères Unicode valides et des symboles de ponctuation standard."
    }
  },
...
}
```

"baseUrl" : provient de @hermes2022-concepts-site-extraction/config/extraction-config.json
"language" : provient de @hermes2022-concepts-site-extraction/config/extraction-config.json
"description": provient de @hermes2022-concepts-site-extraction/config/extraction-config.json

```json
...
"concepts": {
    "overview": {
      "type": "string",
      "maxLength": 1500,
      "pattern": "^[\\p{L}\\p{N}\\s\\-\\.,;:!?()\\[\\]{}'\"`~@#$%^&*+=|\\\\/<>]+$",
      "description": "Description générale des concepts de HERMES2022, enregistrée au moment de l'extraction. Contient uniquement des caractères Unicode valides et des symboles de ponctuation standard."
    },
...
```

"overview" : provient de la génération IA après lecture des pages de référence

## Revue et validation humaine

`/concepts/overview` nécessite une revue et validation humaine selon @hermes2022-concepts-site-extraction/.cursor/rules/specification-hermes2022-concepts-site-extraction.mdc
Structure selon @shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts-approval.json

## Notes importantes

- Extraire uniquement les informations présentes sur les pages de références
- Privilégier la précision sur la quantité d'informations avec une formulation adaptée à une injection ultérieure dans l'IA en RAG
- Respecter la structure JSON définie pour le fichier intermédiaire cible selon le schéma de validation