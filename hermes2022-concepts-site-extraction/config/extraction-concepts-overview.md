# Prompt d'extraction - Introduction aux concepts de HERMES2022

## Objectif

Extraire une description générale structurée des concepts de HERMES2022 depuis les pages <{baseUrl}/project-management/method-overview.html> et <{baseUrl}/project-management/method-overview/preface.html>
à inclure dans `/concepts/overview` du fichier intermédiaire selon @shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json.

## Instructions d'extraction

- Produire un texte synthétique (overview) couvrant la gestion de projet en mode traditionnel ou agile, les autres utilisations sont hors contexte, en se limitant strictement aux informations explicitement présentes dans les deux pages référencées ci‑dessus :
  - Finalité et périmètre de la méthode (focus « project management »)
  - Principes/approches de conduite (traditionnelle, agile, hybride) si et seulement si mention explicite
  - Articulation des concepts de haut niveau et leurs relations au survol (sans détailler les sous‑chapitres traités ailleurs) : phases, scénarios, modules, tâches, résultats, rôles
  - Vue d’ensemble des phases et de leur hiérarchie (1, 2, 2.1, 2.2, 2.3, 3) au niveau conceptuel uniquement
  - Gouvernance et assurance qualité si mention explicite (jalons, décisions, « quality gates »)
  - Domaines explicitement hors scope sur ces pages (portefeuille, gestion des applications, etc.)
  - Longueur cible : 200–650 mots (≈ 1 200–4 000 caractères). Bornes strictes du schéma : 600–5 000 caractères.
  - Sortie : texte brut (pas de Markdown riche). Langue du site. Style factuel, neutre, sans extrapolation.
- Intégrer les points saillants utiles à l'IA pour le contexte et la méthodologie dans son ensemble sans créer des redondances inutiles avec les concepts sous-jacents décrits pour eux-mêmes

## Notes importantes

- Extraire uniquement les informations présentes sur les pages de références
- Privilégier la précision sur la quantité d'informations avec une formulation adaptée à une injection ultérieure dans l'IA en RAG
- Respecter la structure JSON définie pour le fichier intermédiaire cible selon le schéma de validation
- Ne pas compléter avec d’autres pages que celles indiquées. Citer textuellement les termes clés si cela améliore la fidélité sans transformer en citation longue.
- La revue humaine est consignée selon hermes2022-concepts-approval.json par le prompt principal de génération du fichier.
