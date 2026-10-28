"""Rectifica los pósteres de las fotos originales. No inventa detalle ni elimina reflejos."""
from pathlib import Path
import numpy as np
from PIL import Image,ImageOps
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path,required=True);args=parser.parse_args()
source=args.source_dir
out=Path(__file__).resolve().parents[1]/'assets/targets'
# Esquinas TL, TR, BR, BL sobre previsualización 1368x1824.
cases=[('ludus','WhatsApp Image 2026-10-23 at 20.57.36.jpeg',[(514,567),(1160,573),(1127,1476),(506,1447)],(600,850))]
for name,file,quad,size in cases:
 im=ImageOps.exif_transpose(Image.open(source/file)).convert('RGB');quad=[(x*im.width/1368,y*im.height/1824) for x,y in quad]
 w,h=size;dest=[(0,0),(w,0),(w,h),(0,h)];a=[];b=[]
 for (x,y),(u,v) in zip(dest,quad):a.extend([[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]]);b.extend([u,v])
 coeff=np.linalg.solve(np.array(a),np.array(b))
 result=im.transform(size,Image.Transform.PERSPECTIVE,coeff,Image.Resampling.BICUBIC)
 result.save(out/f'{name}.jpg',quality=95,dpi=(72,72));result.save(out/f'{name}.png')
