# Cắt bộ HUD v3 (chủ dự án 23/10/2026) từ assets/ui/_source/hud-v3-gpt.png (nền hồng #FA03FB).
# Xoá chữ / số vẽ sẵn ở chỗ game tự ghi (tên, thanh máu, ô tiền, ô kỹ năng…), giữ mảnh liền lớn nhất, nén 256 màu.
# Chạy: python3 -I tools/hud_v3_slice.py  → assets/ui/frames/hud-*.png, assets/ui/icons/hud-*.png
import os, glob, tempfile
from PIL import Image
import numpy as np
src=np.array(Image.open('assets/ui/_source/hud-v3-gpt.png').convert('RGB')).astype(float)
def keyed(box):
    x,y,w,h=box; a=src[y:y+h,x:x+w].copy()
    r,g,b=a[...,0],a[...,1],a[...,2]
    # độ "hồng nền": r,b cao, g thấp
    m=np.clip((np.minimum(r,b)-g-90)/110,0,1)   # 1 = nền
    alpha=1-m
    # khử viền hồng: kéo r,b về không vượt g quá nhiều ở pixel bán trong suốt
    lim=g+ (np.maximum(r,b)-g)*(1-m)
    r2=np.where(m>0, np.minimum(r, np.maximum(g, r - (r-g)*m)), r)
    b2=np.where(m>0, np.minimum(b, np.maximum(g, b - (b-g)*m)), b)
    out=np.dstack([r2,g,b2,alpha*255]).clip(0,255).astype(np.uint8)
    return Image.fromarray(out,'RGBA')
OUT = tempfile.mkdtemp()
from PIL import Image, ImageDraw
import numpy as np
P=4
def C(box,pad=P): x,y,w,h=box; return keyed((x-pad,y-pad,w+2*pad,h+2*pad))
def rect(im,box,col,r=0):
    d=ImageDraw.Draw(im); x0,y0,x1,y1=box
    (d.rounded_rectangle if r else d.rectangle)((x0,y0,x1,y1),**({'radius':r} if r else {}),fill=col)
def circ(im,c,r,col): ImageDraw.Draw(im).ellipse((c[0]-r,c[1]-r,c[0]+r,c[1]+r),fill=col)
def px(im,x,y): return im.getpixel((x,y))
# toạ độ trong mảnh = toạ độ sheet - (x-P, y-P)
def off(box,pt): return (pt[0]-box[0]+P, pt[1]-box[1]+P)
def ob(box,b): a=off(box,b[:2]); c=off(box,b[2:]); return (*a,*c)

# 1 khung nhân vật
B=(13,16,607,233); im=C(B)
panel=(12,23,46,255)
rect(im,ob(B,(214,64,552,101)),panel)                      # tên + cảnh giới
track=(16,24,48,255)
for y0,y1 in [(111,133),(145,170),(182,206)]: rect(im,ob(B,(261,y0,545,y1)),track,r=7)
badge=px(im,*off(B,(160,212)))
rect(im,ob(B,(163,201,203,226)),badge)                     # số 88
im.save(OUT+'/khung-nv.png')

# 2 ô tiền (bỏ icon + chữ, giữ nút +)
B=(624,71,231,63); im=C(B); bg=(18,30,56,255)
rect(im,ob(B,(644,92,806,120)),bg); im.save(OUT+'/o-tien.png')
# 3 nút menu
for n,b in [('menu',(1115,61,74,70)),('ban-do',(1195,60,79,72)),('do-giam',(1280,60,78,72)),('nhiem-vu',(1364,60,77,71)),('cua-hang',(1195,139,79,72)),('cai-dat',(1280,139,80,72))]:
    C(b).save(OUT+f'/nut-{n}.png')
# 4 bản đồ nhỏ: xoá ảnh bản đồ trong vòng + chữ tên khu
B=(1422,16,236,247); im=C(B)
circ(im,off(B,(1546,137)),81,(0,0,0,0))  # lòng bản đồ trong suốt: canvas bản đồ nằm DƯỚI khung
rect(im,ob(B,(1436,226,1648,252)),px(im,*off(B,(1440,240))))
im.save(OUT+'/ban-do-nho.png')
# 5 băng chữ Tự động / Nhặt
B=(564,286,548,73); im=C(B); rect(im,ob(B,(640,305,1040,340)),px(im,*off(B,(630,322)))); im.save(OUT+'/bang-tu-dong.png')
B=(548,353,581,88); im=C(B); rect(im,ob(B,(700,380,1105,420)),px(im,*off(B,(1090,400)))); im.save(OUT+'/bang-nhat.png')
# 6 nút tròn: khung trống (từ Túi) + Nhân Vật giữ nguyên
B=(1167,283,115,125); im=C(B)
circ(im,off(B,(1223,341)),37,(18,26,50,255))
rect(im,ob(B,(1186,374,1262,404)),(17,24,46,255),r=8)
im.save(OUT+'/nut-tron.png')
C((1292,283,115,125)).save(OUT+'/nut-nhan-vat.png')
# 7 khung nhiệm vụ: xoá thân
B=(16,287,443,308); im=C(B); body=px(im,*off(B,(240,430)))
rect(im,ob(B,(44,358,432,572)),body); im.save(OUT+'/khung-nhiem-vu.png')
# 8 Kho, Chat, cần điều khiển, khung chat
C((24,625,97,111)).save(OUT+'/nut-kho.png'); C((24,763,97,112)).save(OUT+'/nut-chat.png')
C((134,623,255,257)).save(OUT+'/can-dieu-khien.png')
B=(411,625,657,271); im=C(B)
rect(im,ob(B,(572,828,914,868)),(21,32,60,255),r=4)  # chữ gợi ý "Nhập nội dung…"
im.save(OUT+'/khung-chat.png')
# 9 nút kỹ năng
B=(1305,580,108,109); im=C(B); circ(im,off(B,(1359,634)),43,(16,20,42,255)); im.save(OUT+'/o-ky-nang.png')
B=(1549,438,91,92); im=C(B); circ(im,off(B,(1594,484)),30,px(im,*off(B,(1594,450)))); im.save(OUT+'/o-nho.png')
C((1551,551,101,102)).save(OUT+'/nut-xep-ky-nang.png')
C((1110,653,96,98)).save(OUT+'/nut-tu-dong.png'); C((1110,771,96,98)).save(OUT+'/nut-dan.png')
im=C((1412,650,212,268),0); ImageDraw.Draw(im).ellipse((-24-46,226-46,-24+46,226+46),fill=(0,0,0,0)); im.save(OUT+'/nut-danh.png')

from scipy import ndimage
import glob
for f in glob.glob(OUT+'/*.png'):
    im=Image.open(f); a=np.array(im); m=a[...,3]>40
    lab,n=ndimage.label(m if 'nut-danh' in f else ndimage.binary_dilation(m,iterations=2))
    if n<=1: continue
    sizes=ndimage.sum(m,lab,range(1,n+1)); keep=1+int(np.argmax(sizes))
    a[...,3]=np.where(lab==keep,a[...,3],0)
    ys,xs=np.nonzero(a[...,3]); a=a[ys.min():ys.max()+1, xs.min():xs.max()+1]
    Image.fromarray(a).save(f)
FRAMES = {'khung-nv', 'o-tien', 'ban-do-nho', 'bang-tu-dong', 'bang-nhat', 'khung-nhiem-vu', 'khung-chat', 'o-ky-nang', 'o-nho', 'nut-tron', 'can-dieu-khien'}
for f in glob.glob(OUT + '/*.png'):
    n = os.path.basename(f)[:-4]
    Image.open(f).quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(
        f'assets/ui/{"frames" if n in FRAMES else "icons"}/hud-{n}.png', optimize=True)
