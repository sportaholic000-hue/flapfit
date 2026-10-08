from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib,argparse,subprocess,io
ROOT=Path(__file__).resolve().parents[3]
parser=argparse.ArgumentParser(description='Reproduce the localized bar repair into a separate output directory.')
parser.add_argument('--output',required=True);OUT=Path(parser.parse_args().output).resolve();OUT.mkdir(parents=True,exist_ok=True)
BASE='b472e7f827f54947fc5e476a683f94ab60a055e1';REFERENCE='dc4b47056ac9a9864f435c2025bff9022c56473d'
def blob(ref,path):return subprocess.check_output(['git','-C',str(ROOT),'show',ref+':'+path])
source=Image.open(io.BytesIO(blob(REFERENCE,'apps/mobile/artwork/calibration/references/pullup.png'))).convert('RGBA');report=[]
for name,crop,band in [('pullupTop',(285,148,750,886),(38,63)),('pullupBottom',(830,174,1295,979),(12,37))]:
 original=blob(BASE,'apps/mobile/assets/images/calibration/'+name+'.webp');old=Image.open(io.BytesIO(original)).convert('RGBA');raw=source.crop(crop)
 assert old.size==raw.size
 a=np.array(old);b=np.asarray(raw).astype(float);r,g,blue=[b[:,:,i] for i in range(3)]
 # Use original RGB pixels. Restore the neutral grey bar excluded by the former blue/yellow matte.
 coverage=np.maximum(np.clip((g-75)/60,0,1),np.clip((r-0.4*blue)/45,0,1))
 yellow=np.minimum(np.clip((r-blue-8)/65,0,1),np.clip((g-blue-8)/55,0,1))
 fresh=b.copy();fresh[:,:,3]=coverage*(.32+.56*yellow)*255;fresh[coverage==0,:3]=0
 start,end=band;weight=np.zeros(a.shape[:2]);weight[start:end,:]=1
 for j in range(4):
  weight[start-4+j,:]=(j+1)/5;weight[end+j,:]=(4-j)/5
 result=(a*(1-weight[:,:,None])+fresh*weight[:,:,None]).clip(0,255).astype('uint8')
 assert np.array_equal(result[weight==0],a[weight==0])
 output=OUT/(name+'.webp');Image.fromarray(result).save(output,lossless=True,method=6,exact=True)
 (OUT/(name+'-before.webp')).write_bytes(original)
 report.append({'pose':name,'crop':crop,'editedRows':[start-4,end+4],'outsideRowsIdentical':True,'size':list(old.size),'assetSha256':hashlib.sha256(output.read_bytes()).hexdigest()})
 for kind,img in [('before',old),('after',Image.fromarray(result))]:
  rgba=np.array(img.crop((0,0,img.width,150)));rgba[:,:,3]=np.clip(rgba[:,:,3].astype(float)*2.5,0,255).astype('uint8')
  preview=Image.alpha_composite(Image.new('RGBA',(img.width,150),'#192f44'),Image.fromarray(rgba))
  preview.resize((img.width*2,300),Image.Resampling.LANCZOS).convert('RGB').save(OUT/(name+'-'+kind+'.png'))
(OUT/'preservation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
