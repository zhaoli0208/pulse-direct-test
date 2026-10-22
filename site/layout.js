/* Screen direction is independent of key mode, charts and scoring. */
window.PulseLayout=(()=>{
 'use strict';
 const game=document.getElementById('game'),root=document.documentElement;
 const touchDevice=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
 let preference='auto',turn=0,wide=false,lastAxis=innerWidth>innerHeight,ownedLock=false;
 try{const saved=localStorage.getItem('pulse.layout.v1');if(['auto','portrait','landscape'].includes(saved))preference=saved;}catch{}
 function apply(){
  const physicalWide=innerWidth>innerHeight,visible=!game.classList.contains('hidden');
  wide=preference==='auto'?physicalWide:preference==='landscape';
  turn=wide===physicalWide?0:wide?90:-90;
  const width=turn?innerHeight:innerWidth,height=turn?innerWidth:innerHeight;
  root.style.setProperty('--play-width',width+'px');root.style.setProperty('--play-height',height+'px');root.style.setProperty('--play-turn',turn+'deg');
  game.classList.toggle('touch-layout',touchDevice);game.classList.toggle('wide-play',touchDevice&&wide);game.classList.toggle('virtual-turn',turn!==0);
  document.querySelectorAll('dialog').forEach(dialog=>dialog.classList.toggle('play-dialog-rotated',visible&&turn!==0));
  document.querySelectorAll('[data-orientation]').forEach(button=>{const chosen=button.dataset.orientation===preference;button.classList.toggle('chosen',chosen);button.setAttribute('aria-pressed',String(chosen));});
  const button=document.getElementById('gameOrientation');button.textContent=wide?'切换竖屏':'切换横屏';button.setAttribute('aria-label',button.textContent+'，切换会暂停演奏');
  document.querySelectorAll('[data-fullscreen]').forEach(button=>button.textContent=document.fullscreenElement?'退出全屏 ↙':'全屏游玩 ↗');
  if(visible&&playing){resizeCanvas();draw(seekPreview?.target??(isCountdown()?activeSession.playbackBase:currentTime()));}
 }
 async function nativeLock(){
  if(preference==='auto'){if(ownedLock){try{screen.orientation.unlock();}catch{}ownedLock=false;}return;}
  if(!document.fullscreenElement||!screen.orientation?.lock)return;
  try{await screen.orientation.lock(preference);ownedLock=true;}catch{/* CSS rotation remains available. */}
 }
 function set(value){
  if(!['auto','portrait','landscape'].includes(value))return;
  if(playing&&!paused&&value!==preference)pauseGame();
  preference=value;try{localStorage.setItem('pulse.layout.v1',value);}catch{}
  apply();nativeLock();
 }
 async function fullscreen(){
  if(playing&&!paused)pauseGame();
  try{if(document.fullscreenElement)await document.exitFullscreen();else if(root.requestFullscreen)await root.requestFullscreen();else throw new Error('unsupported');await nativeLock();}
  catch{toast('此浏览器暂不支持全屏；横竖屏和整列触控仍可使用。');}
  apply();
 }
 function resized(){const axis=innerWidth>innerHeight;if(axis!==lastAxis&&playing&&!paused)pauseGame();lastAxis=axis;apply();}
 document.querySelectorAll('[data-orientation]').forEach(button=>button.addEventListener('click',()=>set(button.dataset.orientation)));
 document.querySelectorAll('[data-fullscreen]').forEach(button=>button.addEventListener('click',fullscreen));
 document.getElementById('gameOrientation').addEventListener('click',()=>set(wide?'portrait':'landscape'));
 window.addEventListener('resize',resized);document.addEventListener('fullscreenchange',resized);
 apply();return{apply,set,get turn(){return turn;},get preference(){return preference;},get wide(){return wide;}};
})();
