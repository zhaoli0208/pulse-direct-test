(function(root){
  'use strict';
  const WINDOWS={perfect:.055,great:.11,good:.17};
  function rng(seed){return()=>{seed=(Math.imul(1664525,seed)+1013904223)|0;return(seed>>>0)/4294967296;};}
  function demoChart(song,lanes,difficulty){
    const random=rng(song.seed+lanes*11),beat=60/song.bpm,notes=[],step=difficulty==='expert'?.25:difficulty==='hard'?.5:1;
    let previous=-1;
    for(let i=4;i<song.beats-4;i+=step){
      if(difficulty==='easy'&&i%4===3)continue;
      let lane=Math.floor(random()*lanes);if(lane===previous)lane=(lane+1)%lanes;previous=lane;
      const duration=i%8===0?beat*(difficulty==='hard'?1.5:1):0;
      const t=.75+i*beat;
      // Never place a tap inside a hold in the same lane.
      if(!notes.some(n=>n.l===lane&&n.d&&n.t+n.d>t-.15))notes.push({t,l:lane,d:duration});
      if(difficulty!=='easy'&&i%4===2){const other=(lane+Math.ceil(lanes/2))%lanes;if(!notes.some(n=>n.l===other&&n.d&&n.t+n.d>t-.15))notes.push({t,l:other,d:0});}
    }
    return notes.sort((a,b)=>a.t-b.t||a.l-b.l);
  }
  function audioChart(buffer,lanes,difficulty,seed){
    const data=buffer.getChannelData(0),hop=Math.max(1,Math.floor(buffer.sampleRate*.02)),energies=[];
    for(let i=0;i<data.length;i+=hop){let sum=0;for(let j=i;j<Math.min(i+hop,data.length);j+=8)sum+=data[j]*data[j];energies.push(Math.sqrt(sum/Math.max(1,hop/8)));}
    const spacing={easy:.43,normal:.235,hard:.145,expert:.105}[difficulty],anchors=[];let last=-1;
    for(let i=3;i<energies.length-3;i++){
      const t=Math.round(i*hop/buffer.sampleRate*1000)/1000,local=(energies[i-1]+energies[i-2]+energies[i-3])/3;
      if(t<1.2||t>buffer.duration-.5||t-last<spacing||energies[i]<.004)continue;
      if(energies[i]>=energies[i+1]&&energies[i]>local*1.07){anchors.push({t,energy:energies[i]});last=t;}
    }
    return arrange(anchors,lanes,difficulty,seed,buffer.duration);
  }
  function arrange(anchors,lanes,difficulty,seed,endTime){
    const notes=[],busy=Array(lanes).fill(-1),last=Array(lanes).fill(-1),half=lanes/2,block=difficulty==='easy'?8:12,maxFingers={easy:2,normal:3,hard:4,expert:4}[difficulty],theme=seed===183?0:seed===427?2:seed===789?4:Math.floor(seed/7)%8;
    const motifs=difficulty==='easy'?['alternate','stairs','catch','hold','alternate','chord','catch','hold']:difficulty==='normal'?['stairs','chord','catch','hold','repeat','mixed','catch','mirror']:['repeat','chord','catch','mixed','stairs','mirror','hold','mixed'];
    let catchIndex=0,catchStyle='fixed';
    function add(t,preferred,type,d=0,pattern='',chain=null){
      const occupied=busy.filter(until=>until>t).length+notes.filter(n=>Math.abs(n.t-t)<.002).length;if(occupied>=maxFingers)return;
      let lane=-1;for(let step=0;step<(type==='drag'?1:lanes);step++){const candidate=(preferred+step)%lanes;if(busy[candidate]<=t-.12&&t-last[candidate]>=.115){lane=candidate;break;}}if(lane<0)return;
      d=type==='hold'?Math.min(d,endTime-t-.3):0;if(type==='hold'&&d<.55){type='tap';d=0;}const n={t,l:lane,d,type,pattern};if(type==='drag')n.chain=chain;notes.push(n);last[lane]=t;if(d)busy[lane]=t+d;return n;
    }
    for(let i=0;i<anchors.length;i++){
      const t=anchors[i].t,section=Math.floor(i/block),j=i%block,pattern=section===0?'alternate':section===1?'catch':section===2?'hold':motifs[(section-3+theme)%motifs.length],pair=Math.floor(j/2)%half,alternating=j%2?lanes-1-pair:pair,base=(section+theme)%lanes;
      let lane=alternating,type='tap',d=0;
      if(pattern==='catch'&&j===0)catchStyle=catchIndex++%2?'moving':'fixed';
      if(pattern==='stairs'){lane=(base+j)%lanes;}
      else if(pattern==='catch'){const local=base%half,step=(local+Math.floor(j/2))%(2*(half-1));lane=catchStyle==='fixed'?base:Math.floor(base/half)*half+(step<half?step:2*(half-1)-step);type='drag';}
      else if(pattern==='hold'){if(j===0||j===Math.floor(block/2)){lane=(base+(j?half:0))%lanes;type='hold';d=Math.min(difficulty==='easy'?1.7:2.2,(anchors[Math.min(i+3,anchors.length-1)]?.t||t+1)-t-.1);}else{lane=(base+half+j%half)%lanes;}}
      else if(pattern==='repeat'){lane=(base+(Math.floor(j/2)%2?half:0))%lanes;}
      else if(pattern==='mirror'){lane=j%2?half-1-(Math.floor(j/2)%half):half+(Math.floor(j/2)%half);}
      else if(pattern==='mixed'){lane=(base+j)%lanes;if(j%6===0){type='hold';d=Math.min(1.6,(anchors[Math.min(i+4,anchors.length-1)]?.t||t+1)-t-.12);}}
      const n=add(t,lane,type,d,pattern,section);if(n&&type==='drag')n.chainStyle=catchStyle;
      if(n&&((pattern==='chord'&&j%(difficulty==='easy'?4:2)===0)||(difficulty==='hard'&&pattern==='repeat'&&j%4===3))){add(t,(n.l+half)%lanes,'tap',0,pattern);if(difficulty==='hard'&&lanes===6&&j%6===0)add(t,(n.l+2)%lanes,'tap',0,pattern);}
    }
    notes.sort((a,b)=>a.t-b.t||a.l-b.l);
    let slideIndex=0,lastSlide=-10;
    for(let i=0;i<notes.length-1;i++){const a=notes[i],b=notes[i+1];if(a.type==='tap'&&b.type==='tap'&&a.pattern===b.pattern&&a.l!==b.l&&b.t-a.t>=.3&&b.t-a.t<=1.6&&a.t-lastSlide>8&&!notes.some(n=>n!==a&&n!==b&&(Math.abs(n.t-a.t)<.002||Math.abs(n.t-b.t)<.002))){const direction=b.l>a.l?1:-1,destination=[a.l+direction,a.l-direction].find(l=>l>=0&&l<lanes&&!notes.some(n=>n!==b&&n.l===l&&(Math.abs(n.t-b.t)<.115||n.d&&n.t-.12<=b.t&&n.t+n.d+.12>=b.t)));if(destination===undefined)continue;b.l=destination;a.type=b.type='slide';a.chain=b.chain='import-slide-'+slideIndex++;a.step=0;b.step=1;lastSlide=b.t;i++;}}
    return notes;
  }
  // A fresh chart, including fresh note objects. Never mutates the full chart.
  function practiceChart(chart,fromSeconds){
    const from=Number.isFinite(fromSeconds)?Math.max(0,fromSeconds):0;
    const skippedSlides=new Set(chart.filter(n=>n.type==='slide'&&n.t<from).map(n=>n.chain));
    return chart.filter(n=>n.t>=from&&!(n.type==='slide'&&skippedSlides.has(n.chain))).map(n=>({...n}));
  }
  class Judge{
    constructor(chart,onJudge){
      this.notes=chart.map(n=>({...n,type:n.type||(n.d?'hold':'tap'),head:null,tail:n.d?null:'none',held:false,releasedAt:null}));this.total=this.notes.reduce((s,n)=>s+1+(n.d?1:0),0);this.counts={perfect:0,great:0,good:0,miss:0};this.combo=0;this.maxCombo=0;this.earned=0;this.done=0;this.last=null;this.onJudge=onJudge;this.downLanes=new Set();this.slidePrevious=new Map();this.links=[];
      const groups=new Map();for(const n of this.notes)if(n.chain!==undefined&&(n.type==='drag'||n.type==='slide')){const id=n.type+':'+n.chain;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(n);}
      for(const group of groups.values()){group.sort((a,b)=>a.t-b.t);for(let i=1;i<group.length;i++){this.links.push({a:group[i-1],b:group[i],type:group[i].type});if(group[i].type==='slide')this.slidePrevious.set(group[i],group[i-1]);}}
    }
    award(kind,time,n,phase='head',delta=0){this.counts[kind]++;this.done++;this.earned+=({perfect:1,great:.75,good:.4,miss:0})[kind];this.combo=kind==='miss'?0:this.combo+1;this.maxCombo=Math.max(this.combo,this.maxCombo);this.last={kind,time,lane:n?.l,type:n?.type,step:n?.step,chain:n?.chain,phase,delta};this.onJudge?.(this.last);return kind;}
    press(lane,now){
      const readyDrag=this.notes.find(n=>n.l===lane&&n.type==='drag'&&n.head===null&&now>=n.t&&now<=n.t+WINDOWS.good);this.downLanes.add(lane);const caught=this.update(now);if(readyDrag?.head==='perfect')return readyDrag;
      const hold=this.notes.find(n=>n.l===lane&&n.head!==null&&n.head!=='miss'&&n.d&&n.tail===null&&!n.held&&now<=n.t+n.d+.12);if(hold){hold.held=true;hold.releasedAt=null;return hold;}
      let n=null;for(const candidate of this.notes){const previous=this.slidePrevious.get(candidate);if(previous&&(previous.head===null||previous.head==='miss'))continue;if(candidate.type!=='drag'&&candidate.l===lane&&candidate.head===null&&Math.abs(candidate.t-now)<=WINDOWS.good&&(!n||Math.abs(candidate.t-now)<Math.abs(n.t-now)))n=candidate;}
      if(!n)return caught?.l===lane?caught:null;const delta=now-n.t,absolute=Math.abs(delta),kind=absolute<=WINDOWS.perfect?'perfect':absolute<=WINDOWS.great?'great':'good';n.head=kind;n.held=!!n.d;this.award(kind,now,n,'head',delta);return n;
    }
    release(lane,now){this.update(now);this.downLanes.delete(lane);for(const n of this.notes){if(n.l===lane&&n.held&&n.tail===null){n.held=false;if(now>=n.t+n.d-.12){n.tail='perfect';this.award(n.tail,now,n,'tail');}else n.releasedAt=now;}}}
    pause(){this.downLanes.clear();for(const n of this.notes)if(n.held){n.held=false;n.releasedAt=null;}}
    update(now){let caught=null;for(const n of this.notes){if(n.head===null&&n.type==='drag'&&this.downLanes.has(n.l)&&now>=n.t&&now<=n.t+WINDOWS.good){n.head='perfect';this.award('perfect',now,n,'head',0);caught=n;}else if(n.head===null&&now>n.t+WINDOWS.good){n.head='miss';this.award('miss',now,n);if(n.d){n.tail='miss';this.award('miss',now,n,'tail');}}else if(n.held&&n.tail===null&&now>=n.t+n.d){n.tail='perfect';n.held=false;this.award('perfect',now,n,'tail');}else if(n.head!==null&&n.d&&n.tail===null&&!n.held&&((n.releasedAt!==null&&now>n.releasedAt+.075)||now>n.t+n.d+.17)){n.tail='miss';this.award('miss',now,n,'tail');}}return caught;}
    get accuracy(){return this.done?this.earned/this.done*100:100;}
    get score(){return this.total?Math.round(this.earned/this.total*1000000):0;}
  }
  const api={Judge,practiceChart,demoChart,audioChart,arrange,rng,WINDOWS};if(typeof module!=='undefined')module.exports=api;else root.PulseEngine=api;
})(typeof window!=='undefined'?window:globalThis);


