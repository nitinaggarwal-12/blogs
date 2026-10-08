/**
 * Extended Architecture Center blueprints for the non-architecture deliverables
 * (environment setup guides, Terraform blueprints and the zero-downtime upgrade suite).
 *
 * Each file in scripts/blueprints_ext/ default-exports ONE blueprint object using the
 * exact schema consumed by build_all_workstream_diagrams.mjs (see WORKSTREAM_BLUEPRINTS).
 * Files are loaded in deterministic (sorted) order so manifest ordering is stable.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_DIR = path.join(__dirname, 'blueprints_ext');

export async function loadExtendedBlueprints() {
  if (!fs.existsSync(EXT_DIR)) return [];
  const files = fs
    .readdirSync(EXT_DIR)
    .filter((f) => f.endsWith('.mjs'))
    .sort();
  const blueprints = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(EXT_DIR, f)).href);
    const bp = mod.default;
    if (!bp || !bp.id || !bp.workstreamDir) {
      throw new Error(`blueprints_ext/${f} must default-export a blueprint with id + workstreamDir`);
    }
    blueprints.push(bp);
  }
  return blueprints;
}
