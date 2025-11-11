# Résumé de session : Optimisation html-to-text pour hermes.admin.ch

> Date : 2025-11-10
> Contexte : Amélioration de la qualité de conversion HTML→texte pour extraction HERMES2022
> Règles impactées : specification-hermes2022-concepts-site-extraction.mdc

## Problème identifié

La conversion HTML→texte avec configuration basique de `html-to-text` produisait un contenu de mauvaise qualité :
- ❌ Bruit excessif : Navigation, footer, sidebar, sélecteurs de langue, boutons UI
- ❌ Éléments non pertinents : Images, SVG, scripts, metadata
- ❌ Structure sémantique perdue : Pas de hiérarchie claire des titres
- ❌ Contenu redondant : Liens bruts, breadcrumbs, menus dupliqués

**Exemple de bruit extrait** :
```
Skip to main content
please selectProject management
Select language
DEFRITEN
HERMES Online
Bundeskanzlei
[/]
Downloads [/en/downloads.html]
Archive [/en/archive.html]
Search
```

## Analyse effectuée

**Méthode** : Analyse du HTML réel de `hermes.admin.ch` via logs d'exécution (`concepts-prompt.txt`)

**Structure HTML identifiée** :
- Contenu principal : `<main id="main-content">`, `.container__main`, `.vertical-spacing`
- Éléments à ignorer : `<header>`, `<nav>`, `<footer>`, `.top-bar`, `.breadcrumb`, `.language-switcher`, `.search`, `.burger`, `.back-to-top-btn`, `.container__aside`
- Metadata : `<script>`, `<style>`, `<noscript>`, `<meta>`, `<link>`
- Images : `<img>`, `<svg>`, `<picture>`

## Solution implémentée

**Décision architecturale** : Configuration `html-to-text` optimisée spécifiquement pour `hermes.admin.ch` (sans Cheerio)

**Justification** :
- Simplicité : Utilisation de `html-to-text` uniquement (pas de dépendance Cheerio supplémentaire)
- Efficacité : Sélecteurs CSS ciblés pour ignorer le bruit et préserver le contenu principal
- Sémantique : Préservation de la hiérarchie des titres (H1/H2/H3) et de la structure (paragraphes, listes)

**Configuration appliquée** :

```javascript
const textContent = convert(data, {
  wordwrap: false,
  preserveNewlines: true,
  
  // Cibler le contenu principal
  baseElements: {
    selectors: ['main', '.container__main', '.vertical-spacing']
  },
  
  selectors: [
    // Ignorer navigation et UI (12 sélecteurs)
    { selector: 'header', format: 'skip' },
    { selector: 'nav', format: 'skip' },
    { selector: 'footer', format: 'skip' },
    { selector: '.top-bar', format: 'skip' },
    { selector: '.breadcrumb', format: 'skip' },
    { selector: '.main-navigation', format: 'skip' },
    { selector: '.mobile-menu', format: 'skip' },
    { selector: '.language-switcher', format: 'skip' },
    { selector: '.search', format: 'skip' },
    { selector: '.burger', format: 'skip' },
    { selector: '.back-to-top-btn', format: 'skip' },
    { selector: '.container__aside', format: 'skip' },
    
    // Ignorer metadata (3 sélecteurs)
    { selector: 'script', format: 'skip' },
    { selector: 'style', format: 'skip' },
    { selector: 'noscript', format: 'skip' },
    
    // Ignorer images et SVG (3 sélecteurs)
    { selector: 'img', format: 'skip' },
    { selector: 'svg', format: 'skip' },
    { selector: 'picture', format: 'skip' },
    
    // Préserver structure sémantique (7 sélecteurs)
    { selector: 'h1', options: { uppercase: false, leadingLineBreaks: 2, trailingLineBreaks: 1 } },
    { selector: 'h2', options: { uppercase: false, leadingLineBreaks: 2, trailingLineBreaks: 1 } },
    { selector: 'h3', options: { uppercase: false, leadingLineBreaks: 1, trailingLineBreaks: 1 } },
    { selector: 'p', format: 'paragraph' },
    { selector: 'ul', format: 'unorderedList' },
    { selector: 'ol', format: 'orderedList' },
    { selector: 'a', options: { ignoreHref: true } }
  ]
});
```

## Fichiers modifiés

1. **specification-hermes2022-concepts-site-extraction.mdc**
   - Ajout section "Conversion HTML→texte avec html-to-text"
   - Documentation de la décision architecturale (description, justification, patterns, anti-patterns)
   - État d'implémentation : ✅ Configuration appliquée
   - Date mise à jour : 2025-11-10

2. **html-collector-and-transformer.js**
   - Remplacement configuration basique par configuration optimisée (lignes 43-87)
   - Commentaire explicatif : `// Configuration optimisée pour hermes.admin.ch (2025-11-10)`
   - 25 sélecteurs spécifiques ajoutés (18 pour ignorer, 7 pour préserver structure)

## Résultats attendus

**Avant** (configuration basique) :
- Contenu brut avec bruit excessif (~87KB pour `concepts-prompt.txt`)
- Navigation, footer, sidebar, images, scripts inclus
- Structure sémantique perdue

**Après** (configuration optimisée) :
- Contenu principal uniquement avec structure sémantique préservée
- Réduction significative de la taille des prompts envoyés à NuExtract
- Hiérarchie des titres H1/H2/H3 maintenue pour meilleure interprétation IA
- Élimination du bruit : navigation, footer, sidebar, metadata, images

## Validation

- ✅ Pas d'erreurs de linting (specification + code)
- ✅ Configuration basée sur analyse HTML réel de `hermes.admin.ch`
- ✅ Documentation complète dans spécification
- ✅ Commentaire explicatif dans le code
- 🚧 À valider : Exécution tests d'intégration réels pour vérifier qualité extraction

## Prochaines étapes recommandées

1. **Tester** : Exécuter tests d'intégration réels (`extract-hermes2022-concepts.steps.ts`) pour valider amélioration qualité
2. **Mesurer** : Comparer taille prompts avant/après et qualité des réponses NuExtract
3. **Ajuster** : Affiner sélecteurs si nécessaire selon résultats tests réels
4. **Documenter** : Ajouter résultats tests dans spécification (section "État d'implémentation")

## Références

- Spécification : `hermes2022-concepts-site-extraction/.cursor/rules/specification-hermes2022-concepts-site-extraction.mdc`
- Code modifié : `hermes2022-concepts-site-extraction/src/html-collector-and-transformer.js`
- Gouvernance : `@cursor-rules-summary-governance`, `@markdown-formatting-standards`
- Documentation `html-to-text` : https://github.com/html-to-text/node-html-to-text


