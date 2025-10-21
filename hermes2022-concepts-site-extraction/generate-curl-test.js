#!/usr/bin/env node

/**
 * Script pour générer un curl exact qui reproduit l'appel à /api/infer-template-async
 * Usage: node generate-curl-test.js > test-api-curl.sh
 */

const fs = require('fs');
const path = require('path');

// Utiliser find-up pour trouver la racine
const { sync: findUpSync } = require('find-up');
const packagePath = findUpSync('package.json', { cwd: __dirname });
const repoRoot = path.dirname(packagePath);

function resolveFromRepoRoot(...segments) {
  return path.resolve(repoRoot, ...segments);
}

// Charger les instructions (parsing identique au code)
function loadInstructions() {
  const instructionPath = resolveFromRepoRoot('hermes2022-concepts-site-extraction/config/instructions-template-nuextract.md');
  const fullContent = fs.readFileSync(instructionPath, 'utf-8');
  
  const targetHeading = '## Instructions complémentaires pour /api/infer-template /api/infer-template-async de NuExtract';
  const lines = fullContent.split('\n');
  const startIdx = lines.findIndex(line => line.trim() === targetHeading);
  
  if (startIdx === -1) {
    console.error(`⚠️  Heading "${targetHeading}" non trouvé dans ${instructionPath}`, { to: process.stderr });
    return fullContent;
  }
  
  const contentLines = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^#{1,2}\s+/.test(lines[i])) {
      break;
    }
    contentLines.push(lines[i]);
  }
  
  return contentLines.join('\n').trim();
}

// Charger le schéma JSON (identique au code)
function loadAndResolveSchemas() {
  const mainSchemaPath = resolveFromRepoRoot('shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json');
  return fs.readFileSync(mainSchemaPath, 'utf-8');
}

// Construire la description (identique au code)
function buildTemplateDescription(instructions, mainSchema) {
  return [
    mainSchema,
    '',
    '',
    instructions
  ].join('\n');
}

// Générer le curl
const instructions = loadInstructions();
const mainSchema = loadAndResolveSchemas();
const description = buildTemplateDescription(instructions, mainSchema);

// Construire le JSON body
const bodyJson = JSON.stringify({ description });

// Afficher le curl
console.log('#!/bin/bash');
console.log('# Curl exact reproduisant l\'appel à /api/infer-template-async');
console.log('# Usage: chmod +x test-api-curl.sh && ./test-api-curl.sh');
console.log('');
console.log('NUEXTRACT_API_KEY=$(cat hermes2022-concepts-site-extraction/config/nuextract-api-key.key)');
console.log('');
console.log('curl -v "https://nuextract.ai/api/infer-template-async?timeout=60s" \\');
console.log('  -X POST \\');
console.log('  -H "Authorization: Bearer $NUEXTRACT_API_KEY" \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'');
console.log(bodyJson);
console.log('\'');
console.log('');
console.log('echo ""');
console.log('echo "Job lancé, récupérez le jobId pour polling avec:"');
console.log('echo "curl -s \\"https://nuextract.ai/api/jobs/{jobId}\\" -H \\"Authorization: Bearer \\$NUEXTRACT_API_KEY\\" | python3 -m json.tool"');

