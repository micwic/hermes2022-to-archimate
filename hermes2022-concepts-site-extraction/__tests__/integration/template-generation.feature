# language: fr
Fonctionnalité: Génération de templates NuExtract

  Scénario: Génération de template NuExtract avec infer-template-async
    Etant donné des paramètres de configuration NuExtract pour la génération du template
    Et une clé API NuExtract
    Et des instructions de transformation markdown
    Et un schéma JSON de concepts HERMES2022
    Quand on génère un template NuExtract avec infer-template-async
    Alors le template est créé avec succès dans le répertoire de sortie des templates NuExtract
    Et le template contient les champs principaux attendus
    Et le template respecte le format NuExtract

  Scénario: Génération de template NuExtract avec infer-template
    Etant donné des paramètres de configuration NuExtract pour la génération du template
    Et une clé API NuExtract
    Et des instructions de transformation markdown
    Et un schéma JSON de concepts HERMES2022
    Quand on génère un template NuExtract avec infer-template
    Alors le template est créé avec succès dans le répertoire de sortie des templates NuExtract
    Et le template contient les champs principaux attendus
    Et le template respecte le format NuExtract
