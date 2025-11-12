# language: fr
Fonctionnalité: Tests unitaires de succès pour l'extraction des concepts HERMES2022

  Contexte:
    Etant donné une configuration d'extraction hermes2022 minimaliste

  Scénario: Extraction réussie avec agrégation des blocs NuExtract
    Et des blocs collectés pour l'extraction
    Et les mocks API sont configurés pour retourner des réponses valides
    Quand on exécute l'extraction des concepts avec extractHermes2022ConceptsWithNuExtract
    Alors un artefact est reconstruit avec succès
    Et chaque bloc est envoyé à l'API NuExtract

