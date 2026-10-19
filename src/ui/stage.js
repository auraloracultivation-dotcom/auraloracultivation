// "Sân khấu": một ảnh nền vẽ sẵn giao diện, co giãn giữ nguyên tỉ lệ để thấy trọn ảnh.
// Phần tử con đặt theo toạ độ điểm ảnh của ảnh gốc (đổi sang %), nên luôn khớp đúng chỗ đã vẽ.
export function createStage(src, w, h) {
  const wrap = document.createElement('div');
  wrap.className = 'stage-wrap';
  wrap.style.setProperty('--bg', `url("${new URL(src, location.href).href}")`); // đường dẫn tuyệt đối để CSS nào dùng cũng đúng
  const stage = document.createElement('div');
  stage.className = 'stage';
  stage.style.aspectRatio = `${w} / ${h}`;
  stage.style.setProperty('--ar', String(w / h));
  wrap.appendChild(stage);

  return {
    wrap,
    stage,
    // Đặt một phần tử vào khung chữ nhật (x, y, rộng, cao) tính theo ảnh gốc
    place(el, x, y, bw, bh) {
      Object.assign(el.style, {
        position: 'absolute',
        left: (x / w) * 100 + '%',
        top: (y / h) * 100 + '%',
        width: (bw / w) * 100 + '%',
        height: (bh / h) * 100 + '%',
      });
      stage.appendChild(el);
      return el;
    },
    mount() { document.getElementById('ui').appendChild(wrap); return this; },
    remove() { wrap.classList.add('fade-out'); setTimeout(() => wrap.remove(), 250); },
  };
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
