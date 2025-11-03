# language: fr

Fonctionnalité: Gestion d'erreur robuste pour collecte sources et instructions HERMES2022

  Contexte: Tests unitaires pour vérifier que la gestion des erreurs est correctement implémentée
  
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

