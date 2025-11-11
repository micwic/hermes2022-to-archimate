# language: fr
Fonctionnalité: Gestion d'erreur robuste
  #
  # === Gestion des erreurs de configuration (fonction loadGlobalConfig) ===

  Scénario: Erreur schéma JSON Schema introuvable
    Etant donné un schéma extraction-config.schema.json inexistant
    Quand on tente de charger la configuration depuis le schéma
    Alors une erreur "Schema file not found" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur schéma JSON Schema malformé
    Etant donné un fichier extraction-config.schema.json avec syntaxe JSON invalide
    Quand on tente de charger la configuration depuis le schéma
    Alors une erreur "Invalid JSON in schema file" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur structure config invalide après transformation
    Etant donné un schéma JSON Schema avec structure invalide après transformation
    Quand on tente de charger la configuration depuis le schéma
    Alors une erreur "Invalid config structure: expected an object" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur section nuextract absente après transformation
    Etant donné un schéma JSON Schema sans section nuextract après transformation
    Quand on tente de charger la configuration depuis le schéma
    Alors une erreur "Invalid config structure: missing \"nuextract\" section" est générée
    Et le processus s'arrête proprement
  #
  # === Gestion du chargement de la clé API (fonction loadApiKey) ===

  Scénario: Erreur si variable d'environnement et fichier tous deux absents
    Etant donné aucune variable d'environnement NUEXTRACT_API_KEY
    Et un fichier de clé API inexistant
    Quand on tente de charger la clé API
    Alors une erreur "API_KEY is not set" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur si clé vide après trim (whitespace uniquement)
    Etant donné un fichier de clé API contenant uniquement des espaces et retours à la ligne
    Quand on tente de charger la clé API
    Alors une erreur "API key is empty after trimming" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur si clé n'est pas au format JWT valide
    Etant donné un fichier de clé API contenant "1234" sans format JWT
    Quand on tente de charger la clé API
    Alors une erreur "API key format is invalid" est générée
    Et le processus s'arrête proprement

  Scénario: Chargement réussi avec trim appliqué
    Etant donné un fichier de clé API contenant une clé valide avec espaces
    Quand on tente de charger la clé API
    Alors la clé est chargée avec succès
    Et les espaces ont été supprimés
  #
  # === Gestion des erreurs de chargement des instructions (fonction loadInstructions) ===

  Scénario: Erreur templateTransformationInstructions.instructions absent de config
    Etant donné une configuration sans templateTransformationInstructions.instructions
    Quand on tente de charger les instructions
    Alors une erreur "templateTransformationInstructions.instructions non trouvé dans config.nuextract" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur templateTransformationInstructions.instructions n'est pas un array
    Etant donné une configuration avec templateTransformationInstructions.instructions de type string
    Quand on tente de charger les instructions
    Alors une erreur contenant "instructions invalide: type" est générée
    Et le message indique le format attendu "array de strings"
    Et le processus s'arrête proprement
  #
  # === Gestion des erreurs de chargement et résolution des schémas JSON (fonction loadAndResolveSchemas) ===

  Scénario: Erreur schéma JSON manquant
    Etant donné un fichier de schéma JSON inexistant
    Quand on tente de charger et résoudre le schéma JSON
    Alors une erreur contenant "ENOENT" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur fichier $ref manquant
    Etant donné un schéma JSON valide avec une référence $ref vers un fichier inexistant
    Quand on tente de charger et résoudre le schéma JSON
    Alors une erreur contenant "fichier-inexistant-qui-provoque-erreur" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur JSON malformé
    Etant donné un fichier avec syntaxe JSON invalide
    Quand on tente de charger et résoudre le schéma JSON
    Alors une erreur contenant "Error parsing" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur schéma JSON non conforme à JSON Schema Draft-07
    Etant donné un JSON valide mais non conforme à JSON Schema Draft-07
    Quand on tente de charger et résoudre le schéma JSON
    Alors une erreur contenant "Schema validation failed" est générée
    Et le processus s'arrête proprement
  #
  # === Gestion des erreurs de génération de template (fonction generateTemplate) ===

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

  Scénario: Erreur création nouveau projet sans template
    Etant donné aucun projet existant avec le nom configuré
    Et un template null ou vide
    Quand on tente de créer un nouveau projet
    Alors une erreur "A valid NuExtractTemplate is required for project creation" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur mise à jour projet existant avec mise à jour demandée sans template fourni
    Etant donné un projet existant sur la plateforme
    Et templateReset configuré à true
    Et un template null ou vide
    Quand on tente de mettre à jour le projet
    Alors une erreur "A valid NuExtractTemplate is required for template update" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur validation conformité projet existant sans template fourni
    Etant donné un projet existant sur la plateforme
    Et templateReset configuré à false
    Et un template null ou vide
    Quand on tente de rechercher le projet
    Alors une erreur "A valid NuExtractTemplate is required for template conformity validation" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur projet existant sans template valide
    Etant donné un projet existant sur la plateforme
    Et le projet existant ne contient pas de template ou de template.schema
    Et templateReset configuré à false
    Quand on tente de rechercher le projet
    Alors une erreur contenant "existe mais ne contient pas de template valide" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur template existant non conforme au JSON schema
    Etant donné un projet existant sur la plateforme avec un template non conforme
    Et templateReset configuré à false
    Quand on tente de rechercher le projet
    Alors une erreur contenant "n'est pas conforme au JSON schema attendu" est générée
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
  # === Gestion des erreurs HTTP pour fetchHtmlContent ===

  Scénario: Erreur réseau lors d'appel fetchHtmlContent
    Etant donné une erreur réseau simulée pour fetchHtmlContent
    Quand on tente d'appeler fetchHtmlContent
    Alors une erreur "Network error fetching HTML content" est générée
    Et l'erreur originale est préservée avec Error Cause
    Et le processus s'arrête proprement

  Scénario: Timeout lors d'appel fetchHtmlContent
    Etant donné un timeout simulé après 30 secondes pour fetchHtmlContent
    Quand on tente d'appeler fetchHtmlContent
    Alors une erreur contenant "Timeout: La requête HTML a dépassé 30 secondes" est générée
    Et le processus s'arrête proprement

  Scénario: Code HTTP non-200 pour fetchHtmlContent
    Etant donné une réponse HTTP 404 pour fetchHtmlContent
    Quand on tente d'appeler fetchHtmlContent
    Alors une erreur contenant "HTTP error: 404" est générée
    Et le processus s'arrête proprement

  Scénario: URL invalide pour fetchHtmlContent
    Etant donné une URL invalide pour fetchHtmlContent
    Quand on tente d'appeler fetchHtmlContent
    Alors une erreur contenant "Invalid URL" est générée
    Et le processus s'arrête proprement
  #
  # === Gestion des erreurs pour collectHtmlSourcesAndInstructions ===

  Scénario: Schéma invalide (null) pour collectHtmlSourcesAndInstructions
    Etant donné un schéma résolu null pour collectHtmlSourcesAndInstructions
    Quand on tente d'appeler collectHtmlSourcesAndInstructions
    Alors une erreur contenant "Invalid resolved schema" est générée
    Et le processus s'arrête proprement

  Scénario: Schéma invalide (non-objet) pour collectHtmlSourcesAndInstructions
    Etant donné un schéma résolu non-objet (string) pour collectHtmlSourcesAndInstructions
    Quand on tente d'appeler collectHtmlSourcesAndInstructions
    Alors une erreur contenant "Invalid resolved schema" est générée
    Et le processus s'arrête proprement

  Scénario: Profondeur maximale atteinte pour collectHtmlSourcesAndInstructions
    Etant donné un schéma résolu avec récursivité profonde
    Et maxDepth configuré à 0 pour collectHtmlSourcesAndInstructions
    Quand on tente d'appeler collectHtmlSourcesAndInstructions
    Alors une erreur contenant "Maximum recursion depth" est générée
    Et le processus s'arrête proprement

  Scénario: Instructions manquantes pour bloc avec sourceUrl
    Etant donné un schéma résolu avec bloc sourceUrl sans extractionInstructions
    Quand on tente d'appeler collectHtmlSourcesAndInstructions
    Alors une erreur contenant "extractionInstructions is required" est générée
    Et le JSON Pointer du bloc est inclus dans le message d'erreur
    Et le processus s'arrête proprement

  Scénario: Instructions invalides (type non-array) pour collectHtmlSourcesAndInstructions
    Etant donné un schéma résolu avec extractionInstructions de type non-array
    Quand on tente d'appeler collectHtmlSourcesAndInstructions
    Alors une erreur contenant "extractionInstructions must be an array" est générée
    Et le JSON Pointer du bloc est inclus dans le message d'erreur
    Et le processus s'arrête proprement

  Scénario: Instructions invalides (items.enum manquant) pour collectHtmlSourcesAndInstructions
    Etant donné un schéma résolu avec extractionInstructions array sans items.enum
    Quand on tente d'appeler collectHtmlSourcesAndInstructions
    Alors une erreur contenant "extractionInstructions.items.enum is required" est générée
    Et le JSON Pointer du bloc est inclus dans le message d'erreur
    Et le processus s'arrête proprement

  Scénario: Instructions invalides (array vide) pour collectHtmlSourcesAndInstructions
    Etant donné un schéma résolu avec extractionInstructions array vide
    Quand on tente d'appeler collectHtmlSourcesAndInstructions
    Alors une erreur contenant "extractionInstructions array is empty" est générée
    Et le JSON Pointer du bloc est inclus dans le message d'erreur
    Et le processus s'arrête proprement

  Scénario: Erreur chargement HTML (propagée depuis fetchHtmlContent) pour collectHtmlSourcesAndInstructions
    Etant donné un schéma résolu avec sourceUrl valide
    Et fetchHtmlContent simulé pour lever une erreur réseau
    Quand on tente d'appeler collectHtmlSourcesAndInstructions
    Alors une erreur contenant "Error loading HTML from" est générée
    Et l'erreur originale est préservée avec Error Cause
    Et le processus s'arrête proprement
  #
  # === Gestion des erreurs pour buildExtractionPrompt ===

  Scénario: Blocks vide (aucun bloc extractible) pour buildExtractionPrompt
    Etant donné une préparation avec blocks array vide
    Quand on tente d'appeler buildExtractionPrompt
    Alors une erreur contenant "preparation.blocks is empty" est générée
    Et le processus s'arrête proprement

  Scénario: Structure invalide (preparation.blocks undefined) pour buildExtractionPrompt
    Etant donné une préparation avec blocks undefined
    Quand on tente d'appeler buildExtractionPrompt
    Alors une erreur contenant "preparation.blocks is required" est générée
    Et le processus s'arrête proprement
  #
  # === Gestion des erreurs pour buildBlockPrompt ===

  Scénario: Bloc null pour buildBlockPrompt
    Etant donné un bloc null pour buildBlockPrompt
    Quand on tente d'appeler buildBlockPrompt
    Alors une erreur contenant "Invalid block: block must be a non-null object" est générée
    Et le processus s'arrête proprement

  Scénario: Bloc sans jsonPointer pour buildBlockPrompt
    Etant donné un bloc sans jsonPointer pour buildBlockPrompt
    Quand on tente d'appeler buildBlockPrompt
    Alors une erreur contenant "block.jsonPointer is required" est générée
    Et le processus s'arrête proprement

  Scénario: Instructions non-array pour buildBlockPrompt
    Etant donné un bloc avec instructions de type non-array pour buildBlockPrompt
    Quand on tente d'appeler buildBlockPrompt
    Alors une erreur contenant "block.instructions must be an array" est générée
    Et le processus s'arrête proprement

  Scénario: htmlContents vide pour buildBlockPrompt
    Etant donné un bloc avec htmlContents array vide pour buildBlockPrompt
    Quand on tente d'appeler buildBlockPrompt
    Alors une erreur contenant "block.htmlContents is empty" est générée
    Et le processus s'arrête proprement
  #
  # === Gestion des erreurs pour mergeJsonAtPath ===

  Scénario: Target null pour mergeJsonAtPath
    Etant donné un target null pour mergeJsonAtPath
    Quand on tente d'appeler mergeJsonAtPath
    Alors une erreur contenant "Invalid target: target must be a non-null object" est générée
    Et le processus s'arrête proprement

  Scénario: Path invalide (vide) pour mergeJsonAtPath
    Etant donné un path vide pour mergeJsonAtPath
    Quand on tente d'appeler mergeJsonAtPath
    Alors une erreur contenant "Invalid path: path must be a non-empty string" est générée
    Et le processus s'arrête proprement

  Scénario: Index array hors limites pour mergeJsonAtPath
    Etant donné un target array et un path avec index hors limites pour mergeJsonAtPath
    Quand on tente d'appeler mergeJsonAtPath
    Alors une erreur contenant "Array index out of bounds" est générée
    Et le processus s'arrête proprement
  #
  # === Gestion des erreurs pour recomposeArtifact ===

  Scénario: partialResults null pour recomposeArtifact
    Etant donné des partialResults null pour recomposeArtifact
    Quand on tente d'appeler recomposeArtifact
    Alors une erreur contenant "Invalid partialResults: partialResults must be an array" est générée
    Et le processus s'arrête proprement

  Scénario: partialResults vide pour recomposeArtifact
    Etant donné des partialResults array vide pour recomposeArtifact
    Quand on tente d'appeler recomposeArtifact
    Alors une erreur contenant "partialResults is empty" est générée
    Et le processus s'arrête proprement

  Scénario: jsonPointer manquant dans résultat partiel pour recomposeArtifact
    Etant donné des partialResults avec résultat partiel sans jsonPointer pour recomposeArtifact
    Quand on tente d'appeler recomposeArtifact
    Alors une erreur contenant "Invalid jsonPointer in partial result" est générée
    Et le processus s'arrête proprement

  Scénario: data invalide dans résultat partiel pour recomposeArtifact
    Etant donné des partialResults avec résultat partiel avec data null pour recomposeArtifact
    Quand on tente d'appeler recomposeArtifact
    Alors une erreur contenant "Invalid data in partial result" est générée
    Et le processus s'arrête proprement
  #
  # === Gestion des erreurs pour saveArtifact ===

  Scénario: Erreur artefact null pour saveArtifact
    Etant donné un artefact null pour saveArtifact
    Quand on tente de sauvegarder l'artefact
    Alors une erreur contenant "Invalid artifact: artifact must be a non-null object" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur artefact non-objet (array) pour saveArtifact
    Etant donné un artefact de type array pour saveArtifact
    Quand on tente de sauvegarder l'artefact
    Alors une erreur contenant "Invalid artifact: artifact must be a non-null object" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur artefact non-objet (string) pour saveArtifact
    Etant donné un artefact de type string pour saveArtifact
    Quand on tente de sauvegarder l'artefact
    Alors une erreur contenant "Invalid artifact: artifact must be a non-null object" est générée
    Et le processus s'arrête proprement
  #
  # === Gestion des erreurs pour extractHermes2022ConceptsWithNuExtract ===

  Scénario: Erreur validation Ajv échouée pour extractHermes2022ConceptsWithNuExtract
    Etant donné un schéma résolu valide
    Et une extraction NuExtract qui retourne un artefact non conforme au schéma
    Quand on tente d'extraire les concepts HERMES2022
    Alors une erreur contenant "Extracted JSON does not conform to schema" est générée
    Et le message contient les détails des erreurs de validation
    Et le processus s'arrête proprement
  #
