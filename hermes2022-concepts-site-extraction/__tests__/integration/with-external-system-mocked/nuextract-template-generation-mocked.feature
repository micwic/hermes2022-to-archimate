# language: fr
Fonctionnalité: Génération de templates par bloc NuExtract (système externe mocké)

  Contexte:
    Etant donné une configuration valide pour la génération de template
    Et un schéma de bloc pour concepts overview

  Scénario: Génération réussie de template bloc en mode sync
    Et une API infer-template qui retourne un template valide
    Quand on génère un template pour le bloc avec generateTemplateForBlock en mode sync
    Alors le template est généré avec succès
    Et le template contient la structure attendue

  Scénario: Génération réussie de template bloc en mode async
    Et le mode est configuré en async
    Et une API infer-template-async qui retourne un jobId valide
    Et un polling qui retourne un template valide
    Quand on génère un template pour le bloc avec generateTemplateForBlock en mode async
    Alors le template est généré avec succès
    Et le template contient la structure attendue

  Scénario: Erreur HTTP 500 en mode async
    Et le mode est configuré en async
    Et une API infer-template-async qui retourne 500
    Quand on génère un template pour le bloc avec generateTemplateForBlock en mode async
    Alors une erreur contenant "Erreur infer-template-async: 500" est générée

  Scénario: Timeout 10s en mode async
    Et le mode est configuré en async
    Et une API infer-template-async qui timeoute à 10s
    Quand on génère un template pour le bloc avec generateTemplateForBlock en mode async
    Alors une erreur contenant "Timeout: La requête infer-template-async a dépassé 10 secondes" est générée

  Scénario: JSON invalide retourné par le polling
    Et le mode est configuré en async
    Et une API async qui retourne un jobId valide
    Et un polling qui retourne un JSON invalide
    Quand on génère un template pour le bloc avec generateTemplateForBlock en mode async
    Alors une erreur contenant "Invalid JSON in template data" est générée

  Scénario: Type templateData invalide (array)
    Et le mode est configuré en async
    Et une API async qui retourne un jobId valide
    Et un polling qui retourne un type invalide
    Quand on génère un template pour le bloc avec generateTemplateForBlock en mode async
    Alors une erreur contenant "Invalid template data type" est générée


