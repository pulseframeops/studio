'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const html=source('src/index.html');
const app=source('src/app.js');

test('All statically referenced DOM IDs exist before the app attaches event listeners',()=>{
  const present=new Set(Array.from(html.matchAll(/\bid="([\w-]+)"/g),m=>m[1]));
  // The timeline playhead is created dynamically by renderMontageUI(), not in the base HTML.
  const dynamicallyCreated=new Set(['montage-playhead']);
  const refs=new Set(Array.from(app.matchAll(/\$\('#([\w-]+)'\)/g),m=>m[1]));
  const missing=[...refs].filter(id=>!present.has(id)&&!dynamicallyCreated.has(id));
  assert.deepEqual(missing,[],`Missing controls interrupt init: ${missing.join(', ')}`);
});

test('Removed Pull In UI control does not leave a dangling handler',()=>{
  assert.doesNotMatch(app,/montage-hide-visualizer/);
  assert.doesNotMatch(html,/montage-hide-visualizer/);
});

test('Version badge is only shown for normal preset, never Retro',()=>{
  const css=source('src/styles.css');
  assert.match(css,/html\[data-retro="true"\] \.regular-version, html\[data-retro="true"\] \.retro-version \{display:none!important;\}/);
  assert.doesNotMatch(html,/id="retro-version"/);
  assert.match(html,/class="regular-version"/);
});

test('Brand logo is transparent and desktop icon exists',()=>{
  const branding=fs.readFileSync(path.join(root,'src/assets/branding/pulseframe-app.png'));
  assert.equal(branding.subarray(1,4).toString('utf8'),'PNG');
  // PNG color type 6 = RGBA, with transparent pixels at the corners.
  assert.equal(branding[25],6,'RGBA image required');
  const icon=fs.readFileSync(path.join(root,'electron/pulseframe.ico'));
  assert.ok(icon.length>1024);
  assert.match(source('src/styles.css'),/\.brand \.mark \{background:transparent!important/);
});
