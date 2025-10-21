# language: fr
Fonctionnalité: Génération de templates NuExtract

  Scénario: Génération de template depuis instructions
    Etant donné des paramètres de configuration NuExtract pour la génération du template
    Et une clé API NuExtract
    Et des instructions de transformation markdown
    Et un schéma JSON de concepts HERMES2022
    Quand on génère un template NuExtract
    Alors le template est créé avec succès dans le répertoire de sortie des templates NuExtract
    Et le template contient les champs principaux attendus
    Et le template respecte le format NuExtract

  Scénario: Génération de template avec fallback sur schéma vide
    Etant donné des instructions de transformation markdown
    Et un schéma JSON inaccessible
    Quand on génère un template NuExtract avec gestion d'erreur
    Alors un avertissement est généré
    Et le template utilise un schéma vide comme fallback
    Et le processus continue sans interruption
