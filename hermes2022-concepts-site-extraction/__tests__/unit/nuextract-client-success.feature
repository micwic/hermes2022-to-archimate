# language: fr
Fonctionnalité: Tests unitaires de succès pour nuextract-client

  #
  # === Tests de succès pour loadApiKey ===

  Scénario: Chargement réussi depuis variable système
    Etant donné une variable système NUEXTRACT_API_KEY définie avec un JWT valide
    Quand on charge la clé API avec loadApiKey
    Alors la clé API est retournée
    Et la clé API correspond au JWT de la variable système

  Scénario: Chargement réussi depuis fichier avec espaces
    Etant donné aucune variable système NUEXTRACT_API_KEY
    Et un fichier de clé API contenant un JWT valide avec espaces "  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.abc123  "
    Quand on charge la clé API avec loadApiKey
    Alors la clé API est retournée
    Et la clé API est le JWT sans espaces "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.abc123"

  Scénario: Chargement réussi depuis fichier sans espaces
    Etant donné aucune variable système NUEXTRACT_API_KEY
    Et un fichier de clé API contenant un JWT valide sans espaces "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.abc123"
    Quand on charge la clé API avec loadApiKey
    Alors la clé API est retournée
    Et la clé API est identique au contenu du fichier

  #
  # === Tests de succès pour generateTemplate ===

  Scénario: Génération template mode sync avec répertoire existant
    Etant donné une configuration valide avec templateMode "sync" et deux instructions
    Et une clé API valide
    Et un schéma JSON résolu valide
    Et un répertoire de sauvegarde qui existe
    Et une API NuExtract sync qui retourne un template valide
    Quand on génère le template avec generateTemplate
    Alors le template est retourné
    Et le template correspond au template API
    Et l'API sync a été appelée avec les bons paramètres
    Et le template a été sauvegardé dans le fichier

  #
  # === Tests de succès pour loadGlobalConfig ===

  Scénario: Chargement réussi de la configuration globale
    Etant donné un fichier de schéma JSON valide
    Quand on charge la configuration avec loadGlobalConfig
    Alors la configuration est retournée
    Et la configuration contient la section nuextract

  #
  # === Tests de succès pour loadAndResolveSchemas ===

  Scénario: Résolution réussie du schéma JSON avec $ref
    Etant donné une configuration avec le chemin vers un schéma JSON principal valide
    Et le schéma principal contient des $ref vers d'autres fichiers
    Et tous les fichiers $ref existent et sont valides
    Quand on charge et résout le schéma avec loadAndResolveSchemas
    Alors le schéma résolu est retourné
    Et toutes les $ref sont remplacées par leur contenu
    Et le schéma résolu est valide selon JSON Schema Draft-07

  #
  # === Tests de succès pour findOrCreateProject ===

  Scénario: Création d'un nouveau projet NuExtract avec template
    Etant donné une configuration avec projectName "test-project"
    Et une clé API valide
    Et un template JSON valide
    Et le projet "test-project" n'existe pas encore
    Quand on appelle findOrCreateProject
    Alors un nouveau projet est créé
    Et le projet est retourné avec son ID
    Et le projet a la propriété created à true

  Scénario: Récupération d'un projet existant sans mise à jour
    Etant donné une configuration avec projectName "existing-project" et templateReset false
    Et une clé API valide
    Et un template JSON valide
    Et le projet "existing-project" existe déjà avec un template conforme
    Quand on appelle findOrCreateProject
    Alors le projet existant est retourné
    Et aucune mise à jour n'est effectuée
    Et le projet a la propriété existing à true

  #
  # === Tests de succès pour fetchHtmlContent ===

  Scénario: Téléchargement réussi d'une page HTML
    Etant donné une URL valide "https://www.hermes.admin.ch/en/project-management/phases.html"
    Et le serveur répond avec un code 200
    Quand on télécharge le contenu avec fetchHtmlContent
    Alors le contenu texte est retourné
    Et le contenu est une chaîne non vide

  #
  # === Tests de succès pour collectHtmlSourcesAndInstructions ===

  Scénario: Collecte réussie des blocs HTML avec instructions
    Etant donné un schéma JSON résolu avec sourceUrl et extractionInstructions
    Et une configuration avec baseUrl valide
    Et les URLs du schéma sont accessibles
    Quand on collecte les sources avec collectHtmlSourcesAndInstructions
    Alors une liste de blocs est retournée
    Et chaque bloc contient jsonPointer, instructions et htmlContents

  #
  # === Tests de succès pour saveArtifact ===

  Scénario: Sauvegarde réussie de l'artefact JSON
    Etant donné une configuration avec artifactBaseDirectory valide
    Et un artefact JSON valide
    Et un répertoire de destination qui existe
    Quand on sauvegarde l'artefact avec saveArtifact
    Alors l'artefact est écrit dans le fichier
    Et le fichier d'approbation est créé
    Et les chemins des fichiers sont retournés
