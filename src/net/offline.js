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
  return { user_id: USER, name: 'Đạo hữu thử', zone_id: 'zone.start', x: 8016, y: 8016, realm: 0 };
}
export const createCharacter = getMyCharacter;
export const savePosition = async () => null;

export async function joinZone({ me, handlers }) {
  setTimeout(() => handlers.onPresence({ [me.id]: [me] }), 0);
  return { line: 1, sendMove() {}, sendChat() {}, setLook() {}, async leave() {} };
}
