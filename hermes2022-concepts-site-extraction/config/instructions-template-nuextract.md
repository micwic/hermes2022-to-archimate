# Prompt génération de template NuExtract à partir des formats JSON

## Objectif

Faire générer par l'API POST /api/infer-template de NuExtract un template aussi complet que possible à partir des fichiers de format JSON définis pour le projet.

## Instructions de transformation pour /api/infer-template

- transformes les formats JSON ci-dessous en template NuExtract
- considères les énumérations JSON comme par exemple "language": {"type": "string","enum": ["de", "fr", "it", "en"]} comme des énumérations dans le format de template NuExtract "language": ["de", "fr", "it", "en"]
