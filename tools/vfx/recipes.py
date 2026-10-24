"""Sinh data/vfx.json — công thức hiệu ứng ghép từ mảnh sáng (src/entity/vfx.js) + chiêu nào dùng công thức nào.
Sửa công thức ở đây rồi chạy: python3 -I tools/vfx/recipes.py"""
import json
SLUG={'Kim':'kim','Ám':'am','Thủy':'thuy','Hỏa':'hoa','Mộc':'moc','Thổ':'tho','Quang':'quang','Lôi':'loi','Băng':'bang','Phong':'phong','Hư':'hu','Thời':'thoi'}
SP=['lap-lanh']
def no(scale=1.0, extra=None):
  L=[{"f":"sao","t":[0,.25],"s":[.2*scale,.75*scale],"e":"out","a":[.75,0],"r":[0,.05]},
     {"f":"cau","t":[0,.3],"s":[.3*scale,.7*scale],"a":[.6,0]},
     {"f":"vong","t":[0,.6],"s":[.2*scale,1.5*scale],"sy":.5,"a":[.95,0],"norot":True},
     {"f":"lap-lanh","t":[0,.75],"s":[.2*scale,.07*scale],"n":6,"spread":.1,"burst":.95*scale,"sy":.7,"jit":.4,"rj":.3,"norot":True},
     {"f":"khoi","t":[.05,.7],"s":[.45*scale,.85*scale],"a":[.25,0],"norot":True}]
  return {"dur":.5,"layers":L+(extra or [])}
def bolt(frag, r=0.0, size=.9, trail='vet', tr_r=.055, flip=False, spin=0, part='lap-lanh'):
  core={"f":frag,"s":size,"r":[r,r+spin],"a":.85}
  if flip: core["flip"]=True
  return {"dur":.45,"loop":True,"layers":[
    core,
    {"f":part,"x":-.55,"s":.18,"n":2,"spread":.3,"jit":.5,"rj":.5,"flick":2,"a":.7}]}
R={
 # ---- nổ trúng đòn
 "no":no(1.0),
 "no-lon":no(1.4,[{"f":"sao","t":[.05,.4],"s":[.3,1.6],"e":"pop","a":[.8,0],"r":[.12,.2]}]),
 # ---- đạn bay (loop, hướng phải)
 "dan-lua":bolt("lua",.15,1.0,part="lua-2"),
 "dan-bang":bolt("tinh-the-2",.17,.95,part="lap-lanh"),
 "dan-gio":bolt("trang",0,.95,spin=-3,part="la"),
 "dan-phuong":{"dur":.5,"loop":True,"layers":[{"f":"phuong","s":1.25,"glow":.45},{"f":"long-vu","x":-.6,"s":.3,"n":5,"spread":.35,"rj":.6,"flick":2}]},
 "dan-rong":{"dur":.5,"loop":True,"layers":[{"f":"rong-2","s":1.3,"flip":True,"glow":.5},{"f":"set","x":-.3,"s":.4,"n":3,"spread":.4,"rj":.8,"flick":3}]},
 "dan-kiem":bolt("kiem",.25,1.0,part="lap-lanh"),
 "dan-la":bolt("la",.11,.85,part="la"),
 "dan-giot":bolt("giot",.25,.8,part="lap-lanh"),
 "dan-hon":{"dur":.6,"loop":True,"layers":[{"f":"lua-2","s":.9,"r":[.15,.15],"glow":.6,"flick":3},{"f":"cau","s":.4,"a":.6}]},
 "dan-set":bolt("set",.15,1.0,part="set"),
 "dan-da":bolt("tinh-the",.25,.8,part="khoi"),
 "dan-sao":bolt("lap-lanh",0,.8,spin=2,part="lap-lanh"),
 # ---- ra đòn (đầu nòng)
 "phong-ra":{"dur":.3,"layers":[{"f":"sao","t":[0,.6],"s":[.3,.9],"e":"pop","a":[1,0]},{"f":"vong","t":[0,1],"s":[.2,.9],"sy":.6,"a":[.8,0],"norot":True}]},
 # ---- đánh tại mục tiêu
 "gai":{"dur":.75,"layers":[
   {"f":"vong","t":[0,.55],"s":[.3,1.5],"sy":.4,"a":[.9,0],"norot":True},
   {"f":"tinh-the","t":[0,.75],"s":[.2,1.0],"e":"pop","ground":True,"y":.42,"glow":.4,"norot":True},
   {"f":"tinh-the","t":[.06,.7],"s":[.1,.55],"e":"pop","ground":True,"n":4,"spread":.55,"sy":.45,"y":.42,"jit":.3,"norot":True},
   {"f":"khoi","t":[0,.6],"s":[.5,1.0],"a":[.5,0],"y":.3,"norot":True},
   {"f":"tinh-the-2","t":[.2,1],"s":[.12,.05],"n":8,"spread":.15,"burst":.9,"rise":.5,"rj":.5,"norot":True}]},
 "cot":{"dur":.8,"layers":[
   {"f":"cot","t":[0,.65],"s":[1.6,1.9],"e":"out","ground":True,"y":.4,"glow":.25,"a":[.9,0],"norot":True},
   {"f":"set","t":[0,.35],"s":[.9,1.3],"ground":True,"y":.4,"flick":4,"norot":True},
   {"f":"sao","t":[.05,.4],"s":[.3,1.2],"e":"pop","y":.35,"a":[1,0],"norot":True},
   {"f":"vong","t":[.05,.8],"s":[.3,1.8],"sy":.38,"y":.38,"a":[.9,0],"norot":True},
   {"f":"lap-lanh","t":[.1,.9],"s":[.2,.06],"n":10,"spread":.25,"burst":.9,"sy":.5,"y":.35,"rise":.3,"norot":True}]},
 "hodem":{"dur":1.0,"layers":[
   {"f":"vong","t":[0,.7],"s":[1.8,.25],"sy":.55,"e":"in","a":[.2,.9],"norot":True},
   {"f":"xoay","t":[0,1],"s":[.4,1.2],"sy":.62,"r":[0,-1.6],"glow":.5,"a":[.2,1],"norot":True},
   {"f":"thai-cuc","t":[.15,1],"s":[.3,.8],"r":[0,1.2],"a":[0,.8],"norot":True},
   {"f":"lap-lanh","t":[0,.9],"s":[.18,.05],"n":12,"spread":1.2,"burst":-1.1,"sy":.6,"norot":True},
   {"f":"sao","t":[.8,1],"s":[.3,1.3],"e":"pop","a":[1,0],"norot":True}]},
 "dong-ho":{"dur":1.0,"layers":[
   {"f":"an-2","t":[0,1],"s":[.6,1.5],"sy":.45,"r":[0,.5],"a":[.2,1],"glow":.4,"norot":True},
   {"f":"an-thai-cuc","t":[.1,.9],"s":[.4,1.0],"r":[0,-1],"a":[0,.9],"norot":True},
   {"f":"cot","t":[.55,1],"s":[1.2,1.6],"ground":True,"y":.3,"a":[1,0],"norot":True},
   {"f":"sao","t":[.6,.95],"s":[.3,1.4],"e":"pop","a":[1,0],"norot":True},
   {"f":"lap-lanh","t":[.6,1],"s":[.2,.05],"n":12,"burst":1.1,"sy":.5,"norot":True}]},
 "bang-nguc":{"dur":.9,"layers":[
   {"f":"vong","t":[0,.6],"s":[.4,1.7],"sy":.4,"y":.35,"a":[1,0],"norot":True},
   {"f":"tinh-the-2","t":[0,.8],"s":[.3,1.35],"e":"pop","ground":True,"y":.4,"glow":.5,"norot":True},
   {"f":"tinh-the","t":[.05,.8],"s":[.15,.6],"e":"pop","ground":True,"ring":.55,"n":6,"sy":.45,"y":.4,"norot":True},
   {"f":"tinh-the-2","t":[.4,1],"s":[.15,.05],"n":12,"burst":1.1,"rise":.6,"rj":.6,"norot":True},
   {"f":"sao","t":[.05,.4],"s":[.3,1.3],"e":"pop","a":[1,0],"norot":True}]},
 "trao":{"dur":.7,"layers":[
   {"f":"dau-rong","t":[0,.7],"s":[.5,1.3],"e":"pop","flip":True,"glow":.4,"a":[1,0]},
   {"f":"xoay","t":[0,.8],"s":[.4,1.1],"sy":.6,"r":[0,-1],"a":[.9,0],"norot":True},
   {"f":"lap-lanh","t":[0,.8],"s":[.18,.05],"n":10,"spread":1,"burst":-.9,"sy":.6,"norot":True}]},
 # ---- quanh mình
 "nova":{"dur":.75,"layers":[
   {"f":"vong","t":[0,.7],"s":[.3,2.1],"sy":.48,"a":[1,0],"glow":.4,"norot":True},
   {"f":"vong","t":[.12,.85],"s":[.2,1.5],"sy":.48,"a":[.7,0],"norot":True},
   {"f":"xoay","t":[0,.6],"s":[.5,1.3],"sy":.5,"r":[0,1],"a":[.9,0],"norot":True},
   {"f":"sao","t":[0,.35],"s":[.3,1.2],"e":"pop","a":[1,0],"y":-.15,"norot":True},
   {"f":"lap-lanh","t":[0,.8],"s":[.2,.05],"n":14,"burst":1.15,"sy":.5,"rj":.5,"norot":True}]},
 "nova-bang":{"dur":.85,"layers":[
   {"f":"vong","t":[0,.7],"s":[.3,2.1],"sy":.48,"a":[1,0],"glow":.4,"norot":True},
   {"f":"tinh-the","t":[0,.75],"s":[.15,.5],"e":"pop","ground":True,"ring":.75,"n":8,"sy":.5,"norot":True},
   {"f":"may-2","t":[0,.8],"s":[.6,1.2],"ring":.4,"n":4,"sy":.5,"a":[.7,0],"norot":True},
   {"f":"sao","t":[0,.35],"s":[.3,1.2],"e":"pop","a":[1,0],"y":-.15,"norot":True},
   {"f":"tinh-the-2","t":[.1,.9],"s":[.14,.04],"n":14,"burst":1.2,"sy":.5,"rj":.5,"norot":True}]},
 "mua-kiem":{"dur":1.0,"layers":[
   {"f":"an-rong","t":[0,1],"s":[.8,1.7],"sy":.45,"r":[0,.3],"a":[.9,0],"norot":True},
   {"f":"vet","t":[0,.5],"s":.5,"r":.305,"fall":1.1,"n":7,"spread":.85,"sy":.5,"e":"in","jit":.25,"norot":True,"a":[1,1]},
   {"f":"sao","t":[.4,.8],"s":[.15,.5],"n":10,"spread":.85,"sy":.5,"e":"pop","a":[1,0],"norot":True},
   {"f":"mua-kiem","t":[.1,.8],"s":[.8,1.4],"ground":True,"y":.3,"a":[.9,0],"glow":.4,"norot":True},
   {"f":"vong","t":[.35,1],"s":[.4,2.0],"sy":.45,"a":[.9,0],"norot":True}]},
 "sen-bang":{"dur":1.0,"layers":[
   {"f":"vong","t":[0,.8],"s":[.4,2.0],"sy":.45,"y":.25,"a":[1,0],"norot":True},
   {"f":"sen-2","t":[0,.9],"s":[.3,1.4],"e":"pop","ground":True,"y":.35,"glow":.5,"norot":True},
   {"f":"tinh-the-2","t":[.1,.8],"s":[.12,.5],"e":"pop","ground":True,"ring":.8,"n":6,"sy":.5,"y":.3,"norot":True},
   {"f":"lap-lanh","t":[.2,1],"s":[.18,.04],"n":12,"burst":1.1,"rise":.4,"sy":.5,"norot":True}]},
 "thoi-ngung":{"dur":1.1,"layers":[
   {"f":"an-thai-cuc","t":[0,1],"s":[.5,1.8],"sy":.45,"r":[0,.6],"a":[1,0],"glow":.4,"norot":True},
   {"f":"an-2","t":[.05,1],"s":[.3,1.2],"r":[0,-.8],"a":[.9,0],"norot":True},
   {"f":"vong","t":[0,.9],"s":[.3,2.1],"sy":.45,"a":[.9,0],"norot":True},
   {"f":"lap-lanh","t":[0,1],"s":[.18,.05],"ring":1.0,"ring_r":[0,.5],"n":12,"sy":.45,"norot":True}]},
 # ---- hồi máu, buff
 "hoi-sen":{"dur":1.1,"layers":[
   {"f":"ho-sen","t":[0,.9],"s":[.4,1.3],"e":"pop","ground":True,"y":.35,"glow":.4,"norot":True},
   {"f":"cot","t":[.1,.9],"s":[1.0,1.3],"ground":True,"y":.35,"a":[.6,0],"norot":True},
   {"f":"la","t":[0,1],"s":[.22,.12],"n":8,"spread":.5,"sy":.5,"rise":1.1,"rj":.6,"norot":True},
   {"f":"lap-lanh","t":[.1,1],"s":[.18,.05],"n":10,"spread":.6,"sy":.5,"rise":1.3,"flick":2,"norot":True}]},
 "hoi-cay":{"dur":1.2,"layers":[
   {"f":"cay","t":[0,.95],"s":[.3,1.5],"e":"pop","ground":True,"y":.35,"glow":.4,"norot":True},
   {"f":"vong","t":[0,.8],"s":[.4,1.9],"sy":.45,"y":.3,"a":[.8,0],"norot":True},
   {"f":["la","hoa"],"t":[0,1],"s":[.24,.12],"n":12,"spread":.8,"sy":.5,"rise":1.3,"rj":.7,"norot":True},
   {"f":"lap-lanh","t":[.1,1],"s":[.18,.05],"n":10,"spread":.8,"sy":.5,"rise":1.5,"flick":2,"norot":True}]},
 "khien-canh":{"dur":1.0,"layers":[
   {"f":"canh","t":[0,1],"s":[.5,1.5],"e":"pop","y":-.35,"glow":.4,"norot":True},
   {"f":"vong","t":[0,.8],"s":[.3,1.6],"sy":.45,"y":.25,"a":[1,0],"norot":True},
   {"f":"sao","t":[0,.4],"s":[.3,1.2],"e":"pop","a":[1,0],"y":-.4,"norot":True},
   {"f":"long-vu","t":[.1,1],"s":[.2,.1],"n":8,"spread":.6,"rise":1.0,"rj":.7,"norot":True}]},
 # ---- sóng (phát 3 lần dọc đường)
 "song-dat":{"dur":.7,"layers":[
   {"f":"tinh-the","t":[0,.7],"s":[.2,.9],"e":"pop","ground":True,"y":.4,"norot":True},
   {"f":"khoi","t":[0,.7],"s":[.5,1.1],"a":[.6,0],"y":.3,"norot":True},
   {"f":"vong","t":[0,.6],"s":[.3,1.2],"sy":.4,"y":.38,"a":[.8,0],"norot":True}]},
 "song-gio":{"dur":.7,"layers":[
   {"f":"may-2","t":[0,.9],"s":[.5,1.2],"dx":[-.2,.4],"a":[1,0],"glow":.3},
   {"f":"vet","t":[0,.8],"s":[.6,1.3],"n":3,"spread":.35,"r":.055,"dx":[-.3,.5],"a":[1,0]},
   {"f":"la","t":[0,1],"s":[.2,.1],"n":5,"spread":.4,"dx":[0,.6],"rj":.8}]},
 "song-hu":{"dur":.7,"layers":[
   {"f":"liem","t":[0,.7],"s":[.5,1.3],"a":[1,0],"glow":.5},
   {"f":"vet","t":[0,.8],"s":[.6,1.2],"n":3,"spread":.3,"r":.055,"dx":[-.2,.5],"a":[1,0]},
   {"f":"xoay","t":[.2,1],"s":[.3,.8],"r":[0,-1],"a":[.8,0]}]},
 # ---- lốc (loop, đi theo mover)
 "loc":{"dur":.6,"loop":True,"layers":[
   {"f":"loc-2","s":1.2,"ground":True,"y":.42,"glow":.4,"flick":3},
   {"f":"loc","s":1.0,"ground":True,"y":.42,"a":.6},
   {"f":"vong","s":.9,"sy":.35,"y":.38,"r":[0,1]},
   {"f":["la","may"],"s":.2,"ring":.45,"ring_r":[0,1],"n":6,"sy":.6,"y":-.1,"rj":.6}]},
 "loc-nhe":{"dur":.6,"loop":True,"layers":[{"f":"loc-2","s":1.0,"ground":True,"y":.42,"a":.55,"flick":3},{"f":"vong","s":.8,"sy":.35,"y":.38,"r":[0,1],"a":.5}]},
 # ---- dịch chuyển
 "chop":{"dur":.45,"layers":[
   {"f":"set","t":[0,.6],"s":[.5,1.2],"e":"pop","a":[1,0],"flick":4,"glow":.5},
   {"f":"sao","t":[0,.4],"s":[.3,1.1],"e":"pop","a":[1,0]},
   {"f":"vet","t":[0,.7],"s":[.6,1.2],"n":4,"spread":.3,"r":.055,"a":[1,0]}]},
 "tia-set":{"dur":.3,"layers":[{"f":"set","t":[0,1],"s":[.5,.7],"a":[.75,0],"flick":4,"rj":.15,"norot":True},{"f":"lap-lanh","t":[0,.6],"s":[.25,.1],"a":[.7,0],"norot":True}]},
 # ---- gồng (dưới chân)
 "tu-khi":{"dur":1.0,"layers":[
   {"f":"an-2","t":[0,1],"s":[.6,1.5],"sy":.45,"y":.3,"r":[0,.7],"a":[.2,1],"glow":.4,"norot":True},
   {"f":"cot","t":[.2,1],"s":[1.0,1.4],"ground":True,"y":.3,"a":[0,.8],"norot":True},
   {"f":"lap-lanh","t":[0,1],"s":[.18,.05],"n":14,"spread":1.2,"burst":-1.1,"sy":.5,"norot":True}]},
 # ---- pháp bảo
 "tam-kiem-hien":{"dur":.8,"layers":[{"f":"tam-kiem","t":[0,.9],"s":[.4,1.2],"e":"pop","ground":True,"y":.3,"glow":.5,"norot":True},{"f":"vong","t":[0,.8],"s":[.3,1.8],"sy":.45,"y":.25,"a":[1,0],"norot":True},{"f":"lap-lanh","t":[.1,1],"s":[.18,.05],"n":10,"burst":1,"sy":.5,"norot":True}]},
 "cau-sen-hien":{"dur":.8,"layers":[{"f":"cau-sen","t":[0,.9],"s":[.4,1.2],"e":"pop","y":-.1,"glow":.5,"norot":True},{"f":"vong","t":[0,.8],"s":[.3,1.8],"sy":.45,"y":.25,"a":[1,0],"norot":True},{"f":"giot","t":[.1,1],"s":[.2,.08],"n":8,"burst":1,"rise":.3,"sy":.5,"norot":True}]},
 "phun-lua":{"dur":.6,"layers":[{"f":"lua","t":[0,1],"s":[.4,1.0],"r":.15,"dx":[0,.6],"a":[1,0],"glow":.4},{"f":"lua-2","t":[0,1],"s":[.2,.5],"n":4,"spread":.3,"r":.15,"dx":[0,.9],"a":[1,0]}]},
 "dinh-hien":{"dur":.9,"layers":[{"f":"dinh","t":[0,.9],"s":[.4,1.2],"e":"pop","ground":True,"y":.3,"glow":.4,"norot":True},{"f":"vong","t":[0,.8],"s":[.3,1.8],"sy":.45,"y":.25,"a":[1,0],"norot":True},{"f":["la","hoa"],"t":[0,1],"s":[.22,.1],"n":10,"spread":.5,"rise":1.1,"sy":.5,"rj":.6,"norot":True}]},
 "nui-dap":{"dur":.9,"layers":[
   {"f":"nui","t":[0,.35],"s":1.0,"dy":[-1.1,0],"e":"in","a":[.4,1],"glow":.3,"norot":True},
   {"f":"nui","t":[.35,.9],"s":[1.0,1.1],"a":[1,0],"norot":True},
   {"f":"vong","t":[.33,1],"s":[.3,1.9],"sy":.4,"y":.38,"a":[1,0],"norot":True},
   {"f":"khoi","t":[.33,.95],"s":[.5,1.3],"n":3,"spread":.4,"sy":.4,"y":.3,"a":[.7,0],"norot":True},
   {"f":"tinh-the","t":[.33,.9],"s":[.15,.45],"e":"pop","ground":True,"ring":.6,"n":5,"sy":.45,"y":.38,"norot":True}]},
 "roi-kiem":{"dur":.55,"layers":[{"f":"kiem","t":[0,.4],"s":.7,"r":.5,"dy":[-1.0,0],"e":"in","a":[.6,1],"norot":True},{"f":"sao","t":[.38,.7],"s":[.2,.8],"e":"pop","a":[1,0],"norot":True},{"f":"vong","t":[.38,1],"s":[.2,1.0],"sy":.45,"y":.2,"a":[.8,0],"norot":True}]},
 "chay":{"dur":.8,"loop":True,"layers":[{"f":"lua-2","s":.55,"n":5,"spread":.55,"sy":.45,"ground":True,"y":.2,"flick":3,"jit":.3},{"f":"vong","s":1.1,"sy":.4,"y":.2,"a":.5,"r":[0,.3]}]},
 # ---- lên tầng / hồi sinh
 "len-tang":{"dur":1.0,"layers":[{"f":"cot","t":[0,.9],"s":[1.2,1.6],"ground":True,"y":.35,"a":[1,0],"glow":.4,"norot":True},{"f":"vong","t":[0,.8],"s":[.3,1.6],"sy":.45,"y":.3,"a":[1,0],"norot":True},{"f":"lap-lanh","t":[0,1],"s":[.2,.05],"n":12,"spread":.5,"rise":1.2,"sy":.5,"norot":True}]},
}
# Thiên pháp bảo (treasure-thien.js gọi d.fx.<key>): key → công thức
THIEN={
 'pb.dai-nhat-kim-luan':{'xoay':'dan-sao','trieu':'tu-khi','luan':'nova','no':'no-lon'},
 'pb.tu-dien-loi-ky':{'vong':'tu-khi','phien':'loc-nhe','set':'tia-set'},
 'pb.luu-ly-tran':{'do':'tu-khi','tia':'dan-bang','tran':'nova-bang','no':'no-lon'},
 'pb.phong-an-phien':{'do':'tu-khi','song':'song-gio','loc':'loc-nhe','no':'no'},
 'pb.hu-khong-ban':{'do':'tu-khi','tia':'song-hu','tran':'hodem','no':'no-lon'},
 'pb.tue-nguyet-sa-lau':{'trieu':'tu-khi','dong':'song-hu','ha':'thoi-ngung','hoi':'hoi-sen'},
}
def ap(fx=None,hit=None,cast=None,charge=None,**sz):
  d={}
  if fx: d['fx']=fx
  if hit: d['hit_fx']=hit
  if cast: d['cast_fx']=cast
  if charge: d['charge_fx']=charge
  d.update(sz); return d
SK={
 'hoa-cau':ap('dan-lua','no','phong-ra',fx_size=30,hit_h=46),
 'bang-tien':ap('dan-bang','no','phong-ra',fx_size=28,hit_h=44),
 'phong-nhan':ap('dan-gio','no','phong-ra',fx_size=32,hit_h=44),
 'phuong-hoang':ap('dan-phuong','no-lon','phong-ra',fx_size=66,hit_h=70),
 'loi-long-pha-khong':ap('dan-rong','no-lon','tu-khi',fx_size=78,hit_h=80),
 'moc-lien':ap('hoi-sen',fx_h=70),
 'van-moc':ap('hoi-cay',fx_h=90),
 'dia-thu':ap('gai',fx_h=70),
 'hac-dong':ap('hodem',fx_h=100),
 'thanh-quang-phan-quyet':ap('cot',charge='tu-khi',fx_h=130),
 'bang-phach-thien-nguc':ap('bang-nguc',charge='tu-khi',fx_h=120),
 'thien-thu-nhat-thuan':ap('dong-ho',charge='tu-khi',fx_h=130),
 'van-kiem':ap('mua-kiem',fx_h=110),
 'bang-phong':ap('nova-bang',fx_h=110),
 'huyen-bang-lien-hoa':ap('sen-bang',fx_h=100),
 'tue-nguyet-dinh-chi':ap('thoi-ngung',fx_h=110),
 'trieu-duong-ho-the':ap('khien-canh',fx_h=80),
 'dia-liet':ap('song-dat',fx_h=60),
 'thanh-phong-toai-anh':ap('song-gio',fx_h=64),
 'tich-diet-tram':ap('song-hu',fx_h=70),
 'cuu-u-phong-bao':ap('loc',charge='tu-khi',fx_h=110),
 'u-minh-trao':ap('trao',fx_h=80),
 'hu-khong-thon-phe':ap('hodem',charge='tu-khi',fx_h=130),
 'tu-dien-bo':ap('chop',fx_h=60),
}
PB={
 'pb.phi-kiem':ap('dan-kiem',cast='tam-kiem-hien',size=24),
 'pb.hon-phien':ap(cast='hodem'),
 'pb.thuong-hai-chau':ap('dan-giot',cast='cau-sen-hien',size=26),
 'pb.xich-ho-lo':ap('dan-lua',cast='phun-lua',size=22),
 'pb.thanh-moc-dinh':ap(cast='dinh-hien'),
 'pb.tran-son-an':ap('nui-dap',cast='nui-dap'),
}
DV={'Kim':'dan-kiem','Ám':'dan-hon','Thủy':'dan-giot','Hỏa':'dan-lua','Mộc':'dan-la','Thổ':'dan-da','Quang':'dan-sao','Lôi':'dan-set','Băng':'dan-bang','Phong':'dan-gio','Hư':'dan-hon','Thời':'dan-sao'}
out={"_ghi_chu":"Hiệu ứng ghép từ mảnh sáng (chủ dự án 25/10/2026, src/entity/vfx.js). recipes: công thức; skills / treasures / thien / daovan: chiêu nào dùng công thức nào (mã x.<công thức>.<hệ> gán lúc nạp, src/game/vfxapply.js); remap: mã hình cũ → hiệu ứng ghép (màu cố định).",
 "slug":SLUG,"colors":{"vang":"#ffe08a","trang":"#e8f4ff","do":"#ff4a4a","tim":"#b06bff"},
 "recipes":R,"skills":SK,"treasures":PB,"thien":THIEN,"daovan":{"bolt":DV,"hit":"no","rain":{"v.van-kiem":"roi-kiem","v.thuy-ba":"no-lon","v.no-hoa":"no-lon","v.dia-thu":"gai"}},
 "remap":{"vong-lua":"x.len-tang.vang","v.dan-am":"x.dan-hon.am","k.loi-lien":"x.tia-set.loi","k.dai-thanh":"x.tu-khi.vang","k.dat-chay":"x.chay.hoa","k.bao-tho":"x.song-dat.tho","v.no-hoa":"x.no-lon.hoa","v.hac-dong":"x.hodem.am","v.moc-lien":"x.hoi-sen.moc","v.tran-phap":"x.tu-khi.vang","chem-x":"x.no.trang","set-danh":"x.cot.loi","v.am-gai":"x.gai.tim","v.hoa-xoay":"x.loc.do","v.huyet-chu":"x.hodem.do","v.loi-tru":"x.cot.loi","v.no-bang":"x.no-lon.bang","v.xich-tran":"x.nova.do"}}
json.dump(out,open('data/vfx.json','w'),ensure_ascii=False,indent=1)
open('data/vfx.json','a').write('\n')
print(len(R))
