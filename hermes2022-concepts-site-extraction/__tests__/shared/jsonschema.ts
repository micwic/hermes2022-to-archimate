import fs from 'fs';

// Import dynamique pour éviter les problèmes de typage si @types/ajv n'est pas installé
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Ajv = require('ajv');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const addFormats = require('ajv-formats');

export function validateWithSchema(dataPath: string, schemaPath: string): void {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const ok = validate(data);
  if (!ok) {
    // Normalise l'erreur pour lecture facile dans les logs
    const message = JSON.stringify(validate.errors || [], null, 2);
    throw new Error(`Validation JSON Schema échouée pour ${dataPath}:\n${message}`);
  }
}
