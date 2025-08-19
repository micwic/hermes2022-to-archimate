import fs from 'fs';
import path from 'path';

export function findLatestConceptsArtifact(dataDir: string): string {
  if (!fs.existsSync(dataDir)) {
    throw new Error(`Répertoire data introuvable: ${dataDir}`);
  }
  const files = fs
    .readdirSync(dataDir)
    .filter((f) => f.startsWith('hermes2022-concepts-') && f.endsWith('.json'))
    .sort();
  if (files.length === 0) {
    throw new Error('Aucun artefact hermes2022-concepts trouvé');
  }
  return path.join(dataDir, files[files.length - 1]);
}

export function sidecarApprovalPath(artifactPath: string): string {
  const dir = path.dirname(artifactPath);
  const base = path.basename(artifactPath, '.json');
  return path.join(dir, `${base}.approval.json`);
}

export function readApproval(approvalPath: string): any {
  if (!fs.existsSync(approvalPath)) {
    throw new Error(`Visa humain manquant: ${approvalPath}`);
  }
  return JSON.parse(fs.readFileSync(approvalPath, 'utf-8'));
}

export function allTargetsPending(approval: any, targets: string[]): boolean {
  if (!approval || !Array.isArray(approval.approvals)) return false;
  const map = new Map<string, string>();
  for (const item of approval.approvals) {
    if (item && typeof item.target === 'string') {
      map.set(item.target, item.status);
    }
  }
  return targets.every((t) => map.get(t) === 'pending');
}
