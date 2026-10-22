// Chế độ CHƠI THỬ MỘT MÌNH, không cần mạng: mở game với ?offline trong đường dẫn.
// Cùng các hàm như src/net/index.js nhưng không gọi Supabase: không đăng nhập, không thấy người khác, không lưu vị trí lên máy chủ.
// Dùng để thử luật chơi (quái, nhiệm vụ…) và để AI kiểm thử tự động. Không dùng cho chơi thật.
const USER = 'offline-thu';

export const getSession = async () => ({ user: { id: USER } });
export const signIn = async () => ({ user: { id: USER } });
export const signUp = signIn;
export const signOut = async () => {};
export const requestPasswordReset = async () => {};
export const updatePassword = async () => {};
export const isPasswordRecovery = () => false;

export async function getMyCharacter() {
  return { user_id: USER, name: 'Đạo hữu thử', zone_id: 'zone.start', x: 16016, y: 16016, realm: 0 };
}
export const createCharacter = getMyCharacter;
export const savePosition = async () => null;
export const respawnAtTown = async () => null;
export const syncServerTime = async () => {};
export const serverNow = () => Date.now();
export const timeSynced = () => true;
// Bảng xếp hạng chơi một mình: chỉ có mình
let mine = null;
const row = () => mine && { user_id: USER, name: 'Đạo hữu thử', stage_index: mine.stageIndex, stage_name: mine.stageName, exp: mine.exp,
  power: mine.power, void_kills: mine.voidKills, stats: mine.stats, look: mine.look, source: 'client', updated_at: new Date().toISOString() };
export const submitLeaderboard = async (p) => { mine = p; };
export const fetchLeaderboard = async () => (mine ? [row()] : []);
export const fetchMyRank = async () => (mine ? { rank: 1, row: row() } : null);

export async function joinZone({ me, handlers }) {
  setTimeout(() => { handlers.onPresence({ [me.id]: [me] }); handlers.onOnline?.(1); }, 0);
  return { line: 1, sendMove() {}, sendChat() {}, setLook() {}, setRealm() {}, async leave() {} };
}
