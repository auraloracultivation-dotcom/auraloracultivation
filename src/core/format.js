// Số lớn cho gọn (cảnh giới cao chỉ số lên tới hàng trăm triệu): 123456 → "123,5k", 4567890 → "4,57tr", 2,3e9 → "2,3 tỷ"
export function compactNum(n) {
  const a = Math.abs(n);
  const f = (v, d) => v.toFixed(d).replace(/\.?0+$/, '').replace('.', ',');
  if (a >= 1e9) return `${f(n / 1e9, 2)} tỷ`;
  if (a >= 1e6) return `${f(n / 1e6, 2)}tr`;
  if (a >= 1e5) return `${f(n / 1e3, 1)}k`;
  return String(Math.round(n));
}
// Rút gọn mọi số ≥ 100.000 trong một câu chữ (số bay trên đầu)
export const compactText = (s) => String(s).replace(/\d{6,}/g, (m) => compactNum(Number(m)));
