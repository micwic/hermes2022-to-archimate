# language: fr
Fonctionnalité: Extraction des concepts HERMES2022 (système externe mocké)

  Contexte:
    Etant donné une configuration d'extraction hermes2022 minimaliste

  Scénario: Extraction réussie avec agrégation des blocs NuExtract
    Et des blocs collectés pour l'extraction
    Et les mocks API sont configurés pour retourner des réponses valides
    Quand on exécute l'extraction des concepts avec extractHermes2022Concepts
    Alors un artefact est reconstruit avec succès
    Et chaque bloc est envoyé à l'API NuExtract

  Scénario: Erreur lors de l'extraction à cause d'une réponse NuExtract invalide
    Et des blocs collectés pour l'extraction
    Et une réponse NuExtract invalide contenant "Invalid JSON response"
    Quand on exécute l'extraction des concepts avec extractHermes2022Concepts
    Alors une erreur contenant "Invalid JSON response" est générée
