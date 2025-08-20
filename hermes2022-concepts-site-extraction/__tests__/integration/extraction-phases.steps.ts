// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { findLatestConceptsArtifact } from '../shared/approval';
import { validateWithSchema } from '../shared/jsonschema';

const feature = loadFeature(__dirname + '/extraction-phases.feature');

let artifactPath: string | null = null;
let phasesTempPath: string | null = null;
let phasesArray: any[] = [];

defineFeature(feature, (test) => {
  test('validation des phases HERMES2022', ({ given, when, then, and }) => {
    given(/^un fichier intermédiaire de données conforme et valable dans `config\/extraction-config\.json`$/, () => {
      const configDir = path.resolve(__dirname, '../../config');
      const configPath = path.join(configDir, 'extraction-config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as any;
      const fromEnv = process.env.HERMES2022_CONCEPTS_ARTIFACT_DIR;
      const baseDir = fromEnv && fromEnv.length > 0 ? fromEnv : (config.artifactBaseDir || 'shared/hermes2022-extraction-files/data');
      const used = fromEnv && fromEnv.length > 0 ? 'env:HERMES2022_CONCEPTS_ARTIFACT_DIR' : 'config:artifactBaseDir';
      console.log(`[tests] artefacts dir = ${baseDir} (${used})`);
      const dataDir = path.resolve(__dirname, '../../', baseDir);
      artifactPath = findLatestConceptsArtifact(dataDir);
      expect(fs.existsSync(artifactPath)).toBe(true);
      const conceptsSchemaPath = path.resolve(
        __dirname,
        '../../../shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json'
      );
      validateWithSchema(artifactPath, conceptsSchemaPath);
    });

    when(/^Je valide les phases HERMES2022$/, () => {
      if (!artifactPath) throw new Error('Artefact non disponible');
      const json = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
      const phasesObject = json?.concepts?.phases;
      if (!phasesObject || typeof phasesObject !== 'object') {
        throw new Error('Section concepts.phases manquante');
      }
      const tmpFile = path.join(os.tmpdir(), `phases-${Date.now()}.json`);
      fs.writeFileSync(tmpFile, JSON.stringify(phasesObject, null, 2), 'utf-8');
      phasesTempPath = tmpFile;
      const schemaPath = path.resolve(
        __dirname,
        '../../../shared/hermes2022-extraction-files/config/json-schemas/hermes2022-phases.json'
      );
      validateWithSchema(phasesTempPath, schemaPath);
      phasesArray = Array.isArray(phasesObject?.phases) ? phasesObject.phases : [];
    });

    then(/^l'ensemble des phases attendus selon la méthodologie HERMES2022 sont présents dans le fichier intermédiaire de données$/, () => {
      const expectedOrders = new Set(['1', '2', '2.1', '2.2', '2.3', '3']);
      const actualOrders = new Set(phasesArray.map((p) => p.order));
      for (const ord of expectedOrders) {
        if (!actualOrders.has(ord)) {
          throw new Error(`Phase avec order '${ord}' manquante`);
        }
      }
      const phase2 = phasesArray.find((p) => p.order === '2');
      if (!phase2 || phase2.type !== 'composite') {
        throw new Error("La phase '2' doit être de type 'composite'");
      }
      for (const ord of ['2.1', '2.2', '2.3']) {
        const ph = phasesArray.find((p) => p.order === ord);
        if (!ph || ph.type !== 'simple') {
          throw new Error(`La phase '${ord}' doit être de type 'simple'`);
        }
      }
    });

    and(/^l'ordre des phases est conforme à l'ordre attendu selon la méthodologie HERMES2022$/, () => {
      const allowed = /^\d+(\.\d+)*$/;
      for (const p of phasesArray) {
        if (!allowed.test(p.order)) {
          throw new Error(`Order invalide pour la phase ${p.name || p.id}: ${p.order}`);
        }
      }
    });
  });
});
