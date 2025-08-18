# Prompt d'extraction - Overview concept des phases HERMES2022

## Objectif

Extraire une description générale structurée du concept de phases HERMES2022
depuis la page <https://www.hermes.admin.ch/en/project-management/phases.html>.

## Instructions d'extraction

- Produire un texte synthétique (overview) couvrant :
  - Cycle de vie (project start, solution development, project end)
  - Approches traditionnelle vs agile (Execution non subdivisée en agile)
  - Uniformité des interfaces, jalons/quality gates, releases
  - Hiérarchie et ordre (1, 2, 2.1, 2.2, 2.3, 3), rôle Initiation/Closure
- Longueur cible : 600–1500 mots, style factuel et fidèle à la source
- Intégrer les points saillants utiles à l'IA pour le contexte et l'articulation

## Format de sortie attendu (injection dans la propriété "phases-concept")

```json
{
  "overview": "[Texte synthétique structuré]",
  "sourceUrl": "https://www.hermes.admin.ch/en/project-management/phases.html",
  "lastChecked": "2025-08-18"
}
```

## Notes importantes

- Extraire uniquement les informations présentes sur la page
- Respecter la structure JSON définie
- Maintenir la cohérence avec le schéma de validation
- Privilégier la précision sur la quantité d'informations
