(function(){
  const {clamp,smooth,timeline}=window.PFTime;
  const TAU=Math.PI*2;
  const colors={neon_wave:['#58e6ff','#b97bff'],montagem:['#ff4c89','#ffc46b'],retro:['#31e6fa','#fa4bc4']};
  const montage=window.PFMontage;
  const systemLogo=new Image();systemLogo.src=window.PFEmbeddedAssets?.['assets/branding/pulseframe-system.png']||'assets/branding/pulseframe-system.png';
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
      const transform=clip.transform||{},dx=clamp(Number(transform.x)||0,-1,1)*w,dy=clamp(Number(transform.y)||0,-1,1)*h;
      const z=clamp(Number(transform.scale)||1,.2,4),angle=clamp(Number(transform.rotate)||0,-360,360)*Math.PI/180;
      ctx.save();ctx.globalAlpha*=alpha*clamp(Number(transform.opacity??1),0,1);
      ctx.translate(w/2+dx,h/2+dy);ctx.rotate(angle);ctx.scale(z,z);ctx.translate(-w/2,-h/2);
      try{ctx.drawImage(el,(w-iw)/2,(h-ih)/2,iw,ih);painted=true;}
      catch(err){ctx.restore();return false;}
      ctx.restore();return true;
    }
    const tx=montage.transition(proj,local);
    if(tx){
      if(['fade','blur','zoom','wipe','directional','spin','echo','pull_in','pull_out','shake'].includes(tx.kind)){
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
          if(tx.kind==='spin'){ctx.translate(w/2,h/2);ctx.rotate((1-tx.progress)*Math.PI*1.92);const z=.82+.18*tx.progress;ctx.scale(z,z);ctx.translate(-w/2,-h/2);}
          if(tx.kind==='pull_in'||tx.kind==='pull_out'){
            const q=1-Math.pow(1-tx.progress,3),z=tx.kind==='pull_in'?(.67+.33*q):(1.4-.4*q);
            ctx.translate(w/2,h/2);ctx.scale(z,z);ctx.translate(-w/2,-h/2);
          }
          if(tx.kind==='shake'){
            const strength=Math.pow(1-tx.progress,2);
            ctx.translate(Math.sin(tx.progress*87)*w*.035*strength,Math.cos(tx.progress*69)*h*.035*strength);
          }
          if(tx.kind==='echo'){ctx.globalAlpha*=.65+.35*tx.progress;ctx.translate((1-tx.progress)*w*.025,0);}
          if(tx.kind==='blur')ctx.filter=`blur(${(1-tx.progress)*13}px)`;
          paint(state.clip,['wipe','directional'].includes(tx.kind)?1:tx.progress,state.sourceTime);
          ctx.restore();
        }
      }else paint(state.clip,1,state.sourceTime);
    }else paint(state.clip,1,state.sourceTime);
    const age=state.clipTime,ease=clamp(1-age/.28,0,1),fx=state.clip.effect||'none';
    if(['pull_in','pull_out','spin'].includes(fx)){
      ctx.save();ctx.translate(w/2,h/2);
      const z=fx==='pull_in'?1+.24*ease:fx==='pull_out'?1-.21*ease:1;
      ctx.scale(z,z);if(fx==='spin')ctx.rotate(ease*Math.PI*.8);
      ctx.translate(-w/2,-h/2);ctx.globalAlpha=.24*ease;paint(state.clip,1,state.sourceTime);ctx.restore();
    }
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

  // Pixel-art synthwave backdrops. Deterministic at any export time, no dependency
  // on the user's GPU, no external assets, and no extra copyright concerns.
  const retroBackdrops=new Map();
  function retroBackdrop(scene){
    scene=['city','beach','mountains','room','space'].includes(scene)?scene:'city';
    if(retroBackdrops.has(scene))return retroBackdrops.get(scene);
    const c=document.createElement('canvas');c.width=320;c.height=180;
    const g=c.getContext('2d',{alpha:false});g.imageSmoothingEnabled=false;
    const pal={city:['#03051c','#321056','#f64bc0'],beach:['#12072b','#752673','#ffb052'],mountains:['#041128','#224977','#fca9cd'],room:['#140f30','#523b87','#f08bba'],space:['#020518','#262060','#ce57fa']}[scene];
    let gradient=g.createLinearGradient(0,0,0,180);gradient.addColorStop(0,pal[0]);gradient.addColorStop(.65,pal[1]);gradient.addColorStop(1,pal[0]);g.fillStyle=gradient;g.fillRect(0,0,320,180);
    for(let i=0;i<130;i++){let x=Math.floor(rnd(i*2+6)*320),y=Math.floor(rnd(i*3+12)*110);g.fillStyle=i%4?'#9abaff96':'#fbb6ff';g.fillRect(x,y,i%11===0?2:1,1);}
    if(scene==='space'){
      g.fillStyle='#524e9b';g.beginPath();g.arc(210,102,52,0,TAU);g.fill();g.fillStyle='#24134c';g.beginPath();g.arc(194,88,48,0,TAU);g.fill();
      for(let i=0;i<32;i++){g.fillStyle=i%2?'#27b8ff':'#ef58e8';g.fillRect((i*57)%320,(i*31)%180,3,1);}
    }else if(scene==='room'){
      g.fillStyle='#130d30';g.fillRect(0,131,320,49);g.fillStyle='#5c3f7d';g.fillRect(95,22,126,116);g.fillStyle='#090d2c';g.fillRect(105,28,106,103);
      g.fillStyle='#ef80b8';g.fillRect(110,102,96,4);g.fillStyle='#592c67';g.fillRect(10,128,300,9);g.fillStyle='#1b153d';g.fillRect(38,115,92,65);g.fillStyle='#181237';g.fillRect(230,100,70,80);
      g.fillStyle='#de6bcc';g.fillRect(27,104,22,11);g.fillRect(270,68,12,46);
    }else{
      const cx=scene==='city'?174:scene==='beach'?175:240,cy=scene==='mountains'?70:80,r=scene==='city'?42:scene==='beach'?50:30;
      g.fillStyle=pal[2];g.beginPath();g.arc(cx,cy,r,0,TAU);g.fill();for(let j=0;j<9;j++){g.fillStyle=pal[1];g.fillRect(cx-r,cy+j*6,2*r,Math.floor(j*.36));}
      if(scene==='mountains'){for(let i=0;i<8;i++){const x=i*50-20,y=96+rnd(i+30)*15;g.fillStyle=i%2?'#1b224b':'#0b163d';g.beginPath();g.moveTo(x,150);g.lineTo(x+48,y-55);g.lineTo(x+110,150);g.fill();}}
      if(scene==='beach'){for(let i=0;i<36;i++){let y=126+i*2;g.fillStyle=i%3?'#743466':'#d14e9b';g.fillRect(0,y,320,1);}g.fillStyle='#0b1a39';g.fillRect(0,154,320,26);}
      if(scene==='city'){for(let i=0;i<42;i++){let x=i*8-3,h=21+Math.floor(rnd(i+202)*60);g.fillStyle=i%3?'#0c1132':'#17153f';g.fillRect(x,150-h,8,h);g.fillStyle=i%2?'#41bded':'#fd63b3';for(let yy=154-h;yy<147;yy+=9)g.fillRect(x+3,yy,2,3);}}
    }
    if(scene!=='room'&&scene!=='space'){
      g.fillStyle='#09091e';g.fillRect(0,151,320,29);
      g.strokeStyle='#d735b5';g.lineWidth=1;for(let y=155;y<180;y+=6){g.beginPath();g.moveTo(0,y);g.lineTo(320,y);g.stroke();}
      for(let k=-4;k<=4;k++){g.strokeStyle='#3c37ba';g.beginPath();g.moveTo(160+k*16,151);g.lineTo(160+k*65,180);g.stroke();}
    }
    retroBackdrops.set(scene,c);return c;
  }
  // Alpha 0.2.7 Retro Deluxe: deterministic layered low-resolution scenes.
  // All motion uses the absolute audio timeline t; export and preview match.
  const retroLiveCanvas=document.createElement('canvas');retroLiveCanvas.width=480;retroLiveCanvas.height=270;
  const rg=retroLiveCanvas.getContext('2d',{alpha:false});
  const retroCache=new Map();
  const frac=x=>x-Math.floor(x);
  const wave=(x,p=0)=>Math.sin(x+p);
  function rline(g,x1,y1,x2,y2,col,width=1){g.strokeStyle=col;g.lineWidth=width;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();}
  function rrect(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
  function rpoly(g,points,c){g.fillStyle=c;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}
  function rstars(g,scene,time,dy=0){
    for(let i=0;i<125;i++){
      const x=frac(Math.sin(i*71.71+3)*41773)*480;
      const y=frac(Math.sin(i*37.13+1)*87521)*180+dy;
      const blink=.35+.65*frac(Math.sin(i*13.2+time*.4)*175.5);
      g.globalAlpha=blink;
      rrect(g,x,y,i%17===0?2:1,1,i%4===0?'#fda8e8':'#b9dbff');
    }g.globalAlpha=1;
  }
  function rsky(g,top,bottom){const a=g.createLinearGradient(0,0,0,270);a.addColorStop(0,top);a.addColorStop(.71,bottom);a.addColorStop(1,'#07061e');g.fillStyle=a;g.fillRect(0,0,480,270);}
  function rsun(g,x,y,rad,col='#ff8ab1'){
    g.save();g.shadowBlur=18;g.shadowColor=col;g.fillStyle=col;g.beginPath();g.arc(x,y,rad,0,TAU);g.fill();g.restore();
    for(let i=0;i<8;i++){let sy=y+rad*.04+i*rad*.15;rrect(g,x-rad,sy,2*rad,1+i*.5,'#432052');}
  }
  function rcity(g,t,layer=1){
    const speed=layer===1?5:11;
    for(let i=-2;i<42;i++){
      const px=(i*19-(t*speed)%19+480)%520-20;
      const ht=18+Math.floor(frac(Math.sin(i*45+layer*6)*3724)*72)/(layer===1?1.5:1);
      const y=177-ht/2+layer*14;
      rrect(g,px,y,19,ht,layer===1?'#171346':'#0a1035');
      rrect(g,px+2,y+2,14,2,layer===1?'#753da3':'#293b7b');
      for(let wy=y+7;wy<y+ht-3;wy+=7)for(let wx=px+3;wx<px+16;wx+=5){if(frac(Math.sin(i*77+wy*3+wx)*719)>.4)rrect(g,wx,wy,2,2,layer===1?'#ef69c6':'#56c9f7');}
    }
  }
  function rdrive(g,t,beat){
    rsky(g,'#050a31','#7c287b');rstars(g,'drive',t);
    const haze=g.createLinearGradient(0,90,0,205);haze.addColorStop(0,'#cb4a9b00');haze.addColorStop(1,'#e454ad66');g.fillStyle=haze;g.fillRect(0,90,480,120);
    rsun(g,258,104,49,'#ff84aa');rcity(g,t,.9);rcity(g,t,2);
    // Highway perspective: lane stripes and railings advance with the track.
    rpoly(g,[[0,270],[172,180],[308,180],[480,270]],'#0b1030');
    rpoly(g,[[0,270],[180,180],[184,180],[33,270]],'#722d91');
    rpoly(g,[[447,270],[296,180],[300,180],[480,270]],'#862e97');
    for(let i=0;i<13;i++){
      const p=frac(i/13+t*.39),z=p*p;
      const y=180+z*95;
      const lx=240-(68+190*z),rx=240+(68+190*z);
      rline(g,lx,y,rx,y,'#5a2d93',Math.max(1,z*2));
      for(const side of [-1,1]){
        const x1=240+side*(16+72*z),x2=240+side*(16+72*Math.min(1,(p+.05)**2));
        rline(g,x1,y,x2,y+2+7*z,'#c0c5ff',1.5);
      }
    }
    for(let i=0;i<10;i++){
      let z=frac(i/10+t*.19)**2, y=182+z*110, side=i%2?1:-1;
      const x=240+side*(82+170*z);
      rrect(g,x,y-7-z*12,1+z*4,8+z*14,'#111135');
      rrect(g,x-3-z*3,y-11-z*14,7+z*6,3+z*2,'#ff4aaf');
    }
    // Floating outrun racer car: car silhouette is drawn with no licensed sprite.
    const rock=Math.sin(t*9)*1.2+beat*1.7;
    g.save();g.translate(240,221+rock);g.scale(1+beat*.012,1+beat*.012);
    rpoly(g,[[-76,23],[-67,-3],[-42,-12],[42,-12],[67,-3],[76,23]],'#10102c');
    rpoly(g,[[-48,-9],[-35,-37],[33,-37],[51,-9]],'#15265c');
    rpoly(g,[[-32,-32],[-18,-47],[20,-47],[35,-32]],'#263881');
    rrect(g,-64,3,128,21,'#25264f');rrect(g,-59,10,118,6,'#3b3774');
    rrect(g,-54,9,25,11,'#f83291');rrect(g,29,9,25,11,'#f83291');
    rrect(g,-12,9,24,5,'#7f9bfa');rrect(g,-59,22,118,4,'#66eaff');
    rrect(g,-69,19,16,11,'#050817');rrect(g,53,19,16,11,'#050817');g.restore();
    for(let i=0;i<15;i++){
      const p=frac(i*.136+t*.45),y=180+p*p*100;
      rrect(g,frac(Math.sin(i*23)*452)*480,y,2+p*2,3+p*6,i%2?'#ff4bb8':'#61c9ff');
    }
  }
  function rplatform(g,t,beat){
    const run=t*98;
    rsky(g,'#100e56','#5299d8');
    rsun(g,385,68,32,'#ffcf91');
    for(let i=-3;i<12;i++){
      const x=frac((i*90-run*.12)/1080)*1080-260;
      rpoly(g,[[x,182],[x+52,87],[x+140,182]],'#3645ad');
      rpoly(g,[[x+34,126],[x+52,87],[x+73,125]],'#b9e9fa');
    }
    for(let i=-3;i<25;i++){
      const x=frac((i*46-run*.36)/1250)*1250-280;
      rrect(g,x,133+((i*19)%29),32,60,'#1b4e91');
      rrect(g,x+4,131+((i*19)%29),24,6,'#56c0df');
    }
    // Checkerboard scrolling ground.
    rrect(g,0,197,480,73,'#a74b60');rrect(g,0,187,480,10,'#2be5b1');
    const tile=24;const off=(run%tile);
    for(let x=-24;x<505;x+=tile)for(let y=198;y<270;y+=tile){
      rrect(g,x-off,y,tile,tile,((Math.floor((x)/tile)+Math.floor(y/tile))%2===0)?'#d9746e':'#a14478');
      rrect(g,x-off,y,tile,2,'#f8aa7e');
    }
    // Palm shapes / loops in front-scrolling parallax.
    for(let i=0;i<6;i++){
      const x=frac((i*155-run*.77)/930)*930-210;
      rrect(g,x,145,9,43,'#73475a');
      rpoly(g,[[x+5,145],[x-19,128],[x-24,133],[x+3,155]],'#118e93');
      rpoly(g,[[x+5,145],[x+28,126],[x+35,139],[x+5,155]],'#31b5a0');
    }
    // Collectible rings and hazard blocks.
    for(let i=0;i<9;i++){
      const x=frac((i*98-run*1.45)/1020)*1020-230;
      const y=149+(i%3)*-11;
      g.strokeStyle='#ffe46b';g.lineWidth=5;g.beginPath();g.ellipse(x,y,9,14,0,0,TAU);g.stroke();
      rrect(g,x-1,y+11,3,3,'#fff1a5');
    }
    for(let i=0;i<6;i++){
      const x=frac((i*190-run*1.3)/1180)*1180-240;
      rpoly(g,[[x,188],[x+10,168],[x+20,188]],'#e553a9');
    }
    // Unique original pixel runner character, not a copyrighted game sprite.
    const yy=149+Math.sin(t*13)*3-beat*2,xx=135;
    rrect(g,xx-14,yy+22,27,12,'#232c71');
    rrect(g,xx-9,yy+5,19,19,'#36daff');
    rrect(g,xx-7,yy-2,22,17,'#2873c9');
    rrect(g,xx+6,yy+2,6,5,'#f7ffff');rrect(g,xx+9,yy+3,2,3,'#14162e');
    rrect(g,xx-12,yy+22,11,6,'#f65689');rrect(g,xx+8,yy+22,11,6,'#f65689');
    for(let i=0;i<5;i++)rline(g,xx-19-i*9,yy+8+i*3,xx-24-i*9,yy+8+i*3,'#94eaff',2);
    if(beat>.5){rrect(g,xx+2,yy-6,19,2,'#fff2a6');}
  }
  function rbeach(g,t,beat){
    rsky(g,'#250b52','#e74c94');rstars(g,'beach',t);
    rsun(g,255,108,58,'#ffb56b');
    for(let l=0;l<3;l++){
      const y=184+l*28;
      rrect(g,0,y,480,29,l%2?'#7e2b83':'#252577');
      for(let i=0;i<32;i++){
        const x=frac(i/32+t*(.07+l*.03))*490-12;
        rrect(g,x,y+7+(i%5)*3,5+(i%6)*5,2,l%2?'#f36bb0':'#4bd7ed');
      }
    }
    for(let j=0;j<4;j++){
      const px=j%2?438:35,sign=j%2?-1:1;const by=197+(j%2)*11;
      rline(g,px,by,px+sign*9,by-91,'#19132f',7);
      for(let k=0;k<6;k++){
        let a=(k/6)*TAU+t*.08;
        rline(g,px+sign*9,by-91,px+sign*9+Math.cos(a)*40,by-91+Math.sin(a)*17,'#15192d',7);
      }
    }
    for(let i=0;i<28;i++){
      const x=frac(i*.155+t*.04)*480;
      rrect(g,x,187+i%7*10,2+i%5,1,i%2?'#ffe7ba':'#f383a6');
    }
  }
  function rmountains(g,t,beat){
    rsky(g,'#030a34','#4054a0');rstars(g,'mountains',t);
    rsun(g,345,80,36,'#dabaff');
    for(let layer=0;layer<3;layer++){
      const shift=t*(layer+1)*2;
      for(let i=-2;i<10;i++){
        const x=i*98-shift%98;
        rpoly(g,[[x-52,210],[x+18,69+layer*28],[x+112,210]],['#1c2c72','#263b7a','#14224e'][layer]);
        rpoly(g,[[x-1,104+layer*26],[x+18,69+layer*28],[x+39,109+layer*22]],'#a1d6ed');
      }
    }
    rrect(g,0,210,480,60,'#0d2448');
    for(let i=0;i<32;i++){
      let x=frac(i*.077+t*.028)*500-10;
      rrect(g,x,217+i%7*6,4+i%3*4,2,i%3?'#56cdf2':'#e26eec');
    }
    for(let i=0;i<29;i++){
      let x=i*19-(t*17)%19;
      rpoly(g,[[x-9,246],[x,196+(i%4)*7],[x+8,246]],'#071735');
      rrect(g,x-2,239,4,23,'#05122a');
    }
  }
  function rroom(g,t,beat){
    rsky(g,'#18112f','#70367e');rsun(g,318,99,36,'#ffbb85');
    rrect(g,0,180,480,90,'#211b41');
    rrect(g,106,32,265,160,'#563d7a');rrect(g,117,42,240,140,'#1c1a43');
    rrect(g,123,49,228,126,'#322352');
    // Animated rain outside a window.
    for(let i=0;i<35;i++){
      const x=128+frac(i*.319)*215,y=49+frac(i*.71+t*.75)*120;
      rrect(g,x,y,1,7,'#7cbdff88');
    }
    rrect(g,119,167,237,9,'#ff7fbd');rrect(g,225,43,9,138,'#51346e');
    rrect(g,0,204,480,66,'#382551');rrect(g,15,194,459,19,'#6c3467');
    rrect(g,46,150,120,48,'#121c3d');rrect(g,55,157,101,29,'#183367');
    for(let i=0;i<16;i++){let h=8+Math.abs(Math.sin(t*4+i*.7))*22*beat;rrect(g,64+i*5,182-h,3,h,i%3?'#45dbff':'#fa55ce');}
    rrect(g,384,112,19,93,'#2d244b');rrect(g,378,102,31,12,'#ffc5d9');
    rrect(g,180,212,129,6,'#ca83b1');rrect(g,240,192,8,32,'#2c2247');
    rrect(g,245,218,24,6,'#121b35');
  }
  function rspace(g,t,beat){
    rsky(g,'#010715','#1c164a');rstars(g,'space',t);
    const x=330+Math.sin(t*.2)*13,y=126;
    g.save();g.shadowBlur=23;g.shadowColor='#a441fa';g.fillStyle='#534fa0';g.beginPath();g.arc(x,y,70,0,TAU);g.fill();g.restore();
    g.fillStyle='#24245f';g.beginPath();g.arc(x-17,y-11,60,0,TAU);g.fill();
    g.strokeStyle='#fa78db';g.lineWidth=4;g.beginPath();g.ellipse(x,y,97,25,-.25,0,TAU);g.stroke();
    for(let i=0;i<22;i++){
      const x=frac(i*.618+t*(.07+i%4*.07))*530-40;
      const y=frac(Math.sin(i*12.2)*4)*245;
      rline(g,x,y,x-9,y+4,i%3?'#4efaff':'#d986ff',2);
    }
    rpoly(g,[[0,270],[0,199],[68,236],[155,220],[220,255],[286,225],[480,247],[480,270]],'#12143c');
  }
  function retroScene(ctx,w,h,t,proj,beat){
    const scene=proj.retro?.scene||'city',kind=scene==='city'?'drive':scene;
    rg.imageSmoothingEnabled=false;
    if(kind==='drive')rdrive(rg,t,beat);
    else if(kind==='platformer')rplatform(rg,t,beat);
    else if(kind==='beach')rbeach(rg,t,beat);
    else if(kind==='mountains')rmountains(rg,t,beat);
    else if(kind==='room')rroom(rg,t,beat);
    else rspace(rg,t,beat);
    // Oscillating arcades, dynamic pixel bloom and brief bass distortion.
    const bloom=clamp(Number(proj.retro?.glow??65),0,100)/100;
    if(bloom>0){
      rg.fillStyle=`rgba(116,52,196,${.045+.035*bloom+.07*beat})`;rg.fillRect(0,0,480,270);
    }
    ctx.save();ctx.imageSmoothingEnabled=false;
    if(beat>.69){ctx.translate((Math.sin(t*73)*3)*beat,(Math.cos(t*68)*1.6)*beat);}
    ctx.drawImage(retroLiveCanvas,0,0,w,h);
    ctx.restore();
    // Beat-synced chromatic flash: deterministic and short, non-destructive.
    if(beat>.7){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=(beat-.7)*.12;
      ctx.drawImage(retroLiveCanvas,-w*.005,0,w,h);ctx.restore();}
  }

  // Retro TV scene: same deterministic drawing path in preview and export.
  // All visuals are generated locally and never depend on remote VHS filters.
  const tvGlowNoise=i=>rnd(i+19);
  function tvRounded(ctx,x,y,w,h,r,color){ctx.fillStyle=color;rounded(ctx,x,y,w,h,r);ctx.fill();}
  function tvLayout(w,h){const v=h>w,tw=v?w*.91:w*.53,th=v?h*.375:h*.64;
    const x=v?w*.045:w*.065,y=v?h*.155:h*.15;
    return {v,x,y,tw,th,sx:x+tw*.079,sy:y+th*.132,sw:tw*.83,sh:th*.705,rx:v?w*.10:w*.64,ry:v?h*.605:h*.135,rw:v?w*.8:w*.32,rh:v?h*.28:h*.68};
  }
  function tvRoom(ctx,w,h,t,l,beat){
    const sky=ctx.createLinearGradient(0,0,w,h);sky.addColorStop(0,'#0c0a1d');sky.addColorStop(.54,'#24112f');sky.addColorStop(1,'#06060e');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    const lamp=ctx.createRadialGradient(w*.78,h*.2,10,w*.78,h*.2,w*.62);lamp.addColorStop(0,'rgba(250,87,172,.28)');lamp.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=lamp;ctx.fillRect(0,0,w,h);
    // vertical wood-panel texture, neon poster and shelves
    for(let i=0;i<19;i++){ctx.strokeStyle=`rgba(120,64,142,${.06+(i%3)*.025})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(i*w/18,0);ctx.lineTo(i*w/18,h*.8);ctx.stroke();}
    ctx.save();ctx.shadowBlur=26;ctx.shadowColor='#f057b5';tvRounded(ctx,w*.79,h*.073,w*.135,h*.22,4,'#160c29');ctx.restore();
    ctx.fillStyle='#f95fc5';ctx.font=`700 ${Math.max(14,h*.025)}px monospace`;ctx.textAlign='center';ctx.fillText('PULSE',w*.855,h*.12);ctx.fillStyle='#48dafa';ctx.fillText('VHS • 199X',w*.855,h*.165);
    ctx.lineWidth=3;ctx.strokeStyle='#864795';ctx.strokeRect(w*.795,h*.085,w*.125,h*.19);
    // Desktop and shelves
    const deskY=l.y+l.th*.87;ctx.fillStyle='#3c2240';ctx.fillRect(w*.015,deskY,w*.61,h*.054);ctx.fillStyle='#b66b9d';ctx.fillRect(w*.015,deskY,w*.61,6);ctx.fillStyle='#150d1b';ctx.fillRect(w*.035,deskY+h*.05,w*.06,h*.3);ctx.fillRect(w*.58,deskY+h*.05,w*.06,h*.3);
    ctx.fillStyle='#251627';ctx.fillRect(w*.035,deskY+h*.05,w*.55,h*.045);
    // VHS cassette next to the TV, animated diode and cables
    const cs=w*.105;ctx.save();ctx.translate(l.x+l.tw*.76,deskY-4);ctx.rotate(-.04);tvRounded(ctx,0,0,Math.max(70,cs),h*.03,3,'#101015');ctx.strokeStyle='#9c85ad';ctx.strokeRect(6,5,Math.max(70,cs)-12,h*.02);ctx.restore();
    ctx.fillStyle='#6ee8f9';ctx.shadowColor='#37eaf5';ctx.shadowBlur=5+beat*11;ctx.fillRect(l.x+l.tw*.88,l.y+l.th*.87-8,4,3);ctx.shadowBlur=0;
  }
  function tvScreen(ctx,l,t,proj,feature,beat,mode='main',phase=0){
    const {sx,sy,sw,sh}=l;ctx.save();rounded(ctx,sx,sy,sw,sh,15);ctx.clip();ctx.fillStyle='#030810';ctx.fillRect(sx,sy,sw,sh);
    if(mode==='intro'&&phase<.71){
      ctx.fillStyle='#050913';ctx.fillRect(sx,sy,sw,sh);
      for(let i=0;i<66;i++){const x=sx+rnd(i)*sw,y=sy+rnd(i+3)*sh;
       ctx.fillStyle=`rgba(159,196,246,${.04+.10*rnd(i+11)})`;ctx.fillRect(x,y,2,1);}
      const initial=proj.metadata.artist||'ARTIST';const title=proj.metadata.title||'TRACK TITLE';
      const a=phase<.38?smooth(.12,.2,phase)*(1-smooth(.31,.40,phase)):smooth(.39,.48,phase)*(1-smooth(.64,.72,phase));
      ctx.globalAlpha=a;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${Math.min(34,Math.max(15,sw*.047))}px monospace`;ctx.shadowColor='#6ddafa';ctx.shadowBlur=9;ctx.fillStyle='#dbecff';
      const txt=phase<.38?initial:title;ctx.fillText(txt,sx+sw/2,sy+sh/2,sw*.9);ctx.shadowBlur=0;ctx.globalAlpha=1;
    }else{
      const sceneAlpha=mode==='intro'?smooth(.68,.9,phase):1;
      ctx.globalAlpha=sceneAlpha;ctx.translate(sx,sy);retroScene(ctx,sw,sh,t,proj,beat);ctx.globalAlpha=1;
    }
    // Local VHS: deterministic grain + scan lines, tape displacement, red/blue chroma strokes.
    const crt=clamp(Number(proj.retro?.crt??45),0,100)/100;
    ctx.fillStyle=`rgba(1,3,11,${.09+.19*crt})`;for(let y=sy;y<sy+sh;y+=5){ctx.fillRect(sx,y,sw,1.5);}
    if(crt>0){const shift=(Math.floor(t*11)%26)/26;ctx.fillStyle=`rgba(112,207,253,${.025+crt*.043})`;ctx.fillRect(sx,sy+sh*shift,sw,3);
      for(let i=0;i<36;i++){const xx=sx+rnd(i+Math.floor(t*11))*sw,yy=sy+rnd(i+51+Math.floor(t*17))*sh;ctx.globalAlpha=(.05+.1*rnd(i+44))*crt;ctx.fillStyle=i%2?'#c9f0ff':'#f581dc';ctx.fillRect(xx,yy,rnd(i+33)*13+2,1);}ctx.globalAlpha=1;}
    ctx.restore();
  }
  function tvFrame(ctx,w,h,t,l,beat){
    const {x,y,tw,th,sx,sy,sw,sh}=l;ctx.save();ctx.shadowColor='#b35cb1';ctx.shadowBlur=18+beat*20;tvRounded(ctx,x,y,tw,th,25,'#111017');ctx.restore();
    tvRounded(ctx,x+9,y+8,tw-18,th-16,20,'#3a2d3b');
    tvRounded(ctx,x+19,y+17,tw-38,th-34,16,'#1b1c24');
    ctx.strokeStyle='#806682';ctx.lineWidth=4;rounded(ctx,sx-6,sy-5,sw+12,sh+10,16);ctx.stroke();
    ctx.strokeStyle='#57445e';ctx.lineWidth=3;rounded(ctx,sx+1,sy+1,sw-2,sh-2,15);ctx.stroke();
    ctx.textAlign='center';ctx.font=`700 ${Math.max(10,th*.037)}px monospace`;ctx.fillStyle='#b997a6';ctx.fillText('TOSHIBA',x+tw*.51,y+th*.925);
    ctx.fillStyle='#ba6e96';ctx.beginPath();ctx.arc(x+tw*.92,y+th*.915,Math.max(3,th*.014),0,TAU);ctx.fill();
    ctx.fillStyle='#4c354a';ctx.fillRect(x+tw*.13,y+th,x+tw*.17-x,th*.045);ctx.fillRect(x+tw*.7,y+th,tw*.14,th*.045);
  }
  function tvRightPanel(ctx,w,h,t,l,proj,assets,feature,beat,opacity){
    const {rx,ry,rw,rh,v}=l;ctx.save();ctx.globalAlpha=clamp(opacity,0,1);
    ctx.shadowColor='#b94acf';ctx.shadowBlur=22;tvRounded(ctx,rx,ry,rw,rh,8,'rgba(6,5,21,.93)');ctx.shadowBlur=0;
    ctx.strokeStyle='#d368e0';ctx.lineWidth=2;rounded(ctx,rx,ry,rw,rh,8);ctx.stroke();
    ctx.fillStyle='#ffacef';ctx.font=`700 ${Math.max(12,rw*.048)}px monospace`;ctx.textAlign='left';ctx.fillText('NOW PLAYING',rx+rw*.08,ry+rh*.085);
    const size=v?rh*.36:rw*.42,coverX=v?rx+rw*.06:rx+rw*.52,coverY=ry+rh*.13;
    cover(ctx,coverX,coverY,size,proj,assets,feature);
    ctx.shadowBlur=0;ctx.fillStyle='#e8ebff';ctx.font=`700 ${Math.max(12,rw*.045)}px monospace`;ctx.textAlign='left';
    const title=proj.metadata.title||'TRACK';const artist=proj.metadata.artist||'ARTIST';
    const tx=v?rx+rw*.54:rx+rw*.065,ty=ry+rh*.34;
    ctx.fillText(title,tx,ty,Math.max(80,v?rw*.4:rw*.43));ctx.fillStyle='#b9a0ee';ctx.font=`500 ${Math.max(10,rw*.034)}px monospace`;ctx.fillText(artist,tx,ty+rh*.08,Math.max(75,v?rw*.4:rw*.43));
    const barY=ry+rh*.68,barW=rw*.83,count=35;for(let i=0;i<count;i++){
      const part=i/count,signal=part<.24?feature.bass:part<.75?feature.mid:feature.high;
      const jitter=(Math.sin(t*11+i*1.37)+1)*.13;
      const bh=8+(signal*.7+jitter)*rh*.23;const px=rx+rw*.08+i*barW/count;
      ctx.fillStyle=i%4?'#4cecff':'#f163cd';ctx.fillRect(px,barY-bh,Math.max(2,barW/count*.65),bh);
    }
    const ids=(proj.platforms?.selected||['spotify','youtubeMusic','appleMusic']).slice(0,5);
    const logos=window.PFPlatformLogos||{};const icon=Math.min(rw*.11,rh*.09),gap=icon*.5,total=ids.length*icon+(ids.length-1)*gap;
    for(let i=0;i<ids.length;i++){
      const img=logos[ids[i]];if(!img?.complete||!img.naturalWidth)continue;
      const buffer=retroIconBuffer(),b=buffer.getContext('2d');b.clearRect(0,0,20,20);b.imageSmoothingEnabled=true;b.drawImage(img,0,0,20,20);
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(buffer,rx+rw*.5-total*.5+i*(icon+gap),ry+rh*.83,icon,icon);ctx.restore();
    }
    ctx.restore();
  }
  function drawRetroTV(ctx,w,h,t,proj,assets,feature,beat,mode='main',tl=null){
    const l=tvLayout(w,h),r=proj.retro||{},phase=mode==='intro'?clamp(t/Math.max(.1,tl?.intro||7),0,1):1;
    const reveal=mode==='intro'?smooth(0,Math.min(clamp(Number(r.introReveal??2),1,4),tl?.intro||7),t):1;
    ctx.save();tvRoom(ctx,w,h,t,l,beat);
    tvFrame(ctx,w,h,t,l,beat);tvScreen(ctx,l,t,proj,feature,beat,mode,phase);
    // The dock appears only once the visualizer comes online.
    const dock=mode==='intro'?smooth(.81,.99,phase):1;
    if(dock>.001)tvRightPanel(ctx,w,h,t,l,proj,assets,feature,beat,dock);
    if(reveal<1){ctx.fillStyle=`rgba(0,0,0,${1-reveal})`;ctx.fillRect(0,0,w,h);}
    ctx.restore();
  }
  function drawRetroOutro(ctx,w,h,t,proj,assets,tl,feature){
    const elapsed=Math.max(0,t-tl.outroStart),outro=Math.max(2,tl.outro),r=proj.retro||{};
    ctx.save();ctx.fillStyle='#010207';ctx.fillRect(0,0,w,h);
    if(elapsed<2.1){drawRetroTV(ctx,w,h,t,proj,assets,feature,0,'main',tl);
      const dark=smooth(0,.95,elapsed)*.82;ctx.fillStyle=`rgba(0,0,0,${dark})`;ctx.fillRect(0,0,w,h);
      if(elapsed>.45){const p=smooth(.45,1.25,elapsed),lineHeight=Math.max(2,(1-p)*h*.45);
        ctx.save();ctx.fillStyle='#f0fbff';ctx.shadowColor='#b3f5ff';ctx.shadowBlur=27;ctx.fillRect(w*.22,h*.50-lineHeight*.5,w*.4,lineHeight);ctx.restore();}
      ctx.fillStyle=`rgba(0,0,0,${smooth(1.35,2.1,elapsed)})`;ctx.fillRect(0,0,w,h);ctx.restore();return;
    }
    const appear=smooth(2.05,2.60,elapsed),exit=1-smooth(outro-.8,outro,elapsed);
    ctx.globalAlpha=appear*exit;const isVertical=h>w;ctx.textAlign='center';ctx.textBaseline='middle';
    const thanks=r.thanksText|| (proj.uiLanguage==='en'?'Thanks for listening!':'Спасибо за прослушивание!');
    const length=Math.floor(Math.max(0,elapsed-2.4)*17),typed=[...thanks].slice(0,length).join('');
    ctx.fillStyle='#f4d8ff';ctx.shadowColor='#de6bea';ctx.shadowBlur=12;ctx.font=`700 ${Math.max(17,w*.035)}px monospace`;
    ctx.fillText(typed+((Math.floor(elapsed*2)%2===0)?'▮':''),w/2,isVertical?h*.36:h*.255,w*.9);ctx.shadowBlur=0;
    if((r.outroMode||'recommendations')==='recommendations'){
      const rw=isVertical?w*.43:w*.33,rh=isVertical?h*.145:h*.31,top=isVertical?h*.43:h*.36,gap=w*.055;
      const x1=w*.5-gap*.5-rw,x2=w*.5+gap*.5;
      ctx.strokeStyle='#b46aee';ctx.lineWidth=Math.max(2,w*.002);ctx.shadowBlur=12;ctx.shadowColor='#7b4cae';rounded(ctx,x1,top,rw,rh,8);ctx.stroke();rounded(ctx,x2,top,rw,rh,8);ctx.stroke();ctx.shadowBlur=0;
      ctx.font=`500 ${Math.max(12,w*.022)}px monospace`;ctx.fillStyle='#b4a7da';ctx.fillText(r.outroFooter||'Слушайте трек на площадках',w/2,isVertical?h*.67:h*.78,w*.87);
    }else{
      ctx.font=`500 ${Math.max(15,w*.025)}px monospace`;ctx.fillStyle='#d5bfff';ctx.fillText(r.platformFooter||'Ссылка на площадки в описании',w/2,isVertical?h*.70:h*.78,w*.88);
      const ids=(proj.platforms?.selected||['spotify','youtubeMusic','appleMusic']).slice(0,5),imgs=window.PFPlatformLogos||{},size=Math.min(54,w*.095),gap=size*.38,span=ids.length*size+(ids.length-1)*gap;
      if(proj.platforms?.show!==false)ids.forEach((id,i)=>{const img=imgs[id];if(!img?.complete||!img.naturalWidth)return;const buf=retroIconBuffer(),b=buf.getContext('2d');b.clearRect(0,0,20,20);b.drawImage(img,0,0,20,20);ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(buf,w/2-span/2+i*(size+gap),h*.47,size,size);ctx.restore();});
    }
    ctx.restore();
  }

  function retroMain(ctx,w,h,t,proj,assets,feature,boost,active){
    drawRetroTV(ctx,w,h,t,proj,assets,feature,clamp(boost,0,1.3),'main');
  }
  function bg(ctx,w,h,t,proj,assets,intro,amp){
    if(proj.main.preset==='retro'){retroScene(ctx,w,h,t,proj,clamp(amp||0,0,1.3));return;}
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
    if(proj.main.preset==='retro'){
      const f={bass:.1,mid:.2,high:.15,rms:.1,flux:0};
      drawRetroTV(ctx,w,h,t,proj,assets,f,Math.max(0,f?.bass||0),'intro',tl);return;
    }
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
    const shake=(neon?beat*16.5:beat*23.0)*s.shake*amount;
    const moveX=Math.sin(t*(neon?9:14)+2)*shake;
    const moveY=Math.cos(t*(neon?11:17)+3)*shake;
    const zoom=1+(neon?(feature.bass*.013+beat*.145):(feature.bass*.015+beat*.22))*s.zoom*amount;
    ctx.save();ctx.translate(w/2+moveX,h/2+moveY);ctx.scale(zoom,zoom);ctx.translate(-w/2,-h/2);
    bg(ctx,w,h,t,proj,assets,false,boost);
    if(preset==='retro'){retroMain(ctx,w,h,t,proj,assets,feature,boost,active);ctx.restore();return;}
    let visualizationOpacity=1;
    if(!proj.shorts?.render && preset==='montagem' && proj.montage?.enabled){
      const seq=montage.cutSequence(proj),first=seq.cuts[0];
      const event=first&&(first.transition==='pull_in'||first.effect==='pull_in')&&first.visualizerDip;
      if(event&&seq.length>0){
        const local=t-tl.mainStart,firstAt=seq.start;
        if(local>=firstAt-1&&local<seq.end){
          visualizationOpacity=local<firstAt?1-smooth(firstAt-1,firstAt,local):0;
        }else if(local>=seq.end && local<seq.end+.55){
          visualizationOpacity=smooth(seq.end,seq.end+.55,local);
        }
      }
    }
    ctx.save();ctx.globalAlpha*=visualizationOpacity;
    particleLayer(ctx,w,h,t,proj,feature,assets,analysis,audioTime);
    ctx.restore();
    ctx.globalAlpha=active;
    const size=v?w*.59:w*.27,centerX=w/2;
    let posX=preset==='montagem'?centerX-size/2:v?centerX-size/2:(proj.main.coverPosition==='right'?w*.71-size/2:proj.main.coverPosition==='center'?w*.5-size/2:w*.23-size/2);
    let posY=preset==='montagem'?(v?h*.20:h*.22):(v?h*.19:h*.27);
    const enter=forceVisible?1:smooth(tl.mainStart,tl.mainStart+1.25,t);
    if(proj.main.playerEntrance==='table_drop')posY-= (1-easeOutBack(enter))*(v?230:130);
    else ctx.globalAlpha*=enter;
    ctx.save();if(preset==='montagem')ctx.globalAlpha*=visualizationOpacity;
    cover(ctx,posX,posY,size,proj,assets,feature);ctx.restore();
    if(preset==='montagem'){
      // Poster-sized central cover, on-beat frame, deliberately no title overlay.
      ctx.save();ctx.globalAlpha=active*.75;
      const f=clamp(boost,0,1);
      ctx.strokeStyle=assets.coverAccent||'#ae90ff';ctx.globalAlpha=active*visualizationOpacity*(.27+.53*f);ctx.shadowColor=assets.coverAccent||'#ae90ff';ctx.shadowBlur=24+28*f;ctx.lineWidth=2+5*f;
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
    if(proj.main.preset==='retro'&&!proj.shorts?.render)return drawRetroOutro(ctx,w,h,t,proj,assets,tl,feature);
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
  let pixelIconCanvas=null;function retroIconBuffer(){if(!pixelIconCanvas){pixelIconCanvas=document.createElement('canvas');pixelIconCanvas.width=20;pixelIconCanvas.height=20;}return pixelIconCanvas;}
  function drawPlatformLogos(ctx,w,h,proj,opacity=1){
    if(proj.platforms?.show===false)return;
    const imgs=window.PFPlatformLogos||{};
    const valid=['spotify','youtubeMusic','appleMusic','vkMusic','yandexMusic'];
    const ids=(proj.platforms?.selected||valid.slice(0,3)).filter(id=>valid.includes(id));
    if(!ids.length)return;
    const v=h>w,sz=v?(ids.length>3?39:47):(ids.length>3?37:43),gap=v?(ids.length>3?19:27):(ids.length>3?24:33);
    const total=ids.length*sz+(ids.length-1)*gap,first=w/2-total/2;
    const y=v?h*.935:h*.905;
    ctx.save();ctx.globalAlpha=clamp(opacity,0,1)*.88;
    for(let i=0;i<ids.length;i++){
      const img=imgs[ids[i]];
      if(img?.complete&&img.naturalWidth){
        if(proj.main?.preset==='retro'){
          const b=retroIconBuffer();const bc=b.getContext('2d');bc.clearRect(0,0,20,20);bc.imageSmoothingEnabled=true;bc.drawImage(img,0,0,20,20);
          ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(b,first+i*(sz+gap),y-sz/2,sz,sz);ctx.restore();
        }else ctx.drawImage(img,first+i*(sz+gap),y-sz/2,sz,sz);
      }
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
      for(let i=0;i<3;i++){
        const sample=window.PFAudio.sample(analysis,audioTime-i*.035);
        const weight=3-i;total+=weight;
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
