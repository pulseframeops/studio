(function() {
  const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
  function fftMagnitude(input) {
    const n = input.length, real = new Float32Array(n), imag = new Float32Array(n);
    for (let i=0,j=0;i<n;i++) {
      if (i<j) { const tmp=real[i];real[i]=real[j];real[j]=tmp; }
      let m=n>>1; while(m && j>=m) { j-=m; m>>=1; } j+=m;
    }
    // Input is assigned in bit-reversed order for decimation-in-time FFT.
    for(let i=0,j=0;i<n;i++) { real[j]=input[i]; let m=n>>1; while(m && j>=m) {j-=m;m>>=1;} j+=m; }
    for(let size=2;size<=n;size*=2){const half=size/2, step=-2*Math.PI/size;
      for(let start=0;start<n;start+=size) for(let j=0;j<half;j++){
        const wr=Math.cos(step*j),wi=Math.sin(step*j),a=start+j,b=a+half;
        const vr=real[b]*wr-imag[b]*wi,vi=real[b]*wi+imag[b]*wr;
        real[b]=real[a]-vr;imag[b]=imag[a]-vi;real[a]+=vr;imag[a]+=vi;
      }
    }
    const out=new Float32Array(n/2);
    for(let i=0;i<out.length;i++)out[i]=Math.hypot(real[i],imag[i]);
    return out;
  }
  async function analyze(fileOrBlob, onProgress) {
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    try {
      const array=await fileOrBlob.arrayBuffer();
      const buf=await ctx.decodeAudioData(array);
      const sampleRate=buf.sampleRate, data=buf.getChannelData(0), n=1024, hopSec=.055;
      const total=Math.ceil(buf.duration/hopSec), frames=[];
      let prev=null, maxEnergy=.00001, maxFlux=.00001;
      for(let f=0;f<total;f++) {
        const offset=Math.floor(f*hopSec*sampleRate), segment=new Float32Array(n);
        let energy=0;
        for(let i=0;i<n;i++) {
          const s=data[Math.min(data.length-1, offset+i)]||0;
          energy+=s*s;
          segment[i]=s*(.5-.5*Math.cos(2*Math.PI*i/(n-1)));
        }
        const spec=fftMagnitude(segment);
        let bass=0,mid=0,high=0,flux=0;
        const freqPerBin=sampleRate/n;
        for(let i=1;i<spec.length;i++){
          const hz=i*freqPerBin,v=spec[i];
          if(hz<220)bass+=v;else if(hz<2200)mid+=v;else if(hz<12000)high+=v;
          if(prev)flux+=Math.max(0,v-prev[i]);
        }
        const rms=Math.sqrt(energy/n);
        frames.push({rms,bass,mid,high,flux});
        maxEnergy=Math.max(maxEnergy,rms);maxFlux=Math.max(maxFlux,flux);prev=spec;
        if(f%360===0){onProgress?.(f/total);await new Promise(r=>setTimeout(r,0));}
      }
      const maxs={bass:.00001,mid:.00001,high:.00001};
      for(const frame of frames)for(const key of Object.keys(maxs))maxs[key]=Math.max(maxs[key],frame[key]);
      // Rolling smoothing keeps the graphics responsive but avoids harsh single-sample jumps.
      const normalized=frames.map(f=>({
        rms:clamp(f.rms/maxEnergy,0,1),bass:clamp(f.bass/maxs.bass*1.35,0,1),
        mid:clamp(f.mid/maxs.mid*1.3,0,1),high:clamp(f.high/maxs.high*1.3,0,1),
        flux:clamp(f.flux/maxFlux*1.5,0,1)
      }));
      const markers=[];let last=-99;
      for(let i=2;i<normalized.length-2;i++){
        const q=normalized[i];
        if(q.flux>.4 && q.flux>=normalized[i-1].flux && q.flux>=normalized[i+1].flux && i*hopSec-last>.22){
          markers.push({t:Number((i*hopSec).toFixed(2)),strength:clamp(q.flux,.2,1)});last=i*hopSec;
        }
      }
      onProgress?.(1);
      return {duration:buf.duration,hopSec,frames:normalized,markers,sampleRate,channels:buf.numberOfChannels};
    } finally { await ctx.close(); }
  }
  function sample(analysis,time){
    if(!analysis||!analysis.frames.length || time<0)return {rms:0,bass:0,mid:0,high:0,flux:0};
    const idx=clamp(time/analysis.hopSec,0,analysis.frames.length-1),a=Math.floor(idx),b=Math.min(a+1,analysis.frames.length-1),t=idx-a;
    const out={};for(const k of ['rms','bass','mid','high','flux'])out[k]=analysis.frames[a][k]*(1-t)+analysis.frames[b][k]*t;
    return out;
  }
  window.PFAudio={analyze,sample};
})();
