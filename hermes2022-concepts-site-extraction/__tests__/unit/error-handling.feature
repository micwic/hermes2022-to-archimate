# language: fr
Fonctionnalité: Gestion d'erreur robuste
  #
  # === Gestion des erreurs de configuration (fonction loadGlobalConfig) ===

  Scénario: Erreur générée et gérée en cas de fichier de configuration général extraction-config.json manquant
    Etant donné un fichier de configuration général extraction-config.json inexistant
    Quand on tente de charger la configuration
    Alors une erreur adhoc au fichier de configuration général extraction-config.json manquant générée
    Et le processus s'arrête proprement

  Scénario: Erreur générée et gérée en cas de fichier de configuration général extraction-config.json présent mais malformé
    Etant donné un fichier de configuration général extraction-config.json existant mais malformé
    Quand on tente de charger la configuration
    Alors une erreur "Invalid JSON in configuration" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur générée et gérée en cas de section nuextract absente dans le fichier de configuration
    Etant donné un fichier de configuration général extraction-config.json existant et formatté mais sans section nuextract
    Quand on tente de charger la configuration
    Alors une erreur "missing nuextract section" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur générée et gérée en cas de section nuextract avec moins de 15 clés
    Etant donné un fichier de configuration général extraction-config.json avec section nuextract contenant moins de 15 clés
    Quand on tente de charger la configuration
    Alors une erreur "Invalid JSON minimal content for nuextract-client.js in configuration" est générée
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

  Scénario: Erreur API NuExtract inaccessible
    Etant donné une configuration avec baseUrl incorrect
    Quand on tente d'appeler l'API NuExtract
    Alors une erreur de connexion est générée
    Et le processus s'arrête proprement
  #
  # === Gestion des erreurs de gestion de projet (fonction findOrCreateProject) ===

  Scénario: Erreur paramètres obligatoires manquants
    Etant donné une configuration sans projectName
    Quand on tente de gérer un projet
    Alors une erreur "Missing required parameter: projectName" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur création projet sans template
    Etant donné une configuration valide
    Et un template null
    Quand on tente de créer un nouveau projet
    Alors une erreur "Template is required for project creation" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur mise à jour projet inexistant
    Etant donné un projectId invalide
    Quand on tente de mettre à jour le template
    Alors une erreur "Project not found" est générée
    Et le processus s'arrête proprement
