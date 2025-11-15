# language: fr
Fonctionnalité: Tests unitaires de succès pour l'orchestrateur d'extraction

  Contexte:
    Etant donné une configuration d'extraction hermes2022 minimaliste

  Scénario: Extraction réussie avec agrégation des blocs
    Et des blocs collectés pour l'extraction
    Et les mocks clients sont configurés pour retourner des réponses valides
    Quand on exécute l'extraction des concepts avec extractHermes2022Concepts
    Alors un artefact est reconstruit avec succès
    Et chaque bloc est extrait via les clients LLM appropriés

