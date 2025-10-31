# language: fr
Fonctionnalité: Gestion des projets NuExtract (système externe mocké)

  Contexte:
    Etant donné une configuration valide pour la gestion de projet

  Scénario: Création de projet sans template (orchestration)
    Et aucun projet existant avec le nom configuré
    Et un template null
    Quand on exécute l'orchestration de gestion de projet
    Alors une erreur contenant "A valid NuExtractTemplate is required for project creation" est générée

  Scénario: Mise à jour demandée sans template (orchestration)
    Et un projet existant sur la plateforme
    Et templateReset est true
    Et un template null
    Quand on exécute l'orchestration de gestion de projet
    Alors une erreur contenant "A valid NuExtractTemplate is required for template update" est générée


