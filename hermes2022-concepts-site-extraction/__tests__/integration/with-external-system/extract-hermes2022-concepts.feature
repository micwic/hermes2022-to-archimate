# language: fr
Fonctionnalité: Extraction des concepts HERMES2022 (système externe réel)

  Contexte:
    Etant donné une configuration d'extraction hermes2022 complète
    Et une clé API NuExtract valide
    Et un schéma JSON de concepts HERMES2022 résolu

  Scénario: Extraction réussie des concepts HERMES2022 avec NuExtract
    Et un projet NuExtract existant avec template
    Quand on exécute l'extraction des concepts avec extractHermes2022ConceptsWithNuExtract
    Alors un artefact est reconstruit avec succès
    Et l'artefact contient les propriétés principales attendues
    Et l'artefact est conforme au schéma JSON Schema
    Et chaque bloc a été traité par l'API NuExtract

