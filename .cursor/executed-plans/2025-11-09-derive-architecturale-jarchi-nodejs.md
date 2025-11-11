# Plan exécuté : Dérive architecturale JArchi → Node.js et solution hybride

**Date d'exécution** : 2025-11-09

**Statut** : ✅ Complété

**Contexte** : Projet hermes2022-to-archimate, module hermes2022-concepts-site-extraction

## Problème identifié

Une dérive architecturale majeure s'est produite entre août et novembre 2025 :

- **Spécification initiale** : "Javascript compatible comme plugin JArchi de Archi"
- **Implémentation réelle** : Code 100% Node.js avec 7+ dépendances npm

## Cause racine

**Absence de tests de conformité JArchi dès le départ.**

Les tests BDD Node.js validaient le comportement fonctionnel mais pas la contrainte architecturale JArchi.

## Chronologie de la dérive

### ✅ Phase initiale (2025-08-16) : Spécification correcte

- Contrainte JArchi **clairement définie** dans les spécifications
- Architecture prévue : "Javascript compatible comme plugin JArchi de Archi"

### ⚠️ Phase de dérive (2025-10-14 → 2025-11-04) : Introduction progressive de Node.js

- **2025-10-14** : Introduction de `html-to-text` (package npm)
- **2025-10-26** : Refactorisation SOLID avec `find-up`, `jsonwebtoken`, `Ajv`, `@apidevtools/json-schema-ref-parser`
- **2025-11-04** : Extraction par bloc avec `html-to-text` intégré

### ❌ Résultat actuel : Incompatibilité totale

- Code 100% Node.js avec 7+ dépendances npm
- Tests BDD complets mais non exécutables dans JArchi
- Architecture SOLID excellente mais hors contrainte

## Impact

- ✅ Code de qualité (SOLID, DI, tests BDD)
- ❌ Incompatible avec contrainte JArchi
- ⚠️ Nécessite modification des spécifications et architecture hybride

## Solution adoptée

**Architecture hybride Node.js + JArchi** :

1. **Phase 1 : Extraction et transformation (Node.js)**
   - Module `hermes2022-concepts-site-extraction` exécuté en Node.js
   - Utilise l'écosystème npm pour robustesse (Ajv, jsonwebtoken, html-to-text, find-up, @apidevtools/json-schema-ref-parser)
   - Tests BDD complets avec Jest + jest-cucumber
   - Produit des fichiers JSON intermédiaires validés par JSON Schema

2. **Phase 2 : Chargement dans Archi (JArchi)**
   - Module `archimate-model-loader` exécuté dans JArchi (plugin Archi)
   - Lit les fichiers JSON intermédiaires
   - Utilise l'API JArchi pour créer/mettre à jour les éléments Archimate
   - Pas de dépendances externes (pur JavaScript JArchi)

## Modifications effectuées

### Spécifications mises à jour

**Fichier** : `hermes2022-concepts-site-extraction/.cursor/rules/specification-hermes2022-concepts-site-extraction.mdc`

- Ligne 39 : Architecture Node.js + JArchi
- Ligne 88-89 : Exécution Node.js + script JArchi séparé
- Ligne 137-144 : Architecture modulaire Node.js
- Ligne 154-156 : Écosystème npm + tests BDD + architecture hybride
- Ligne 167-170 : Requêtes HTTP Node.js + conversion HTML→texte
- Ligne 179 : Dépendances npm justifiées
- Ligne 209 : APIs REST compatibles Node.js et JArchi

**Fichier** : `.cursor/rules/specification-hermes2022-to-archimate.mdc`

- Ligne 61-70 : Conception générale avec 3 modules distincts
- Ligne 135-190 : Nouvelle section "Architecture hybride Node.js + JArchi"

### Nouveaux documents créés

- `.cursor/rules/architectural-constraints-testing.mdc` (règle de gouvernance à créer)

## Leçons pour l'avenir

### ✅ À faire systématiquement

1. **Tests de conformité architecturale dès le départ**
   - Créer des tests qui valident les contraintes (ex: compatibilité JArchi)
   - Exécuter ces tests à chaque génération IA

2. **Validation continue des contraintes**
   - Revue régulière des spécifications vs implémentation
   - Alertes automatiques en cas de dérive

3. **Documentation des décisions**
   - Documenter pourquoi une contrainte est relaxée
   - Mettre à jour les spécifications immédiatement

### ❌ À éviter

1. **Supposer que les tests fonctionnels suffisent**
   - Tests BDD ≠ Tests de conformité architecturale

2. **Laisser dériver sans validation**
   - Chaque introduction de dépendance npm aurait dû déclencher une alerte

3. **Modifier l'architecture sans mettre à jour les spécifications**
   - Spécifications et code doivent rester synchronisés

## Règle de gouvernance à ajouter

**Nouvelle règle** : `@architectural-constraints-testing.mdc`

Tout projet avec des contraintes architecturales explicites (JArchi, serverless, edge computing, etc.) DOIT avoir des tests automatisés qui valident ces contraintes.

**Exemple** :

```javascript
test('Aucune dépendance Node.js dans code JArchi', () => {
  const code = fs.readFileSync('src/jarchi-script.js', 'utf8');
  expect(code).not.toMatch(/require\(['"]fs['"]\)/);
  expect(code).not.toMatch(/require\(['"]https['"]\)/);
  expect(code).not.toMatch(/require\(['"]path['"]\)/);
});
```

## Fichiers impactés

1. `hermes2022-concepts-site-extraction/.cursor/rules/specification-hermes2022-concepts-site-extraction.mdc`
2. `.cursor/rules/specification-hermes2022-to-archimate.mdc`
3. `.cursor/rules/architectural-constraints-testing.mdc` (à créer)

## Références

- Spécification module : `hermes2022-concepts-site-extraction/.cursor/rules/specification-hermes2022-concepts-site-extraction.mdc`
- Spécification projet : `.cursor/rules/specification-hermes2022-to-archimate.mdc`
- Gouvernance BDD : `@bdd-governance.mdc`
- Gouvernance SOLID : `@code-modularity-governance.mdc`
- Gouvernance root directory : `@root-directory-governance.mdc`

## Conclusion

Cette dérive architecturale, bien qu'ayant produit un code de qualité, illustre l'importance cruciale de :

1. **Tests de conformité architecturale** dès le début du projet
2. **Validation continue** des contraintes non-fonctionnelles
3. **Synchronisation** spécifications ↔ implémentation

La solution adoptée (architecture hybride) permet de conserver les bénéfices du code Node.js tout en respectant la contrainte JArchi pour le chargement dans Archi.

## Prochaines étapes

1. Créer la règle de gouvernance `architectural-constraints-testing.mdc`
2. Implémenter les tests de conformité JArchi pour le module `archimate-model-loader`
3. Valider l'architecture hybride avec des tests d'intégration complets

