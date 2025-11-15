# language: fr
Fonctionnalité: Tests unitaires de succès pour nuextract-client

  Contexte:
    Etant donné une configuration minimale valide

  Scénario: Création réussie d'un projet NuExtract
    Et un projet n'existe pas encore sur la plateforme
    Quand on appelle findOrCreateProject
    Alors le projet est créé avec succès
    Et l'identifiant du projet est retourné

  Scénario: Réutilisation réussie d'un projet existant
    Et un projet existe déjà sur la plateforme
    Quand on appelle findOrCreateProject
    Alors le projet existant est réutilisé
    Et l'identifiant du projet existant est retourné

  Scénario: Génération réussie de template en mode sync
    Et un schéma de bloc simple
    Et une clé API valide
    Quand on génère un template avec generateTemplateForBlock en mode sync
    Alors le template est généré avec succès
    Et le template contient la structure attendue

  Scénario: Génération réussie de template en mode async
    Et un schéma de bloc simple
    Et une clé API valide
    Quand on génère un template avec generateTemplateForBlock en mode async
    Alors le template est généré avec succès après polling
    Et le template contient la structure attendue

  Scénario: Extraction réussie d'un bloc unique
    Et un bloc avec schéma et contenus HTML
    Et une clé API valide
    Et un projet NuExtract initialisé
    Quand on extrait le bloc avec extractSingleBlock
    Alors l'extraction retourne des données structurées
    Et les données respectent le schéma du bloc
