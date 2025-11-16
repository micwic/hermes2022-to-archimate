# language: fr
Fonctionnalité: Gestion des projets NuExtract par blocs (système externe mocké)

  Contexte:
    Etant donné une configuration valide pour la gestion de projet

  # === Scénarios de succès ===

  Scénario: Création réussie de projet (sans template, workflow par blocs)
    Et aucun projet existant avec le nom configuré
    Quand on appelle findOrCreateProject avec la config et l'apiKey
    Alors le projet est créé avec succès
    Et l'id du projet est mis en cache dans _projectId
    Et la réponse contient created: true

  Scénario: Réutilisation de projet existant (cache _projectId)
    Et un projet existant sur la plateforme avec id "project-123"
    Quand on appelle findOrCreateProject avec la config et l'apiKey
    Alors le projet existant est réutilisé
    Et l'id du projet est mis en cache dans _projectId
    Et la réponse contient existing: true

  # === Scénarios d'erreur ===

  Scénario: Erreur projectName manquant dans config
    Et une config avec projectName vide
    Quand on tente d'appeler findOrCreateProject
    Alors une erreur contenant "Missing required valid parameter: projectName" est générée

  Scénario: Erreur API getNuExtractProjects (HTTP 500)
    Et une API getNuExtractProjects qui retourne 500
    Quand on tente d'appeler findOrCreateProject
    Alors une erreur contenant "API error: 500" est générée

  Scénario: Erreur API createNuExtractProject (HTTP 403)
    Et aucun projet existant avec le nom configuré
    Et une API createNuExtractProject qui retourne 403
    Quand on tente d'appeler findOrCreateProject
    Alors une erreur contenant "API error: 403" est générée


