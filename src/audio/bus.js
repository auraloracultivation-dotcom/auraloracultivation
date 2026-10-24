// Bus âm thanh (24/10/2026): module game gọi sound('sfx.…') / music('bgm.…') / skillSound(id, he) mà không cần biết audio.js.
// main.js gắn bộ phát thật (attachAudio). Chưa gắn (đang tải, chạy thử không tiếng) thì mọi lời gọi là không làm gì.
// Bảng id ↔ file ↔ âm lượng ↔ giãn cách ↔ lệch cao độ: data/audio.json. Tiếng do tools/sfx/build.py sinh ra.
let impl = null, def = null;

export function attachAudio(audio, audioDef) { impl = audio; def = audioDef; }
// vol: nhân âm lượng (vd. ở xa nghe nhỏ hơn). Trả về hàm dừng sớm (có thể bỏ qua).
export function sound(id, vol = 1) { return impl ? impl.play(id, vol) : () => {}; }
export function music(id) { impl?.music(id); }
// Tiếng tung chiêu: theo mã kỹ năng (audio.json → skill_sfx.by_id), không có thì theo hệ, cuối cùng là tiếng mặc định
export function skillSound(id, he) {
  const m = def?.skill_sfx; if (!m) return;
  sound(m.by_id?.[id] || m.by_he?.[he] || m.default);
}
