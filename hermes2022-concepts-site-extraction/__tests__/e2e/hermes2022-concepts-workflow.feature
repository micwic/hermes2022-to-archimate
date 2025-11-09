# language: fr
Fonctionnalité: Workflow complet hermes2022-concepts-site-extraction (système externe réel)

  Contexte:
    Etant donné une configuration d'extraction hermes2022 valide
    Et une clé API NuExtract disponible
    Et un répertoire d'artefacts isolé pour la session d'extraction

  Scénario: Exécution complète de l'agent hermes2022-concepts-site-extraction
    Quand on exécute l'agent complet hermes2022-concepts-site-extraction
    Alors l'artefact hermes2022-concepts du jour est généré
    Et le fichier d'approbation hermes2022-concepts du jour est initialisé à pending
    Et les métadonnées de l'artefact contiennent la date du jour et la source d'extraction
