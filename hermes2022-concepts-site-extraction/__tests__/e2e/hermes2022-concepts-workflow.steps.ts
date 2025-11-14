// @ts-nocheck
import fs from 'fs';
import path from 'path';
import util from 'util';
import { execFile } from 'child_process';
import { defineFeature, loadFeature } from 'jest-cucumber';
import findUp from 'find-up';

const fullFilePath = findUp.sync('package.json', { cwd: __dirname });
if (!fullFilePath) {
  throw new Error('Impossible de localiser la racine du repository');
}
const repoRoot = path.dirname(fullFilePath);
const resolveFromRepoRoot = (...segments: string[]) => path.resolve(repoRoot, ...segments);

const nuextractClientModulePath = resolveFromRepoRoot(
  'hermes2022-concepts-site-extraction/src/nuextract-client.js'
);
const {
  _testOnly_loadGlobalConfig: loadGlobalConfig,
  _testOnly_loadApiKey: loadApiKey,
  _testOnly_loadAndResolveSchemas: loadAndResolveSchemas,
  _testOnly_generateTemplate: generateTemplate,
  _testOnly_findOrCreateProject: findOrCreateProject,
  _testOnly_extractHermes2022ConceptsWithNuExtract: extractHermes2022ConceptsWithNuExtract,
  _testOnly_saveArtifact: saveArtifact
} = require(nuextractClientModulePath);

const execFileAsync = util.promisify(execFile);

const feature = loadFeature(
  path.join(__dirname, 'hermes2022-concepts-workflow.feature')
);

defineFeature(feature, (test) => {
  let relativeArtifactDir: string;
  let absoluteArtifactDir: string;
  let originalArtifactEnv: string | undefined;
  let artifactPath: string;
  let approvalPath: string;
  let today: string;
  let executionError: Error | null;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    const runId = `${Date.now()}-${process.pid}`;
    relativeArtifactDir = path.join(
      'hermes2022-concepts-site-extraction',
      '__tests__',
      'tmp-artifacts',
      runId
    );
    absoluteArtifactDir = resolveFromRepoRoot(relativeArtifactDir);

    if (!fs.existsSync(absoluteArtifactDir)) {
      fs.mkdirSync(absoluteArtifactDir, { recursive: true });
    }

    originalArtifactEnv = process.env.HERMES2022_CONCEPTS_ARTIFACT_DIR;
    process.env.HERMES2022_CONCEPTS_ARTIFACT_DIR = relativeArtifactDir;
    executionError = null;
    today = new Date().toISOString().split('T')[0];
  });

  afterEach(async () => {
    if (originalArtifactEnv === undefined) {
      delete process.env.HERMES2022_CONCEPTS_ARTIFACT_DIR;
    } else {
      process.env.HERMES2022_CONCEPTS_ARTIFACT_DIR = originalArtifactEnv;
    }

    if (fs.existsSync(absoluteArtifactDir)) {
      await fs.promises.rm(absoluteArtifactDir, { recursive: true, force: true });
    }

    jest.restoreAllMocks();
  });

  test(
    'Exécution complète de l\'agent hermes2022-concepts-site-extraction',
    ({ given, when, then, and }) => {
      given('une configuration d\'extraction hermes2022 valide', async () => {
        const config = await loadGlobalConfig();
        expect(config?.nuextract).toBeDefined();
      });

      given('une clé API NuExtract disponible', () => {
        const envKey = process.env.NUEXTRACT_API_KEY;
        const keyFilePath = resolveFromRepoRoot(
          'hermes2022-concepts-site-extraction/config/nuextract-api-key.key'
        );
        expect(envKey || fs.existsSync(keyFilePath)).toBe(true);
      });

      given('un répertoire d\'artefacts isolé pour la session d\'extraction', () => {
        expect(fs.existsSync(absoluteArtifactDir)).toBe(true);
        const files = fs.readdirSync(absoluteArtifactDir);
        expect(files).toHaveLength(0);
      });

      when('on exécute l\'agent complet hermes2022-concepts-site-extraction', async () => {
        const scriptPath = resolveFromRepoRoot(
          'hermes2022-concepts-site-extraction/src/nuextract-client.js'
        );
        try {
          await execFileAsync('node', [scriptPath], {
            cwd: resolveFromRepoRoot('.'),
            env: {
              ...process.env,
              HERMES2022_CONCEPTS_ARTIFACT_DIR: relativeArtifactDir
            },
            timeout: 120000
          });
        } catch (error) {
          executionError = error as Error;
        }
        expect(executionError).toBeNull();
      });

      then('l\'artefact hermes2022-concepts du jour est généré', async () => {
        artifactPath = path.join(
          absoluteArtifactDir,
          `hermes2022-concepts-${today}.json`
        );
        expect(fs.existsSync(artifactPath)).toBe(true);

        const artifactRaw = await fs.promises.readFile(artifactPath, 'utf8');
        const artifactData = JSON.parse(artifactRaw);

        // Valider la structure de base de l'artefact
        expect(artifactData?.config).toBeDefined();
        expect(artifactData?.method).toBeDefined();
        expect(artifactData?.concepts).toBeDefined();
        
        // Valider les informations d'extraction dans config.extractionSource
        const extractionSource = artifactData?.config?.extractionSource;
        expect(extractionSource).toBeDefined();
        expect(extractionSource.baseUrl).toBeDefined();
        expect(typeof extractionSource.baseUrl).toBe('string');
        expect(extractionSource.baseUrl.length).toBeGreaterThan(0);
      });

      and('le fichier d\'approbation hermes2022-concepts du jour est initialisé à pending', async () => {
        approvalPath = path.join(
          absoluteArtifactDir,
          `hermes2022-concepts-${today}.approval.json`
        );
        expect(fs.existsSync(approvalPath)).toBe(true);

        const approvalRaw = await fs.promises.readFile(approvalPath, 'utf8');
        const approvalData = JSON.parse(approvalRaw);

        expect(approvalData.artifact).toBe(
          `hermes2022-concepts-${today}.json`
        );
        expect(Array.isArray(approvalData.approvals)).toBe(true);
        const overviewEntry = approvalData.approvals.find(
          (entry: any) => entry.target === '/concepts/overview'
        );
        expect(overviewEntry).toBeDefined();
        expect(overviewEntry.status).toBe('pending');
        expect(overviewEntry.lastChecked).toBe(today);
      });

      and('les métadonnées de l\'artefact contiennent la date du jour et la source d\'extraction', async () => {
        const artifactRaw = await fs.promises.readFile(artifactPath, 'utf8');
        const artifactData = JSON.parse(artifactRaw);

        // La date d'extraction est déductible du nom du fichier (hermes2022-concepts-YYYY-MM-DD.json)
        const fileNameDate = path.basename(artifactPath).match(/hermes2022-concepts-(\d{4}-\d{2}-\d{2})\.json/)?.[1];
        expect(fileNameDate).toBe(today);
        
        // Valider la source d'extraction dans config.extractionSource
        expect(artifactData?.config?.extractionSource?.baseUrl).toBeDefined();
        expect(typeof artifactData.config.extractionSource.baseUrl).toBe('string');
        expect(artifactData.config.extractionSource.baseUrl.length).toBeGreaterThan(0);
        
        // Valider la langue d'extraction
        expect(artifactData?.config?.extractionSource?.language).toBeDefined();
        expect(['de', 'fr', 'it', 'en']).toContain(artifactData.config.extractionSource.language);
      });
    },
    120000
  );
});

