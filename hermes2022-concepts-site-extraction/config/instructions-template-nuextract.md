# Prompt génération de template NuExtract à partir des formats JSON

## Objectif

Faire générer par l'API POST /api/infer-template (/api/infer-template-async) de NuExtract un template aussi complet que possible à partir des fichiers de schéma JSON définis pour le projet et des instructions complémentaire qui renforcent la qualité de la transformation effectuée par l'IA NuExtract.

## Mode d'utilisation des instructions complémentaires

Les instructions complémentaires placées au-dessous du titre ci-dessous jusqu'au prochain titre markdown de même niveau ou de niveau supérieur sont extraites et placées directement après le schéma JSON dans le champ description du body de l'appel à l'API pour assurer un traitement adéquat par l'IA de NuExtract.

## Instructions complémentaires pour /api/infer-template /api/infer-template-async de NuExtract

- transformes le schéma JSON en template NuExtract
- considères les énumérations JSON comme par exemple "language": {"type": "string","enum": ["de", "fr", "it", "en"]} comme des énumérations dans le format de template NuExtract "language": ["de", "fr", "it", "en"]
