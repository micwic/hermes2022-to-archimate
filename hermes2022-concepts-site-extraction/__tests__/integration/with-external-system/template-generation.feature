# language: fr
Fonctionnalité: Génération de templates par bloc NuExtract (système externe réel)

  Contexte:
    Etant donné une configuration valide pour la génération de template par bloc
    Et une clé API NuExtract valide
    Et un schéma de bloc pour /concepts/overview

  Scénario: Génération de template bloc en mode async (API réelle)
    Quand on génère un template pour le bloc avec generateTemplateForBlock en mode async
    Alors le template est créé avec succès
    Et le template contient les champs attendus du schéma de bloc
    Et le template respecte le format NuExtract

  Scénario: Génération de template bloc en mode sync (API réelle)
    Quand on génère un template pour le bloc avec generateTemplateForBlock en mode sync
    Alors le template est créé avec succès
    Et le template contient les champs attendus du schéma de bloc
    Et le template respecte le format NuExtract


