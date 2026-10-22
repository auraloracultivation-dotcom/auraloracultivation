// Bảng xếp hạng (migration 0006): đọc bảng public.leaderboard, ghi qua RPC submit_leaderboard (máy chủ lọc + giới hạn 20 giây/lần).
import { supabase } from './client.js';

const COLS = 'user_id,name,stage_index,stage_name,exp,power,void_kills,stats,look,source,updated_at';
const ORDER = { realm: [['stage_index', false], ['exp', false]], power: [['power', false]], void: [['void_kills', false], ['power', false]] };

export async function submitLeaderboard(p) {
  const { error } = await supabase.rpc('submit_leaderboard', {
    p_stage_index: p.stageIndex, p_stage_name: p.stageName, p_exp: p.exp, p_power: p.power,
    p_void_kills: p.voidKills, p_stats: p.stats, p_look: p.look || null,
  });
  if (error) throw error;
}

// kind: 'realm' | 'power' | 'void'
export async function fetchLeaderboard(kind, limit = 50) {
  let q = supabase.from('leaderboard').select(COLS);
  for (const [col, asc] of ORDER[kind]) q = q.order(col, { ascending: asc });
  const { data, error } = await q.limit(limit);
  if (error) throw error;
  return data;
}

// Hạng của mình = số người xếp trên + 1 (null nếu chưa có trên bảng)
export async function fetchMyRank(kind, userId) {
  const { data: me } = await supabase.from('leaderboard').select(COLS).eq('user_id', userId).maybeSingle();
  if (!me) return null;
  const f = kind === 'realm' ? `stage_index.gt.${me.stage_index},and(stage_index.eq.${me.stage_index},exp.gt.${me.exp})`
    : kind === 'power' ? `power.gt.${me.power}` : `void_kills.gt.${me.void_kills}`;
  const { count, error } = await supabase.from('leaderboard').select('user_id', { count: 'exact', head: true }).or(f);
  if (error) throw error;
  return { rank: (count || 0) + 1, row: me };
}
