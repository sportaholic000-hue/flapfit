const fs=require('node:fs');const path=require('node:path');const {createRequire}=require('node:module');
const repo=path.resolve(__dirname,'../../../..');const req=createRequire(path.join(repo,'package.json'));const {PNG}=req('pngjs');
const generated=path.join(__dirname,'.generated');fs.mkdirSync(generated,{recursive:true});
const specs=[
{name:'pressTop',file:'shoulder-press-dumbbells',weights:[[348,163,466,215],[510,163,628,215]],roi:[330,158,310,810],cx:480,baseline:955,scale:246/671},
{name:'pressBottom',file:'shoulder-press-dumbbells',weights:[[896,355,1019,412],[1118,355,1242,412]],roi:[888,270,360,700],cx:1066,baseline:955,scale:246/671},
{name:'lateralTop',file:'lateral-raise-dumbbells',weights:[[127,293,188,364],[792,293,854,364]],roi:[125,175,735,780],cx:495,baseline:939,scale:246/750},
{name:'lateralBottom',file:'lateral-raise-dumbbells',weights:[[967,553,1029,623],[1188,553,1249,623]],roi:[960,175,300,780],cx:1109,baseline:939,scale:246/750},
{name:'curlTop',file:'bicepcurl-dumbbells',weights:[[337,273,473,341],[554,273,690,341]],roi:[335,160,355,810],cx:514,baseline:949,scale:246/778},
{name:'curlBottom',file:'bicepcurl-dumbbells',weights:[[868,557,997,621],[1124,557,1253,621]],roi:[862,160,400,810],cx:1062,baseline:949,scale:246/778},
{name:'squatTop',file:'squat',roi:[335,178,285,770],cx:477,baseline:933,scale:246/746},
{name:'squatBottom',file:'squat',roi:[920,330,320,620],cx:1080,baseline:933,scale:246/746},
{name:'pullupTop',file:'pullup',roi:[285,148,465,738],cx:518,baseline:198,scale:.31,pull:true},
{name:'pullupBottom',file:'pullup',roi:[830,174,465,805],cx:1056,baseline:198,scale:.31,pull:true},
{name:'pushupTop',file:'pushup',roi:[190,235,595,539],cx:487,baseline:769,scale:.32,push:true},
{name:'pushupBottom',file:'pushup',roi:[995,425,655,349],cx:1323,baseline:769,scale:.32,push:true},
];
function dist(p,a,b){let dx=b[0]-a[0],dy=b[1]-a[1];let t=dx||dy?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy))):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)}
function simplify(p,e){if(p.length<=2)return p;let best=e,at=-1;for(let i=1;i<p.length-1;i++){const d=dist(p[i],p[0],p[p.length-1]);if(d>best){best=d;at=i}}return at<0?[p[0],p[p.length-1]]:simplify(p.slice(0,at+1),e).slice(0,-1).concat(simplify(p.slice(at),e))}
function smoothClosed(points){const f=n=>Number(n.toFixed(2));const mid=(a,b)=>[f((a[0]+b[0])/2),f((a[1]+b[1])/2)];let p=points;let out='M'+mid(p[p.length-1],p[0]).join(' ');for(let i=0;i<p.length;i++)out+=' Q'+p[i].map(f).join(' ')+' '+mid(p[i],p[(i+1)%p.length]).join(' ');return out+' Z'}
function trace(spec){const png=PNG.sync.read(fs.readFileSync(path.join(__dirname,'references',spec.file+'.png')));const [ox,oy,w,h]=spec.roi;const mask=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=((oy+y)*png.width+ox+x)*4;const r=png.data[k],g=png.data[k+1],b=png.data[k+2];mask[y*w+x]=(g>100&&(b>120||r>175))?1:0;if(spec.push&&oy+y>=761&&oy+y<=766&&Math.abs(r-100)<18&&Math.abs(g-147)<18)mask[y*w+x]=0;}
// Fill enclosed dark dumbbell faces, but retain body/arm negative spaces.
if(spec.weights){const visited=new Uint8Array(w*h),q=new Int32Array(w*h);for(let s=0;s<mask.length;s++){if(mask[s]||visited[s])continue;let a=0,b=1,touches=false,sx=0,sy=0;q[0]=s;visited[s]=1;while(a<b){const i=q[a++],x=i%w,y=(i/w)|0;sx+=x+ox;sy+=y+oy;if(x===0||x===w-1||y===0||y===h-1)touches=true;for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&!mask[j]&&!visited[j]){visited[j]=1;q[b++]=j}}if(!touches&&spec.weights.some(([l,t,r,d])=>sx/b>=l&&sx/b<=r&&sy/b>=t&&sy/b<=d))for(let k=0;k<b;k++)mask[q[k]]=1;}}
// Discard caption/noise components; keep the connected body (and bar).
const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let largest=[];for(let s=0;s<mask.length;s++){if(!mask[s]||seen[s])continue;let a=0,b=1;queue[0]=s;seen[s]=1;while(a<b){const i=queue[a++],x=i%w,y=(i/w)|0;for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&mask[j]&&!seen[j]){seen[j]=1;queue[b++]=j}}if(b>largest.length)largest=Array.from(queue.subarray(0,b))}mask.fill(0);for(const i of largest)mask[i]=1;
const edges=new Map(),stride=w+1;const add=(a,b)=>{const list=edges.get(a)||[];list.push(b);edges.set(a,list)};for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x]){let a=y*stride+x;if(y===0||!mask[(y-1)*w+x])add(a,a+1);if(x===w-1||!mask[y*w+x+1])add(a+1,a+stride+1);if(y===h-1||!mask[(y+1)*w+x])add(a+stride+1,a+stride);if(x===0||!mask[y*w+x-1])add(a+stride,a)}
const loops=[];while(edges.size){const first=edges.keys().next().value;let at=first,points=[];do{points.push([at%stride+ox,Math.floor(at/stride)+oy]);const choices=edges.get(at);if(!choices)break;const next=choices.pop();if(!choices.length)edges.delete(at);at=next;}while(at!==first&&points.length<100000);let area=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];area+=p[0]*q[1]-q[0]*p[1]}if(Math.abs(area)>220){let far=0;for(let i=1;i<points.length;i++)if(Math.hypot(points[i][0]-points[0][0],points[i][1]-points[0][1])>Math.hypot(points[far][0]-points[0][0],points[far][1]-points[0][1]))far=i;const cleaned=simplify(points.slice(0,far+1),1.7).slice(0,-1).concat(simplify(points.slice(far).concat([points[0]]),1.7).slice(0,-1));loops.push(cleaned)}}
return loops.map(points=>points.map(([x,y])=>{let nx=(x-spec.cx)*spec.scale+120,ny=(y-spec.baseline)*spec.scale+(spec.pull?26:270);if(spec.name==='squatTop'){const legMix=Math.max(0,Math.min(1,(y-650)/220));nx+=Math.sign(nx-120)*10.2*legMix}return[nx,ny]}));}
const contours={},assets={};for(const spec of specs){const loops=trace(spec);contours[spec.name]=loops;assets[spec.name]=loops.map(smoothClosed).join(' ')}
// Reuse the anatomically matched overhead reference for the pre-grab reach.
// Toe-facing feet stay under the legs; a modest heel lift shortens shoe projection.
const reachSource=trace({name:"reachSource",file:"shoulder-press",roi:[330,158,310,810],cx:480,baseline:955,scale:246/671});
contours.pullupReach=reachSource.map(loop=>loop.map(([x,y])=>[120+(x-120)*.87,y<244?y-4:240+(y-244)*30/26]));assets.pullupReach=contours.pullupReach.map(smoothClosed).join(' ');
fs.writeFileSync(path.join(generated,'contours.json'),JSON.stringify(contours));fs.writeFileSync(path.join(generated,'paths.json'),JSON.stringify(assets));

// Minimal anatomical overlap lines traced in source coordinates. These retain
// readable hands/forearms and the front-facing head without copying fabric seams.
const sourceDetails={
 curlTop:'M435 320 C430 347 441 374 443 410 M593 320 C598 347 587 374 585 410',
 squatTop:'M362 469 C388 477 427 448 455 415 L465 396 Q474 388 480 399 M594 469 C568 477 529 448 507 418 L499 387 Q494 371 479 368 L464 372 Q455 375 457 382 L477 378 L492 386 M457 382 L452 390 Q451 396 458 397 L476 389 M458 397 L450 408',
 squatBottom:'M963 617 C990 631 1028 593 1054 563 L1067 543 Q1077 536 1083 546 M1191 617 C1164 631 1127 593 1106 565 L1098 534 Q1093 518 1078 515 L1063 519 Q1054 522 1056 529 L1076 525 L1091 533 M1056 529 L1051 537 Q1050 543 1057 544 L1075 536 M1057 544 L1049 555',
 pushupTop:'M428 331 C432 379 456 417 487 419 C518 417 543 379 547 331 M358 479 C382 531 424 552 487 555 C550 552 592 531 616 479',
 pushupBottom:'M1262 518 C1269 570 1298 618 1324 621 C1350 618 1380 570 1387 518 M1127 590 C1160 663 1222 688 1324 691 C1426 688 1488 663 1521 590',
};
// Reference-traced dumbbell end faces distinguish equipment from hands.
const cap=(x,y,w,h)=>'M'+(x+5)+' '+y+' L'+(x+w-5)+' '+y+' L'+(x+w)+' '+(y+7)+' L'+(x+w)+' '+(y+h-7)+' L'+(x+w-5)+' '+(y+h)+' L'+(x+5)+' '+(y+h)+' L'+x+' '+(y+h-7)+' L'+x+' '+(y+7)+' L'+(x+5)+' '+y;
const hex=(x,y)=>'M'+(x-11)+' '+(y-20)+' L'+(x+11)+' '+(y-20)+' L'+(x+22)+' '+y+' L'+(x+11)+' '+(y+20)+' L'+(x-11)+' '+(y+20)+' L'+(x-22)+' '+y+' L'+(x-11)+' '+(y-20);
sourceDetails.pressTop=[cap(352,168,30,43),cap(432,168,30,43),cap(513,168,30,43),cap(594,168,30,43)].join(' ');
sourceDetails.pressBottom=[cap(901,363,29,43),cap(981,363,29,43),cap(1124,363,29,43),cap(1205,363,29,43)].join(' ');
sourceDetails.lateralTop=hex(154,336)+' '+hex(823,336);
sourceDetails.lateralBottom=hex(997,592)+' '+hex(1217,592);
sourceDetails.curlTop+=' '+[cap(345,280,33,48),cap(432,285,33,48),cap(562,285,33,48),cap(647,280,33,48)].join(' ');
sourceDetails.curlBottom=[cap(875,563,33,48),cap(957,565,33,48),cap(1130,565,33,48),cap(1213,563,33,48)].join(' ');
const details={};for(const [name,d] of Object.entries(sourceDetails)){const spec=specs.find(s=>s.name===name);let axis=0;details[name]=d.replace(/-?\d+(?:\.\d+)?/g,n=>{const x=Number(n);return String(Number(((axis++%2===0?(x-spec.cx)*spec.scale+120:(x-spec.baseline)*spec.scale+(spec.pull?26:270))).toFixed(2)))})}

const lines=['// Body contours traced from the owner-supplied exercise references.','// Flat fills intentionally omit clothing seams, shading, and facial details.','// Artwork only: no tracking targets or calibration rules.','export const CALIBRATION_ARTWORK = '+JSON.stringify(assets,null,2)+' as const;','export const CALIBRATION_DETAILS = '+JSON.stringify(details,null,2)+' as const;'];fs.writeFileSync(path.join(repo,'apps/mobile/src/utils/game/calibrationGuideArtwork.ts'),lines.join('\n')+'\n');console.log(JSON.stringify({poses:Object.keys(assets).length,bytes:lines.join('\n').length,points:Object.fromEntries(Object.entries(contours).map(([k,v])=>[k,v.reduce((s,p)=>s+p.length,0)]))}));
