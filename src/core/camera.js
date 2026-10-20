// Camera bám theo nhân vật, không vượt mép bản đồ.
export function createCamera() {
  return { x: 0, y: 0, viewW: 0, viewH: 0 };
}

export function followCamera(cam, target, screen, worldW, worldH, wrap = false) {
  cam.viewW = screen.width / screen.scale;
  cam.viewH = screen.height / screen.scale;
  if (wrap) { // thế giới vòng lặp: không có mép, camera luôn giữ nhân vật ở giữa
    cam.x = target.x - cam.viewW / 2;
    cam.y = target.y - cam.viewH / 2;
    return;
  }
  const cx = target.x - cam.viewW / 2;
  const cy = target.y - cam.viewH / 2;
  cam.x = worldW > cam.viewW ? clamp(cx, 0, worldW - cam.viewW) : (worldW - cam.viewW) / 2;
  cam.y = worldH > cam.viewH ? clamp(cy, 0, worldH - cam.viewH) : (worldH - cam.viewH) / 2;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
