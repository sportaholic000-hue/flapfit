'use strict';
(function(){
const DATA={"exercises":[{"id":"pushups","name":"Push-ups","part":"Wings","tag":"Bodyweight","copy":"Put your wings to work.","setup":"Phone on the floor, 1–1.5 m in front. Keep your full body visible.","detail":"Tracked push-up time develops your bird’s wings."},{"id":"squats","name":"Squats","part":"Legs","tag":"Bodyweight","copy":"Build your bird from the ground up.","setup":"Place your phone securely at knee height, 1.5–2 m in front.","detail":"Tracked squat time develops your bird’s legs."},{"id":"pullups","name":"Pull-ups","part":"Arms","tag":"Pull-up bar","copy":"Raise the bar. Raise your bird.","setup":"Use a stable stand facing the bar, with your full range in view.","detail":"Tracked pull-up time develops your bird’s arms."},{"id":"biceps","name":"Bicep curls","part":"Arms","tag":"Weights","copy":"Give those little wings some muscle.","setup":"Phone at waist height, 1–1.5 m in front. Keep both wrists visible.","detail":"Tracked curl time develops your bird’s arms."},{"id":"lateral-raise","name":"Lateral raises","part":"Wings + shoulders","tag":"Weights","copy":"A little more wingspan. A lot more character.","setup":"Phone at chest height, about 2 m in front. Keep both wrists visible.","detail":"Tracked lateral-raise time develops your bird’s wings and shoulders."},{"id":"shoulder-press","name":"Shoulder press","part":"Shoulders","tag":"Weights","copy":"Take your next level overhead.","setup":"Phone at chest height, 1.5–2 m in front. Keep your hands visible overhead.","detail":"Tracked shoulder-press time develops your bird’s shoulders."}],"stages":["Hatchling","First Flap","Rookie","Trainee","Conditioned","Athlete","Strong","Powerhouse","Elite","Legend"],"times":["Start","2 min","10 min","30 min","1 hour","2 hours","4 hours","8 hours","15 hours","30 hours"]};
const config=window.FLAP_FIT_CONFIG||{};
const byId=id=>document.getElementById(id);
const text=(id,value)=>{const node=byId(id);if(node)node.textContent=value;};
for(const button of document.querySelectorAll('[data-exercise]')){
 button.addEventListener('click',()=>{
  const exercise=DATA.exercises.find(x=>x.id===button.dataset.exercise);
  for(const item of document.querySelectorAll('[data-exercise]')){const active=item===button;item.classList.toggle('selected',active);item.setAttribute('aria-pressed',String(active));}
  text('exercise-part',(exercise.name+' / '+exercise.part).toUpperCase());
  text('exercise-headline',exercise.copy);text('exercise-description',exercise.detail);text('exercise-setup',exercise.setup);
 });
}
const stageDescriptions=[
 'Every flight starts somewhere. Meet Sunny at the beginning of the journey.',
 'The first visible step. Your tracked training time is starting to show.',
 'A bigger build and a little more attitude. Keep your training story going.',
 'More definition, more character. Sunny’s transformation is taking shape.',
 'The next milestone in your bird’s build, earned through cumulative training time.',
 'A more muscular Sunny, shaped further by the exercises you choose.',
 'A stronger silhouette as your tracked training time adds up.',
 'More muscle and definition. Sunny is getting hard to miss.',
 'The stage before the final transformation. Your next milestone is Legend.',
 'The final form. Bigger build, gold details, unmistakable presence. Your training story, written in feathers.'
];
const evolutionCopy=document.querySelector('.evolution-copy');if(evolutionCopy)evolutionCopy.setAttribute('aria-live','polite');
for(const button of document.querySelectorAll('[data-stage]')){
 button.addEventListener('click',()=>{
  const i=Number(button.dataset.stage);
  for(const item of document.querySelectorAll('[data-stage]')){const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));}
  text('stage-number','STAGE '+String(i+1).padStart(2,'0')+' / 10');
  text('stage-name',DATA.stages[i]);text('stage-copy',stageDescriptions[i]);text('stage-time',i===0?'0 minutes':DATA.times[i]);text('stage-watermark',String(i+1).padStart(2,'0'));
  const art=byId('stage-image');art.src='/assets/sunny-'+(i+1)+'.png';art.alt='Sunny at stage '+(i+1)+', '+DATA.stages[i]+(i===9?', with a larger muscular build and gold champion details':'');
 });
}
const validEmail=value=>typeof value==='string'&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.trim());
for(const node of document.querySelectorAll('[data-config]')){const value=config[node.dataset.config];if(typeof value==='string'&&value.trim())node.textContent=value;}
if(validEmail(config.supportEmail)){
 text('support-status','Contact Flap Fit at '+config.supportEmail+'.');
 const container=byId('support-action');
 if(container){const link=document.createElement('a');link.className='button primary';link.href='mailto:'+config.supportEmail+'?subject='+encodeURIComponent('Flap Fit support');link.textContent='Email Flap Fit support ↗';container.append(link);}
}
if(validEmail(config.privacyEmail)){text('privacy-contact','For privacy questions or data requests, contact '+config.privacyEmail+'.');}
const officialStore=(value,host)=>{try{const url=new URL(value);return url.protocol==='https:'&&url.hostname===host?url.href:null;}catch{return null;}};
const storeLinks=byId('store-links');
if(storeLinks&&config.releaseStatus==='available'){
 const links=[['App Store',officialStore(config.appStoreUrl,'apps.apple.com')],['Google Play',officialStore(config.googlePlayUrl,'play.google.com')]].filter(([,url])=>url);
 for(const [name,url] of links){const link=document.createElement('a');link.className='button primary';link.href=url;link.textContent='Get Flap Fit on '+name;storeLinks.append(link);}
 if(links.length)text('launch-copy','Flap Fit is available on '+links.map(([name])=>name).join(' and ')+'. Choose an official store to download the game.');
}
const copyButton=byId('copy-report');
if(copyButton)copyButton.addEventListener('click',async()=>{
 const report=byId('report-template');
 try{await navigator.clipboard.writeText(report.value);text('copy-status','Template copied. Add your details before sending it to support.');}
 catch{report.hidden=false;report.focus();report.select();text('copy-status','Select and copy the template below. No report has been sent.');}
});
const canvas=byId('flight');
if(!canvas)return;
const ctx=canvas.getContext('2d');if(!ctx)return;
const W=720,H=430;
const CONFIG={sky1:'#4EC0EA',sky2:'#A8E6FF',pipe:'#43A047'};
const clouds=[{x:.18,y:.12,s:.8},{x:.65,y:.20,s:1.1},{x:.92,y:.08,s:.65}];
const pipes=[{x:430,w:65,gapC:215,gapH:185},{x:720,w:65,gapC:230,gapH:185}];
function drawBackground() {
  var grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, CONFIG.sky1);
  grad.addColorStop(1, CONFIG.sky2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (var i = 0; i < clouds.length; i++) {
    var c = clouds[i];
    var cx = c.x * W, cy = c.y * H, cs = c.s * 26;
    ctx.beginPath();
    ctx.arc(cx, cy, cs, 0, Math.PI * 2);
    ctx.arc(cx + cs * 0.9, cy + cs * 0.25, cs * 0.75, 0, Math.PI * 2);
    ctx.arc(cx - cs * 0.9, cy + cs * 0.3, cs * 0.65, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(0, H - 14, W, 14);
}

function drawPipes() {
  var capH = 16;
  for (var i = 0; i < pipes.length; i++) {
    var p = pipes[i];
    var topEnd = p.gapC - p.gapH / 2;
    var botStart = p.gapC + p.gapH / 2;
    ctx.fillStyle = CONFIG.pipe;
    ctx.fillRect(p.x, 0, p.w, topEnd);
    ctx.fillRect(p.x, botStart, p.w, H - botStart);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(p.x - 4, topEnd - capH, p.w + 8, capH);
    ctx.fillRect(p.x - 4, botStart, p.w + 8, capH);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(p.x + 6, 0, 8, Math.max(0, topEnd - capH));
    ctx.fillRect(p.x + 6, botStart + capH, 8, Math.max(0, H - botStart - capH));
  }
}


const sprite=new Image();sprite.src='/assets/sunny-6.png';
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches,visible=false,frame=0,lastTime=null,elapsed=0,ready=false;
const motionButton=byId('motion-toggle');
function label(){motionButton.textContent=paused?'Play motion':'Pause motion';motionButton.setAttribute('aria-pressed',String(paused));}
function draw(){
 drawBackground();drawPipes();
 if(ready){const y=H*.5+Math.sin(elapsed*.0016)*34;ctx.save();ctx.translate(215,y);ctx.rotate(Math.sin(elapsed*.0016)*.06);ctx.drawImage(sprite,-70,-70,140,140);ctx.restore();}
}
function loop(now){
 if(paused||!visible||document.hidden){frame=0;lastTime=null;return;}
 const dt=lastTime===null?0:Math.min(now-lastTime,50);lastTime=now;elapsed+=dt;
 pipes.forEach(p=>{p.x-=dt*.045;if(p.x< -90)p.x+=580;});
 draw();frame=requestAnimationFrame(loop);
}
function schedule(){if(!frame&&!paused&&visible&&!document.hidden)frame=requestAnimationFrame(loop);}
function stop(){if(frame)cancelAnimationFrame(frame);frame=0;lastTime=null;}
sprite.addEventListener('load',()=>{ready=true;draw();schedule();});
sprite.addEventListener('error',()=>{text('copy-status','');});
motionButton.addEventListener('click',()=>{paused=!paused;label();if(paused)stop();else schedule();});
reduced.addEventListener('change',event=>{paused=event.matches;label();if(paused)stop();else schedule();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else schedule();});
if('IntersectionObserver' in window){new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else stop();},{threshold:.01}).observe(canvas);}else{visible=true;}
label();draw();
})();
