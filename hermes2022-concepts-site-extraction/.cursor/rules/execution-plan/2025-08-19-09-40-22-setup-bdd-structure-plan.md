---
description: Plan d'exécution — Mise en place structure BDD initiale pour l'extraction des phases HERMES2022
alwaysApply: false
globs: ""
---

# Plan d'exécution — Mise en place structure BDD (hermes2022-concepts-site-extraction)

> Créé le : 2025-08-19  
> Dernière mise à jour : 2025-08-19

## Intention utilisateur

- Préparer la structure de répertoires et fichiers BDD minimale conforme à `@bdd-governance.mdc` pour le module `hermes2022-concepts-site-extraction`.
- Permettre à l'utilisateur IA d'éditer ces fichiers pour préciser ses intentions. L'IA n'invente pas les intentions.
- Adopter Gherkin comme spécification première (hypothèse actuelle), sans rédiger une autre spécification préalable.

## Références applicables

- `@bdd-governance.mdc`
- `@bdd-cucumber-vscode-plugin-governance.mdc`
- `cucumber-jest.config.js`
- `hermes2022-to-archimate/shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json`
- `hermes2022-to-archimate/shared/hermes2022-extraction-files/.cursor/rules/specification-hermes2022-extraction-files.mdc`

## Périmètre

- Module : `hermes2022-to-archimate/hermes2022-concepts-site-extraction`
- Sujet : Extraction des phases HERMES2022 (cycle Rouge → Vert → Refactor)

## Mise en œuvre (actions prévues)

1. Création de l'arborescence BDD dans le module ciblé (hermes2022-concepts-site-extraction):

   - `__tests__/integration/`
   - `__tests__/e2e/`
   - `__tests__/shared/`
   - `__tests__/support/`

2. Création des fichiers initiaux prérequis hermes2022-concepts (méthodologie/en-tête) :

   - `__tests__/integration/hermes2022-concepts.feature`
   - `__tests__/integration/hermes2022-concepts.steps.ts`

3. Création des fichiers initiaux pour l'extraction des phases (éditables par l'utilisateur IA) :

   - `__tests__/integration/extraction-phases.feature`
   - `__tests__/integration/extraction-phases.steps.ts`
   - `__tests__/shared/common.steps.ts`
   - `__tests__/support/jest-cucumber-setup.js`

4. Contenu initial minimal conforme :

   - `hermes2022-concepts.feature` : entête `# language: fr` et scénario placeholder commenté visant la présence/validité des champs d'en-tête (`hermesVersion`, `extractionSource.baseUrl|language|description`, `metadata.created|lastModified|author|project|purpose`).
   - `hermes2022-concepts.steps.ts` : squelette Jest-Cucumber (imports) et TODOs.
   - `extraction-phases.feature` : entête `# language: fr` et un scénario placeholder commenté.
   - `extraction-phases.steps.ts` : squelette Jest-Cucumber import et TODOs.
   - `common.steps.ts` : squelette mutualisable vide.
   - `jest-cucumber-setup.js` : configuration de base (si manquante au niveau repo, référencer le fichier partagé défini dans la config).

5. Aucune génération d'intentions :

   - Les scénarios, étapes et données seront complétés par l'utilisateur IA dans les itérations successives.

## Critères de validation

- Arborescence `__tests__/[integration|e2e|shared|support]` créée au bon endroit.
- Fichiers initiaux présents avec entêtes/boilerplate minimal conformément à `@bdd-governance.mdc`.
- Lancement des tests possible (même si aucun scénario effectif) via la config partagée.
- La feature et les steps `hermes2022-concepts` existent et constituent un prérequis conceptuel à `extraction-phases`.
- Séparation claire entre tests d'en-tête (méthodologie) et tests des concepts (phases d'abord, autres concepts ensuite).

## Traçabilité d'exécution

- À compléter après exécution: lister les dossiers/fichiers effectivement créés et leurs contenus initiaux.

## Ajustements

- Ajuster ce plan et/ou les spécifications si nécessaire après création.
- En particulier, préciser les conventions de nommage des features/steps si besoin.
