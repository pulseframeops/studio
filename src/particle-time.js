(function(root,factory){
 const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;
 root.PFParticleTime=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 const cache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function compile(auto,manual,duration){
   const filtered=[...(auto||[]).filter(m=>Number(m.strength??1)>=.53).map(m=>Number(m.t)),
     ...(manual||[]).map(m=>Number(m.t))].filter(Number.isFinite).sort((a,b)=>a-b);
   const clean=[];for(const t of filtered)if(!clean.length||t-clean[clean.length-1]>duration*1.05)clean.push(t);
   return clean;
 }
 function phase(t,events,duration){
   let a=0,b=events.length;while(a<b){const mid=(a+b)>>1;if(events[mid]<t)a=mid+1;else b=mid;}
   const previous=a-1;
   const completed=previous>=0?Math.max(0,previous):0;
   let correction=completed*duration*.5;
   if(previous>=0){const age=t-events[previous];const u=clamp(age/duration,0,1);
      correction+=duration*(u*.5-Math.sin(Math.PI*2*u)/(Math.PI*4));}
   return t-correction;
 }
 function motionTime(t,analysis,manual,holdMs=300){
   if(!Number.isFinite(t))return 0;
   const duration=clamp(Number(holdMs)||300,100,500)/1000;
   const auto=analysis?.markers||[];
   const sig=(manual||[]).map(x=>`${Number(x.t)}:${Number(x.strength)}`).join('|')+'#'+duration;
   let cached=analysis&&cache.get(analysis);
   if(!cached||cached.auto!==auto||cached.sig!==sig){
     cached={auto,sig,events:compile(auto,manual,duration)};
     if(analysis)cache.set(analysis,cached);
   }
   return phase(t,cached.events,duration);
 }
 return {compile,phase,motionTime};
});
