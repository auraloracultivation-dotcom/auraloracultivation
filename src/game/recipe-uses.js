// Công thức có SỐ LẦN DÙNG (chủ dự án 23/10/2026): đan phương / công thức phôi / bí kíp không còn "mua 1 lần dùng cả đời".
// Mỗi cuốn dùng được `uses` lần thành công (data/items/recipes.json → uses, không ghi thì theo loại: DEF).
// Hết lượt thì cuốn đó mất khỏi Kho — còn cuốn khác thì dùng tiếp, không thì phải mua / nhặt lại.
// Lượt còn lại của cuốn đang dùng: progress.state.recipeUses[recipeId].
const DEF = { 'dan-phuong': 10, 'phap-khi': 3, 'cong-phap': 2, khac: 1 };

export function createRecipeUses({ progress, recipes, toast }) {
  const byId = new Map(recipes.filter((r) => r.teaches).map((r) => [r.id, r]));
  const teacher = new Map([...byId.values()].map((r) => [r.teaches, r.id])); // món dạy → cuốn công thức
  const U = () => (progress.state.recipeUses ||= {});
  const max = (rid) => byId.get(rid)?.uses ?? DEF[byId.get(rid)?.cat] ?? 5;
  const left = (rid) => (progress.count(rid) > 0 ? (U()[rid] ?? max(rid)) : 0); // lượt của cuốn đang dùng
  const total = (rid) => (progress.count(rid) > 0 ? left(rid) + (progress.count(rid) - 1) * max(rid) : 0);
  // Gọi sau mỗi lần luyện / tu luyện THÀNH CÔNG bằng công thức dạy món `teachId`
  function spend(teachId) {
    const rid = teacher.get(teachId);
    if (!rid || progress.count(rid) <= 0) return;
    const n = left(rid) - 1;
    if (n > 0) U()[rid] = n;
    else {
      delete U()[rid]; progress.take(rid, 1);
      toast(`${byId.get(rid).name} đã dùng hết${progress.count(rid) ? ` — mở cuốn tiếp (còn ${progress.count(rid)} cuốn)` : ' — mua lại ở Vạn Bảo Lâu'}`, 2400);
    }
    progress.changed();
  }
  return { teacher, owns: (id) => !teacher.has(id) || progress.count(teacher.get(id)) > 0, spend, left, total, max, isRecipe: (rid) => byId.has(rid) };
}
