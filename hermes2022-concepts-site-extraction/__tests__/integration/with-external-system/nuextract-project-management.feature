# language: fr
Fonctionnalité: Gestion des projets NuExtract (système externe réel)

  Contexte:
    Etant donné une configuration valide pour la gestion de projet
    Et une clé API NuExtract valide

  Scénario: Création d'un nouveau projet sans template (API réelle)
    Quand on appelle findOrCreateProject pour créer le projet
    Alors le projet est créé avec succès sur la plateforme NuExtract
    Et l'ID du projet est retourné
    Et l'ID est caché dans _projectId pour réutilisation

  Scénario: Réutilisation d'un projet existant (API réelle)
    Etant donné un projet "HERMES2022" existant sur la plateforme
    Quand on appelle findOrCreateProject pour le projet existant
    Alors le projet existant est trouvé
    Et l'ID du projet existant est retourné
    Et l'ID est caché dans _projectId pour réutilisation
