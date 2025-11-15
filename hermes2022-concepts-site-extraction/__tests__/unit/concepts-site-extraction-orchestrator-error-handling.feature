# language: fr
Fonctionnalité: Gestion d'erreur robuste pour l'orchestrateur
  #
  # === Gestion des erreurs de configuration (fonction loadGlobalConfig) ===

  Scénario: Erreur schéma JSON Schema introuvable
    Etant donné un schéma extraction-config.schema.json inexistant
    Quand on tente de charger la configuration depuis le schéma
    Alors une erreur contenant "Schema file not found" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur schéma JSON Schema malformé
    Etant donné un fichier extraction-config.schema.json avec syntaxe JSON invalide
    Quand on tente de charger la configuration depuis le schéma
    Alors une erreur contenant "Invalid JSON in schema file" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur structure config invalide après transformation
    Etant donné un schéma JSON Schema avec structure invalide après transformation
    Quand on tente de charger la configuration depuis le schéma
    Alors une erreur contenant "Invalid config structure: expected an object" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur section llm absente après transformation
    Etant donné un schéma JSON Schema sans section llm après transformation
    Quand on tente de charger la configuration depuis le schéma
    Alors une erreur contenant "missing \"llm\" section" est générée
    Et le processus s'arrête proprement
  #
  # === Gestion du chargement des clés API (fonction loadApiKeys) ===

  Scénario: Erreur configuration LLM manquante
    Etant donné une configuration sans section llm
    Quand on tente de charger les clés API
    Alors une erreur contenant "Configuration LLM manquante ou invalide" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur configuration LLM invalide (non objet)
    Etant donné une configuration avec llm de type string
    Quand on tente de charger les clés API
    Alors une erreur contenant "Configuration LLM manquante ou invalide" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur fichier clé API NuExtract inexistant
    Etant donné une configuration avec llm.nuextract.apiKeyFile pointant vers un fichier inexistant
    Et aucune variable d'environnement NUEXTRACT_API_KEY
    Quand on tente de charger les clés API
    Alors une erreur contenant "nuextract API_KEY is not set" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur fichier clé API Claude inexistant
    Etant donné une configuration avec llm.claude.apiKeyFile pointant vers un fichier inexistant
    Et aucune variable d'environnement CLAUDE_API_KEY
    Quand on tente de charger les clés API
    Alors une erreur contenant "claude API_KEY is not set" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur clé API NuExtract vide après trim
    Etant donné un fichier de clé API NuExtract contenant uniquement des espaces
    Quand on tente de charger les clés API
    Alors une erreur contenant "nuextract API key is empty after trimming whitespace" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur clé API NuExtract format JWT invalide
    Etant donné un fichier de clé API NuExtract contenant "1234" sans format JWT
    Quand on tente de charger les clés API
    Alors une erreur contenant "NuExtract API key format is invalid" est générée
    Et le processus s'arrête proprement

  Scénario: Chargement réussi avec trim appliqué
    Etant donné un fichier de clé API NuExtract contenant une clé valide avec espaces
    Et un fichier de clé API Claude contenant une clé valide
    Quand on tente de charger les clés API
    Alors les clés sont chargées avec succès
    Et les espaces ont été supprimés
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
  # === Gestion des erreurs d'initialisation des projets LLM (fonction initializeLLMProjects) ===

  Scénario: Erreur initialisation projet NuExtract échouée
    Etant donné une configuration valide
    Et des clés API valides
    Et un schéma JSON résolu valide
    Et initializeProject de nuextract-client échoue
    Quand on tente d'initialiser les projets LLM
    Alors une erreur est propagée depuis nuextract-client
    Et le processus s'arrête proprement

  Scénario: Erreur validation clé API Claude échouée
    Etant donné une configuration valide
    Et des clés API valides
    Et un schéma JSON résolu valide
    Et validateApiKey de claude-client échoue
    Quand on tente d'initialiser les projets LLM
    Alors une erreur est propagée depuis claude-client
    Et le processus s'arrête proprement
  #
  # === Gestion des erreurs de sauvegarde (fonction saveArtifact) ===

  Scénario: Erreur répertoire de sauvegarde non accessible
    Etant donné une configuration valide
    Et un artefact valide
    Et un répertoire de sauvegarde non accessible en écriture
    Quand on tente de sauvegarder l'artefact
    Alors une erreur contenant "EACCES" ou "ENOENT" est générée
    Et le processus s'arrête proprement

  Scénario: Erreur écriture fichier artefact échouée
    Etant donné une configuration valide
    Et un artefact valide
    Et fs.writeFileSync échoue lors de l'écriture
    Quand on tente de sauvegarder l'artefact
    Alors une erreur est générée
    Et le processus s'arrête proprement
  #
  # === Gestion des erreurs d'extraction (fonction extractHermes2022Concepts) ===

  Scénario: Erreur collecte HTML échouée
    Etant donné une configuration valide
    Et un schéma JSON résolu valide
    Et des clés API valides
    Et collectHtmlSourcesAndInstructions échoue
    Quand on tente d'extraire les concepts HERMES2022
    Alors une erreur est propagée depuis html-collector
    Et le processus s'arrête proprement

  Scénario: Erreur extraction bloc NuExtract échouée
    Etant donné une configuration valide
    Et un schéma JSON résolu valide
    Et des clés API valides
    Et des blocs HTML collectés avec succès
    Et extractSingleBlock de nuextract-client échoue
    Quand on tente d'extraire les concepts HERMES2022
    Alors une erreur est propagée depuis nuextract-client
    Et le processus s'arrête proprement

  Scénario: Erreur extraction bloc Claude échouée
    Etant donné une configuration valide
    Et un schéma JSON résolu valide
    Et des clés API valides
    Et des blocs HTML collectés avec succès
    Et extractBlock de claude-client échoue
    Quand on tente d'extraire les concepts HERMES2022
    Alors une erreur est propagée depuis claude-client
    Et le processus s'arrête proprement

  Scénario: Erreur validation artefact échouée
    Etant donné une configuration valide
    Et un schéma JSON résolu valide
    Et des clés API valides
    Et des blocs HTML collectés avec succès
    Et un artefact extrait non conforme au schéma
    Quand on tente d'extraire les concepts HERMES2022
    Alors une erreur contenant "Extracted JSON does not conform to schema" est générée
    Et le processus s'arrête proprement
