# Plan d'Exécution : Ajustement de la Spécification pour Extraction HERMES2022 avec Agent JS + NuExtract

## Intention et Contexte
- **Intention Utilisateur** : Ajuster la spécification pour la nouvelle approche (agent JS articulant APIs NuExtract) en retirant les éléments non conformes et en ajoutant les nouveaux.
- **Spécifications Consultées** : @specification-hermes2022-concepts-site-extraction.mdc (ajustée), @specification-hermes2022-to-archimate.mdc, @specification-hermes2022-extraction-files.mdc.
- **Règles Appliquées** : @agent-ai-generation-governance, @specification-governance, @bdd-governance.

## Mise en Œuvre
### 1. Architecture de l'Agent JS
   - Décrire précisément l'agent JavaScript : Classes/modules pour gérer les requêtes HTTP vers APIs NuExtract, parsing des réponses, génération JSON.
   - Composants impactés : Ajouter un répertoire `/src/` avec fichiers comme `nuextract-client.js`, `hermes-extractor.js`, intégration Node.js.
   - Décisions de conception : Utiliser Axios pour les requêtes, Zod pour validation JSON, gestion asynchrone avec promesses.

### 2. Gestion des Erreurs et Reprise
   - Implémenter retry logic (3 tentatives max) et logging détaillé (fichier `/logs/extraction-errors.json`).
   - Fallback : Si NuExtract échoue, journaliser et permettre une intervention manuelle.
   - Impacts connexes : Intégrer avec les tests BDD pour simuler les erreurs.

### 3. Intégration avec Modules Aval
   - Contrats d'interface : Assurer que les JSON produits respectent les schémas de `hermes2022-extraction-files` (validation Ajv).
   - Tests d'intégration : Scénarios BDD pour vérifier le flux complet (extraction → JSON → chargement ArchiMate/Neo4j).
   - Artefacts à modifier : Mettre à jour `extraction-config.json` pour inclure les paramètres NuExtract (clé API, endpoints).

### 4. Sécurité et Conformité
   - Souveraineté : Extraction via APIs cloud, mais stockage local ; gérer les quotas pour éviter les coûts excessifs.
   - Conformité : Respecter les licences NuExtract (MIT), et les lois suisses sur les données (pas de stockage sensible).
   - Validation : Contrôles d'intégrité pour les données extraites (ex. : pas d'injection de contenu externe).

### 5. Tests et Validation BDD
   - Étendre les tests : Ajouter des scénarios pour l'agent JS (ex. : extraction d'une phase HERMES2022, gestion d'erreur).
   - Outils : Utiliser Jest-Cucumber avec fixtures JSON pour valider les sorties.
   - Critères : 100% de conformité JSON Schema, taux de succès >95% sur les URLs test.

### 6. Performance et Monitoring
   - Métriques : Temps moyen d'extraction (<5s par page), volume de données (JSON <1MB par concept).
   - Logging : Fichier `/logs/extraction-metrics.json` avec timestamps, erreurs, et succès.
   - Optimisation : Parallélisation des requêtes si possible (sans dépasser les limites d'API).

## Validation
- **Critères Mesurables** : 
  - Conformité JSON Schema : 100% des fichiers validés.
  - Tests BDD : Tous les scénarios passent (intégration, e2e).
  - Performance : Extraction complète des phases en <10min.
- **Méthodes** : Exécution des tests automatisés, revue manuelle des logs, validation croisée avec les spécifications aval.

## Traçabilité
- **Actions Concrètes** : 
  - Journaliser les modifications dans `/summary/2025-10-14-ajustement-specification-extraction-hermes2022.md`.
  - Résultats Effectifs : Liste des éléments retirés/adaptés/ajoutés, avec références aux règles.
- **Décisions Prises** : Priorité à la simplicité (agent JS vs. approche complexe), maintien des schémas existants pour compatibilité.

## Résumé
- **Avancements** : Spécification ajustée pour la nouvelle approche, éléments non conformes retirés, nouveaux éléments définis.
- **Prochaines Étapes** : Implémenter l'agent JS, tester l'intégration, et ajuster si nécessaire.
- **Fichier Résumé** : Créer `/summary/2025-10-14-implementation-agent-js-nuextract-hermes2022.md` avec un overview des résultats.

## Ajustements
- **Si Nécessaire** : Si des incohérences sont détectées (ex. : quotas API insuffisants), ajuster la configuration et mettre à jour le plan.
- **Lien Précis** : Ce qui a été ajouté/modifié et pourquoi (ex. : retrait de l'approche hybride pour cohérence).