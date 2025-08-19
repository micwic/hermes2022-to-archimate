# Plan d'exécution : Implémentation système HERMES2022

> Créé le : 2025-08-19  
> Heure de création : 08:01:29  
> Dernière mise à jour : 2025-08-19-08:38:44  
> Statut : Plan d'implémentation selon spécifications validées - En attente de validation  
> Référence gouvernance : @agent-ai-generation-governance

## Contexte

Implémentation du système d'extraction des concepts HERMES2022 selon les spécifications validées

## Préconditions (hors plan) — déjà réalisées

1. ✅ `specification-hermes2022-to-archimate.mdc` - Validée (cadre architectural)
2. ✅ `specification-hermes2022-concepts-site-extraction.mdc` - Validée (ségrégation respectée)
3. ✅ `specification-hermes2022-extraction-files.mdc` - Validée (structure cible définie)
4. 🚧 Schéma JSON phases - À implémenter selon spécifications

## Objectif

**Itération phases uniquement** : Implémenter l'extraction des phases HERMES2022 selon les spécifications validées. Les autres concepts (scénarios, modules, tâches, résultats, rôles) seront généralisés après validation de cette itération phases.

## Mise en œuvre

### Phase 1 : Implémentation du schéma JSON phases selon spécifications hermes2022-extraction-files

1. **Implémenter la structure du schéma JSON pour extraction des phases** :
   - Propriété "description" comme structure pour contenu extractible des phases
   - Propriété "order" avec format hiérarchique "\\d+(\\.\\d+)*" pour phases HERMES2022
   - Support hiérarchie à deux niveaux (1, 2, 2.1, 2.2, 2.3, 3)
   - Contraintes de validation selon spécifications pour les phases uniquement

2. **Implémenter la hiérarchie spécifique des phases HERMES2022** :
   - Structure conforme aux spécifications documentées pour les 6 phases
   - Identifiants format "ph_abc123" pour les phases
   - Types "composite" pour Execution, "simple" pour autres phases

### Phase 2 : Implémentation des instructions d'extraction phases selon spécifications hermes2022-concepts-site-extraction

1. **Créer la structure de répertoire pour extraction des phases** :
   - Répertoires /config/, /output/, /logs/
   - 7 Fichiers extraction-phases-*.md pour les 6 phases HERMES2022 et le concept général de phases
   - Configuration extraction-config.json pour phases

2. **Implémenter le contrat d'interface extraction-phases/fichiers intermédiaires** :
   - Synchronisation avec schéma JSON phases hermes2022-extraction-files @shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json et @shared/hermes2022-extraction-files/config/json-schemas/hermes2022-phases.json
   - Validation conforme aux spécifications pour les phases

### Phase 3 : Génération des prompts d'extraction des phases

1. **Générer les instructions d'extraction des phases au format spécifié** :
   - Format Markdown selon spécifications du module
   - Un fichier par phase (6 fichiers : initiation, concept, implementation, deployment, execution, closure + 1 fichier pour concept général phases : overview)
   - Respect du contrat d'interface pour les phases uniquement

## Validation

### Critères de validation — Phase 1 (schéma JSON phases)

- [x] Structure du schéma JSON phases implémentée selon spécifications hermes2022-extraction-files
- [x] Propriété "description" comme structure extractible pour phases
- [x] Propriété "order" format hiérarchique pour phases HERMES2022 (1, 2, 2.1, 2.2, 2.3, 3)
- [x] Hiérarchie 6 phases HERMES2022 supportée dans le schéma

### Critères de validation — Phase 2 (instructions d'extraction phases)

- [x] Structure de répertoire créée pour extraction phases selon spécifications (7 fichiers, dont `extraction-phases-overview.md`)
- [x] Contrat d'interface extraction-phases/fichiers intermédiaires implémenté
- [x] Validation conforme aux spécifications pour phases uniquement

### Critères de validation — Phase 3 (prompts phases)

- [x] Instructions d'extraction phases générées (7 fichiers .md, dont overview)
- [x] Conformité avec le cadre architectural pour phases
- [x] Scope limité aux phases de cette itération

## Risques identifiés

- **Risque faible** : Implémentation selon spécifications validées
- **Impact** : Aucun impact architectural, cadre défini
- **Mitigation** : Respect strict des spécifications et du principe de ségrégation

## Traçabilité

Cette section sera mise à jour avec les résultats effectifs après validation et exécution.

### Résultats obtenus

- [x] Phase 1 : Schéma JSON phases implémenté selon spécifications hermes2022-extraction-files
- [x] Phase 2 : Instructions d'extraction phases en place conformément aux spécifications (structure + 7 fichiers, dont overview)
- [x] Phase 3 : Prompts d'extraction des 6 phases + overview disponibles

### Actions réalisées

- [2025-08-19 08:09] Réorganisation du présent plan pour conformité stricte à @agent-ai-generation-governance (préconditions hors plan, sections Mise en œuvre/Validation/Traçabilité/Résumé)
- [2025-08-19 08:30] Ajout/prise en compte du fichier d'instruction d'overview des phases (7e fichier) dans la structure attendue `extraction-phases-overview.md`
- [2025-08-19 08:35] Mise à jour de la règle `agent-ai-generation-governance.mdc` (exemples) avec l'étape 5 « Ajustements » afin d'exiger la mise à jour du plan et/ou des spécifications après exécution

### Problèmes rencontrés et solutions

- Omission initiale de l'overview des phases dans les exemples de la règle → Ajout explicite du 7e fichier d'instruction et de l'étape 5 « Ajustements » dans la règle; plan ajusté en conséquence

### Validation conformité @agent-ai-generation-governance

- Conformité aux obligations: plan formalisé, critères de validation, traçabilité prévue, résumé attendu, étape d'ajustements intégrée

## Résumé (à produire après exécution)

Créer un résumé factuel dans `shared/hermes2022-extraction-files/.cursor/rules/summary/` avec un nom conforme (p. ex. `2025-08-19-implementation-phases.md`) : actions réalisées, résultats, écarts, points ouverts.

## Demande de validation utilisateur

Souhaitez-vous valider l'exécution de ce plan d'implémentation qui découle des spécifications validées et respecte @agent-ai-generation-governance ?
