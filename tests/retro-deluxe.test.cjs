const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Retro is a time-driven scene renderer, including highway and arcade',()=>{
 const s=read('src/render.js');assert.match(s,/function retroScene\(/);assert.match(s,/function rdrive\(/);assert.match(s,/function rplatform\(/);
 assert.match(s,/function rbeach\(/);assert.match(s,/function rspace\(/);assert.match(s,/function rmountains\(/);assert.match(s,/function rroom\(/);
 assert.match(s,/ctx\.imageSmoothingEnabled=false/);
});
test('Retro pixel platform icons preserve nonretro originals',()=>{
 const s=read('src/render.js');assert.match(s,/proj\.main\?\.preset==='retro'/);assert.match(s,/pixelIconCanvas/);
});
test('Starfall rules and two chapters gate unlock',()=>{
 const s=read('src/starfall.js'),html=read('src/index.html');
 assert.match(html,/id="starfall-rules"/);assert.match(html,/id="starfall-start"/);
 assert.match(s,/goldChance=\.45/);assert.match(s,/state\.regular>=5&&state\.gold>=2/);assert.match(s,/state\.bonusGold>=5&&state\.diamond>=5/);
 assert.match(s,/state\.phase='sunrise'/);assert.match(s,/state\.code==='plsframe'/);assert.match(s,/state\.code==='027'/);
});
test('Full screen word timer starts only on initial f',()=>{
 const s=read('src/app.js');assert.match(s,/key==='f'\?'f':''/);assert.match(s,/now-typedAt>15000/);
 assert.match(s,/typed==='fullscreen'\|\|typed==='flscrn'/);
});
test('Offline chiptune sounds are bundled',()=>{
 for(const p of ['coin','gold','diamond','start','stage','type','jump','miss']){
  const b=fs.readFileSync(path.join(root,'src/assets/sounds',p+'.wav'));
  assert.equal(b.subarray(0,4).toString(),'RIFF');assert.equal(b.subarray(8,12).toString(),'WAVE');
 }
});
