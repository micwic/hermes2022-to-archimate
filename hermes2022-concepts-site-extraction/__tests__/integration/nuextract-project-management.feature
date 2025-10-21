# language: fr
Fonctionnalité: Gestion des projets NuExtract

  Scénario: Création d'un nouveau projet avec template
    Etant donné une configuration NuExtract valide
    Quand on demande la création d'un projet "HERMES2022"
    Alors le projet est créé avec succès
    Et le projet contient le template généré
    Et le projet a l'ID correct stocké dans PROJECT_ID

  Scénario: Recherche d'un projet existant
    Etant donné un projet "HERMES2022" existant
    Quand on recherche le projet par nom
    Alors le projet existant est retourné
    Et le projet peut être mis à jour avec un nouveau template
    Et l'ID du projet est stocké dans PROJECT_ID
