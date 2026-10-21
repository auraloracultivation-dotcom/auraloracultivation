# Danh sách ảnh cần làm (xuất từ Đồ giám 21/10/2026)

Tên file = cột **Mã** + `.png` (dấu `#` đổi thành `-`). Bỏ vào thư mục con theo cột **Thư mục**.
Trạng thái: *Chưa có ảnh* = cần nhất · *Ảnh tạm* = đang dùng hình tạm, nên thay. Mục "Đã có ảnh" không liệt kê ở đây.

## Kỹ năng người → `assets/_gpt/kynang/`

Quy cách: A) icon nút tròn 512×512 (không vẽ viền tròn) + B) dải hiệu ứng 1 hàng 8 khung 256×256

| Mã | Tên | Trạng thái | Thông tin |
|---|---|---|---|
| `skill.attack` | Đánh thường | Ảnh tạm | Nút: tan-cong.png · Chém vũ khí vào mục tiêu gần nhất |
| `skill.linh-thu` | Linh thú | Ảnh tạm | Linh thú đang dùng chó trắng (gói miễn phí) · chưa có hình linh thú riêng · Gọi linh thú đánh cùng 30s · hồi 40s · mở ở Kết Đan, cần đeo linh thú |
| `skill.luot` | Lướt | Chưa có ảnh | Nút: luot.png · Chưa có hình hiệu ứng · Tăng né ×1.5 và tốc độ trong 3s · hồi 8s · mở ở Kết Đan |
| `skill.phap-tuong` | Pháp tướng hoá hình | Chưa có ảnh | Hình = pháp tướng đang đeo (xem Trang bị) · Nút: phap-tuong.png · Chưa có hình hiệu ứng · +60% công, +25% thủ khi hiện; tốn linh lực liên tục |
| `skill.bay` | Ngự kiếm phi hành | Chưa có ảnh | Nút: bay.png · Chưa có hình hiệu ứng · Cầm kiếm mới bay được · tốn linh lực mỗi giây |
| `skill.len-tang` | Lên tầng / hồi sinh | Ảnh tạm | Nút: tan-cong.png · Vòng sáng khi lên tầng nhỏ hoặc hồi sinh |

## Kỹ năng quái · hiệu ứng → `assets/_gpt/quaiskill/`

Quy cách: A) icon nút tròn 512×512 + B) dải hiệu ứng 1 hàng 8 khung 256×256

| Mã | Tên | Trạng thái | Thông tin |
|---|---|---|---|
| `mskill.thuong` | Quái: đòn thường | Ảnh tạm | Nút: tan-cong.png · Máu bắn khi người chơi trúng đòn |
| `mskill.nang` | Quái: đòn nặng | Ảnh tạm | Nút: tan-cong.png · Mỗi 4 đòn: vòng đỏ 0.9s rồi đánh ×2.5 · chạy khỏi vòng để né |
| `mskill.chet` | Quái gục | Ảnh tạm | Nút: tan-cong.png · Khói tan khi quái chết |
| `fx.mat-quy` | Hiệu ứng mat-quy | Ảnh tạm | Chưa gắn vào kỹ năng nào |
| `fx.no-lua` | Hiệu ứng no-lua | Ảnh tạm | Chưa gắn vào kỹ năng nào |

## Quái vật → `assets/_gpt/quai/`

Quy cách: sprite sheet 4 hàng (đứng / đi / đánh / chết) × 6 khung, mỗi khung 256×256, nhìn sang PHẢI

| Mã | Tên | Trạng thái | Thông tin |
|---|---|---|---|
| `monster.xanh.yeu-ho.001` | Yêu Hồ Sơ | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Chỉ 1 hình đứng yên, chưa có chuyển động đi / đánh / chết · Quái thường · Vùng Xanh · cảnh giới lk1–3 · Khí huyết 90–140 · Công 10–16 · Thủ 6–10 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.xanh.thanh-xa.001` | Thanh Xà Yêu | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Chỉ 1 hình đứng yên, chưa có chuyển động đi / đánh / chết · Quái thường · Vùng Xanh · cảnh giới lk2–4 · Khí huyết 120–180 · Công 14–22 · Thủ 8–14 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.xanh.thach-giap.001` | Thạch Giáp Thú | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Dùng chung hình với: Hàn Giáp Thú · Chỉ 1 hình đứng yên, chưa có chuyển động đi / đánh / chết · Quái thường · Vùng Xanh · cảnh giới lk4–6 · Khí huyết 180–280 · Công 18–28 · Thủ 15–25 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.xanh.hac-lang-vuong.001` | Hắc Lang Vương | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Dùng chung hình với: Sơn Động Lão Yêu · Tinh anh · Vùng Xanh · cảnh giới lk6–8 · Khí huyết 450–650 · Công 35–50 · Thủ 22–32 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.xanh.son-dong-lao-yeu.001` | Sơn Động Lão Yêu | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Dùng chung hình với: Hắc Lang Vương · Đổi màu từ hình khác · Boss · Vùng Xanh · cảnh giới lk8–10 · Khí huyết 900–1300 · Công 55–75 · Thủ 30–42 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.cam.huyet-sai.001` | Huyết Sài | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Quái thường · Vùng Cam · cảnh giới tc_so · Khí huyết 380–520 · Công 40–58 · Thủ 28–40 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.cam.diem-xa.001` | Diễm Xà | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Quái thường · Vùng Cam · cảnh giới tc_so–trung · Khí huyết 480–650 · Công 50–70 · Thủ 32–48 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.cam.nham-giap.001` | Nham Giáp Thú | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Dùng chung hình với: Huyền Giáp Thú · Chỉ 1 hình đứng yên, chưa có chuyển động đi / đánh / chết · Quái thường · Vùng Cam · cảnh giới tc_trung · Khí huyết 600–850 · Công 55–80 · Thủ 50–70 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.cam.huyet-lang-vuong.001` | Huyết Lang Vương | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Dùng chung hình với: Hỏa Vực Ma Tôn · Tinh anh · Vùng Cam · cảnh giới tc_trung–hau · Khí huyết 1600–2200 · Công 95–130 · Thủ 55–75 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.cam.hoa-vuc-ma-ton.001` | Hỏa Vực Ma Tôn | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Dùng chung hình với: Huyết Lang Vương · Đổi màu từ hình khác · Boss · Vùng Cam · cảnh giới tc_hau · Khí huyết 4200–5500 · Công 160–210 · Thủ 70–95 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.trang.bang-ho.001` | Băng Hồ | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Chỉ 1 hình đứng yên, chưa có chuyển động đi / đánh / chết · Quái thường · Vùng Trắng · cảnh giới kd_so · Khí huyết 1300–1800 · Công 95–130 · Thủ 65–90 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.trang.tuyet-ung.001` | Tuyết Ưng | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Đổi màu từ hình khác · Chỉ 1 hình đứng yên, chưa có chuyển động đi / đánh / chết · Quái thường · Vùng Trắng · cảnh giới kd_so–trung · Khí huyết 1600–2300 · Công 110–155 · Thủ 70–100 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.trang.han-giap.001` | Hàn Giáp Thú | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Dùng chung hình với: Thạch Giáp Thú · Đổi màu từ hình khác · Chỉ 1 hình đứng yên, chưa có chuyển động đi / đánh / chết · Quái thường · Vùng Trắng · cảnh giới kd_trung · Khí huyết 2200–3000 · Công 130–180 · Thủ 110–150 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.trang.bang-hon-tuong.001` | Băng Hồn Tướng | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Đổi màu từ hình khác · Tinh anh · Vùng Trắng · cảnh giới kd_trung–hau · Khí huyết 7000–10000 · Công 250–340 · Thủ 130–180 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.trang.tuyet-son-lao-to.001` | Tuyết Sơn Lão Tổ | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Dùng chung hình với: Thượng Cổ Chiến Tướng · Đổi màu từ hình khác · Boss · Vùng Trắng · cảnh giới kd_hau · Khí huyết 16000–22000 · Công 380–480 · Thủ 160–220 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.xam.co-chien-hon.001` | Cổ Chiến Hồn | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Chỉ 1 hình đứng yên, chưa có chuyển động đi / đánh / chết · Quái thường · Vùng Xám · cảnh giới na_so · Khí huyết 4500–6500 · Công 240–330 · Thủ 150–210 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.xam.doc-yeu.001` | Độc Yêu | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Chỉ 1 hình đứng yên, chưa có chuyển động đi / đánh / chết · Quái thường · Vùng Xám · cảnh giới na_so–trung · Khí huyết 5500–8000 · Công 280–380 · Thủ 160–230 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.xam.huyen-giap.001` | Huyền Giáp Thú | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Dùng chung hình với: Nham Giáp Thú · Đổi màu từ hình khác · Chỉ 1 hình đứng yên, chưa có chuyển động đi / đánh / chết · Quái thường · Vùng Xám · cảnh giới na_trung · Khí huyết 7000–10000 · Công 320–430 · Thủ 220–300 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.xam.thuong-co-chien-tuong.001` | Thượng Cổ Chiến Tướng | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Dùng chung hình với: Tuyết Sơn Lão Tổ · Tinh anh · Vùng Xám · cảnh giới na_trung–hau · Khí huyết 22000–32000 · Công 580–780 · Thủ 250–350 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |
| `monster.than.hu-khong-thu.001` | Hư Không Thú | Ảnh tạm | Hình thử nghiệm (gói miễn phí / chưa rõ nguồn) · Đổi màu từ hình khác · Chỉ 1 hình đứng yên, chưa có chuyển động đi / đánh / chết · Quái thường · Vùng Than · cảnh giới ht_so–trung · Khí huyết 22000–32000 · Công 620–850 · Thủ 360–500 · Đòn nặng mỗi 4 đòn (×2.5 sát thương, vòng đỏ báo trước) |

## Trang bị → `assets/_gpt/trangbi/`

Quy cách: xem luật trang bị trong README

| Mã | Tên | Trạng thái | Thông tin |
|---|---|---|---|
| `slot.mat-na` | Mặt nạ (đồ 6 hệ) | Chưa có ảnh | Ô này chưa hiện trên người — cần ảnh icon + (nếu muốn) ảnh mặc lên người · Chưa có món nào trong Kho cho ô này |
| `slot.nhan` | Nhẫn (đồ 6 hệ) | Chưa có ảnh | Ô này chưa hiện trên người — cần ảnh icon + (nếu muốn) ảnh mặc lên người · Chưa có món nào trong Kho cho ô này |
| `slot.day-chuyen` | Dây chuyền (đồ 6 hệ) | Chưa có ảnh | Ô này chưa hiện trên người — cần ảnh icon + (nếu muốn) ảnh mặc lên người · Chưa có món nào trong Kho cho ô này |
| `slot.linh-thu` | Linh thú (đồ 6 hệ) | Chưa có ảnh | Ô này chưa hiện trên người — cần ảnh icon + (nếu muốn) ảnh mặc lên người · Chưa có món nào trong Kho cho ô này |

## Phôi luyện → `assets/_gpt/phoi/`

Quy cách: xem luật trang bị trong README

| Mã | Tên | Trạng thái | Thông tin |
|---|---|---|---|
| `recipe.phoi.vu-khi.001-1` | Thanh Phong Kiếm | Ảnh tạm | Đang mượn ngẫu nhiên 1 trong 30 hình kho chung · Phôi Vũ khí · Mở ở lk1 · tỷ lệ 95% |
| `recipe.phoi.vu-khi.001-2` | Huyết Ảnh Kiếm | Ảnh tạm | Đang mượn ngẫu nhiên 1 trong 30 hình kho chung · Phôi Vũ khí · Mở ở lk1 · tỷ lệ 95% |
| `recipe.phoi.vu-khi.001-3` | Huyền Thiên Kiếm | Ảnh tạm | Đang mượn ngẫu nhiên 1 trong 30 hình kho chung · Phôi Vũ khí · Mở ở lk1 · tỷ lệ 95% |
| `recipe.phoi.trang-phuc.001-1` | Thanh Vân Đạo Bào | Ảnh tạm | Đang mượn ngẫu nhiên 1 trong 56 hình kho chung · Phôi Trang phục · Mở ở lk1 · tỷ lệ 95% |
| `recipe.phoi.trang-phuc.001-2` | Huyết Chiến Y | Ảnh tạm | Đang mượn ngẫu nhiên 1 trong 56 hình kho chung · Phôi Trang phục · Mở ở lk1 · tỷ lệ 95% |
| `recipe.phoi.trang-phuc.001-3` | Huyền Giáp | Ảnh tạm | Đang mượn ngẫu nhiên 1 trong 56 hình kho chung · Phôi Trang phục · Mở ở lk1 · tỷ lệ 95% |
| `recipe.phoi.nhan.001-1` | Linh Giới Chỉ | Chưa có ảnh | Chưa có hình · Phôi Nhẫn · Mở ở lk1 · tỷ lệ 92% |
| `recipe.phoi.nhan.001-2` | Huyết Ngọc Giới | Chưa có ảnh | Chưa có hình · Phôi Nhẫn · Mở ở lk1 · tỷ lệ 92% |
| `recipe.phoi.day-chuyen.001-1` | Thanh Tâm Hạng Liên | Chưa có ảnh | Chưa có hình · Phôi Dây chuyền · Mở ở lk3 · tỷ lệ 90% |
| `recipe.phoi.day-chuyen.001-2` | Huyền Ngọc Liên | Chưa có ảnh | Chưa có hình · Phôi Dây chuyền · Mở ở lk3 · tỷ lệ 90% |
| `recipe.phoi.mat-na.001-1` | Hồ Diện | Chưa có ảnh | Chưa có hình · Phôi Mặt nạ · Mở ở lk5 · tỷ lệ 88% |
| `recipe.phoi.mat-na.001-2` | Băng Phách Mặt Nạ | Chưa có ảnh | Chưa có hình · Phôi Mặt nạ · Mở ở lk5 · tỷ lệ 88% |
| `recipe.phoi.mat-na.001-3` | Hắc Vực Diện | Chưa có ảnh | Chưa có hình · Phôi Mặt nạ · Mở ở lk5 · tỷ lệ 88% |
| `recipe.phoi.linh-thu.001-1` | Linh Hồ Ấn | Chưa có ảnh | Chưa có hình · Phôi Linh thú · Mở ở kd_so · tỷ lệ 75% |
| `recipe.phoi.linh-thu.001-2` | Huyết Lang Khế | Chưa có ảnh | Chưa có hình · Phôi Linh thú · Mở ở kd_so · tỷ lệ 75% |
| `recipe.phoi.linh-thu.001-3` | Huyền Thú Phù | Chưa có ảnh | Chưa có hình · Phôi Linh thú · Mở ở kd_so · tỷ lệ 75% |
| `recipe.phoi.canh.001-1` | Thanh Phong Dực | Ảnh tạm | Đang mượn ngẫu nhiên 1 trong 60 hình kho chung · Phôi Cánh · Mở ở na_so · tỷ lệ 65% |
| `recipe.phoi.canh.001-2` | Huyết Diễm Dực | Ảnh tạm | Đang mượn ngẫu nhiên 1 trong 60 hình kho chung · Phôi Cánh · Mở ở na_so · tỷ lệ 65% |
| `recipe.phoi.canh.001-3` | Hư Không Dực | Ảnh tạm | Đang mượn ngẫu nhiên 1 trong 60 hình kho chung · Phôi Cánh · Mở ở na_so · tỷ lệ 65% |
| `recipe.phoi.phap-tuong.001-1` | Thiên Tôn Pháp Tướng | Ảnh tạm | Đang mượn ngẫu nhiên 1 trong 24 hình kho chung · Phôi Pháp tướng · Mở ở ht_so · tỷ lệ 50% |
| `recipe.phoi.phap-tuong.001-2` | Hắc Vực Pháp Tướng | Ảnh tạm | Đang mượn ngẫu nhiên 1 trong 24 hình kho chung · Phôi Pháp tướng · Mở ở ht_so · tỷ lệ 50% |

## Khác → `assets/_gpt/khac/`

Quy cách: icon 512×512

| Mã | Tên | Trạng thái | Thông tin |
|---|---|---|---|
| `linh-thach` | Linh thạch | Ảnh tạm | Icon gói miễn phí · Tiền tệ: mua ở Vạn Bảo Lâu, hồi sinh tại chỗ |
| `slot.trang-phuc` | Icon ô Trang phục | Ảnh tạm | Icon gói miễn phí (bảng Nhân vật, ô trống) |
| `slot.vu-khi` | Icon ô Vũ khí | Ảnh tạm | Icon gói miễn phí (bảng Nhân vật, ô trống) |
| `slot.canh` | Icon ô Cánh | Ảnh tạm | Icon gói miễn phí (bảng Nhân vật, ô trống) |
| `slot.phap-tuong` | Icon ô Pháp tướng | Ảnh tạm | Icon gói miễn phí (bảng Nhân vật, ô trống) |
| `slot.mat-na` | Icon ô Mặt nạ | Ảnh tạm | Icon gói miễn phí (bảng Nhân vật, ô trống) |
| `slot.nhan` | Icon ô Nhẫn | Ảnh tạm | Icon gói miễn phí (bảng Nhân vật, ô trống) |
| `slot.day-chuyen` | Icon ô Dây chuyền | Ảnh tạm | Icon gói miễn phí (bảng Nhân vật, ô trống) |
| `slot.linh-thu` | Icon ô Linh thú | Ảnh tạm | Icon gói miễn phí (bảng Nhân vật, ô trống) |

