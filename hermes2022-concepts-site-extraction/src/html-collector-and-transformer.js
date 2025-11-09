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
            const textContent = convert(data, {
              wordwrap: false,
              preserveNewlines: true
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

          let sourceUrls = [];
          if (sourceUrlProp.enum && Array.isArray(sourceUrlProp.enum)) {
            sourceUrls = sourceUrlProp.enum;
          } else if (typeof sourceUrlProp.default === 'string') {
            sourceUrls = [sourceUrlProp.default];
          } else if (sourceUrlProp.enum && sourceUrlProp.enum.length > 0) {
            sourceUrls = [sourceUrlProp.enum[0]];
          } else {
            throw new Error(`Invalid sourceUrl at JSON Pointer: ${currentPointer}. Must have enum or default. Script stopped.`);
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

          let sourceUrls = [];
          if (sourceUrlProp.enum && Array.isArray(sourceUrlProp.enum)) {
            sourceUrls = sourceUrlProp.enum;
          } else if (typeof sourceUrlProp.default === 'string') {
            sourceUrls = [sourceUrlProp.default];
          } else {
            throw new Error(`Invalid sourceUrl for array items at JSON Pointer: ${currentPointer}. Must have enum or default. Script stopped.`);
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

    console.log(`[info] Collecte terminée depuis ${jsonPointer} : ${blocks.length} bloc(s) trouvé(s)`);

    return { blocks };
  } catch (error) {
    console.error(`Erreur lors de la collecte HTML sources et instructions: ${error.message}`);
    throw error;
  }
}

module.exports = {
  collectHtmlSourcesAndInstructions,
  fetchHtmlContent
};
