# language: fr
Fonctionnalité: Gestion d'erreur robuste
  #
  # === Gestion des erreurs système (résolution racine repository) ===

  Scénario: Erreur racine repository introuvable
    Etant donné find-up ne trouve pas package.json
    Quand on tente d'initialiser le module
    Alors une erreur contenant "Impossible de localiser la racine du repository" est générée
    Et le processus s'arrête proprement
  #
  # NOTE: Les tests de loadGlobalConfig, loadApiKeys et loadAndResolveSchemas ont été déplacés
  # vers concepts-site-extraction-orchestrator-error-handling.feature car ces fonctions sont
  # maintenant dans l'orchestrateur (refactoring BDD Phase 1)
  #
  # === Gestion des erreurs de génération de template (fonction generateTemplate) ===

  Scénario: Erreur instructions absentes dans generateTemplate
    Etant donné une configuration sans templateTransformationInstructions.instructions
    Et une clé API valide "fake-api-key"
    Et un schéma JSON résolu valide
    Quand on tente de générer un template
    Alors une erreur "templateTransformationInstructions.instructions non trouvé dans config.llm.nuextract" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur instructions type invalide dans generateTemplate
    Etant donné une configuration avec templateTransformationInstructions.instructions de type string
    Et une clé API valide "fake-api-key"
    Et un schéma JSON résolu valide
    Quand on tente de générer un template
    Alors une erreur contenant "instructions invalide: type" est générée
    Et le message indique le format attendu "array de strings"
    Et le processus s'arrête proprement

  Scénario: Erreur templateMode invalide
    Etant donné une configuration avec templateMode "invalid"
    Quand on tente de générer un template
    Alors une erreur contenant "templateMode invalide" est générée
    Et le message indique les valeurs acceptées "sync" et "async"

  Scénario: Erreur jobId null en mode async
    Etant donné une configuration avec templateMode async
    Et une API async qui ne retourne pas de jobId
    Quand on tente de générer un template
    Alors une erreur "Pas de jobId reçu de l'API async" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur parse JSON templateData invalide en mode async
    Etant donné une configuration avec templateMode async
    Et templateData retourné est une string JSON invalide
    Quand on tente de parser le templateData
    Alors une erreur "Invalid JSON in template data" est générée
    Et l'erreur originale est préservée avec Error Cause

  Scénario: Erreur type templateData invalide en mode async
    Etant donné une configuration avec templateMode async
    Et templateData retourné est de type invalide (null, number, array)
    Quand on tente de valider le type de templateData
    Alors une erreur "Invalid template data type" est générée
    Et le message indique le type attendu et le type reçu
  #
  # === Gestion des erreurs de gestion de projet (fonction findOrCreateProject) ===

  Scénario: Erreur paramètre projectName manquant ou vide
    Etant donné un projectName null ou vide
    Quand on tente de gérer un projet
    Alors une erreur "Missing required valid parameter: projectName" est générée
    Et le processus s'arrête proprement
  #
  # === Gestion des erreurs de template NuExtract et appels API ===

  Scénario: Erreur template vide retourné par l'API
    Etant donné une configuration valide
    Et une API qui retourne un template vide
    Quand on tente de générer un template
    Alors une erreur "Empty template returned by API" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur timeout API génération template mode sync
    Etant donné une configuration avec templateMode sync
    Et un schéma très volumineux causant un timeout
    Quand on tente de générer un template
    Alors une erreur contenant "Timeout sync" est générée
    Et le message suggère d'utiliser le mode async

  Scénario: Erreur API NuExtract infer-template inaccessible
    Etant donné une configuration avec baseUrl incorrect
    Quand on tente d'appeler l'API NuExtract infer-template
    Alors une erreur contenant "Network error calling infer-template API" est générée
    Et le processus s'arrête proprement
  #
  # === Gestion des erreurs d'extraction de bloc (fonction extractSingleBlock) ===

  Scénario: Erreur _projectId non initialisé avant extraction
    Etant donné un bloc valide avec schema et contenus HTML
    Et un projet NuExtract non initialisé
    Quand on tente d'extraire le bloc avec extractSingleBlock
    Alors une erreur "NuExtract project not initialized" est générée
    Et le message suggère d'appeler "findOrCreateProject() first"
    Et le processus s'arrête proprement

  Scénario: Erreur htmlContents vide dans le bloc
    Etant donné un bloc avec schema valide
    Et le bloc a des htmlContents vides
    Et un projet NuExtract initialisé
    Quand on tente d'extraire le bloc avec extractSingleBlock
    Alors une erreur "block.htmlContents is empty" est générée
    Et le message indique "No HTML content found for this block"
    Et le processus s'arrête proprement
