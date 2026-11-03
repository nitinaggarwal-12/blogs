const { execFileSync } = require('child_process');
const path = require('path');

const tsxBin = process.env.TSX_BIN || 'npx';
const scriptTs = path.join(__dirname, 'build_ws3_upgraded_visual_deck.ts');
const args = tsxBin === 'npx' ? ['tsx', scriptTs] : [scriptTs];

execFileSync(tsxBin, args, {
  stdio: 'inherit',
  env: { ...process.env }
});
