# Plan exécuté : Ajustements du scénario « Erreur API NuExtract infer-template inaccessible »

- **Date** : 2025-11-09
- **Portée** : `hermes2022-concepts-site-extraction/__tests__/unit`
- **Objectif** : Harmoniser le nom du scénario BDD et l’attendu textuel afin d’aligner les tests unitaires sur le message réellement produit par `nuextract-client.js`.

## Contexte

Le scénario « Erreur API NuExtract inaccessible » utilisait encore l’ancien intitulé et attendait le fragment `"connexion"`, alors que la logique métier journalise désormais `"Network error calling infer-template API"`. Le renommage du scénario avait été amorcé mais pas entièrement propagé.

## Actions réalisées

- Renommé le scénario dans `nuextract-client-error-handling.feature` en « Erreur API NuExtract infer-template inaccessible » et mis à jour l’étape `Quand`.
- Aligné l’assertion Then sur le fragment `Network error calling infer-template API`.
- Synchronisé `nuextract-client-error-handling.steps.ts` : nom du test, intitulé `when(...)` et commentaire d’assertion.
- Ajusté la configuration de test pour que le step definition corresponde au nouvel intitulé.
- Exécuté `npm test -- --testPathPatterns="nuextract-client-error-handling"` pour vérifier que la suite restait au vert (un échec subsistait alors sur un scénario non relié, traité ultérieurement).

## Résultat

Le scénario visé reflète désormais précisément le comportement de l’implémentation et ne dépend plus d’un ancien message d’erreur. L’alignement facilite la poursuite des travaux sur la suite unitaire.

