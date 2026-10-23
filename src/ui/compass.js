// Bản đồ tròn: game vẽ bản đồ thật vào lòng tròn, rồi đặt khung la bàn của chủ dự án
// (frames/khung-ban-do.png, sinh bằng tools/map_frame.py) đè lên trên. Dùng chung cho bản đồ nhỏ và bản đồ thế giới.
const FRAME_SRC = 'assets/ui/frames/khung-ban-do.png';
const FRAME = { w: 995, h: 980, cx: 497, cy: 500, r: 376 }; // toạ độ lòng tròn trên ảnh khung

const frameImg = new Image();
frameImg.src = FRAME_SRC;

// cssWidth: chiều rộng hiển thị của cả khung; canvas có cùng tỉ lệ với ảnh khung
// bare = true: chỉ lòng tròn, không vẽ khung la bàn (khung HUD v3 là ảnh riêng đặt đè lên)
export function setupRoundCanvas(canvas, cssWidth, bare = false) {
  const dpr = window.devicePixelRatio || 1;
  const cssH = bare ? cssWidth : (cssWidth * FRAME.h) / FRAME.w;
  canvas._bare = bare;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssH * dpr);
  return canvas;
}

// drawMap(offCanvas, size): vẽ bản đồ vào ô vuông size×size (tâm = vị trí mình)
export function drawRoundMap(canvas, drawMap) {
  const k = canvas.width / FRAME.w, bare = canvas._bare;
  const cx = bare ? canvas.width / 2 : FRAME.cx * k, cy = bare ? canvas.height / 2 : FRAME.cy * k, R = bare ? canvas.width / 2 - 1 : FRAME.r * k;
  const size = Math.max(16, Math.round(R * 2));
  const off = (canvas._off ||= document.createElement('canvas'));
  if (off.width !== size) { off.width = off.height = size; }
  drawMap(off, size);

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#10192d';
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, cx - R, cy - R, R * 2, R * 2);
  ctx.restore();
  if (!bare && frameImg.complete && frameImg.naturalWidth) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
  }
}
