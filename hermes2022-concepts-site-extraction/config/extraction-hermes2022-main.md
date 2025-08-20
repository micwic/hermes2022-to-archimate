# Prompt général — Génération du fichier hermes2022-concepts.json

## Objectif

Orchestrer la génération complète du fichier intermédiaire `hermes2022-concepts-YYYY-MM-DD.json` (structure conforme au schéma) en:
- agrégeant l’overview général,
- exécutant les prompts des concepts de la méthode dans l’ordre défini,
- validant l’artefact,
- initialisant le sidecar d’approbation pour la revue humaine.

## Références de prompts (inclusions)

- Overview: `hermes2022-concepts-site-extraction/config/extraction-concepts-overview.md`
- Phases:
  - `@hermes2022-concepts-site-extraction/config/extraction-phases-initiation.md`
  - `@hermes2022-concepts-site-extraction/config/extraction-phases-execution.md` (contexte de la phase composite “2. Execution”)
  - `@hermes2022-concepts-site-extraction/config/extraction-phases-concept.md` (2.1 Concept)
  - `@hermes2022-concepts-site-extraction/config/extraction-phases-implementation.md` (2.2 Implementation)
  - `@hermes2022-concepts-site-extraction/config/extraction-phases-deployment.md` (2.3 Deployment)
  - `@hermes2022-concepts-site-extraction/config/extraction-phases-closure.md`

## Schémas de validation

- Données: `@shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json`
- Sidecar d’approbation: `@shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts-approval.json`

## Entrées de configuration

- Fichier: `@hermes2022-concepts-site-extraction/config/extraction-config.json`
  - `hermesVersion` (ex.: `"2022"`)
  - `extractionSource.baseUrl`, `language`, `description`
  - `artifactBaseDir` (chemin relatif au module ou absolu)
- Override répertoire artefacts (optionnel): variable d’environnement `HERMES2022_CONCEPTS_ARTIFACT_DIR` prioritaire sur `artifactBaseDir`.

Note: si `extractionSource.baseUrl` ne contient pas le slash final, normaliser en `https://www.hermes.admin.ch/en/` (ou variante de langue) pour respecter l’énumération du schéma.

## Ordre d’exécution (séquentiel)

1. Overview (inclure le résultat dans `/concepts/overview`)
2. Phases:
   - 1 Initiation
   - 2 Execution (contexte global de la phase composite)
   - 2.1 Concept
   - 2.2 Implementation
   - 2.3 Deployment
   - 3 Closure

Chaque étape produit uniquement la partie du document qui la concerne, qui est ensuite agrégée dans l’artefact final.

## Construction de l’artefact

- Nom du fichier: `hermes2022-concepts-YYYY-MM-DD.json`
- Répertoire:
  - `resolvedArtifactDir = HERMES2022_CONCEPTS_ARTIFACT_DIR || artifactBaseDir`
  - Si `artifactBaseDir` est relatif: il est résolu depuis `hermes2022-concepts-site-extraction/`
- Champs à fournir (conformes au schéma):
  - `hermesVersion`: valeur depuis la config (ex.: `"2022"`)
  - `extractionSource`: `baseUrl` (avec “/” final), `language`, `description`
  - `concepts`:
    - `overview`: produit par le prompt Overview (600–5000 caractères; anglais; texte brut; factuel)
    - `phases`: produit par les prompts de phases (structure conforme au schéma `hermes2022-phases.json`)
  - `metadata`:
    - `created`: date du jour (YYYY-MM-DD)
    - `lastModified`: date du jour (YYYY-MM-DD)

## Validation

- Valider l’artefact avec `hermes2022-concepts.json`
- En cas d’échec: corriger la section fautive, relancer l’étape correspondante, puis revalider globalement.

## Sidecar d’approbation (visa humain)

- Fichier: `hermes2022-concepts-YYYY-MM-DD.approval.json` adjacent à l’artefact
- Contenu conforme à `hermes2022-concepts-approval.json`:
  - Métadonnées: `artifact` (chemin de l’artefact), `date` (YYYY-MM-DD), `reviewer` (optionnel), `notes` (optionnel)
  - Items à initialiser:
    - `{ "target": "/concepts/overview", "rule": "quality-review", "status": "pending", "lastChecked": "YYYY-MM-DD" }`

## Contraintes de style (rappel synthétique)

- Overview: anglais, texte brut (pas de Markdown riche), factuel, fidèle aux 2 pages d’overview/preface, sans extrapolation.
- Phases: respecter la hiérarchie et l’ordre, utiliser les URLs spécifiques par phase définies dans les prompts de phases.