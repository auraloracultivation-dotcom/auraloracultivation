// Bàn phím ảo trên điện thoại (nhất là iPhone/Safari): khi gõ chữ, Safari tự đẩy cả trang lên để ô nhập
// không bị che → màn game bị kéo theo. Ở đây bù lại đúng khoảng đẩy để game và HUD đứng yên,
// và báo chiều cao phần nhìn thấy để chỉ thanh chat được đưa lên ngay trên bàn phím.
export function watchKeyboard(onChange) {
  const vv = window.visualViewport;
  const layers = [document.getElementById('game'), document.getElementById('ui')];
  const apply = () => {
    const offset = vv ? vv.offsetTop : 0;
    const visible = vv ? vv.height : window.innerHeight;
    for (const el of layers) el.style.transform = offset ? `translateY(${offset}px)` : '';
    // Game/HUD đã bù offset nên đứng yên trên màn; bàn phím che phần dưới cao (innerHeight − visible)
    const covered = Math.max(0, window.innerHeight - visible);
    onChange({ covered, visible });
  };
  vv?.addEventListener('resize', apply);
  vv?.addEventListener('scroll', apply);
  addEventListener('resize', apply);
  // trang không bao giờ được cuộn (chỉ visualViewport được phép dịch)
  addEventListener('scroll', () => { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); });
  apply();
  return apply;
}
