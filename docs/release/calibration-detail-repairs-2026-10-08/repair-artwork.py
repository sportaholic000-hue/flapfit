from pathlib import Path
from PIL import Image,ImageFilter,ImageDraw
import numpy as np,json,hashlib,shutil
import argparse,subprocess
parser=argparse.ArgumentParser(description='Reproduce only the reviewed localized calibration-art repairs, into a separate output folder.')
parser.add_argument('--output',required=True)
args=parser.parse_args()
R=Path(__file__).resolve().parents[3]
D=Path(__file__).resolve().parent
O=Path(args.output).resolve();O.mkdir(parents=True,exist_ok=True);(O/'before').mkdir(exist_ok=True)
BASE='29d378f949bd4a54e88a29ac595a1b0e83c7df71'
REFERENCE='dc4b47056ac9a9864f435c2025bff9022c56473d'
def git_file(ref,path):return subprocess.check_output(['git','-C',str(R),'show',ref+':'+path])
specs=json.loads((D/'source-crops.json').read_text(encoding='utf-8'))
for item in specs:
 name=item['pose']
 (O/'before'/(name+'.webp')).write_bytes(git_file(BASE,'apps/mobile/assets/images/calibration/'+name+'.webp'))
 ref=O/item['reference']
 if not ref.exists():ref.write_bytes(git_file(REFERENCE,'apps/mobile/artwork/calibration/references/'+item['reference']))
 item['source']=str(ref)
(O/'before'/'pushupBottom.webp').write_bytes(git_file(BASE,'apps/mobile/assets/images/calibration/pushupBottom.webp'))
shutil.copy2(O/'shoulder-press.png',O/'pullupReach-reference.png')
shutil.copy2(O/'pullup.png',O/'pullup-reference.png')
shutil.copy2(D/'pushup-bottom-source-aligned.png',O/'pushupBottom-source-aligned.png')
def boost(im):
 a=np.array(im.convert('RGBA'));a[:,:,3]=(a[:,:,3].astype(float)*2.5).clip(0,255).astype('uint8');return Image.alpha_composite(Image.new('RGBA',im.size,'#192f44'),Image.fromarray(a)).convert('RGB')
def source_rgba(im,transparent=False):
 a=np.array(im.convert('RGBA')).astype(float);r,g,b,alpha=[a[:,:,i] for i in range(4)]
 # Preserve the source's subpixel contours. No new outline, no contour tracing.
 if transparent:
  support=(alpha>10)&(((b>r+15)&(g>r+2)&(b>100))|((r>b+20)&(g>b+15)&(r>130)))
  mask=Image.fromarray(support.astype('uint8')*255)
  # Ignore detached generator specks and fill internal highlights only.
  filled=mask.copy();ImageDraw.floodfill(filled,(im.width//2,60),128,thresh=0)
  mask=Image.fromarray((np.asarray(filled)==128).astype('uint8')*255)
  ext=mask.copy();ImageDraw.floodfill(ext,(0,0),128,thresh=0)
  mask=Image.fromarray((np.asarray(ext)!=128).astype('uint8')*255)
  coverage=np.asarray(mask.filter(ImageFilter.GaussianBlur(.45))).astype(float)/255
  coverage*=alpha/255
 else:
  # Source navy backdrop is below 80 green; figure incl. all fingers is bright.
  coverage=np.clip((g-75)/60,0,1)
 yellow=np.minimum(np.clip((r-b-8)/65,0,1),np.clip((g-b-8)/55,0,1))
 opacity=coverage*(.32+.56*yellow)
 result=a.copy();result[:,:,3]=opacity*255;result[opacity==0,:3]=0
 return Image.fromarray(result.clip(0,255).astype('uint8'))
# First pullup reach: original hands and wrist contours, with a short internal join.
name='pullupReach';old=Image.open(O/'before'/f'{name}.webp').convert('RGBA')
raw=Image.open(O/'pullupReach-reference.png').convert('RGBA').crop((330,158,640,968));fresh=source_rgba(raw)
a=np.asarray(old).astype(float);b=np.asarray(fresh).astype(float)
w=np.zeros(old.size[::-1]);w[:115,:]=1
for y in range(115,135):w[y,:]=(135-y)/20
result=(a*(1-w[:,:,None])+b*w[:,:,None]).clip(0,255).astype('uint8');Image.fromarray(result).save(O/f'{name}.webp',lossless=True,method=6,exact=True)
# Bottom pushup: source face/ear/neck contours. Keep the approved hands identical.
name='pushupBottom';old=Image.open(O/'before'/f'{name}.webp').convert('RGBA');raw=Image.open(O/'pushupBottom-source-aligned.png').convert('RGBA');fresh=source_rgba(raw,True)
a=np.asarray(old).astype(float);b=np.asarray(fresh).astype(float);yy,xx=np.mgrid[:old.height,:old.width]
w=np.clip((xx-220)/25,0,1)*np.clip((550-xx)/25,0,1)*np.clip((270-yy)/25,0,1)
result=(a*(1-w[:,:,None])+b*w[:,:,None]).clip(0,255).astype('uint8');assert np.array_equal(result[331:],np.asarray(old)[331:]);Image.fromarray(result).save(O/f'{name}.webp',lossless=True,method=6,exact=True)
# Small isolated gap at the apex between the legs: restore the original reference
# matte just in that local aperture; do not alter limb position or entire outlines.
# Source crops loaded above from the preserved Android reference commit.
report=[]
for item in specs:
 name=item['pose']
 if name.startswith('pushup') or name=='squatBottom':continue
 cur=Image.open(O/(name+'.webp') if (O/(name+'.webp')).exists() else O/'before'/(name+'.webp')).convert('RGBA')
 source=Path(item['source'])
 if not source.exists():source=O/('pullupReach-reference.png' if name=='pullupReach' else 'pullup-reference.png')
 raw=Image.open(source).convert('RGBA').crop(tuple(item['crop']));extracted=source_rgba(raw)
 a=np.array(cur);b=np.asarray(extracted);rgb=np.asarray(raw);h,w=a.shape[:2]
 # Locate the reference aperture's uppermost navy pixel in the central crotch strip.
 region=rgb[int(h*.44):int(h*.77),int(w*.44):int(w*.56),1]<70
 ys,xs=np.where(region)
 if len(ys):
  top=int(ys.min()+int(h*.44));row=xs[ys==ys.min()];cx=int(round(row.mean()+int(w*.44)))
  left=max(0,cx-15);right=min(w,cx+16);bottom=min(h,top+60);start=max(0,top-12)
  yy,xx=np.mgrid[start:bottom,left:right]
  weight=np.minimum.reduce([np.ones_like(xx,dtype=float),(xx-left)/4,(right-1-xx)/4,(yy-start)/5,(bottom-1-yy)/10]).clip(0,1)
  a[start:bottom,left:right]=(a[start:bottom,left:right]*(1-weight[:,:,None])+b[start:bottom,left:right]*weight[:,:,None]).astype('uint8')
  report.append({'pose':name,'referenceApertureTop':[cx,top],'editedBounds':[left,start,right,bottom]})
 if name=='pullupTop':
  # Also restore the first loaded hold pose's hands, including the original grip.
  for left,right in [(52,157),(304,416)]:
   yy,xx=np.mgrid[:130,left:right];weight=np.minimum.reduce([np.ones_like(xx,dtype=float),(xx-left)/7,(right-1-xx)/7,(130-yy)/20]).clip(0,1)
   a[:130,left:right]=(a[:130,left:right]*(1-weight[:,:,None])+b[:130,left:right]*weight[:,:,None]).astype('uint8')
 Image.fromarray(a).save(O/f'{name}.webp',lossless=True,method=6,exact=True)
(O/'cleanup-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
sheet=Image.new('RGB',(1536,1400),'#192f44');d=ImageDraw.Draw(sheet)
for i,(name,crop) in enumerate([('pushupBottom',(210,0,560,280)),('pullupReach',(15,0,300,160)),('pressTop',(93,453,217,607)),('curlBottom',(120,453,280,607))]):
 for col,root in enumerate([O/'before',O]):
  file=root/(name+'.webp');file=file if file.exists() else O/'before'/(name+'.webp');im=boost(Image.open(file).crop(crop));im.thumbnail((740,310));im=im.resize((round(im.width*min(740/im.width,310/im.height)),round(im.height*min(740/im.width,310/im.height))),Image.Resampling.LANCZOS)
  sheet.paste(im,(col*768,350*i+30));d.text((col*768,350*i),name+(' BEFORE' if col==0 else ' CANDIDATE'),fill='white')
sheet.save(O/'artwork-corrections-review.png')
print(json.dumps(report))
