const { execFileSync } = require('child_process');
const path = require('path');

const tsxBin = '/usr/local/google/home/nitinagga/Documents/_legacy_cloudtop_backups_20261029/PromptCanvas_oct02_backup/node_modules/.bin/tsx';
const scriptTs = path.join(__dirname, 'build_ws4_upgraded_visual_deck.ts');

execFileSync(tsxBin, [scriptTs], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_PATH: '/usr/local/google/home/nitinagga/Documents/_legacy_cloudtop_backups_20261029/PromptCanvas_oct02_backup/node_modules'
  }
});
