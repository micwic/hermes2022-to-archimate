/**
 * Logger hiérarchique avec niveaux NONE, INFO, DEBUG
 * 
 * Niveaux :
 * - NONE (0) : Seulement error() et warn()
 * - INFO (1) : error(), warn() + info()
 * - DEBUG (2) : error(), warn(), info() + debug()
 * 
 * Configuration :
 * 1. Variable d'environnement LOG_LEVEL (précédence)
 * 2. Paramètre configuration (via logger.configure())
 * 3. Fallback : INFO
 */

const LOG_LEVELS = {
  NONE: 0,
  INFO: 1,
  DEBUG: 2
};

/**
 * Résout le niveau de log selon la priorité : env var > config > fallback
 * @param {string} configLevel - Niveau depuis la configuration
 * @returns {number} Niveau de log résolu
 */
function resolveLogLevel(configLevel) {
  // 1. Variable d'environnement (précédence)
  if (process.env.LOG_LEVEL) {
    return LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] ?? LOG_LEVELS.INFO;
  }
  // 2. Paramètre configuration
  if (configLevel) {
    return LOG_LEVELS[configLevel.toUpperCase()] ?? LOG_LEVELS.INFO;
  }
  // 3. Fallback
  return LOG_LEVELS.INFO;
}

let currentLevel = LOG_LEVELS.INFO;

const logger = {
  /**
   * Configure le niveau de log depuis la configuration
   * @param {string} configLevel - Niveau depuis config (NONE, INFO, ou DEBUG)
   */
  configure: (configLevel) => {
    currentLevel = resolveLogLevel(configLevel);
  },
  
  /**
   * Log d'erreur (toujours actif)
   */
  error: (...args) => console.error('[error]', ...args),
  
  /**
   * Log d'avertissement (toujours actif)
   */
  warn: (...args) => console.warn('[warn]', ...args),
  
  /**
   * Log d'information (actif si niveau >= INFO)
   */
  info: (...args) => {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.log('[info]', ...args);
    }
  },
  
  /**
   * Log de debug (actif si niveau >= DEBUG)
   */
  debug: (...args) => {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      console.log('[debug]', ...args);
    }
  }
};

module.exports = logger;

