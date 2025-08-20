# Résumé session génération IA 2025-08-20 - Paramétrage du répertoire des artefacts

## Contexte Initial

Séparer explicitement les fixtures d’attestation des données « réelles » et
éviter les recherches multi-emplacements coûteuses (IO/CPU). Aligner la
gouvernance sur un pilotage par configuration plutôt que par heuristique.

## Objectifs de la session de génération IA

Introduire un paramétrage unique du répertoire des artefacts pour les tests BDD
(`artifactBaseDir`) et documenter la décision conformément à la gouvernance.

## Découvertes/Problèmes identifiés/Constats effectués

- Recherches multi-emplacements entraînant une consommation évitable de
  ressources.
- Ambiguïté entre données d’attestation et données « réelles » lorsque la
  distinction repose sur les chemins codés en dur.

## Solutions appliquées

- Spécification mise à jour: ajout de « Paramétrage du répertoire des artefacts
  (artifactBaseDir) ».
- Configuration mise à jour: ajout de la clé `artifactBaseDir` dans
  `config/extraction-config.json` (override possible via la variable
  d’environnement `HERMES_CONCEPTS_ARTIFACT_DIR`).

## Validation/Tests

- À réaliser: adapter les steps BDD pour lire `artifactBaseDir` et utiliser ce
  répertoire unique pour localiser l’artefact et son sidecar; conserver la
  validation Ajv (concepts, phases, approval).

## Impact sur le projet

- Réduction de la consommation de ressources et exécutions plus prévisibles.
- Gouvernance et traçabilité clarifiées entre contextes d’attestation et
  données « réelles ».

## État Final

Spécification et configuration mises à jour; implémentation des steps BDD en
attente d’application.

## Prochaines étapes (si applicable)

- Adapter `__tests__/integration/hermes2022-concepts.steps.ts` et
  `__tests__/integration/extraction-phases.steps.ts` pour utiliser
  `artifactBaseDir` (avec override env).
- Harmoniser la phrase Given des features pour pointer
  `config/extraction-config.json`.
