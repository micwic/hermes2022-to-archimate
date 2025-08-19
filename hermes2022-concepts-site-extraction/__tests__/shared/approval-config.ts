import fs from 'fs';
import path from 'path';

export interface ExtractionConfig {
  requireHumanApproval?: boolean;
  approvalTargets?: string[];
}

export function readExtractionConfig(configPath: string): ExtractionConfig {
  const content = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(content) as ExtractionConfig;
}

export function getApprovalTargets(config: ExtractionConfig): string[] {
  if (Array.isArray(config.approvalTargets) && config.approvalTargets.length > 0) {
    return config.approvalTargets;
  }
  return ['/concepts/overview'];
}
