(function(root){
 'use strict';
 function palette(data,t){let value=0;for(const [a,b] of data?.sections||[]){if(t>=a&&t<=b+1.2)value=Math.max(value,Math.min(1,(t-a)/1.2,(b+1.2-t)/1.2));}return Math.max(0,value);}
 function color(a,b,mix){return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-mix)+parseInt(b.slice(i,i+2),16)*mix).toString(16).padStart(2,'0')).join('');}
 // Replacement recordings keep the base palette, without original song cues.
 function fromBuffer(){return {sections:[],method:'local-base'};}
 const api={palette,color,fromBuffer};if(typeof module!=='undefined')module.exports=api;else root.PulseStage=api;
})(typeof window!=='undefined'?window:globalThis);
