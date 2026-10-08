from pathlib import Path
from PIL import Image,ImageFilter,ImageDraw,ImageFont
import numpy as np,json,hashlib,subprocess,io
OUT=Path(__file__).parent
SRC=OUT/'owner-selected-reference.png'
REPO=OUT.parents[2]
BASE='34ba0d5205d133f07ee973734fe2397c05d49e88'
source=Image.open(SRC).convert('RGBA')
a=np.asarray(source).astype(float)
blue=(a[:,:,2]>a[:,:,0]+15)&(a[:,:,2]>90)&(a[:,:,1]>a[:,:,0]+4)&(a[:,:,3]>25)
yellow=(a[:,:,0]>130)&(a[:,:,1]>115)&(a[:,:,2]<a[:,:,0]-15)&(a[:,:,2]<a[:,:,1]-10)&(a[:,:,3]>25)
# Keep the source's yellow boundary, which encloses its white finger highlights.
# Never reconstruct fingers from only the blue pixels.
mask=Image.fromarray((255*(blue|yellow)).astype('uint8')).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
# Isolate each connected hand/forearm, filling only enclosed highlight holes.
hand_masks=[]
for box,seed in [((34,974,329,1190),(155,100)),((927,974,1224,1190),(154,100))]:
 m=mask.crop(box);ImageDraw.floodfill(m,seed,128)
 m=Image.fromarray((np.asarray(m)==128).astype('uint8')*255)
 ext=m.copy();ImageDraw.floodfill(ext,(0,0),128)
 m=Image.fromarray((np.asarray(ext)!=128).astype('uint8')*255)
 # Subpixel antialiasing, without the previous broad blur/erosion of fingertips.
 m=m.filter(ImageFilter.GaussianBlur(.45))
 rgba=np.array(source.crop(box)).astype(float)
 coverage=np.minimum(np.asarray(m)/255,rgba[:,:,3]/255)
 rgb=rgba[:,:,:3]
 # Preserve source RGB and all highlights; only opacity changes.
 ink=np.minimum(np.clip((rgb[:,:,0]-rgb[:,:,2]-12)/55,0,1),np.clip((rgb[:,:,1]-rgb[:,:,2]-10)/50,0,1))
 alpha=coverage*(.32+.56*ink)
 rgba[:,:,3]=alpha*255;rgba[rgba[:,:,3]<.5]=0
 hand=Image.fromarray(rgba.clip(0,255).astype('uint8'))
 hand_masks.append((box,hand))
for name,scale,transforms,seam in [
 ('Top',.60,[(-16,-19),(32,-19)],(584,615)),
 ('Bottom',.55,[(-25,-233),(101,-233)],(331,352)),
]:
 original=Image.open(io.BytesIO(subprocess.check_output(['git','show',f'{BASE}:apps/mobile/assets/images/calibration/pushup{name}.webp'],cwd=REPO))).convert('RGBA')
 replacement=Image.new('RGBA',original.size)
 for (box,hand),(tx,ty) in zip(hand_masks,transforms):
  hand=hand.resize((round(hand.width*scale),round(hand.height*scale)),Image.Resampling.LANCZOS)
  replacement.alpha_composite(hand,(round(box[0]*scale+tx),round(box[1]*scale+ty)))
 # Match the short replacement forearms to the accepted wrists at the join.
 # This warp ends before the hands: palms/fingers stay uniformly scaled source pixels.
 raw=np.asarray(replacement).copy(); base=np.asarray(original)
 for y in range(seam[0],seam[1]):
  t=(y-seam[0])/(seam[1]-seam[0]); amount=(1-t)**2
  for lo,hi in [(0,180),(590,768)]:
   aa=np.where(base[y,lo:hi,3]>50)[0]+lo; bb=np.where(raw[y,lo:hi,3]>50)[0]+lo
   if len(aa)==0 or len(bb)==0: continue
   left=bb.min()+amount*(aa.min()-bb.min());right=bb.max()+amount*(aa.max()-bb.max())
   xx=np.arange(lo,hi);sample=bb.min()+(xx-left)*(bb.max()-bb.min())/max(1,right-left)
   original_row=raw[y,:, :].copy()
   for channel in range(4): raw[y,lo:hi,channel]=np.interp(sample,np.arange(original.width),original_row[:,channel],left=0,right=0).round().astype('uint8')
 replacement=Image.fromarray(raw)
 old=np.asarray(original).astype(float)/255;new=np.asarray(replacement).astype(float)/255
 y=np.arange(original.height)[:,None]
 blend=np.clip((y-seam[0])/(seam[1]-seam[0]),0,1)*np.ones((1,original.width))
 # Only replace the two hands and their short wrist joins; the accepted body stays exact.
 blend[:,180:590]=0
 alpha=old[:,:,3]*(1-blend)+new[:,:,3]*blend
 color=(old[:,:,:3]*old[:,:,3,None]*(1-blend[:,:,None])+new[:,:,:3]*new[:,:,3,None]*blend[:,:,None])/np.maximum(alpha[:,:,None],1e-6)
 result=np.dstack((color,alpha))*255
 result=np.rint(result).clip(0,255).astype('uint8');result[result[:,:,3]==0,:3]=0
 # Keep every untouched pixel byte-for-byte.
 result[blend==0]=np.asarray(original)[blend==0]
 im=Image.fromarray(result);im.save(OUT/f'pushup{name}-exact-hands.webp',lossless=True,method=6);im.save(OUT/f'pushup{name}-exact-hands.png')
 bg=Image.new('RGBA',im.size,'#183047');bg.alpha_composite(im);bg.convert('RGB').save(OUT/f'pushup{name}-exact-hands-preview.png')
 # Opaque inspection is labelled; only used to inspect anatomy, not show camera translucency.
 opaque=np.array(im);opaque[:,:,3]=np.minimum(255,opaque[:,:,3].astype(float)/.32).astype('uint8');op=Image.new('RGBA',im.size,'#183047');op.alpha_composite(Image.fromarray(opaque));op.convert('RGB').save(OUT/f'pushup{name}-hands-anatomy.png')
print('Prepared local candidates only; accepted body pixels preserved.')
