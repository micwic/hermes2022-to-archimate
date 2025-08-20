import path from 'path';
import fs from 'fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export function validateWithSchema(dataPath: string, schemaPath: string): void {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  // Précharge le schéma référencé pour permettre la résolution du $ref
  const schemaDir = path.dirname(schemaPath);
  const phasesSchemaPath = path.resolve(schemaDir, 'hermes2022-phases.json');
  if (fs.existsSync(phasesSchemaPath)) {
    const phasesSchema = JSON.parse(fs.readFileSync(phasesSchemaPath, 'utf-8'));
    const baseId = typeof schema.$id === 'string' ? schema.$id : undefined;
    const phasesId = baseId ? new URL('./hermes2022-phases.json', baseId).toString() : './hermes2022-phases.json';
    ajv.addSchema(phasesSchema, phasesId);
  }

  const validate = ajv.compile(schema);
  const ok = validate(data);
  if (!ok) {
    const message = JSON.stringify(validate.errors || [], null, 2);
    throw new Error(`Validation JSON Schema échouée pour ${dataPath}:\n${message}`);
  }
}