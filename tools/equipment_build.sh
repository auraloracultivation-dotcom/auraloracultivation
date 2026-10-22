#!/bin/sh
# Cắt lại toàn bộ hình trang bị từ ảnh gốc trong assets/*/_source (chạy từ gốc repo).
# Thêm bảng mới: chép ảnh vào _source, thêm một dòng sheet_grid ở đây, chạy lại script.
set -e
S=assets/equipment/_source
C=assets/characters/_source
E=assets/equipment
for d in trang-phuc vu-khi canh phap-tuong; do rm -f $E/$d/art.* $E/$d/manifest*.json; done

# Trang phục (đầu + tóc + thân): 50 mẫu 10x5; tay và chân vẽ sẵn bị xoá, code vẽ lại
python3 -I tools/sheet_grid.py $C/mau-dau-than-50.png $E/trang-phuc --grid 10x5 --prefix art.outfit --anchor bottom
python3 -I tools/sheet_grid.py $C/co-ban-tach-lop.png $E/trang-phuc --crop 930,898,1536,1022 --grid 6x1 --prefix art.outfit.tan-thu --manifest t2.json
python3 -I tools/merge_manifest.py $E/trang-phuc manifest t2
python3 -I tools/outfit_strip.py $E/trang-phuc

# Mặt nạ: chỉ 6 mẫu 6 hệ bản 2 (chủ dự án 23/10 xoá 85 mặt nạ cũ) — cắt cùng nhẫn / dây chuyền / linh thú ở cuối

# Vũ khí: hàng lẻ của bảng 2
python3 -I tools/sheet_grid.py $S/mat-na-vu-khi-bang-2.png $E/vu-khi --grid 10x6 --rows 1,3,5 --prefix art.weapon --anchor grip

# Cánh / hào quang sau lưng, pháp tướng
python3 -I tools/sheet_grid.py $S/canh-hao-quang.png $E/canh --grid 10x6 --prefix art.wing --anchor bottom
python3 -I tools/sheet_grid.py $S/phap-tuong.png $E/phap-tuong --grid 6x4 --prefix art.avatar --anchor bottom

python3 -I tools/art_pack.py
python3 -I tools/equip_6he.py # mặt nạ, nhẫn, dây chuyền, linh thú 6 hệ (tự chạy lại art_pack)
