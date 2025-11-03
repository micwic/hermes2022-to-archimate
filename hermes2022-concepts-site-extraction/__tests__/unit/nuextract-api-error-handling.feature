# language: fr
Fonctionnalité: Gestion d'erreur robuste du module nuextract-api
  #
  # === Tests des erreurs HTTP pour inferTemplateFromDescription ===

  Scénario: Erreur réseau lors d'appel API inferTemplateFromDescription
    Etant donné une erreur réseau simulée pour inferTemplateFromDescription
    Quand on tente d'appeler inferTemplateFromDescription
    Alors une erreur "Network error calling infer-template API" est générée
    Et l'erreur originale est préservée avec Error Cause
    Et le processus s'arrête proprement

  Scénario: Timeout lors d'appel API inferTemplateFromDescription
    Etant donné un timeout simulé après 35 secondes pour inferTemplateFromDescription
    Quand on tente d'appeler inferTemplateFromDescription
    Alors une erreur contenant "Timeout sync après" est générée
    Et le message suggère d'utiliser le mode async
    Et le processus s'arrête proprement

  Scénario: Code HTTP non-200 pour inferTemplateFromDescription
    Etant donné une réponse HTTP 500 de l'API inferTemplateFromDescription
    Quand on tente d'appeler inferTemplateFromDescription
    Alors une erreur contenant "Erreur infer-template: 500" est générée
    Et le processus s'arrête proprement

  Scénario: JSON invalide dans réponse inferTemplateFromDescription
    Etant donné une réponse avec JSON malformé pour inferTemplateFromDescription
    Quand on tente d'appeler inferTemplateFromDescription
    Alors une erreur "Invalid JSON response from infer-template API" est générée
    Et l'erreur de parsing est préservée avec Error Cause
    Et le processus s'arrête proprement
  #
  # === Tests des erreurs HTTP pour inferTemplateFromDescriptionAsync ===

  Scénario: Erreur réseau lors d'appel API inferTemplateFromDescriptionAsync
    Etant donné une erreur réseau simulée pour inferTemplateFromDescriptionAsync
    Quand on tente d'appeler inferTemplateFromDescriptionAsync
    Alors une erreur "Network error calling infer-template-async API" est générée
    Et l'erreur originale est préservée avec Error Cause
    Et le processus s'arrête proprement

  Scénario: Timeout lors d'appel API inferTemplateFromDescriptionAsync
    Etant donné un timeout simulé après 10 secondes pour inferTemplateFromDescriptionAsync
    Quand on tente d'appeler inferTemplateFromDescriptionAsync
    Alors une erreur "Timeout: La requête infer-template-async a dépassé 10 secondes" est générée
    Et le processus s'arrête proprement

  Scénario: Code HTTP non-200 pour inferTemplateFromDescriptionAsync
    Etant donné une réponse HTTP 400 de l'API inferTemplateFromDescriptionAsync
    Quand on tente d'appeler inferTemplateFromDescriptionAsync
    Alors une erreur contenant "Erreur infer-template-async: 400" est générée
    Et le processus s'arrête proprement
  #
  # === Tests des erreurs HTTP pour getJobStatus ===

  Scénario: Erreur réseau lors d'appel API getJobStatus
    Etant donné une erreur réseau simulée pour getJobStatus
    Quand on tente d'appeler getJobStatus
    Alors une erreur "Network error calling job status API" est générée
    Et l'erreur originale est préservée avec Error Cause
    Et le processus s'arrête proprement

  Scénario: Timeout lors d'appel API getJobStatus
    Etant donné un timeout simulé après 5 secondes pour getJobStatus
    Quand on tente d'appeler getJobStatus
    Alors une erreur "Timeout: La requête GET job a dépassé 5 secondes" est générée
    Et le processus s'arrête proprement

  Scénario: JSON invalide dans réponse getJobStatus
    Etant donné une réponse avec JSON malformé pour getJobStatus
    Quand on tente d'appeler getJobStatus
    Alors une erreur "Invalid JSON response from job status API" est générée
    Et l'erreur de parsing est préservée avec Error Cause
    Et le processus s'arrête proprement
  #
  # === Tests des erreurs pour pollJobUntilComplete ===

  Scénario: Erreur job terminé sans outputData
    Etant donné un job avec statut completed mais sans outputData
    Quand on tente de poller le job
    Alors une erreur "Job completed mais pas de outputData" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur job avec statut failed
    Etant donné un job avec statut failed
    Quand on tente de poller le job
    Alors une erreur contenant "Job failed" est générée
    Et le processus s'arrête proprement

  Scénario: Timeout polling après max tentatives
    Etant donné un job qui reste en statut running après max tentatives
    Quand on tente de poller le job
    Alors une erreur contenant "Timeout polling après" est générée
    Et une erreur contenant "tentatives" est générée
    Et le processus s'arrête proprement
  #
  # === Tests des erreurs HTTP pour getNuExtractProjects ===

  Scénario: Erreur réseau lors d'appel API getNuExtractProjects
    Etant donné une erreur réseau simulée pour getNuExtractProjects
    Quand on tente d'appeler getNuExtractProjects
    Alors une erreur "Network error calling GET /api/projects" est générée
    Et l'erreur originale est préservée avec Error Cause
    Et le processus s'arrête proprement

  Scénario: Timeout lors d'appel API getNuExtractProjects
    Etant donné un timeout simulé après 10 secondes pour getNuExtractProjects
    Quand on tente d'appeler getNuExtractProjects
    Alors une erreur "Timeout: La requête GET /api/projects a dépassé 10 secondes" est générée
    Et le processus s'arrête proprement
  #
  # === Tests des erreurs HTTP pour createNuExtractProject ===

  Scénario: Erreur réseau lors d'appel API createNuExtractProject
    Etant donné une erreur réseau simulée pour createNuExtractProject
    Quand on tente d'appeler createNuExtractProject
    Alors une erreur "Network error calling POST /api/projects" est générée
    Et l'erreur originale est préservée avec Error Cause
    Et le processus s'arrête proprement
  #
  # === Tests des erreurs HTTP pour inferTextFromContent ===

  Scénario: Erreur réseau lors d'appel API inferTextFromContent
    Etant donné une erreur réseau simulée pour inferTextFromContent
    Quand on tente d'appeler inferTextFromContent
    Alors une erreur "Network error calling infer-text API" est générée
    Et l'erreur originale est préservée avec Error Cause
    Et le processus s'arrête proprement

  Scénario: Timeout lors d'appel API inferTextFromContent
    Etant donné un timeout simulé après 120 secondes pour inferTextFromContent
    Quand on tente d'appeler inferTextFromContent
    Alors une erreur contenant "Timeout: La requête infer-text a dépassé 120 secondes" est générée
    Et le processus s'arrête proprement

  Scénario: Code HTTP non-200 pour inferTextFromContent
    Etant donné une réponse HTTP 500 de l'API inferTextFromContent
    Quand on tente d'appeler inferTextFromContent
    Alors une erreur contenant "Erreur infer-text: 500" est générée
    Et le processus s'arrête proprement

  Scénario: JSON invalide dans réponse inferTextFromContent
    Etant donné une réponse avec JSON malformé pour inferTextFromContent
    Quand on tente d'appeler inferTextFromContent
    Alors une erreur "Invalid JSON response from infer-text API" est générée
    Et l'erreur de parsing est préservée avec Error Cause
    Et le processus s'arrête proprement

  Scénario: Path invalide pour inferTextFromContent
    Etant donné un path invalide pour inferTextFromContent
    Quand on tente d'appeler inferTextFromContent
    Alors une erreur contenant "Invalid path" est générée
    Et le processus s'arrête proprement

  Scénario: ProjectId invalide pour inferTextFromContent
    Etant donné un projectId invalide (null ou vide) pour inferTextFromContent
    Quand on tente d'appeler inferTextFromContent
    Alors une erreur contenant "Invalid projectId" est générée
    Et le processus s'arrête proprement
