# Harmonisation des messages d'erreur BDD avec pattern regex et capture

## Contexte Initial

Les tests unitaires utilisaient déjà un pattern efficace avec regex et capture de groupe pour éviter la duplication littérale des messages d'erreur entre `.feature` et `.steps.ts`, tandis que les tests d'intégration mockés dupliquaient les messages littéralement. Cette incohérence nuisait à la maintenabilité du code de test.

## Objectifs de la session

- Harmoniser le traitement des messages d'erreur dans tous les tests BDD en adoptant le pattern avec regex et capture
- Établir une règle de bonne pratique dans la gouvernance BDD pour garantir la cohérence future
- Assurer qu'un changement de message ne nécessite qu'une modification dans le fichier `.feature`

## Découvertes/Constats effectués

- **Pattern optimal identifié** : Les tests unitaires utilisaient déjà `/^une erreur contenant "(.*)" est générée$/` avec capture de paramètre, évitant toute duplication
- **Duplication problématique** : Les tests d'intégration mockés dupliquaient les messages entre `.feature` et `.steps.ts`, causant une maintenance à deux endroits
- **Bénéfices du pattern** : DRY (Don't Repeat Yourself), maintenance simplifiée, couplage réduit, flexibilité accrue

## Solutions appliquées

### 1. Harmonisation des tests d'intégration mockés

**Fichier**: `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system-mocked/template-generation-mocked.steps.ts`

- Ligne 61-64 : Remplacement du step littéral par pattern regex avec capture
- Lignes 80-83, 101-104, 122-125 : Application du même pattern pour tous les steps similaires
- Transformation de 4 steps différents en un seul step réutilisable

**Fichier**: `hermes2022-concepts-site-extraction/__tests__/integration/with-external-system-mocked/nuextract-project-management-mocked.steps.ts`

- Lignes 74-77, 101-104 : Application du pattern regex avec capture pour les deux tests

### 2. Ajout de la bonne pratique dans bdd-governance.mdc

**Fichier**: `cursor-ws-hermes2022-to-archimate/.cursor/rules/new-for-testing/bdd-governance.mdc`

Ajout d'une nouvelle section "Gestion des messages d'erreur dans les step definitions" après la section "Cycle Rouge → Vert → Refactor" :

- Pattern validé avec exemples Gherkin et TypeScript complets
- Justification détaillée (DRY, maintenance simplifiée, couplage réduit, flexibilité)
- Anti-patterns à éviter avec exemples de code incorrect
- État d'implémentation documenté

**Formatage** : Conformité avec @markdown-formatting-standards (lignes vides autour titres/listes, indentation 2 espaces)

**Date** : Mise à jour de la date de dernière modification à 2025-10-30 (ligne 9)

## Validation/Tests

**Exécution des tests** : Tous les tests passent après harmonisation

- `template-generation-mocked.steps.ts` : 4/4 tests PASS
  - Erreur HTTP 500 en mode async
  - Timeout 10s en mode async
  - JSON invalide retourné par le polling
  - Type templateData invalide (array)

- `nuextract-project-management-mocked.steps.ts` : 2/2 tests PASS
  - Création de projet sans template (orchestration)
  - Mise à jour demandée sans template (orchestration)

**Total** : 6/6 tests PASS en 0.98s

**Linter** : Aucune erreur de formatage détectée

## Impact sur le projet

**Maintenabilité améliorée** : Un changement de message d'erreur ne nécessite plus qu'une modification dans le fichier `.feature`, évitant les erreurs de synchronisation

**Cohérence assurée** : Tous les tests BDD utilisent maintenant le même pattern, facilitant la compréhension et l'évolution

**Documentation intégrée** : La règle est désormais formalisée dans la gouvernance BDD, garantissant son application systématique

**Conformité** : Respect des principes DRY et de la gouvernance BDD établie

## État Final

✅ **Harmonisation complète** : Tous les tests BDD (unitaires et d'intégration mockés) utilisent le pattern regex avec capture

✅ **Règle formalisée** : La bonne pratique est documentée dans `bdd-governance.mdc` avec exemples et anti-patterns

✅ **Tests validés** : 100% des tests passent avec le nouveau pattern

✅ **Traçabilité assurée** : Plan sauvegardé dans `.cursor/executed-plans/` selon @agent-ai-generation-governance

## Prochaines étapes

- Vérifier si d'autres fichiers de tests dans le projet utilisent la duplication littérale et les harmoniser si nécessaire
- Appliquer systématiquement ce pattern lors de la création de nouveaux tests BDD

## Références

- Gouvernance BDD : `cursor-ws-hermes2022-to-archimate/.cursor/rules/new-for-testing/bdd-governance.mdc`
- Tests unitaires de référence : `hermes2022-concepts-site-extraction/__tests__/unit/nuextract-client-error-handling.steps.ts`
- Gouvernance plan : `cursor-ws-hermes2022-to-archimate/.cursor/rules/new-for-testing/agent-ai-generation-governance.mdc`

