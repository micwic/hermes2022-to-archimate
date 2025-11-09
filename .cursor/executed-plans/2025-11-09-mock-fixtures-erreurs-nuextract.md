# Plan exécuté : Generalisation des fixtures pour les tests d’erreurs NuExtract

- **Date** : 2025-11-09
- **Portée** : `hermes2022-concepts-site-extraction/__tests__/unit`
- **Objectif** : Documenter et appliquer la règle imposant l’usage exclusif de fixtures/mocks pour les tests unitaires de gestion d’erreurs NuExtract, sans appels API réels.

## Contexte

Des scénarios unitaires faisaient encore appel à `generateTemplate()` avec la configuration complète, provoquant des timeouts et une dépendance aux endpoints NuExtract. La gouvernance impose d’éviter ces appels dans les tests d’erreurs.

## Actions réalisées

- Ajouté dans `specification-hermes2022-concepts-site-extraction-tests.mdc` une section dédiée à cette règle (fixtures + mocks, interdiction des appels API réels).
- Dans `nuextract-client-error-handling.steps.ts` :
  - Remplacé le recours à `generateTemplate()` par la fixture `nuextract-template-valid.json` pour le scénario « Erreur template existant non conforme ».
  - Mocké explicitement `nuextractApi.inferTemplateFromDescription` pour les scénarios « template vide », « timeout mode sync » et « API infer-template inaccessible ».
  - Simplifié la création du template non conforme via l’opérateur spread.
  - Étendu le mock global de `nuextract-api.js` pour exposer `inferTemplateFromDescription` en tant que `jest.fn`.
- Exécuté `npm test -- --testPathPatterns="nuextract-client-error-handling"` pour valider la suite (52 scénarios passés).

## Résultat

Les tests d’erreurs sont désormais déterministes, indépendants du réseau et alignés avec la gouvernance. La documentation reflète la règle et sert de référence pour les prochaines évolutions.

