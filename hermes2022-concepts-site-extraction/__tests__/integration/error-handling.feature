# language: fr
Fonctionnalité: Gestion d'erreur robuste

  Scénario: Erreur lors de la lecture du schéma JSON
    Etant donné un fichier de schéma JSON inaccessible
    Quand on tente de générer un template
    Alors une erreur critique est générée
    Et le processus s'arrête proprement avec un message explicite

  Scénario: Erreur lors de la génération de template API
    Etant donné une API NuExtract inaccessible
    Quand on tente de générer un template
    Alors une erreur est générée avec gestion d'erreur
    Et le processus s'arrête proprement avec un message explicite

  Scénario: Erreur lors de la gestion des projets
    Etant donné une API NuExtract inaccessible pour les projets
    Quand on tente de gérer un projet NuExtract
    Alors une erreur est générée
    Et le processus s'arrête proprement avec un message explicite
