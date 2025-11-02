# language: fr
Fonctionnalité: Gestion des projets NuExtract (système externe réel)

  Scénario: Création d'un nouveau projet avec template sans qu'il existe préalablement sur la plateforme SaaS NuExtract
    Etant donné des paramètres de configuration NuExtract pour la gestion de projet
    Et une clé API NuExtract
    Et un template NuExtract valide
    Et le projet "HERMES2022" n'existe pas sur la plateforme
    Quand on demande la création du projet avec findOrCreateProject
    Alors le projet est créé avec succès
    Et le projet contient le template fourni
    Et l'ID du projet est retourné

  Scénario: Recherche d'un projet existant et mise à jour avec un nouveau template pour un projet qui existe déjà sur la plateforme SaaS NuExtract
    Etant donné des paramètres de configuration NuExtract pour la gestion de projet
    Et une clé API NuExtract
    Et un projet "HERMES2022" existant sur la plateforme
    Et un nouveau template NuExtract valide
    Quand on met à jour le template du projet avec findOrCreateProject sur un projet existant (templateReset=true)
    Alors le template est mis à jour avec succès
    Et le projet contient le nouveau template
    Et l'ID du projet reste inchangé

  Scénario: Recherche d'un projet existant sans mise à jour pour un projet qui existe déjà sur la plateforme SaaS NuExtract
    Etant donné des paramètres de configuration NuExtract pour la gestion de projet
    Et une clé API NuExtract
    Et un projet "HERMES2022" existant sur la plateforme
    Quand on recherche le projet avec findOrCreateProject sans nouveau template
    Alors Ne rien faire
    Et l'ID du projet existant est retourné
