/**
 * path-resolver.js - Résolution robuste des chemins depuis la racine du repository
 * 
 * Convention du projet :
 * - Un seul package.json à la racine du repository
 * - Tous les chemins dans les fichiers de configuration sont relatifs à repoRoot
 * - Utilisation de find-up pour détection automatique de la racine
 * 
 * Conforme à @root-directory-governance.mdc
 */

const findUp = require('find-up');
const path = require('path');

/**
 * Cache de la racine détectée pour éviter les recherches répétées
 */
let _cachedRepoRoot = null;

/**
 * Obtient la racine du repository (version synchrone)
 * 
 * Utilise package.json comme marqueur selon la convention Node.js standard.
 * La recherche commence depuis __dirname et remonte l'arborescence.
 * 
 * @returns {string} Chemin absolu vers la racine du repo
 * @throws {Error} Si package.json n'est pas trouvé
 */
function getRepoRootSync() {
  if (!_cachedRepoRoot) {
    const packagePath = findUp.sync('package.json', { cwd: __dirname });
    if (!packagePath) {
      throw new Error('Could not find project root (package.json not found)');
    }
    _cachedRepoRoot = path.dirname(packagePath);
  }
  return _cachedRepoRoot;
}

/**
 * Résout un chemin depuis la racine du repository (version synchrone)
 * 
 * Tous les chemins dans les fichiers de configuration doivent être
 * relatifs à la racine du repository selon les conventions du projet.
 * 
 * @param {...string} segments - Segments de chemin relatifs à repoRoot
 * @returns {string} Chemin absolu résolu
 * 
 * @example
 * // Config contient: "apiKeyFile": "hermes2022-concepts-site-extraction/config/nuextract-api-key.key"
 * const keyPath = resolveFromRepoRoot(config.nuextract.apiKeyFile);
 * 
 * @example
 * // Chemin direct
 * const schemaPath = resolveFromRepoRoot('shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json');
 */
function resolveFromRepoRoot(...segments) {
  const repoRoot = getRepoRootSync();
  return path.resolve(repoRoot, ...segments);
}

/**
 * Réinitialise le cache (utile pour les tests)
 * @internal
 */
function _resetCache() {
  _cachedRepoRoot = null;
}

module.exports = {
  resolveFromRepoRoot,
  getRepoRootSync,
  _resetCache
};

