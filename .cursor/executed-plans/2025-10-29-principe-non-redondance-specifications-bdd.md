# Plan : Clarification du principe de non-redondance entre spécifications générales et détaillées

**Date** : 2025-10-29
**Statut** : ✅ Complété

## Contexte

Suite à remarque utilisateur : "Les spécifications dans le projet et pour les tests doivent rester succinctes pour éviter des redondances, .feature et .steps.ts représentent les spécifications détaillées."

Besoin de clarifier la distinction entre :
- **Spécifications générales** : Fichiers `.mdc` dans `.cursor/rules/` - doivent être **succincts**
- **Spécifications détaillées** : Fichiers `.feature` et `.steps.ts` - peuvent être **exhaustifs**

## Objectifs

1. Ajouter le principe de non-redondance dans `@bdd-governance`
2. Appliquer ce principe dans `specification-hermes2022-concepts-site-extraction-tests.mdc`
3. Simplifier les sections existantes qui dupliquaient le contenu BDD
4. Maintenir la mise à jour de la date selon @current-date-awareness

## Changements implémentés

### 1. Ajout du principe dans `bdd-governance.mdc`

**Section ajoutée** : "Principe : Spécifications générales vs spécifications détaillées"

#### Spécifications générales (fichiers `.mdc`)
- **Contenu** : Décisions architecturales et techniques justifiées, patterns validés avec exemples minimalistes, anti-patterns avec solutions recommandées, état d'implémentation
- **Objectif** : Documenter les choix de conception et les principes directeurs
- **Niveau de détail** : Succinct, éviter la redondance avec les fichiers BDD

#### Spécifications détaillées (fichiers BDD)
- **`.feature`** : Scénarios Gherkin exhaustifs (Given/When/Then) décrivant tous les comportements attendus
- **`.steps.ts`** : Implémentation complète des steps avec mocking, assertions et logique de test
- **Objectif** : Définir précisément le comportement attendu du code
- **Niveau de détail** : Exhaustif et exécutable

#### Règle de non-redondance
- **Les spécifications générales ne doivent PAS dupliquer le contenu des fichiers `.feature` et `.steps.ts`**
- **Les fichiers `.feature` et `.steps.ts` représentent les spécifications détaillées exécutables**
- **Les spécifications générales documentent uniquement les décisions et patterns, pas les scénarios détaillés**

### 2. Application dans `specification-hermes2022-concepts-site-extraction-tests.mdc`

**Ajout du principe** au début du document (après "Objectifs") :
- Même structure que dans `bdd-governance.mdc`
- Adaptation au contexte spécifique des tests du module

**Simplification de la section "Tests de validation loadInstructions"** :
- **Avant** : ~70 lignes avec exemples de code TypeScript détaillés et scénarios Gherkin complets
- **Après** : ~20 lignes succinctes avec uniquement :
  - Description : 3 cas d'erreur correspondant aux 3 étapes de traitement
  - Justification : Criticité, détection précoce, exhaustivité
  - Patterns validés : Mocking fs.readFileSync, Error Cause, messages explicites
  - Anti-patterns : Validation laxiste
  - État d'implémentation : ✅ 3 scénarios BDD

**Contenu supprimé** (redondant avec `.feature` et `.steps.ts`) :
- Exemples de code TypeScript complets (~40 lignes)
- Détails des 3 scénarios Gherkin
- Assertions détaillées des tests
- Mocking détaillé de `fs.readFileSync`

### 3. Mise à jour des dates

- `bdd-governance.mdc` : Date mise à jour de [2025-08-19] → [2025-10-29]
- `specification-hermes2022-concepts-site-extraction-tests.mdc` : Date déjà à [2025-10-29]

## Validation

### Conformité aux règles

- ✅ @bdd-governance : Principe de non-redondance clairement défini
- ✅ @specification-governance : Spécifications succinctes sans duplication
- ✅ @current-date-awareness : Dates mises à jour correctement
- ✅ @markdown-formatting-standards : Lignes vides autour des listes ajoutées

### Vérification du contenu

**Spécifications générales** :
- ✅ Décisions documentées (3 étapes de traitement)
- ✅ Patterns minimalistes (mocking, Error Cause)
- ✅ Anti-patterns avec solutions
- ✅ État d'implémentation clair

**Pas de duplication** :
- ✅ Pas de scénarios Gherkin complets (dans .feature)
- ✅ Pas d'exemples de code complets (dans .steps.ts)
- ✅ Pas d'assertions détaillées (dans .steps.ts)

## Fichiers modifiés

1. `cursor-ws-hermes2022-to-archimate/.cursor/rules/new-for-testing/bdd-governance.mdc`
   - Ajout section "Principe : Spécifications générales vs spécifications détaillées"
   - Mise à jour date : [2025-10-29]

2. `hermes2022-concepts-site-extraction/__tests__/.cursor/rules/specification-hermes2022-concepts-site-extraction-tests.mdc`
   - Ajout section "Principe : Spécifications générales vs spécifications détaillées"
   - Simplification section "Tests de validation loadInstructions" (~70 → ~20 lignes)
   - Correction MD032 (lignes vides autour des listes)

## Impact

### Bénéfices
1. **Clarté** : Distinction explicite entre spécifications générales et détaillées
2. **Maintenabilité** : Réduction de la redondance (~50 lignes supprimées)
3. **Cohérence** : Principe applicable à toutes les spécifications de tests du projet
4. **Efficacité** : Lecture plus rapide des spécifications générales

### Règle applicable globalement
Ce principe s'applique maintenant à :
- Tous les fichiers de spécifications de tests (`.mdc` dans `__tests__/.cursor/rules/`)
- Toutes les futures sections ajoutées dans ces spécifications
- Tous les modules du projet (hermes2022-concepts-site-extraction, archimate-model-loader, hermes2022-ia-loader)

## Leçons apprises

1. **Les fichiers BDD sont les spécifications détaillées** : Ne pas dupliquer leur contenu dans les `.mdc`
2. **Spécifications générales = décisions + patterns** : Se concentrer sur le "pourquoi" et les principes, pas le "comment détaillé"
3. **Exemples minimalistes suffisent** : Pas besoin de code complet, juste les patterns clés
4. **La gouvernance doit être explicite** : Principe documenté évite la dérive future

## Prochaines étapes potentielles

- [ ] Appliquer le même principe de simplification aux autres sections de `specification-hermes2022-concepts-site-extraction-tests.mdc`
- [ ] Réviser les spécifications générales des autres modules pour cohérence
- [ ] Créer un template de spécification de tests avec le principe intégré

