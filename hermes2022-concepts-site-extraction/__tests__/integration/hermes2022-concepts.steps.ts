// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';
import path from 'path';
import fs from 'fs';
import { findLatestConceptsArtifact, sidecarApprovalPath, readApproval, allTargetsPending } from '../shared/approval';
import { readExtractionConfig, getApprovalTargets } from '../shared/approval-config';
import { validateWithSchema } from '../shared/jsonschema';

const feature = loadFeature(__dirname + '/hermes2022-concepts.feature');

let artifactPath: string | null = null;

defineFeature(feature, (test) => {
  test("nouvelle extraction des concepts HERMES2022", ({ given, when, then, and }) => {
    given(
      /^un site de référence, la langue et la description du site de référence définis dans le fichier de configuration `config\/extraction-config\.json`$/, 
      () => {
        const configDir = path.resolve(__dirname, '../../config');
        const configPath = path.join(configDir, 'extraction-config.json');
        expect(fs.existsSync(configPath)).toBe(true);
        const config = readExtractionConfig(configPath);
        expect(typeof config).toBe('object');
      }
    );

    when(/^l'utilisateur a demandé une extraction des concepts HERMES2022 dans le chat IA intégré à Cursor sur la base de ces indications$/, () => {
      const configDir = path.resolve(__dirname, '../../config');
      const configPath = path.join(configDir, 'extraction-config.json');
      const config = readExtractionConfig(configPath) as any;
      const fromEnv = process.env.HERMES2022_CONCEPTS_ARTIFACT_DIR;
      const baseDir = fromEnv && fromEnv.length > 0 ? fromEnv : (config.artifactBaseDir || 'shared/hermes2022-extraction-files/data');
      const used = fromEnv && fromEnv.length > 0 ? 'env:HERMES2022_CONCEPTS_ARTIFACT_DIR' : 'config:artifactBaseDir';
      // Log d'information pour diagnostiquer la source utilisée
      // Affiché par Jest sauf si --silent est activé
      console.log(`[tests] artefacts dir = ${baseDir} (${used})`);
      const dataDir = path.resolve(__dirname, '../../', baseDir);
      artifactPath = findLatestConceptsArtifact(dataDir);
    });

    then(/^le fichier intermédiaire de données est conforme et valable aux schémas de données définis dans `shared\/hermes2022-extraction-files\/config\/json-schemas\/hermes2022-concepts\.json`$/, () => {
      if (!artifactPath) throw new Error('Artefact non disponible');
      const schemaPath = path.resolve(
        __dirname,
        '../../../shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json'
      );
      validateWithSchema(artifactPath, schemaPath);
    });

    and(/^le fichier sidecar d'approbation est conforme et valable aux schémas de données définis dans `shared\/hermes2022-extraction-files\/config\/json-schemas\/hermes2022-concepts-approval\.json`$/, () => {
      if (!artifactPath) throw new Error('Artefact non disponible');
      const approvalPath = sidecarApprovalPath(artifactPath);
      const approvalSchemaPath = path.resolve(
        __dirname,
        '../../../shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts-approval.json'
      );
      validateWithSchema(approvalPath, approvalSchemaPath);
    });

    and(/^les status des concepts extraits sont tous à "pending"$/, () => {
      if (!artifactPath) throw new Error('Artefact non disponible');
      const configDir = path.resolve(__dirname, '../../config');
      const configPath = path.join(configDir, 'extraction-config.json');
      const config = readExtractionConfig(configPath);
      const targets = getApprovalTargets(config);
      const approvalPath = sidecarApprovalPath(artifactPath);
      const approval = readApproval(approvalPath);
      expect(allTargetsPending(approval, targets)).toBe(true);
    });
  });
});
