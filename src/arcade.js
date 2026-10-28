/* Pulsy Runner: original PulseFrame arcade. Sprite art generated for the project.
 * Canvas logic is intentionally independent of document/UI and does not mutate the .pulseframe schema. */
(function(global){
'use strict';
const W=1000,H=560,TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const spriteImgs=Array.from({length:10},(_,i)=>{const im=new Image();im.src=global.PFEmbeddedAssets?.[`assets/arcade/jessica_${i}.png`]||`assets/arcade/jessica_${i}.png`;return im;});
function createLevel(n){
 const w=n===0?3330:n===1?3810:4220;
 const theme=['NEON CITY','CIRCUIT FACTORY','SKY GARDENS'][n];
 const holes=n===0?[[610,735],[1630,1790],[2640,2800]]:n===1?[[820,950],[1870,2050],[2920,3065]]:[[710,870],[1610,1780],[2700,2900],[3510,3670]];
 const surfaces=[];
 let x=0;for(const [a,b] of holes){surfaces.push({x,y:505,w:a-x,h:60,type:'ground'});x=b;}surfaces.push({x,y:505,w:w-x,h:60,type:'ground'});
 for(let i=0;i<12;i++){
   let px=340+i*250+(i%3)*30,py=(i%4===0?397:i%4===1?336:i%4===2?420:380);
   surfaces.push({x:px,y:py,w:115+i%3*18,h:18,type:'floating'});
 }
 for(const [a,b] of holes)surfaces.push({x:a+15,y:418,w:b-a-30,h:15,type:'bridge'});
 const spikes=Array.from({length:8},(_,i)=>({x:510+i*350+(i%2)*90,y:505,w:38})).filter(s=>!holes.some(([a,b])=>s.x>=a-60&&s.x<=b+10));
 const enemies=Array.from({length:13},(_,i)=>({id:i,x:600+i*215+(i%3)*32,baseY:(i%3===1?345:486),y:0,type:i%3===1?'drone':i%4===0?'turret':'blob',alive:true,phase:i*1.7})).filter(e=>e.x<w-140);
 const coins=[];
 for(let i=0;i<44;i++){
   const cx=170+i*69, near=surfaces.filter(s=>s.x<=cx&&s.x+s.w>=cx).sort((a,b)=>a.y-b.y);
   if(!near.length)continue;
   const base=near.some(s=>s.type==='floating')?near[0]:near[near.length-1];
   // Snap to solid surface and place well above it; never spawn inside geometry.
   coins.push({id:i,x:cx,y:base.y-48-(i%3)*13,taken:false});
 }
 return {name:theme,w,theme:n,holes,surfaces,spikes,enemies,coins,goal:w-130,checkpoints:[1000,2050,2950].filter(c=>c<w-280)};
}
const stages=[0,1,2].map(createLevel);
let state=null,audioCtx=null,lastBeat=0,bgm=null;
function beginBgm(stage){
 try{if(bgm){bgm.pause();bgm.src='';}const names=['neon_city','circuit_factory','sky_gardens'];
 const path=`assets/music/${names[Math.min(stage,2)]}.wav`;
 bgm=new Audio(global.PFEmbeddedAssets?.[path]||path);bgm.loop=true;bgm.volume=.27;bgm.muted=state?.mute||false;
 bgm.play().catch(()=>{});
 }catch{}
}
const melodies=[
 [0,4,7,12,7,4,2,7,5,9,12,16,12,9,7,5],
 [0,3,7,10,7,3,5,8,7,10,14,17,14,10,8,5],
 [0,5,7,12,14,12,7,5,3,7,10,15,10,7,5,3]
];
function note(freq,duration=0.11,wave='square',gain=.06){try{
 audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
 if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
 const o=audioCtx.createOscillator(),g=audioCtx.createGain(),now=audioCtx.currentTime;
 o.type=wave;o.frequency.setValueAtTime(freq,now);g.gain.setValueAtTime(.0001,now);
 g.gain.exponentialRampToValueAtTime(gain,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+duration);
 o.connect(g);g.connect(audioCtx.destination);o.start(now);o.stop(now+duration+.01);
}catch{}}
function chirp(kind){if(kind==='coin')note(880,.08,'triangle',.05);if(kind==='jump')note(420,.10,'square',.05);if(kind==='hurt')note(150,.20,'sawtooth',.09);if(kind==='dash')note(620,.10,'triangle',.06);if(kind==='goal'){note(670,.2,'triangle',.07);setTimeout(()=>note(990,.3,'triangle',.07),130);}}
function start(){state={stage:0,level:stages[0],p:{x:76,y:438,vx:0,vy:0,onFloor:false,face:1,jumps:0,dash:0,invuln:0,frame:0},cam:0,life:3,coins:0,check:76,keys:new Set(),last:0,started:performance.now(),completed:false,transition:0,projectiles:[],particles:[],mute:false};lastBeat=0;beginBgm(0);}
function stop(){if(state)state.keys.clear();if(bgm)bgm.pause();}
function inputDown(k){if(!state)return false;
 if(['ArrowLeft','ArrowRight','ArrowUp',' ','a','d','w','Shift','r','m','Escape'].includes(k)){
 if(k==='r')respawn();else if(k==='m'){state.mute=!state.mute;if(bgm)bgm.muted=state.mute;}else if(k==='Escape')state.keys.clear();else state.keys.add(k);return true;}
 return false;}
function inputUp(k){state?.keys.delete(k);}
function respawn(){if(!state)return;const p=state.p;p.x=state.check;p.y=410;p.vx=0;p.vy=0;p.dash=0;p.invuln=1.6;p.jumps=0;}
function nextStage(){const s=state;s.stage++;s.transition=1.2;s.projectiles=[];if(s.stage>=3){s.completed=true;if(bgm)bgm.pause();chirp('goal');return;}s.level=stages[s.stage];s.check=76;s.cam=0;s.p.x=76;s.p.y=405;s.p.vx=0;s.p.vy=0;beginBgm(s.stage);chirp('goal');}
function hurt(){const s=state;if(s.p.invuln>0)return;s.life--;chirp('hurt');
 for(let i=0;i<12;i++)s.particles.push({x:s.p.x,y:s.p.y-32,vx:(i-6)*45,vy:-90-((i*29)%85),t:0,c:'#ff4f93'});
 if(s.life<=0){s.life=3;s.check=76;s.coins=Math.max(0,s.coins-8);}respawn();}
function physics(dt,t){const s=state;if(!s||s.completed)return;dt=Math.min(.04,Math.max(0,dt));const p=s.p,oldY=p.y,wasFloor=p.onFloor;
 const right=s.keys.has('ArrowRight')||s.keys.has('d'),left=s.keys.has('ArrowLeft')||s.keys.has('a');
 const dir=(right?1:0)-(left?1:0);
 if(dir){p.vx+=dir*1450*dt;p.face=dir;}else p.vx*=Math.pow(.035,dt);
 p.vx=clamp(p.vx,-380,380);
 if(s.keys.has('Shift')&&p.dash<=0&&dir){p.dash=.18;p.vx=p.face*760;s.keys.delete('Shift');chirp('dash');}
 if(p.dash>0){p.dash-=dt;p.vx=p.face*690;}
 const jump=s.keys.has('ArrowUp')||s.keys.has(' ')||s.keys.has('w');
 if(jump&&!p.jumpHeld&&(p.onFloor||p.jumps<2)){p.vy=p.jumps===0?-560:-490;p.jumps++;p.onFloor=false;chirp('jump');}p.jumpHeld=jump;
 p.vy=Math.min(840,p.vy+1450*dt);p.x=clamp(p.x+p.vx*dt,15,s.level.w-25);p.y+=p.vy*dt;p.onFloor=false;
 const feetOld=oldY+62,feet=p.y+62;
 for(const b of s.level.surfaces){
  if(p.x+18<b.x||p.x-18>b.x+b.w)continue;
  if(p.vy>=0&&feetOld<=b.y+13&&feet>=b.y){p.y=b.y-62;p.vy=0;p.onFloor=true;p.jumps=0;}
 }
 if(p.y>H+70)hurt();
 for(const cp of s.level.checkpoints)if(p.x>cp&&cp>s.check)s.check=cp;
 for(const a of s.level.spikes)if(p.x+17>a.x&&p.x-17<a.x+a.w&&p.y+62>a.y-21&&p.y<a.y+9)hurt();
 for(const e of s.level.enemies){if(!e.alive)continue;
  e.y=e.baseY+(e.type==='drone'?Math.sin(t*2+e.phase)*30:0);
  const ex=e.x+(e.type==='blob'?Math.sin(t*1.1+e.phase)*24:0),ey=e.y;
  if(Math.abs(p.x-ex)<31&&Math.abs((p.y+34)-ey)<35){
   if(p.vy>130&&feetOld<ey-12){e.alive=false;p.vy=-340;chirp('coin');s.coins+=3;}
   else hurt();
  }
  if(e.type==='turret'&&Math.abs(ex-p.x)<480&&Math.sin(t*2+e.phase)>.985&&s.projectiles.length<20)s.projectiles.push({x:ex,y:ey,vx:(p.x>ex?1:-1)*245,age:0});
 }
 for(const proj of s.projectiles){proj.x+=proj.vx*dt;proj.age+=dt;if(Math.abs(proj.x-p.x)<18&&Math.abs(proj.y-p.y-24)<28){proj.age=20;hurt();}}
 s.projectiles=s.projectiles.filter(q=>q.age<3);
 for(const c of s.level.coins){if(!c.taken&&Math.hypot(c.x-p.x,c.y-p.y-35)<32){c.taken=true;s.coins++;chirp('coin');}}
 if(p.x>s.level.goal)nextStage();
 s.cam+=((clamp(p.x-330,0,s.level.w-W))-s.cam)*Math.min(1,dt*4.4);
 s.p.invuln=Math.max(0,s.p.invuln-dt);s.transition=Math.max(0,s.transition-dt);
 for(const q of s.particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=160*dt;q.t+=dt;}
 s.particles=s.particles.filter(q=>q.t<.65);
 if((right||left)&&wasFloor&&Math.random()<dt*12)s.particles.push({x:p.x,y:p.y+58,vx:-p.face*40,vy:-45,t:0,c:'#50e4fa'});
}
function pixelText(ctx,text,x,y,size=17,color='#ecedff',align='left'){ctx.save();ctx.font=`bold ${size}px monospace`;ctx.textAlign=align;ctx.shadowColor=color;ctx.shadowBlur=7;ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();}
function drawBackdrop(ctx,t){const s=state,theme=Math.min(2,s.stage),cam=s.cam;const palettes=[['#050c24','#20245c','#a63580','#4b64d4'],['#170b25','#572044','#ff6f7e','#d94382'],['#12244c','#4184bc','#a6ccea','#e6f7ff']][theme];
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,palettes[0]);sky.addColorStop(.55,palettes[1]);sky.addColorStop(1,palettes[2]);ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 const sunX=730-(cam*.035)%150,sunY=152;ctx.fillStyle=theme===2?'#fff8d7':'#ff7dba';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=55;ctx.beginPath();ctx.arc(sunX,sunY,theme===2?62:85,0,TAU);ctx.fill();ctx.shadowBlur=0;
 for(let layer=0;layer<3;layer++){
  const par=(.06+.14*layer)*cam;
  if(theme===0){ctx.fillStyle=['#142b56','#0d2050','#0a1230'][layer];for(let i=-2;i<26;i++){const bx=(i*77-par%77),hh=120+((i*71+layer*47)%170);ctx.fillRect(bx,360-hh+layer*40,59,hh+170);ctx.fillStyle='#42b3ef';for(let j=0;j<7;j++)for(let k=0;k<3;k++)if((i*3+j+k)%4===0)ctx.fillRect(bx+8+k*16,370-hh+layer*40+j*20,5,7);ctx.fillStyle=['#142b56','#0d2050','#0a1230'][layer];}}
  else if(theme===1){ctx.fillStyle=['#43214f','#311b46','#1a1436'][layer];for(let i=-2;i<20;i++){let bx=(i*115-par%115),hh=135+((i*31+layer*54)%95);ctx.fillRect(bx,355-hh,65,hh+200);ctx.fillRect(bx+42,355-hh-45,15,50);ctx.fillStyle='#ffb583';ctx.fillRect(bx+12,360-hh+23,38,9);ctx.fillStyle=['#43214f','#311b46','#1a1436'][layer];}}
  else {ctx.fillStyle=['#9acbe1','#6f9ac3','#365b96'][layer];for(let i=-3;i<20;i++){let bx=i*140-par%140,by=345+layer*57+(i%3)*17;ctx.beginPath();ctx.moveTo(bx-70,by+120);ctx.lineTo(bx+45,by-90);ctx.lineTo(bx+155,by+120);ctx.fill();}}
 }
 for(let i=0;i<30;i++){let x=((i*167-cam*.18-t*18)%1300+1300)%1300,y=33+(i*43)%270;ctx.fillStyle=i%3?'#e1ebff':'#ffacdd';ctx.globalAlpha=.3+.5*(.5+.5*Math.sin(t+i));ctx.fillRect(x,y,2,2);}ctx.globalAlpha=1;
}
function drawWorld(ctx,t){const s=state,cam=s.cam,level=s.level;
 ctx.save();ctx.translate(-cam,0);
 for(const b of level.surfaces){if(b.x+b.w<cam-30||b.x>cam+W+30)continue;
 ctx.fillStyle=s.stage===2?'#2c6d5f':s.stage===1?'#523050':'#29244e';ctx.fillRect(b.x,b.y,b.w,b.h);
 ctx.fillStyle=s.stage===2?'#79e4b8':s.stage===1?'#fe9468':'#37d8ef';ctx.fillRect(b.x,b.y,b.w,7);
 ctx.fillStyle=s.stage===1?'#a85b79':'#75618d';for(let xx=b.x;xx<b.x+b.w;xx+=24)ctx.fillRect(xx,b.y+17,19,3);
 if(b.type==='floating'){ctx.shadowColor=s.stage===2?'#7aeec1':'#ef6ad9';ctx.shadowBlur=8;ctx.strokeStyle=ctx.shadowColor;ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.shadowBlur=0;}
 }
 for(const z of level.spikes){ctx.fillStyle='#ff5b86';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(z.x+i*13,z.y);ctx.lineTo(z.x+i*13+7,z.y-24);ctx.lineTo(z.x+i*13+13,z.y);ctx.fill();}}
 for(const c of level.coins){if(c.taken)continue;const wob=Math.sin(t*8+c.id)*3;ctx.save();ctx.translate(c.x,c.y+wob);ctx.strokeStyle='#ffe26a';ctx.lineWidth=5;ctx.shadowColor='#ffd65e';ctx.shadowBlur=12;ctx.beginPath();ctx.ellipse(0,0,8+Math.sin(t*6+c.id)*3,13,0,0,TAU);ctx.stroke();ctx.restore();}
 for(const e of level.enemies){if(!e.alive)continue;const ex=e.x+(e.type==='blob'?Math.sin(t*1.1+e.phase)*24:0),ey=e.y;
 ctx.save();ctx.translate(ex,ey);ctx.fillStyle=e.type==='blob'?'#b2439a':e.type==='drone'?'#33d8e5':'#fa6e70';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=9;
 if(e.type==='blob'){ctx.beginPath();ctx.ellipse(0,8,22,17,0,Math.PI,TAU);ctx.lineTo(22,10);ctx.lineTo(-22,10);ctx.fill();}
 else{ctx.fillRect(-19,-17,38,33);ctx.fillStyle='#111a44';ctx.fillRect(-14,-12,28,22);}
 ctx.fillStyle='#eafdff';ctx.fillRect(-12,-3,8,6);ctx.fillRect(5,-3,8,6);ctx.restore();
 }
 for(const q of s.projectiles){ctx.fillStyle='#fc7a96';ctx.beginPath();ctx.arc(q.x,q.y,8,0,TAU);ctx.fill();}
 for(const cp of level.checkpoints){ctx.fillStyle=cp<=s.check?'#79f9bc':'#ffe5b4';ctx.fillRect(cp,441,7,64);ctx.fillStyle='#bd6cff';ctx.fillRect(cp,441,32,20);}
 ctx.save();ctx.translate(level.goal,430);ctx.strokeStyle='#61f7ea';ctx.lineWidth=8;ctx.shadowColor='#50ece0';ctx.shadowBlur=25;ctx.strokeRect(0,0,46,74);ctx.restore();
 for(const p of s.particles){ctx.globalAlpha=1-p.t/.65;ctx.fillStyle=p.c;ctx.fillRect(p.x-3,p.y-3,6,6);}ctx.globalAlpha=1;
 ctx.restore();
}
function drawCharacter(ctx,t){const s=state,p=s.p;if(p.invuln>0&&Math.sin(t*23)>0)ctx.globalAlpha=.48;
 const run=Math.abs(p.vx)>30&&p.onFloor,idx=p.dash>0?9:!p.onFloor?6:run?1+Math.floor(t*13)%5:0;
 const img=spriteImgs[idx],sx=p.x-s.cam,sy=p.y;
 ctx.save();ctx.translate(sx,sy+31);ctx.scale(p.face<0?-1:1,1);
 if(img?.complete&&img.naturalWidth){ctx.imageSmoothingEnabled=false;ctx.shadowColor=p.dash>0?'#54e5ff':'#a275f7';ctx.shadowBlur=p.dash>0?17:4;ctx.drawImage(img,-48,-65,96,96);}
 else {ctx.fillStyle='#53dcff';ctx.fillRect(-15,-35,30,52);}
 ctx.restore();ctx.globalAlpha=1;
 if(p.dash>0){ctx.fillStyle='#58f1fb66';ctx.fillRect(sx-62*p.face,sy+13,60,6);}
}
function drawHUD(ctx,t){const s=state;ctx.fillStyle='rgba(4,6,20,.79)';ctx.fillRect(9,9,982,50);
 pixelText(ctx,`PULSY RUNNER  |  ${s.level.name}`,23,42,18,'#bdeaff');pixelText(ctx,'♥'.repeat(s.life),580,42,22,'#ff5e93');pixelText(ctx,`✦ ${String(s.coins).padStart(3,'0')}`,750,42,20,'#ffe06a');
 pixelText(ctx,'← → / A D move  •  SPACE double jump  •  SHIFT dash  •  M sound  •  R retry',W/2,550,12,'#b5d9ef','center');
 if(s.transition>0){ctx.fillStyle=`rgba(6,3,24,${s.transition*.6})`;ctx.fillRect(0,0,W,H);pixelText(ctx,s.level.name,W/2,248,40,'#ffb2ee','center');}
 if(s.completed){ctx.fillStyle='rgba(4,7,24,.88)';ctx.fillRect(0,0,W,H);pixelText(ctx,'PULSY JESSICA • VICTORY!',W/2,220,35,'#97f4ff','center');pixelText(ctx,`3 ZONES CLEAR • ${s.coins} STARS`,W/2,268,23,'#ffd7ed','center');pixelText(ctx,'R — RESTART',W/2,326,21,'#ffd9a1','center');if(s.keys.has('r'))start();}
}
// Implement frame with a deterministic sequence; note timing does not determine gameplay frames.
function frame(ctx,millis,keys){if(!state)start();state.keys=keys||state.keys;
 const t=millis/1000,dt=state.last?Math.min((millis-state.last)/1000,.037):.016;state.last=millis;
 const beat=Math.floor((millis-state.started)/158);
 if(beat!==lastBeat)lastBeat=beat;
 physics(dt,t);drawBackdrop(ctx,t);drawWorld(ctx,t);drawCharacter(ctx,t);drawHUD(ctx,t);
}
function info(){return state?{stage:state.stage,coins:state.coins,life:state.life,completed:state.completed,player:state.p.x}:null;}
global.PFArcade={start,stop,inputDown,inputUp,frame,info,_test:{createLevel,stages}};
})(window);
