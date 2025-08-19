import { defineFeature, loadFeature } from 'jest-cucumber';
import path from 'path';
import fs from 'fs';
import { findLatestConceptsArtifact, sidecarApprovalPath, readApproval, allTargetsPending } from '../shared/approval';
import { readExtractionConfig, getApprovalTargets } from '../shared/approval-config';
import { validateWithSchema } from '../shared/jsonschema';

const feature = loadFeature(__dirname + '/hermes2022-concepts.feature');

let artifactPath: string | null = null;

defineFeature(feature, (test) => {
  test("Nouvelle demande d'extraction des concepts HERMES2022", ({ when, then }) => {
    when(/^l’utilisateur demande l’extraction des concepts HERMES2022$/, () => {
      const dataDir = path.resolve(__dirname, '../../../shared/hermes2022-extraction-files/data');
      artifactPath = findLatestConceptsArtifact(dataDir);
    });

    then(/^un artefact hermes2022-concepts est disponible à l’emplacement attendu$/, () => {
      if (!artifactPath) throw new Error('Artefact non disponible');
      expect(fs.existsSync(artifactPath)).toBe(true);
    });

    then(/^l’artefact est conforme au schéma JSON des concepts HERMES2022$/, () => {
      if (!artifactPath) throw new Error('Artefact non disponible');
      const schemaPath = path.resolve(
        __dirname,
        '../../../shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json'
      );
      validateWithSchema(artifactPath, schemaPath);
    });
  });

  test('Validité de contenu — principes généraux', ({ given, when, then }) => {
    given(/^un artefact hermes2022-concepts produit$/, () => {
      const dataDir = path.resolve(__dirname, '../../../shared/hermes2022-extraction-files/data');
      artifactPath = findLatestConceptsArtifact(dataDir);
    });

    when(/^j’évalue sa validité de contenu selon les règles métier applicables$/, () => {
      // Contrôles de haut niveau, délégués aux étapes suivantes
    });

    then(/^toutes les cibles d’approbation sont en attente de validation humaine$/, () => {
      if (!artifactPath) throw new Error('Artefact non disponible');
      const configPath = path.resolve(__dirname, '../../config/extraction-config.json');
      const config = readExtractionConfig(configPath);
      const targets = getApprovalTargets(config);
      const approvalPath = sidecarApprovalPath(artifactPath);
      const approval = readApproval(approvalPath);
      expect(allTargetsPending(approval, targets)).toBe(true);
    });
  });
});
