## Intention utilisateur

Identifier et supprimer les raisonnements inutiles de l’IA lors de l’extraction HERMES2022 par une approche bottom-up basée sur journaux/mémoire, et instrumenter la prochaine exécution pour journaliser les étapes de réflexion afin d’optimiser les prompts.

## Spécifications consultées

- `hermes2022-concepts-site-extraction/config/extraction-hermes2022-main.md`
- `shared/hermes2022-extraction-files/config/json-schemas/*`
- Règles de gouvernance Always Apply (formatage, gouvernance)

## Plan bottom-up (journalisation et analyse)

1) Capture des journaux d’extraction IA
- Créer un fichier horodaté `hermes2022-concepts-site-extraction/logs/extraction-YYYY-MM-DD-HHMM.log`.
- Y tracer les événements clés: répertoire d’artefacts utilisé, `baseUrl` et URLs de pages effectivement lues, tailles des sections produites (longueur de `overview`, nombre de phases), temps par étape.

2) Journalisation synthétique de la démarche IA
- Dans les prompts principaux, demander un bref récapitulatif factuel des actions (liste d’étapes, URLs consultées, contrôles effectués) en ≤ 500 caractères, écrit uniquement dans le log (jamais dans l’artefact).
- Si la mémoire du chat est volatile, insérer un encart “Résumé d’actions (log-only)” au début/fin du prompt; proscrire tout raisonnement détaillé.

3) Collecte structurée post-extraction
- Sauvegarder: artefact, sidecar, log d’extraction, récapitulatif IA (si présent) dans `hermes2022-concepts-site-extraction/logs/` avec horodatage.
- Extraire des métriques: nb caractères de `overview`, nb de phases, présence de `phases-concept.overview`, durée totale.

4) Analyse des sources de réflexion inutile
- Catégoriser les digressions: navigation/résolution de chemins, relectures/redondances, commentaires non demandés, validations déjà couvertes par la configuration.
- Mapper chaque catégorie à une mesure de prévention au niveau prompt (directives strictes), configuration (répertoire d’artefacts unique), ou outil (génération directe au bon chemin).

5) Mesures d’optimisation à appliquer
- Prompts: ajouter sections “In-Scope / Out-of-Scope”, formats de sortie stricts, bannir paraphrases, fixer longueurs conformes aux schémas.
- Outillage d’extraction IA: logs horodatés, résolution de répertoire d’artefacts unique (utiliser exclusivement `artifactBaseDir`), supprimer toute recherche multi-emplacements.

## Validation

- Exécution avec journalisation → artefact JSON et sidecar générés au bon endroit, conformes aux schémas (contrôle ponctuel si nécessaire).
- Rapport d’analyse succinct listant les digressions observées et actions correctives associées.

## Traçabilité (à compléter après exécution)

- Lien vers fichiers de logs, artefacts, sidecar, métriques relevées, corrections de prompts effectuées.

## Ajustements

- Si les logs montrent des réflexions persistantes, serrer davantage les prompts (règles “No extra reasoning output”, formats de sortie stricts) et déplacer les contrôles non essentiels hors des prompts vers une validation post‑extraction minimaliste.

