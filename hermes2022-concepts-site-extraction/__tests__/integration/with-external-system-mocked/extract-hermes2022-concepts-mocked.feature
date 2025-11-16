# language: fr
Fonctionnalité: Extraction orchestrée des concepts HERMES2022 avec workflow par blocs (systèmes externes mockés)

  Contexte:
    Etant donné une configuration valide pour l'extraction orchestrée
    Et un schéma JSON résolu valide
    Et les clés API sont chargées

  # === Scénario de succès ===

  Scénario: Extraction complète réussie avec workflow par blocs
    Et nuextract.ai et api.anthropic.com sont mockés pour retourner des réponses valides
    Et les pages HTML sources d'information sont mockées pour retourner un contenu valable
    Et les projets LLM sont initialisés
    Quand on exécute extractHermes2022Concepts avec l'orchestrateur
    Alors l'extraction se termine avec succès
    Et l'artefact final est recomposé correctement
    Et les propriétés paramétriques sont normalisées (sourceUrl, extractionInstructions)
    Et l'artefact est sauvegardé dans le répertoire de sortie
    Et le fichier d'approbation est créé avec status "pending"

  # === Scénarios d'erreur ===

  Scénario: Erreur lors de la collecte HTML (fetch hermes.admin.ch échoue)
    Et nuextract.ai et api.anthropic.com sont mockés pour retourner des réponses valides
    Et le fetch HTML vers hermes.admin.ch échoue avec erreur réseau
    Et les projets LLM sont initialisés
    Quand on tente d'exécuter extractHermes2022Concepts avec l'orchestrateur
    Alors une erreur contenant "Network error" est générée

  Scénario: Erreur lors de l'extraction d'un bloc (nuextract.ai retourne erreur HTTP 500)
    Et nuextract.ai est mocké pour retourner erreur HTTP 500
    Et api.anthropic.com est mocké pour retourner des réponses valides
    Et les pages HTML sources d'information sont mockées pour retourner un contenu valable
    Et les projets LLM sont initialisés
    Quand on tente d'exécuter extractHermes2022Concepts avec l'orchestrateur
    Alors une erreur contenant "API error: 500" est générée

  Scénario: Erreur lors de la recomposition (nuextract.ai retourne data null)
    Et nuextract.ai est mocké pour retourner data null
    Et api.anthropic.com est mocké pour retourner des réponses valides
    Et les pages HTML sources d'information sont mockées pour retourner un contenu valable
    Et les projets LLM sont initialisés
    Quand on tente d'exécuter extractHermes2022Concepts avec l'orchestrateur
    Alors une erreur contenant "Invalid data in partial result" est générée

  # === Scénarios d'erreur Claude (préparation intégration future) ===

  @future
  Scénario: Erreur lors de l'extraction avec Claude (api.anthropic.com retourne erreur HTTP 429)
    Et nuextract.ai est mocké pour retourner des réponses valides
    Et api.anthropic.com est mocké pour retourner erreur HTTP 429 (rate limit)
    Et les pages HTML sources d'information sont mockées pour retourner un contenu valable
    Et les projets LLM sont initialisés
    Quand on tente d'exécuter extractHermes2022Concepts avec l'orchestrateur
    Alors une erreur contenant "Rate limit exceeded" est générée
