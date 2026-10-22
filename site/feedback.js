// Original, pre-rendered sound banks. Each style has a dry attack and a short release.
(function(root){
 const packs=[{id:'crisp',name:'清脆敲击',description:'利落的短拍声，起音清楚、收尾干净。'},{id:'wood',name:'柔和木击',description:'温暖的木质轻敲，降低高频刺激。'},{id:'drum',name:'厚实鼓点',description:'低中频的轻鼓声，触感更扎实。'},{id:'glass',name:'玻璃轻响',description:'明亮的玻璃叮声，带一点短余韵。'},{id:'switch',name:'机械触键',description:'紧凑的咔嗒声，像按下清晰的机械开关。'}];
 class HitAudio{
  constructor(context){this.context=context;this.output=context.createGain();this.output.gain.value=.8;this.banks={};this.voices=new Set();for(const pack of packs){this.banks[pack.id]={};for(const type of ['tap','drag','slide','tail','empty'])this.banks[pack.id][type]=this.make(type,pack.id);}this.setPack('crisp');}
  make(type,pack){const sr=this.context.sampleRate,duration=type==='empty'?.025:type==='drag'?.045:type==='slide'?.065:pack==='glass'?.105:.072,buffer=this.context.createBuffer(1,Math.ceil(sr*duration),sr),data=buffer.getChannelData(0);let seed=441+packs.findIndex(p=>p.id===pack)*121,noiseLow=0,low=0,previous=0,high=0,peak=0,sum=0;const cutoff=pack==='wood'?2400:pack==='drum'?2100:pack==='glass'?4800:3500,filter=1-Math.exp(-2*Math.PI*cutoff/sr),frequencyScale=type==='tail'?1.12:type==='drag'?1.2:type==='slide'?1.4:1;
   for(let i=0;i<data.length;i++){const t=i/sr*frequencyScale;seed=(Math.imul(seed,1664525)+1013904223)|0;const noise=(seed>>>0)/2147483648-1;noiseLow+=.16*(noise-noiseLow);let raw;
    if(pack==='crisp')raw=(noise-noiseLow)*.82*Math.exp(-t*145)+noiseLow*1.8*Math.exp(-t*85)+(Math.sin(2*Math.PI*480*t)*.3+Math.sin(2*Math.PI*1030*t)*.13)*Math.exp(-t*125);
    else if(pack==='wood')raw=(Math.sin(2*Math.PI*470*t)*.65+Math.sin(2*Math.PI*790*t)*.25+Math.sin(2*Math.PI*1190*t)*.08)*Math.exp(-t*85)+noise*.16*Math.exp(-t*210);
    else if(pack==='drum')raw=Math.sin(2*Math.PI*178*t)*.85*Math.exp(-t*65)+Math.sin(2*Math.PI*320*t)*.24*Math.exp(-t*100)+noiseLow*.75*Math.exp(-t*110);
    else if(pack==='glass')raw=(Math.sin(2*Math.PI*1490*t)*.55*Math.exp(-t*58)+Math.sin(2*Math.PI*2340*t)*.19*Math.exp(-t*82)+Math.sin(2*Math.PI*3210*t)*.07*Math.exp(-t*110))+noise*.09*Math.exp(-t*230);
    else raw=noise*.65*Math.exp(-t*220)+noiseLow*1.1*Math.exp(-t*135)+Math.sin(2*Math.PI*740*t)*.3*Math.exp(-t*165)+(t>.007?Math.sin(2*Math.PI*1100*(t-.007))*.17*Math.exp(-(t-.007)*200):0);
    const attack=Math.min(1,i/(sr*.0003)),end=Math.min(1,(data.length-i-1)/(sr*.004));raw*=attack*end;high=raw-previous+Math.exp(-2*Math.PI*65/sr)*high;previous=raw;low+=filter*(high-low);data[i]=low;peak=Math.max(peak,Math.abs(low));sum+=low*low;
   }
   const rms=Math.sqrt(sum/data.length),scale=Math.min(.62/Math.max(peak,.001),.13/Math.max(rms,.001))*(type==='tail'?.72:type==='drag'?.6:type==='empty'?.38:1);for(let i=0;i<data.length;i++)data[i]*=scale;return buffer;
  }
  setPack(id){this.pack=this.banks[id]?id:'crisp';this.buffers=this.banks[this.pack];}
  setVolume(value){this.output.gain.setTargetAtTime(value,this.context.currentTime,.008);}
  play(type='tap',level=1,when=this.context.currentTime){if(this.output.gain.value===0||this.context.state!=='running')return;const node=this.context.createBufferSource(),gain=this.context.createGain();node.buffer=this.buffers[type]||this.buffers.tap;gain.gain.value=level;node.connect(gain);gain.connect(this.output);this.voices.add(node);node.onended=()=>{this.voices.delete(node);node.disconnect();gain.disconnect();};node.start(Math.max(when,this.context.currentTime));}
  preview(){this.stop();const now=this.context.currentTime+.015;['tap','drag','tap','tail'].forEach((type,i)=>this.play(type,i===2?.8:1,now+i*.18));}
  stop(){for(const node of this.voices){try{node.stop();}catch{}}this.voices.clear();}
 }
 HitAudio.packs=packs;
 root.PulseHitAudio=HitAudio;
})(window);
