const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const tsxCandidates = [
  process.env.TSX_BIN,
  path.resolve(__dirname, '../node_modules/.bin/tsx'),
].filter(Boolean);
const tsxBin = tsxCandidates.find((p) => fs.existsSync(p)) || 'npx';
const scriptTs = path.join(__dirname, 'build_ws5_upgraded_visual_deck.ts');
const args = tsxBin === 'npx' ? ['tsx', scriptTs, ...process.argv.slice(2)] : [scriptTs, ...process.argv.slice(2)];

execFileSync(tsxBin, args, {
  stdio: 'inherit',
  env: { ...process.env },
});
