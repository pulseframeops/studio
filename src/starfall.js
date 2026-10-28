(function(global){
 'use strict';
 const canvas=document.getElementById('starfall-canvas');if(!canvas)return;
 const displayCtx=canvas.getContext('2d',{alpha:false});
 const pixelCanvas=document.createElement('canvas');pixelCanvas.width=500;pixelCanvas.height=280;
 const pixelCtx=pixelCanvas.getContext('2d',{alpha:false});let ctx=displayCtx;
 const W=1000,H=560,HALF=H*.51,$=id=>document.getElementById(id);
 const random=(a,b)=>a+Math.random()*(b-a),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const goldChance=.45; // Publicly declared drop chance for Gold stars.
 const startRules=$('starfall-rules'),startButton=$('starfall-start');
 const state={active:false,phase:'rules',stars:[],regular:0,gold:0,diamond:0,bonusGold:0,next:0,code:'',codeAt:0,won:false,since:0,raf:0,retro:false,player:{x:65,y:420,vy:0,coins:0,move:0,grounded:true},keys:new Set()};
 const sounds={};
 function audio(name){try{
   const el=sounds[name]||(sounds[name]=new Audio(global.PFEmbeddedAssets?.['assets/sounds/'+name+'.wav']||'assets/sounds/'+name+'.wav'));
   el.volume=name==='coin'?.3:.24;el.currentTime=0;el.play().catch(()=>{});
  }catch{}
 }
 const update=()=>{
   $('starfall-regular').textContent=state.phase==='sunrise'?`★ ${Math.min(state.bonusGold,5)} / 5`:`✦ ${Math.min(state.regular,5)} / 5`;
   $('starfall-gold').textContent=state.phase==='sunrise'?`◆ ${Math.min(state.diamond,5)} / 5`:`★ ${Math.min(state.gold,2)} / 2`;
 };
 function reset(){state.phase='rules';state.stars=[];state.regular=0;state.gold=0;state.diamond=0;state.bonusGold=0;state.next=0;state.code='';state.won=false;state.player={x:65,y:420,vy:0,coins:0,move:0,grounded:true};state.keys.clear();
  $('starfall-secret').classList.add('hidden');$('starfall-result').classList.add('hidden');$('starfall-code').textContent='_';
  $('starfall-hint').textContent='Поймай звёзды до середины их пути.';
  startRules?.classList.remove('hidden');update();
 }
 function begin(){startRules?.classList.add('hidden');state.phase='night';state.next=performance.now()+450;state.since=performance.now();audio('start');}
 function background(t){
   const sunrise=state.phase==='sunrise'||state.phase==='code'||state.phase==='platformer';
   const sky=ctx.createLinearGradient(0,0,0,H);
   if(sunrise){sky.addColorStop(0,'#4d113e');sky.addColorStop(.40,'#e25659');sky.addColorStop(.81,'#ff9b53');sky.addColorStop(1,'#272148');}
   else {sky.addColorStop(0,'#020718');sky.addColorStop(.6,'#163156');sky.addColorStop(1,'#081a30');}
   ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
   for(let i=0;i<180;i++){const x=((Math.sin(i*41.17)*19391)%1+1)%1*W,y=((Math.sin(i*17.19)*13519)%1+1)%1*H*.72;
     const pulse=.23+.6*(.5+.5*Math.sin(t*.0018+i));ctx.globalAlpha=sunrise?pulse*.36:pulse;
     ctx.fillStyle=i%4?'#d7e9ff':'#ffaddc';ctx.fillRect(x,y,i%7===0?2:1,i%7===0?2:1);
   }ctx.globalAlpha=1;
   const sx=sunrise?680:780,sy=sunrise?285:124;
   ctx.save();ctx.shadowBlur=sunrise?58:27;ctx.shadowColor=sunrise?'#ffb36c':'#d9f0ff';ctx.fillStyle=sunrise?'#ffbd7c':'#e0f5ff';ctx.beginPath();ctx.arc(sx,sy,sunrise?77:24,0,Math.PI*2);ctx.fill();ctx.restore();
   if(sunrise){for(let i=0;i<8;i++){ctx.fillStyle='#b7466590';ctx.fillRect(sx-77,sy+i*13,154,i*1.3);}}
   for(let layer=0;layer<3;layer++){
     ctx.fillStyle=(sunrise?['#8e405c','#673454','#2c2544']:['#283854','#172e46','#0b2033'])[layer];
     ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=W;x+=8){let y=368+layer*47-(76-layer*13)*Math.abs(Math.sin((x+layer*132)/145+.5))-27*Math.abs(Math.sin((x+layer*65)/51));ctx.lineTo(x,y);}
     ctx.lineTo(W,H);ctx.closePath();ctx.fill();
   }
   for(let i=0;i<91;i++){let x=i*17-9,ht=17+i%9*6;
     ctx.fillStyle=sunrise?'#211b37':'#071a2c';ctx.beginPath();ctx.moveTo(x-10,H);ctx.lineTo(x,515-ht);ctx.lineTo(x+10,H);ctx.fill();}
   if(state.retro){
     ctx.fillStyle='rgba(2,1,16,.12)';for(let y=0;y<H;y+=5)ctx.fillRect(0,y,W,2);
   }
 }
 function spawn(t){
   const sunrise=state.phase==='sunrise';
   const type=sunrise?(Math.random()<goldChance?'gold':'diamond'):(Math.random()<goldChance?'gold':'regular');
   const side=Math.random()<.5?-1:1;
   const x=side===-1?random(-25,45):random(W-45,W+25);
   const y=random(36,155);
   const destX=random(W*.32,W*.68),destY=random(H*.33,HALF+8);
   const life=sunrise?random(1100,1800):random(1550,2400);
   state.stars.push({x,y,dx:destX,dy:destY,side,type,born:t,life,size:type==='diamond'?18:21,rot:random(-2,2)});
   // In the sunrise stage a meteor shower forms. No long pauses.
   state.next=t+(sunrise?random(300,670):random(1500,3600));
 }
 function point(s,t){
   const p=clamp((t-s.born)/s.life,0,1);
   const ease=1-(1-p)**2;
   return {p,x:s.x+(s.dx-s.x)*ease,y:s.y+(s.dy-s.y)*ease+Math.sin(p*Math.PI)*15};
 }
 function drawStar(s,t){
   const {p,x,y}=point(s,t);
   if(p>=1)return;
   const fade=clamp((1-p)/(500/s.life),0,1);
   const color=s.type==='gold'?'#ffd85d':s.type==='diamond'?'#65e5ff':'#dceaff';
   ctx.save();ctx.globalAlpha=fade;ctx.translate(x,y);ctx.rotate(s.rot+p*3);
   ctx.shadowColor=color;ctx.shadowBlur=s.type==='diamond'?24:18;
   ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-(s.dx-s.x)*.11,-(s.dy-s.y)*.11);ctx.stroke();
   ctx.fillStyle=color;ctx.beginPath();
   if(s.type==='diamond'){ctx.moveTo(0,-s.size);ctx.lineTo(s.size*.85,0);ctx.lineTo(0,s.size);ctx.lineTo(-s.size*.85,0);}
   else for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?s.size*.43:s.size;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
   ctx.closePath();ctx.fill();ctx.shadowBlur=0;
   ctx.fillStyle='#fff6d9';ctx.fillRect(-2,-2,4,4);ctx.restore();
 }
 function stageComplete(){
   if(state.phase==='night'&&state.regular>=5&&state.gold>=2){
     state.phase='sunrise';state.stars=[];state.next=performance.now()+350;
     $('starfall-hint').textContent='Рассвет! Поймай ещё 5 золотых и 5 бриллиантовых звёзд.';
     audio('stage');update();return;
   }
   if(state.phase==='sunrise'&&state.bonusGold>=5&&state.diamond>=5){
     state.phase='code';state.stars=[];state.code='';state.codeAt=0;
     $('starfall-secret').classList.remove('hidden');$('starfall-hint').textContent='Секретный код разблокирован.';
     audio('stage');
   }
 }
 canvas.addEventListener('pointerdown',ev=>{
   if(!state.active||!['night','sunrise'].includes(state.phase))return;
   const r=canvas.getBoundingClientRect(),x=(ev.clientX-r.left)*W/r.width,y=(ev.clientY-r.top)*H/r.height,t=performance.now();
   let ix=-1,shortest=Infinity;
   state.stars.forEach((s,i)=>{const p=point(s,t);const d=Math.hypot(p.x-x,p.y-y);
     if(p.p<.82&&d<s.size+24&&d<shortest){ix=i;shortest=d;}
   });
   if(ix<0){audio('miss');return;}
   const hit=state.stars.splice(ix,1)[0];
   if(state.phase==='night'){if(hit.type==='gold')state.gold++;else state.regular++;}
   else {if(hit.type==='gold')state.bonusGold++;else state.diamond++;}
   audio(hit.type==='diamond'?'diamond':hit.type==='gold'?'gold':'coin');update();stageComplete();
 });
 function frame(t){
   if(!state.active)return;
   state.retro=document.documentElement.dataset.retro==='true';
   ctx=state.retro?pixelCtx:displayCtx;
   ctx.save();ctx.setTransform(state.retro?.5:1,0,0,state.retro?.5:1,0,0);background(t);
   if(['night','sunrise'].includes(state.phase)){
     if(t>=state.next)spawn(t);
     state.stars=state.stars.filter(s=>t-s.born<s.life);
     for(const s of state.stars)drawStar(s,t);
   }else if(state.phase==='platformer'){window.PFArcade?.frame(ctx,t,state.keys);}
   ctx.restore();
   if(state.retro){displayCtx.save();displayCtx.imageSmoothingEnabled=false;displayCtx.drawImage(pixelCanvas,0,0,W,H);displayCtx.restore();}
   state.raf=requestAnimationFrame(frame);
 }
 function handleKey(ev){
   if(!state.active)return false;
   if(state.phase==='platformer'){
     if(window.PFArcade?.inputDown(ev.key)){ev.preventDefault();state.keys.add(ev.key);return true;}
     return false;
   }
   if(state.phase!=='code'||state.won||ev.key.length!==1)return false;
   const ch=ev.key.toLowerCase();if(!/[0-9a-z]/.test(ch))return false;
   ev.preventDefault();const t=performance.now();if(t-state.codeAt>6500)state.code='';state.codeAt=t;
   state.code+=ch;
   if(!('027'.startsWith(state.code)||'plsframe'.startsWith(state.code)))state.code=ch==='0'||ch==='p'?ch:'';
   const visual={'0':'0','02':'0.2','027':'0.2.7'}[state.code]||state.code.toUpperCase();
   $('starfall-code').textContent=visual||'_';
   $('starfall-code').style.animation='none';void $('starfall-code').offsetWidth;$('starfall-code').style.animation='';
   audio('type');
   if(state.code==='027'){
      state.won=true;audio('stage');setTimeout(()=>{$('starfall-result').classList.remove('hidden');try{localStorage.setItem('pf-starfall-027','unlocked');}catch{}},800);
   }
   if(state.code==='plsframe'){
      state.phase='platformer';window.PFArcade?.start();
      $('starfall-secret').classList.add('hidden');$('starfall-hint').textContent='Секретная аркада: ← → / A D и пробел для прыжка. Собери кольца!';audio('stage');
   }
   return true;
 }
 document.addEventListener('keyup',ev=>{state.keys.delete(ev.key);window.PFArcade?.inputUp(ev.key);});
 $('starfall-restart').addEventListener('click',()=>{reset();});
 startButton?.addEventListener('click',begin);
 global.PFStarfall={enter(){state.active=true;reset();if(!state.raf)state.raf=requestAnimationFrame(frame);},leave(){state.active=false;window.PFArcade?.stop();state.raf&&cancelAnimationFrame(state.raf);state.raf=0;},handleKey,stats(){return {regular:state.regular,gold:state.gold,diamond:state.diamond,bonusGold:state.bonusGold,phase:state.phase,won:state.won}},_test:{goldChance,point}};
})(window);
