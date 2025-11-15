const https = require('https');
const http = require('http');
const { URL } = require('url');
const { convert } = require('html-to-text');

async function fetchHtmlContent(url, timeoutMs = 30000) {
  console.log(`[info] Chargement et conversion HTML→texte depuis ${url}`);

  try {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (err) {
      throw new Error(`Invalid URL: ${url}. Script stopped.`, { cause: err });
    }

    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const hostname = parsedUrl.hostname;
    const port = parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80);
    const path = parsedUrl.pathname + parsedUrl.search;

    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        port,
        path,
        method: 'GET',
        headers: {
          'User-Agent': 'hermes2022-concepts-site-extraction/1.0'
        }
      };

      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            console.error(`Erreur HTTP ${res.statusCode} lors du chargement de ${url}`);
            reject(new Error(`HTTP error: ${res.statusCode} - ${data.substring(0, 200)}. Script stopped.`, { cause: new Error(`Status ${res.statusCode}`) }));
            return;
          }
          try {
            // Configuration optimisée pour hermes.admin.ch (2025-11-10)
            const textContent = convert(data, {
              wordwrap: false,
              preserveNewlines: true,
              
              // Cibler le contenu principal
              baseElements: {
                selectors: ['main', '.container__main', '.vertical-spacing']
              },
              
              selectors: [
                // Ignorer navigation et UI
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
                
                // Ignorer metadata
                { selector: 'script', format: 'skip' },
                { selector: 'style', format: 'skip' },
                { selector: 'noscript', format: 'skip' },
                
                // Ignorer images et SVG
                { selector: 'img', format: 'skip' },
                { selector: 'svg', format: 'skip' },
                { selector: 'picture', format: 'skip' },
                
                // Préserver structure sémantique
                { selector: 'h1', options: { uppercase: false, leadingLineBreaks: 2, trailingLineBreaks: 1 } },
                { selector: 'h2', options: { uppercase: false, leadingLineBreaks: 2, trailingLineBreaks: 1 } },
                { selector: 'h3', options: { uppercase: false, leadingLineBreaks: 1, trailingLineBreaks: 1 } },
                { selector: 'p', format: 'paragraph' },
                { selector: 'ul', format: 'unorderedList' },
                { selector: 'ol', format: 'orderedList' },
                { selector: 'a', options: { ignoreHref: true } }
              ]
            });
            resolve(textContent);
          } catch (convertError) {
            console.error(`Erreur lors de la conversion HTML→texte pour ${url}: ${convertError.message}`);
            reject(new Error(`Error converting HTML to text from ${url}. Script stopped.`, { cause: convertError }));
          }
        });
      });

      req.setTimeout(timeoutMs, () => {
        req.destroy();
        console.error(`Timeout lors du chargement de ${url} après ${timeoutMs}ms`);
        reject(new Error(`Timeout: La requête HTML a dépassé ${timeoutMs / 1000} secondes. Script stopped.`));
      });

      req.on('error', (err) => {
        console.error(`Erreur réseau lors du chargement de ${url}: ${err.message}`);
        reject(new Error(`Network error fetching HTML content from ${url}. Script stopped.`, { cause: err }));
      });

      req.end();
    });
  } catch (error) {
    console.error(`Erreur lors du chargement du contenu HTML: ${error.message}`);
    throw error;
  }
}

async function collectHtmlSourcesAndInstructions(resolvedSchema, config, baseUrl, jsonPointer = '/', depth = 0, maxDepth = 10) {
  console.log(`[info] Collecte HTML sources et instructions depuis ${jsonPointer} (profondeur ${depth}/${maxDepth})`);

  try {
    if (!resolvedSchema || typeof resolvedSchema !== 'object' || Array.isArray(resolvedSchema)) {
      throw new Error(`Invalid resolved schema: schema must be a non-null object. Current JSON Pointer: ${jsonPointer}. Script stopped.`);
    }

    if (depth >= maxDepth) {
      throw new Error(`Maximum recursion depth (${maxDepth}) reached at JSON Pointer: ${jsonPointer}. Script stopped.`);
    }

    const blocks = [];
    let localBlocksCount = 0; // Compteur de blocs trouvés localement (à ce niveau)

    for (const [key, value] of Object.entries(resolvedSchema)) {
      const currentPointer = jsonPointer === '/' ? `/${key}` : `${jsonPointer}/${key}`;

      if (value && typeof value === 'object' && !Array.isArray(value) && value.properties) {
        const sourceUrlProp = value.properties.sourceUrl;
        const extractionInstructionsProp = value.properties.extractionInstructions;

        if (sourceUrlProp) {
          if (!extractionInstructionsProp) {
            throw new Error(`extractionInstructions is required for block with sourceUrl at JSON Pointer: ${currentPointer}. Script stopped.`);
          }

          if (extractionInstructionsProp.type !== 'array') {
            throw new Error(`extractionInstructions must be an array at JSON Pointer: ${currentPointer}. Script stopped.`);
          }

          if (!extractionInstructionsProp.items || !extractionInstructionsProp.items.enum) {
            throw new Error(`extractionInstructions.items.enum is required at JSON Pointer: ${currentPointer}. Script stopped.`);
          }

          if (!Array.isArray(extractionInstructionsProp.items.enum) || extractionInstructionsProp.items.enum.length === 0) {
            throw new Error(`extractionInstructions array is empty at JSON Pointer: ${currentPointer}. Script stopped.`);
          }

          const instructions = extractionInstructionsProp.items.enum;

          // CORRECTION: sourceUrl est maintenant un array avec items.enum (propriété paramétrique)
          let sourceUrls = [];
          if (sourceUrlProp.type === 'array' && sourceUrlProp.items?.enum && Array.isArray(sourceUrlProp.items.enum)) {
            // Cas array avec items.enum (nouveau format paramétrique)
            sourceUrls = sourceUrlProp.items.enum;
          } else if (sourceUrlProp.enum && Array.isArray(sourceUrlProp.enum)) {
            // Cas ancien format avec enum direct (rétrocompatibilité)
            sourceUrls = sourceUrlProp.enum;
          } else if (typeof sourceUrlProp.default === 'string') {
            // Cas avec default (rétrocompatibilité)
            sourceUrls = [sourceUrlProp.default];
          } else if (sourceUrlProp.enum && sourceUrlProp.enum.length > 0) {
            // Cas enum non-array (rétrocompatibilité)
            sourceUrls = [sourceUrlProp.enum[0]];
          } else {
            throw new Error(`Invalid sourceUrl at JSON Pointer: ${currentPointer}. Must have items.enum, enum, or default. Script stopped.`);
          }

          const htmlContents = [];
          for (const sourceUrl of sourceUrls) {
            const fullUrl = sourceUrl.startsWith('http') ? sourceUrl : `${baseUrl}${sourceUrl.startsWith('/') ? '' : '/'}${sourceUrl}`;

            try {
              const htmlContent = await fetchHtmlContent(fullUrl);
              htmlContents.push({ url: fullUrl, content: htmlContent });
            } catch (error) {
              throw new Error(`Error loading HTML from ${fullUrl} at JSON Pointer: ${currentPointer}. Script stopped.`, { cause: error });
            }
          }

          blocks.push({
            jsonPointer: currentPointer,
            instructions,
            htmlContents
          });
          localBlocksCount++; // Bloc trouvé à ce niveau
        }

        const nestedResult = await collectHtmlSourcesAndInstructions(
          value.properties,
          config,
          baseUrl,
          currentPointer,
          depth + 1,
          maxDepth
        );
        blocks.push(...nestedResult.blocks);
      }

      if (value && typeof value === 'object' && value.type === 'array' && value.items && value.items.properties) {
        const itemsProps = value.items.properties;
        const sourceUrlProp = itemsProps.sourceUrl;
        const extractionInstructionsProp = itemsProps.extractionInstructions;

        if (sourceUrlProp) {
          if (!extractionInstructionsProp) {
            throw new Error(`extractionInstructions is required for array items with sourceUrl at JSON Pointer: ${currentPointer}. Script stopped.`);
          }

          if (extractionInstructionsProp.type !== 'array') {
            throw new Error(`extractionInstructions must be an array at JSON Pointer: ${currentPointer}. Script stopped.`);
          }

          if (!extractionInstructionsProp.items || !extractionInstructionsProp.items.enum) {
            throw new Error(`extractionInstructions.items.enum is required at JSON Pointer: ${currentPointer}. Script stopped.`);
          }

          if (!Array.isArray(extractionInstructionsProp.items.enum) || extractionInstructionsProp.items.enum.length === 0) {
            throw new Error(`extractionInstructions array is empty at JSON Pointer: ${currentPointer}. Script stopped.`);
          }

          const instructions = extractionInstructionsProp.items.enum;

          // CORRECTION: sourceUrl est maintenant un array avec items.enum (propriété paramétrique)
          let sourceUrls = [];
          if (sourceUrlProp.type === 'array' && sourceUrlProp.items?.enum && Array.isArray(sourceUrlProp.items.enum)) {
            // Cas array avec items.enum (nouveau format paramétrique)
            sourceUrls = sourceUrlProp.items.enum;
          } else if (sourceUrlProp.enum && Array.isArray(sourceUrlProp.enum)) {
            // Cas ancien format avec enum direct (rétrocompatibilité)
            sourceUrls = sourceUrlProp.enum;
          } else if (typeof sourceUrlProp.default === 'string') {
            // Cas avec default (rétrocompatibilité)
            sourceUrls = [sourceUrlProp.default];
          } else {
            throw new Error(`Invalid sourceUrl for array items at JSON Pointer: ${currentPointer}. Must have items.enum, enum, or default. Script stopped.`);
          }

          const htmlContents = [];
          for (const sourceUrl of sourceUrls) {
            const fullUrl = sourceUrl.startsWith('http') ? sourceUrl : `${baseUrl}${sourceUrl.startsWith('/') ? '' : '/'}${sourceUrl}`;

            try {
              const htmlContent = await fetchHtmlContent(fullUrl);
              htmlContents.push({ url: fullUrl, content: htmlContent });
            } catch (error) {
              throw new Error(`Error loading HTML from ${fullUrl} at JSON Pointer: ${currentPointer}. Script stopped.`, { cause: error });
            }
          }

          blocks.push({
            jsonPointer: currentPointer,
            instructions,
            htmlContents
          });
          localBlocksCount++; // Bloc trouvé à ce niveau (array items)
        }

        const otherItemsProps = { ...itemsProps };
        delete otherItemsProps.sourceUrl;
        delete otherItemsProps.extractionInstructions;

        if (Object.keys(otherItemsProps).length > 0) {
          const nestedResult = await collectHtmlSourcesAndInstructions(
            otherItemsProps,
            config,
            baseUrl,
            currentPointer,
            depth + 1,
            maxDepth
          );
          blocks.push(...nestedResult.blocks);
        }
      }
    }

    // Message de log clair distinguant blocs locaux vs total (incluant sous-jacents)
    const nestedBlocksCount = blocks.length - localBlocksCount;
    if (localBlocksCount === 0 && nestedBlocksCount === 0) {
      console.log(`[info] Collecte terminée depuis ${jsonPointer} : aucun bloc trouvé, passage à la propriété suivante`);
    } else if (localBlocksCount > 0 && nestedBlocksCount === 0) {
      console.log(`[info] Collecte terminée depuis ${jsonPointer} : ${localBlocksCount} bloc(s) trouvé(s) à ce niveau`);
    } else if (localBlocksCount === 0 && nestedBlocksCount > 0) {
      console.log(`[info] Collecte terminée depuis ${jsonPointer} : ${nestedBlocksCount} bloc(s) sous-jacent(s) trouvé(s) en profondeur`);
    } else {
      console.log(`[info] Collecte terminée depuis ${jsonPointer} : ${localBlocksCount} bloc(s) à ce niveau + ${nestedBlocksCount} sous-jacent(s) = ${blocks.length} total`);
    }

    return { blocks };
  } catch (error) {
    console.error(`Erreur lors de la collecte HTML sources et instructions: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Exports normaux (interface publique du module utilitaire)
module.exports = {
  collectHtmlSourcesAndInstructions,
  fetchHtmlContent
};
