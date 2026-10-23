// Vá tính năng cho trình duyệt cũ (chủ dự án 23/10/2026: Oppo A3s, Android 8.1 — Chrome / WebView chưa cập nhật).
// Thiếu một hàm vẽ là game đứng hình, nên vá tối thiểu những gì code đang dùng. Nạp đầu tiên qua core/index.js.
if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, 'at', { configurable: true, writable: true, value(i) { i = Math.trunc(i) || 0; if (i < 0) i += this.length; return this[i]; } });
}
if (!String.prototype.at) {
  Object.defineProperty(String.prototype, 'at', { configurable: true, writable: true, value(i) { i = Math.trunc(i) || 0; if (i < 0) i += this.length; return this[i]; } });
}
for (const P of [globalThis.CanvasRenderingContext2D, globalThis.OffscreenCanvasRenderingContext2D, globalThis.Path2D]) {
  if (P && !P.prototype.roundRect) { // vẽ hình chữ nhật bo góc bằng arcTo (bán kính một số)
    P.prototype.roundRect = function (x, y, w, h, r = 0) {
      r = Math.max(0, Math.min(Array.isArray(r) ? r[0] || 0 : r, Math.abs(w) / 2, Math.abs(h) / 2));
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    };
  }
}
