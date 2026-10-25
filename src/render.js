(function(){
  const {clamp,smooth,timeline}=window.PFTime;
  const TAU=Math.PI*2;
  const colors={neon_wave:['#58e6ff','#b97bff'],montagem:['#ff4c89','#ffc46b']};
  const montage=window.PFMontage;
  const systemLogo=new Image();systemLogo.src='assets/branding/pulseframe-system.png';
  const readyAssets=()=>systemLogo.decode?.().catch(()=>{})||Promise.resolve();
  const rnd=(n)=>{let x=Math.sin(n*127.1+47.3)*43758.5453;return x-Math.floor(x)};
  const easeOutBack=(x)=>{const t=clamp(x,0,1),c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};
  function fitText(ctx,text,maxWidth,startSize,minSize=22) {
    let size=startSize;while(size>minSize){ctx.font=`800 ${size}px Montserrat, system-ui, Segoe UI, Arial`;if(ctx.measureText(text).width<=maxWidth)break;size-=2;}return size;
  }
  function rounded(ctx,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function imageCover(ctx,img,x,y,w,h){if(!img||!img.complete||!img.naturalWidth)return false;const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight);const iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);return true;}
  // Cache costly static backdrop blur. Rebuilding a full-screen Gaussian blur
  // 60 times per second was a major source of Neon preview frame drops.
  const backdropCache=[];
  function staticBackdrop(w,h,proj,assets){
    const image=assets.background||assets.cover;
    const blur=proj.shorts?.render?Math.min(28,clamp(Number(proj.backgroundStyle?.blur??48),10,95)):clamp(Number(proj.backgroundStyle?.blur??48),10,95);
    const preset=proj.main.preset;
    const imageReady=image?.complete&&image.naturalWidth?`${image.naturalWidth}x${image.naturalHeight}`:'pending';
    const cached=backdropCache.find(item=>item.w===w&&item.h===h&&item.image===image&&item.imageReady===imageReady&&item.blur===blur&&item.preset===preset);
    if(cached)return cached.canvas;
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const cx=canvas.getContext('2d',{alpha:false});
    const gradient=cx.createLinearGradient(0,0,w,h);
    gradient.addColorStop(0,'#07080b');
    gradient.addColorStop(.55,'#0b0b0e');
    gradient.addColorStop(1,'#07080a');
    cx.fillStyle=gradient;cx.fillRect(0,0,w,h);
    if(image?.complete&&image.naturalWidth){
      cx.save();cx.filter=`blur(${blur}px)`;cx.globalAlpha=.98;
      imageCover(cx,image,-130,-130,w+260,h+260);cx.restore();
    }
    backdropCache.push({w,h,image,imageReady,blur,preset,canvas});
    if(backdropCache.length>4)backdropCache.shift();
    return canvas;
  }
  // Montage composition is reused by the editor preview and by the final
  // music visualizer. Editing preview shows the raw footage, not the cover/UI.
  function montageFrame(ctx,w,h,local,proj,assets){
    const state=montage.resolve(proj,local);
    if(!state)return false;
    const current=assets.montage?.get(state.clip.id)?.element;
    // Never replace a valid montage frame with an undecoded frame during seek.
    if(!current || (current.tagName==='VIDEO' && (current.readyState<2 || current.seeking)))return false;
    let painted=false;
    function paint(clip,alpha,sourceTime){
      const el=assets.montage?.get(clip.id)?.element;
      if(!el||(el.tagName==='VIDEO'&&(el.readyState<2||el.seeking)))return false;
      const mw=el.naturalWidth||el.videoWidth,mh=el.naturalHeight||el.videoHeight;
      if(!(mw>0&&mh>0))return false;
      const scale=Math.max(w/mw,h/mh),iw=mw*scale,ih=mh*scale;
      ctx.save();ctx.globalAlpha*=alpha;
      try{ctx.drawImage(el,(w-iw)/2,(h-ih)/2,iw,ih);painted=true;}
      catch(err){ctx.restore();return false;}
      ctx.restore();return true;
    }
    const tx=montage.transition(proj,local);
    if(tx){
      if(['fade','blur','zoom','wipe','directional','spin','echo'].includes(tx.kind)){
        // For video transitions the previous frame is held near its endpoint.
        // A crossfade cannot start from a missing/undecoded previous frame.
        // On a loop edge show the new decoded clip immediately rather than
        // briefly painting a black background at transition progress 0.
        if(!paint(tx.previous,1,tx.previousSourceTime)){
          paint(state.clip,1,state.sourceTime);
        } else {
          ctx.save();
          if(tx.kind==='wipe'||tx.kind==='directional'){
            ctx.beginPath();ctx.rect(0,0,w*tx.progress,h);ctx.clip();
          }
          if(tx.kind==='zoom'){
            const z=.95+.05*tx.progress;ctx.translate(w/2,h/2);ctx.scale(z,z);ctx.translate(-w/2,-h/2);
          }
          if(tx.kind==='directional'){ctx.beginPath();ctx.rect(0,0,w*tx.progress,h);ctx.clip();ctx.translate((1-tx.progress)*w*.19,0);}
          if(tx.kind==='spin'){ctx.translate(w/2,h/2);ctx.rotate((1-tx.progress)*.18);ctx.scale(.94+tx.progress*.06,.94+tx.progress*.06);ctx.translate(-w/2,-h/2);}
          if(tx.kind==='echo'){ctx.globalAlpha*=.65+.35*tx.progress;ctx.translate((1-tx.progress)*w*.025,0);}
          if(tx.kind==='blur')ctx.filter=`blur(${(1-tx.progress)*13}px)`;
          paint(state.clip,['wipe','directional'].includes(tx.kind)?1:tx.progress,state.sourceTime);
          ctx.restore();
        }
      }else paint(state.clip,1,state.sourceTime);
    }else paint(state.clip,1,state.sourceTime);
    const age=state.clipTime,ease=clamp(1-age/.28,0,1),fx=state.clip.effect||'none';
    // Very short impacts, no permanent high-frequency camera oscillation.
    if(fx==='flash'||fx==='strobe'){
      ctx.fillStyle=`rgba(255,255,255,${ease*(fx==='strobe'?.30:.19)})`;ctx.fillRect(0,0,w,h);
    }else if(fx==='rgb'){
      ctx.fillStyle=`rgba(240,55,105,${ease*.10})`;ctx.fillRect(0,0,w*.5,h);
      ctx.fillStyle=`rgba(56,191,251,${ease*.10})`;ctx.fillRect(w*.5,0,w*.5,h);
    }else if(fx==='blur'){
      ctx.save();ctx.filter=`blur(${ease*10}px)`;paint(state.clip,ease*.45,state.sourceTime);ctx.restore();
    }else if(fx==='zoom'){
      ctx.save();ctx.translate(w/2,h/2);const z=1+ease*.075;ctx.scale(z,z);ctx.translate(-w/2,-h/2);paint(state.clip,ease*.45,state.sourceTime);ctx.restore();
    }else if(fx==='velocity'){
      ctx.save();ctx.globalAlpha=ease*.48;ctx.translate(w/2,h/2);const z=1+ease*.22;ctx.scale(z,z);ctx.translate(-w/2,-h/2);paint(state.clip,1,state.sourceTime);ctx.restore();
    }else if(fx==='chromatic'){
      ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=ease*.18;ctx.translate(ease*8,0);paint(state.clip,1,state.sourceTime);ctx.translate(-ease*16,0);paint(state.clip,1,state.sourceTime);ctx.restore();
    }else if(fx==='echo'){
      for(let j=3;j>=1;j--){ctx.save();ctx.globalAlpha=ease*.12;ctx.translate(j*7*ease,0);paint(state.clip,1,state.sourceTime);ctx.restore();}
    }else if(fx==='negative'){
      ctx.save();ctx.globalCompositeOperation='difference';ctx.fillStyle=`rgba(255,255,255,${ease*.92})`;ctx.fillRect(0,0,w,h);ctx.restore();
    }else if(fx==='pixel'){
      const pw=Math.max(8,Math.floor(w/(8+ease*25))),ph=Math.max(8,Math.floor(h/(8+ease*25)));
      const tiny=pixelBuffer||(pixelBuffer=document.createElement('canvas'));if(tiny.width!==pw)tiny.width=pw;if(tiny.height!==ph)tiny.height=ph;
      const smallCtx=tiny.getContext('2d');smallCtx.imageSmoothingEnabled=false;
      // Reuse the current composited frame, avoiding an additional video seek.
      smallCtx.drawImage(ctx.canvas,0,0,w,h,0,0,pw,ph);
      ctx.save();ctx.globalAlpha=ease*.6;ctx.imageSmoothingEnabled=false;ctx.drawImage(tiny,0,0,pw,ph,0,0,w,h);ctx.restore();
    }else if(fx==='shake'){
      // Single damped punch, not jitter on every audio frame.
      ctx.save();ctx.globalAlpha=ease*.35;const dx=Math.sin(age*24)*ease*8;
      ctx.translate(dx,0);paint(state.clip,1,state.sourceTime);ctx.restore();
    }
    return painted;
  }
  let pixelBuffer=null;
  const editBuffers=new Map();
  function blurredEdit(ctx,w,h,local,proj,assets,blur){
    // Blur at proxy resolution, then composite full-size. Dramatically cheaper
    // than Gaussian-blurring a 1080p video frame every requestAnimationFrame.
    const key=w+'x'+h;
    if(!editBuffers.has(key)){
      const pw=Math.min(480,w),ph=Math.round(h*pw/w);
      const raw=document.createElement('canvas'),soft=document.createElement('canvas');
      raw.width=soft.width=pw;raw.height=soft.height=ph;
      editBuffers.set(key,{raw,soft,pw,ph,hasFrame:false});
    }
    const b=editBuffers.get(key),r=b.raw.getContext('2d',{alpha:false}),f=b.soft.getContext('2d',{alpha:false});
    // Seek boundaries: keep the last complete soft frame until the new one
    // is decoded. Clearing the visible canvas first caused one-frame black
    // flashes in the final visualizer (and could contaminate MP4 output).
    const ready=montageFrame(r,b.pw,b.ph,local,proj,assets);
    if(ready){
      f.clearRect(0,0,b.pw,b.ph);f.save();
      f.filter=`blur(${Math.max(1,blur*.13)}px)`;
      f.drawImage(b.raw,-7,-7,b.pw+14,b.ph+14);f.restore();
      b.hasFrame=true;
    }
    if(!b.hasFrame)return false;
    ctx.drawImage(b.soft,0,0,w,h);return true;
  }
  function bg(ctx,w,h,t,proj,assets,intro,amp){
    const palette=colors[proj.main.preset]||colors.neon_wave;
    const cfg=proj.backgroundStyle||{},dim=proj.shorts?.render?Math.min(26,clamp(Number(cfg.dim??54),0,95)):clamp(Number(cfg.dim??54),0,95),vignette=proj.shorts?.render?Math.min(38,clamp(Number(cfg.vignette??72),0,100)):clamp(Number(cfg.vignette??72),0,100);
    // Separate background crop: the artwork/footage fills the full canvas, while the
    // cover and text stay anchored, especially in vertical 9:16 teasers.
    ctx.save();
    if(proj.shorts?.render){
      const s=proj.shorts, z=clamp(Number(s.bgZoom)||1.15,1,3);
      const dx=clamp(Number(s.bgX)||0,-1,1)*(z-1)*w/2;
      const dy=clamp(Number(s.bgY)||0,-1,1)*(z-1)*h/2;
      ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
      ctx.translate(w/2-dx,h/2-dy);ctx.scale(z,z);ctx.translate(-w/2,-h/2);
    }
    ctx.drawImage(staticBackdrop(w,h,proj,assets),0,0);
    if(!intro&&proj.main.preset==='montagem'&&proj.montage?.enabled){
      const local=proj.shorts?.render?window.PFShorts.montageSourceTime(proj.shorts.computed,t):Math.max(0,t-(Number(proj.intro?.durationSec)||0));
      blurredEdit(ctx,w,h,local,proj,assets,clamp(Number(cfg.blur??48),10,95));
    }
    ctx.restore();
    ctx.fillStyle=`rgba(2,2,5,${intro?Math.min(.91,dim/100+.13):dim/100})`;ctx.fillRect(0,0,w,h);
    if(vignette){const v=ctx.createRadialGradient(w*.5,h*.48,w*.09,w*.5,h*.5,Math.max(w,h)*.73);
      v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,`rgba(0,0,0,${vignette/100})`);ctx.fillStyle=v;ctx.fillRect(0,0,w,h);}
    // No opaque purple color wash: imported cover/background colors stay intact.
    const alpha=intro?.13:clamp(.12+amp*.1,.1,.25);
    for(let i=0;i<60;i++){const x=(rnd(i+34)*w+Math.sin(t*(.2+rnd(i+9)*.5)+i)*15+w)%w;const y=(rnd(i+13)*h+t*(6+rnd(i+2)*11))%h;ctx.fillStyle=assets.coverAccent||palette[i%2];ctx.globalAlpha=alpha*rnd(i+72);ctx.beginPath();ctx.arc(x,y,1+rnd(i+24)*1.8,0,TAU);ctx.fill();}
    ctx.globalAlpha=1;
  }
  const montagePreviewCache=new WeakMap();
  function drawMontage(canvas,proj,videoTime,assets){
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
    const vertical=proj.canvas.aspect==='9:16',w=vertical?720:1280,h=vertical?1280:720;
    ctx.save();ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);
    ctx.fillStyle='#060608';ctx.fillRect(0,0,w,h);
    // Hold a completed preview frame across async seeks, too.
    let last=montagePreviewCache.get(canvas);
    if(!last||last.width!==w||last.height!==h){last=document.createElement('canvas');last.width=w;last.height=h;montagePreviewCache.set(canvas,last);}
    let surface=last._pending;
    if(!surface||surface.width!==w||surface.height!==h){surface=document.createElement('canvas');surface.width=w;surface.height=h;last._pending=surface;}
    const sctx=surface.getContext('2d');sctx.clearRect(0,0,w,h);
    if(montageFrame(sctx,w,h,videoTime,proj,assets)){
      last.getContext('2d').clearRect(0,0,w,h);
      last.getContext('2d').drawImage(surface,0,0);
      last.dataset.ready='1';ctx.drawImage(surface,0,0);
    } else if(last.dataset.ready==='1'){
      ctx.drawImage(last,0,0);
    } else {
      ctx.drawImage(staticBackdrop(w,h,proj,assets),0,0);
      ctx.fillStyle='#0009';ctx.fillRect(0,0,w,h);
      ctx.font='600 28px Montserrat,system-ui,sans-serif';ctx.textAlign='center';ctx.fillStyle='#f4f1fb';
      ctx.fillText(proj.uiLanguage==='en'?'Add videos or photos':'Добавь видео или фотографии',w/2,h/2);
    }
    ctx.restore();
  }
  function drawIntro(ctx,w,h,t,proj,assets,tl){
    ctx.save();if(t<.15){ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.restore();return;}
    const reveal=smooth(.12,1.6,t);ctx.globalAlpha=reveal;
    bg(ctx,w,h,t,proj,assets,true,0);
    ctx.globalAlpha=1;
    ctx.fillStyle=`rgba(0,0,0,${(1-reveal)*.88})`;ctx.fillRect(0,0,w,h);
    const intro=tl.intro, first=smooth(intro*.13,intro*.29,t)*(1-smooth(intro*.81,intro*.97,t));
    const title=smooth(intro*.40,intro*.60,t)*(1-smooth(intro*.79,intro*.96,t));
    const isVertical=h>w;
    const titleY=isVertical?h*.57:h*.55;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.globalAlpha=first;ctx.fillStyle='#eeecff';ctx.font=`500 ${isVertical?23:31}px Montserrat,system-ui,Segoe UI,Arial`;const presents=proj.intro.presents || `${proj.metadata.artist||'ARTIST'} presents…`;
    ctx.fillText(presents,w/2,isVertical?h*.48:h*.43,w*.84);
    ctx.globalAlpha=title;
    const accentAt=intro*.7,glitch=proj.intro.accent==='glitch' && t>=accentAt && t<accentAt+.5;
    const text=proj.metadata.title||'UNTITLED';fitText(ctx,text,w*.83,isVertical?70:94,32);
    ctx.shadowColor=assets.coverAccent||colors[proj.main.preset]?.[1]||'#987cfa';ctx.shadowBlur=60*clamp(Number(proj.intro.titleGlow??.65),0,1);
    if(glitch){const ox=(rnd(Math.floor(t*55))*2-1)*13;ctx.fillStyle='#32dff8';ctx.fillText(text,w/2+ox+5,titleY,w*.87);ctx.fillStyle='#ff578e';ctx.fillText(text,w/2-ox-4,titleY+4,w*.87);}
    ctx.fillStyle='#fff';ctx.fillText(text,w/2,titleY,w*.87);ctx.shadowBlur=0;
    if(proj.intro.accent==='stars'&&t>accentAt-.5){
      for(let i=0;i<90;i++){
        const p=clamp((t-accentAt+.5)*(.7+rnd(i+4)*.8),0,1.4),x=((rnd(i+142)*w+180*p)%w),y=(rnd(i+287)*h+400*p)%h;
        ctx.globalAlpha=clamp((1-p)*.65,0,1)*title;
        ctx.strokeStyle=i%2?'#ffe4fc':'#9fe9ff';ctx.lineWidth=1+rnd(i+3)*1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-35*p,y-65*p);ctx.stroke();
      }
    }
    ctx.restore();
  }
  function glowRect(ctx,x,y,w,h,r,accent){ctx.save();ctx.shadowColor=accent;ctx.shadowBlur=25;ctx.fillStyle='#181a35';rounded(ctx,x,y,w,h,r);ctx.fill();ctx.restore();}
  function cover(ctx,x,y,size,proj,assets,feature){
    ctx.save();glowRect(ctx,x,y,size,size,22,proj.main.preset==='montagem'?(assets.coverAccent||'#ae90ff'):colors[proj.main.preset][1]);
    rounded(ctx,x,y,size,size,20);ctx.clip();
    const grad=ctx.createLinearGradient(x,y,x+size,y+size);grad.addColorStop(0,'#4c3f9a');grad.addColorStop(.5,'#181a3b');grad.addColorStop(1,'#ac4f8d');ctx.fillStyle=grad;ctx.fillRect(x,y,size,size);
    if(!imageCover(ctx,assets.cover,x,y,size,size)){
      ctx.save();ctx.translate(x+size*.5,y+size*.5);ctx.rotate(-.6);ctx.fillStyle='#a2a5ff35';ctx.fillRect(-size*.2,-size, size*.28,size*2);ctx.restore();
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f4e8ff';fitText(ctx,(proj.metadata.title||'MUSIC').toUpperCase(),size*.83,size*.14,20);ctx.fillText((proj.metadata.title||'MUSIC').toUpperCase(),x+size/2,y+size/2,size*.85);
    }
    ctx.restore();
    ctx.save();ctx.lineWidth=2;ctx.strokeStyle='#ffffff4f';rounded(ctx,x,y,size,size,20);ctx.stroke();ctx.restore();
  }
  function bars(ctx,cx,cy,width,h,feature,t,preset,settings,accent){
    const count=preset==='montagem'?66:48,barW=width/count*.57,gap=width/count;
    ctx.save();ctx.shadowColor=accent;ctx.shadowBlur=15*settings.glow;
    for(let i=0;i<count;i++){
      const local=i/(count-1),energy=(local<.24?feature.bass:local<.7?feature.mid:feature.high);
      const detail=Math.abs(Math.sin(i*.69+t*(preset==='montagem'?9:3))+Math.cos(i*.36-t*3))* .24;
      const magnitude=clamp(.08+energy*settings.bassResponse*.72+detail*.36,0,1.08);
      const height=(h*.1+h*.86*magnitude);
      const x=cx-width/2+i*gap;
      ctx.fillStyle=i%5===0?colors[preset][1]:accent;ctx.globalAlpha=.45+energy*.55;
      rounded(ctx,x,cy-height/2,barW,height,barW/2);ctx.fill();
    }ctx.restore();
  }
  function waves(ctx,x,y,w,h,t,feature,proj){
    const s=proj.main.visualSettings,preset=proj.main.preset,c=colors[preset];
    const n=4;
    for(let j=0;j<n;j++){
      ctx.save();ctx.beginPath();ctx.lineWidth=j===0?3:1.8;ctx.strokeStyle=c[j%2];ctx.globalAlpha=.85-j*.13;ctx.shadowColor=c[j%2];ctx.shadowBlur=25*s.glow;
      for(let i=0;i<=110;i++){
        const xp=x+w*i/110,phi=i/110*TAU;
        const freq=feature.bass*s.bassResponse*.75+feature.mid*.26+.09;
        const yp=y+Math.sin(phi*(1.7+j*.4)+t*(1+j*.22)+j)*h*.32*freq+Math.sin(phi*5-t*2.3+j)*h*.12*freq;
        if(i===0)ctx.moveTo(xp,yp);else ctx.lineTo(xp,yp);
      }
      ctx.stroke();ctx.restore();
    }
  }
  function circle(ctx,cx,cy,r,t,f,proj){
    const count=112,c=colors[proj.main.preset],s=proj.main.visualSettings;
    ctx.save();ctx.lineWidth=2;ctx.strokeStyle=c[0];ctx.globalAlpha=.45;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.stroke();ctx.restore();
    ctx.save();ctx.shadowBlur=15*s.glow;ctx.shadowColor=c[1];ctx.lineCap='round';
    for(let i=0;i<count;i++){
      const a=i/count*TAU-t*.05,local=i/count;
      const amp=local<.22?f.bass:local<.75?f.mid:f.high;
      const amount=8+amp*s.bassResponse*48+Math.abs(Math.sin(a*9+t*2))*8;
      ctx.strokeStyle=c[i%7===0?1:0];ctx.globalAlpha=.55+amp*.35;
      ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*(r+6),cy+Math.sin(a)*(r+6));ctx.lineTo(cx+Math.cos(a)*(r+amount),cy+Math.sin(a)*(r+amount));ctx.stroke();
    }ctx.restore();
  }
  function particleLayer(ctx,w,h,t,proj,feature,assets,analysis,audioTime){
    const s=proj.main.visualSettings,count=Math.floor(s.particles*140),palette=[assets.coverAccent||colors[proj.main.preset][0],assets.coverAccent||colors[proj.main.preset][0]],speed=proj.main.preset==='montagem'?1.7:.75;
    // Analytic integrated velocity: particles decelerate to zero and resume smoothly
    // around beat markers, independently of preview frame rate or export order.
    const adjusted=window.PFParticleTime?.motionTime(audioTime,analysis,proj.effects?.manualMarkers,s.particlePauseMs??300)??audioTime;
    t+=adjusted-audioTime;
    ctx.save();for(let i=0;i<count;i++){
      const baseX=rnd(i+proj.main.seed)*w,baseY=rnd(i+proj.main.seed+54)*h;
      const x=(baseX+Math.sin(t*speed*.7+i)*22+w)%w,y=((baseY-t*(8+rnd(i+17)*52)*speed)%h+h)%h;
      const rad=.6+rnd(i+35)*2.1;
      ctx.globalAlpha=.15+rnd(i+77)*.6+feature.high*.1;ctx.fillStyle=palette[i%3===0?1:0];ctx.beginPath();ctx.arc(x,y,rad,0,TAU);ctx.fill();
    }ctx.restore();
  }
  function drawMain(ctx,w,h,t,proj,assets,tl,feature,analysis,forceVisible=false){
    const v=h>w,preset=proj.main.preset,s=proj.main.visualSettings,audioTime=tl.audioAt(t);
    const autoMarkers=analysis?.markers||[];
    let beat=0;
    for(const marker of proj.effects.manualMarkers){const dt=audioTime-marker.t;if(dt>=0&&dt<.45)beat=Math.max(beat,(1-dt/.45)*(marker.strength||1));}
    // Auto peaks contribute too. Small near-time lookup to avoid scanning the whole song on each rendered frame.
    if(autoMarkers.length){let lo=0,hi=autoMarkers.length;while(lo<hi){const m=(lo+hi)>>1;if(autoMarkers[m].t<audioTime-.4)lo=m+1;else hi=m;}
      for(let i=lo;i<Math.min(lo+6,autoMarkers.length);i++){const dt=audioTime-autoMarkers[i].t;if(dt>=0&&dt<.4)beat=Math.max(beat,(1-dt/.4)*autoMarkers[i].strength*.7);}
    }
    const amount=(s.safeFX?.25:1);
    const boost=clamp(feature.bass*s.bassResponse*.65+beat*.8,0,1.4);
    let appear=smooth(tl.mainStart,tl.mainStart+1.6,t),fade=1-smooth(tl.outroStart,tl.outroStart+2.5,t);
    const active=forceVisible?1:clamp(appear*fade,0,1);
    // Neon deliberately has smooth camera motion. Only detected beat accents
    // create a small damped shake, not every bass sample. Montagem keeps punch.
    const neon=preset==='neon_wave';
    const shake=(neon?beat*2.2:beat*3.6)*s.shake*amount;
    const moveX=Math.sin(t*(neon?9:14)+2)*shake;
    const moveY=Math.cos(t*(neon?11:17)+3)*shake;
    const zoom=1+(neon?(feature.bass*.014+beat*.007):(feature.bass*.012+beat*.023))*s.zoom*amount;
    ctx.save();ctx.translate(w/2+moveX,h/2+moveY);ctx.scale(zoom,zoom);ctx.translate(-w/2,-h/2);
    bg(ctx,w,h,t,proj,assets,false,boost);
    particleLayer(ctx,w,h,t,proj,feature,assets,analysis,audioTime);
    ctx.globalAlpha=active;
    const size=v?w*.59:w*.27,centerX=w/2;
    let posX=preset==='montagem'?centerX-size/2:v?centerX-size/2:(proj.main.coverPosition==='right'?w*.71-size/2:proj.main.coverPosition==='center'?w*.5-size/2:w*.23-size/2);
    let posY=preset==='montagem'?(v?h*.20:h*.22):(v?h*.19:h*.27);
    const enter=forceVisible?1:smooth(tl.mainStart,tl.mainStart+1.25,t);
    if(proj.main.playerEntrance==='table_drop')posY-= (1-easeOutBack(enter))*(v?230:130);
    else ctx.globalAlpha*=enter;
    cover(ctx,posX,posY,size,proj,assets,feature);
    if(preset==='montagem'){
      // Poster-sized central cover, on-beat frame, deliberately no title overlay.
      ctx.save();ctx.globalAlpha=active*.75;
      const f=clamp(boost,0,1);
      ctx.strokeStyle=assets.coverAccent||'#ae90ff';ctx.globalAlpha=active*(.27+.53*f);ctx.shadowColor=assets.coverAccent||'#ae90ff';ctx.shadowBlur=24+28*f;ctx.lineWidth=2+5*f;
      rounded(ctx,posX-9,posY-9,size+18,size+18,24);ctx.stroke();ctx.restore();
      ctx.save();ctx.globalAlpha=active;
      const decors=(proj.cornerImages||[]).slice(0,12);
      for(const decor of decors){const img=assets.corners?.get(decor.id);
        if(!img||!img.complete||!img.naturalWidth)continue;
        const dw=w*clamp(Number(decor.scale)||.12,.035,.30),dh=dw*img.naturalHeight/img.naturalWidth;
        const margin=w*.035,anchor=decor.anchor||'bottom-left';
        const x=(anchor.includes('right')?w-margin-dw:margin)+(Number(decor.offsetX)||0);
        const y=(anchor.includes('bottom')?h-h*.13-dh:h*.05)+(Number(decor.offsetY)||0);
        ctx.globalAlpha=clamp(Number(decor.opacity??1),0,1);ctx.drawImage(img,x,y,dw,dh);
      }
      ctx.restore();
      drawPlatformLogos(ctx,w,h,proj,active);
      ctx.restore();return;
    }
    const visualX=v?w/2:proj.main.coverPosition==='left'?w*.71:proj.main.coverPosition==='right'?w*.29:w*.74;
    const visualY=v?h*.66:h*.53;
    if(preset==='neon_wave'){
      waves(ctx,visualX-(v?w*.4:w*.215),visualY,v?w*.8:w*.43,v?210:260,t,feature,proj);
      bars(ctx,visualX,visualY,v?w*.68:w*.40,v?170:200,feature,t,preset,s,colors[preset][0]);
    } else bars(ctx,visualX,visualY,v?w*.85:w*.43,v?400:370,feature,t,preset,s,colors[preset][0]);
    ctx.shadowBlur=0;
    const textX=v?w/2:posX,anchor=v?'center':'left';
    ctx.textAlign=anchor;ctx.textBaseline='middle';
    const title=proj.metadata.title||'UNTITLED';
    ctx.fillStyle='#f7f7ff';const maxWidth=v?w*.9:size*1.25;
    const showMainText=!(proj.shorts?.render&&(t<tl.mainStart||t>=tl.outroStart));
    if(showMainText){fitText(ctx,title,maxWidth,v?53:44,19);ctx.fillText(title,textX,v?h*.55:posY+size+44,maxWidth);}
    ctx.fillStyle='#c9c3e1';ctx.font=`500 ${v?24:22}px Montserrat,system-ui,Segoe UI,Arial`;if(showMainText)ctx.fillText(proj.metadata.artist||'ARTIST',textX,v?h*.59:posY+size+83,maxWidth);
    const progress=clamp((audioTime-tl.audioStart)/Math.max(.1,tl.effectiveLength),0,1);
    if(v){ctx.fillStyle='#ffffff33';rounded(ctx,w*.12,h*.89,w*.76,5,2.5);ctx.fill();ctx.fillStyle=colors[preset][0];rounded(ctx,w*.12,h*.89,w*.76*progress,5,2.5);ctx.fill();}
    else{ctx.fillStyle='#ffffff36';rounded(ctx,w*.52,h*.82,w*.39,5,2.5);ctx.fill();ctx.fillStyle=colors[preset][0];rounded(ctx,w*.52,h*.82,w*.39*progress,5,2.5);ctx.fill();}
    drawPlatformLogos(ctx,w,h,proj,active);
    ctx.restore();
  }
  function drawOutro(ctx,w,h,t,proj,assets,tl,feature,analysis){
    if(proj.shorts?.render)return drawReleaseOutro(ctx,w,h,t,proj,assets,tl,feature,analysis);
    const phase=t-tl.outroStart,d=tl.outro,first=clamp(phase/Math.max(1,d*.32),0,1),last=1-smooth(d*.75,d,phase),fade=smooth(d*.22,d*.49,phase)*last;
    ctx.save();ctx.fillStyle='#020207';ctx.fillRect(0,0,w,h);ctx.globalAlpha=1-first;drawMain(ctx,w,h,t,proj,assets,tl,feature,analysis);ctx.globalAlpha=1;
    ctx.fillStyle=`rgba(0,0,0,${smooth(0,d*.31,phase)})`;ctx.fillRect(0,0,w,h);
    ctx.globalAlpha=fade;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#bdb6d3';ctx.font=`500 ${h>w?22:21}px Montserrat,system-ui,Segoe UI,Arial`;ctx.fillText(proj.uiLanguage==='en'?'LISTEN ON':'СЛУШАЙ НА',w/2,h*.36);
    const platformText=(proj.outro.platforms||[]).filter(Boolean).slice(0,6);
    const strings=platformText.length?platformText:['Спасибо за прослушивание'];
    ctx.fillStyle='#f5f0ff';fitText(ctx,strings.join('   •   '),w*.84,h>w?35:37,20);
    if(strings.join(' • ').length>45){ctx.font=`700 ${h>w?29:32}px Montserrat,system-ui,Segoe UI,Arial`;strings.forEach((label,i)=>ctx.fillText(label,w/2,h*.46+i*(h>w?52:43),w*.84));}
    else ctx.fillText(strings.join('    •    '),w/2,h*.48,w*.84);
    drawPlatformLogos(ctx,w,h,proj,fade);
    ctx.restore();
  }
  function drawReleaseOutro(ctx,w,h,t,proj,assets,tl,feature,analysis){
    const elapsed=Math.max(0,t-tl.outroStart),fadeIn=smooth(0,Math.min(1.2,tl.outro*.42),elapsed),fadeOut=1-smooth(tl.outro*.70,tl.outro,elapsed);
    ctx.save();
    // Keep the chosen background and imagery visible, never switch to full black.
    drawMain(ctx,w,h,t,proj,assets,tl,feature,analysis,true);
    ctx.fillStyle=`rgba(0,0,0,${.18+.60*fadeIn})`;ctx.fillRect(0,0,w,h);
    const fade=fadeIn*fadeOut;ctx.globalAlpha=fade;ctx.textAlign='center';ctx.textBaseline='middle';
    const label=window.PFShorts.outroLabel(proj.shorts),dateKnown=label!=='СКОРО';
    const title=proj.metadata?.title||'НОВЫЙ ТРЕК';
    ctx.fillStyle='#fff';ctx.shadowColor=assets.coverAccent||'#a58aff';ctx.shadowBlur=32;
    fitText(ctx,title,w*.86,65,25);ctx.fillText(title,w/2,h*.34,w*.86);ctx.shadowBlur=0;
    ctx.fillStyle='#DEDAEA';ctx.font=`800 ${dateKnown?49:43}px Montserrat,system-ui,sans-serif`;
    ctx.fillText(dateKnown?label:(proj.uiLanguage==='en'?'COMING TO PLATFORMS':'СКОРО НА ПЛОЩАДКАХ'),w/2,h*.48,w*.90);
    drawPlatformLogos(ctx,w,h,proj,fade);ctx.restore();
  }
  function drawPlatformLogos(ctx,w,h,proj,opacity=1){
    if(proj.platforms?.show===false)return;
    const imgs=window.PFPlatformLogos||{};
    const ids=['spotify','youtubeMusic','appleMusic'],v=h>w,sz=v?47:43,gap=v?27:33;
    const total=ids.length*sz+(ids.length-1)*gap,first=w/2-total/2;
    const y=v?h*.935:h*.905;
    ctx.save();ctx.globalAlpha=clamp(opacity,0,1)*.88;
    for(let i=0;i<ids.length;i++){
      const img=imgs[ids[i]];
      if(img?.complete&&img.naturalWidth){ctx.drawImage(img,first+i*(sz+gap),y-sz/2,sz,sz);}
    }
    ctx.restore();
  }
  function watermark(ctx,w,h,proj,assets){
    const wm=proj.watermark||{},mode=wm.mode||((wm.enabled===false)?'off':'system');
    const margin=w*.026,corner=wm.position||'bottom-left';
    function position(iw,ih){return {x:corner.includes('right')?w-iw-margin:margin,y:corner.includes('bottom')?h-ih-margin:margin};}
    if(['image','video'].includes(mode)){
      const img=assets.watermark;
      const naturalW=img?.videoWidth||img?.naturalWidth||0,naturalH=img?.videoHeight||img?.naturalHeight||0;
      if(naturalW&&naturalH&&(img.tagName!=='VIDEO'||img.readyState>=2)){
        const iw=w*clamp(Number(wm.scale??.13),.04,.4),ih=iw*naturalH/naturalW;
        let {x,y}=position(iw,ih);
        // Leave room for the top-right branded signature above custom content.
        if(corner==='top-right')y=Math.max(y,h*.11);
        ctx.save();ctx.globalAlpha=clamp(Number(wm.opacity??.85),0,1);ctx.drawImage(img,x,y,iw,ih);ctx.restore();
      }
    }
    // Distinct credit above every user layer. Not technically tamper-proof in open source.
    if(proj.branding?.credit!==false){
      const scale=h/720;ctx.save();ctx.textAlign='right';ctx.textBaseline='top';
      ctx.font=`700 ${Math.max(11,18*scale)}px Montserrat,system-ui,sans-serif`;
      const label='Visual by PulseFrame',x=w-margin,y=h*.028;
      const tw=ctx.measureText(label).width;
      ctx.fillStyle='rgba(1,1,3,.52)';rounded(ctx,x-tw-15*scale,y-7*scale,tw+28*scale,36*scale,13*scale);ctx.fill();
      const grad=ctx.createLinearGradient(x-tw,y,x,y);grad.addColorStop(0,'#60E2FA');grad.addColorStop(.5,'#B78BFF');grad.addColorStop(1,'#FC88C0');ctx.fillStyle=grad;
      ctx.shadowColor='#ab65f8';ctx.shadowBlur=9*scale;ctx.fillText(label,x,y);ctx.restore();
    }
    if(mode==='system'&&systemLogo.complete&&systemLogo.naturalWidth){
      const iw=w*clamp(Number(wm.scale??.13),.06,.32),ih=iw*systemLogo.naturalHeight/systemLogo.naturalWidth;
      const {x,y}=position(iw,ih);
      ctx.save();ctx.globalAlpha=clamp(Number(wm.opacity??.85),0,1);
      ctx.drawImage(systemLogo,x,y,iw,ih);ctx.restore();
    }
  }
  function draw(canvas,proj,t,assets,analysis){
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
    const v=proj.canvas.aspect==='9:16';const w=v?720:1280,h=v?1280:720;
    ctx.save();ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);ctx.clearRect(0,0,w,h);
    const tl=timeline(proj,analysis?.duration||0);const audioTime=tl.audioAt(t);
    let f=window.PFAudio.sample(analysis,audioTime);
    if(proj.main.preset==='neon_wave'&&analysis){
      // Deterministic 210 ms smoothing: identical in preview and MP4 render.
      // Avoid frame-based accumulation, which resets on seek and drifts in export.
      const values={bass:0,mid:0,high:0,rms:0,flux:0};let total=0;
      for(let i=0;i<5;i++){
        const sample=window.PFAudio.sample(analysis,audioTime-i*.055);
        const weight=5-i;total+=weight;
        for(const key of Object.keys(values))values[key]+=sample[key]*weight;
      }
      for(const key of Object.keys(values))values[key]/=total;
      f=values;
    }
    if(t<tl.mainStart){
      if(proj.shorts?.render){
        drawMain(ctx,w,h,t,proj,assets,tl,f,analysis,true);
        ctx.fillStyle=`rgba(0,0,0,${1-smooth(0,Math.max(.15,tl.intro),t)})`;ctx.fillRect(0,0,w,h);
      }else drawIntro(ctx,w,h,t,proj,assets,tl);
    }
    else if(t>=tl.outroStart)drawOutro(ctx,w,h,t,proj,assets,tl,f,analysis);
    else drawMain(ctx,w,h,t,proj,assets,tl,f,analysis);
    watermark(ctx,w,h,proj,assets);
    ctx.restore();
  }
  const shortsScratch=new Map();
  function drawShort(canvas,proj,t,assets,analysis){
    const frame=window.PFShorts.makeRenderProject(proj,analysis?.duration||0),info=frame.info;
    if(!info.valid)return false;
    const key=canvas.width+'x'+canvas.height;
    let source=shortsScratch.get(key);
    if(!source){source=document.createElement('canvas');source.width=canvas.width;source.height=canvas.height;shortsScratch.set(key,source);}
    draw(source,{...frame.project,watermark:{mode:'off'},branding:{credit:false}},t,assets,analysis);
    const ctx=canvas.getContext('2d');ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
    const effects=window.PFShorts.activeEffects(proj.shorts?.effects,t,info.total),scale=canvas.width/720;
    let zoom=1,dx=0,dy=0,flash=0,rgb=0,glitch=0;
    for(const e of effects){
      const amount=(1-e.phase)*(1-e.phase)*e.strength;
      if(e.kind==='zoom')zoom=Math.max(zoom,1+amount*.13);
      else if(e.kind==='shake'){dx+=Math.sin(e.phase*60)*14*amount*scale;dy+=Math.cos(e.phase*47)*11*amount*scale;}
      else if(e.kind==='flash')flash=Math.max(flash,amount*.58);
      else if(e.kind==='rgb')rgb=Math.max(rgb,amount*.4);
      else if(e.kind==='glitch')glitch=Math.max(glitch,amount);
    }
    const w=canvas.width,h=canvas.height;
    const framingCfg=proj.shorts||{};
    const framing=clamp(Number(framingCfg.frameZoom)||1,1,2.2);
    const marginX=(framing-1)*w*.5,marginY=(framing-1)*h*.5;
    const panX=clamp(Number(framingCfg.frameX)||0,-1,1)*marginX;
    const panY=clamp(Number(framingCfg.frameY)||0,-1,1)*marginY;
    ctx.translate(w/2+dx-panX,h/2+dy-panY);ctx.scale(zoom*framing,zoom*framing);ctx.translate(-w/2,-h/2);
    ctx.drawImage(source,0,0);
    if(rgb>0){ctx.globalCompositeOperation='screen';ctx.globalAlpha=rgb*.35;ctx.drawImage(source,8*scale,0);ctx.drawImage(source,-8*scale,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
    if(glitch>0){const strips=8;for(let i=0;i<strips;i++){const y=((i*137)%700)/720*h,sh=h*.014;ctx.drawImage(source,0,y,w,sh,Math.sin(i*17+Math.floor(t*29))*glitch*18*scale,y,w,sh);}}
    if(flash>0){ctx.fillStyle=`rgba(255,255,255,${flash})`;ctx.fillRect(0,0,w,h);}
    ctx.restore();watermark(ctx,canvas.width,canvas.height,proj,assets);return true;
  }
  window.PFRenderer={draw,drawMontage,montageFrame,drawShort,readyAssets};
})();
