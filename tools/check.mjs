// Kiểm tra tự động: JSON hợp lệ, không lộ khoá bí mật, file không quá dài, index.html không chứa logic.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { checkRefs } from './check_refs.mjs';
import { spawnSync } from 'node:child_process';

const errors = [];
const SKIP = new Set(['.git', 'node_modules']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

for (const file of walk('.')) {
  const ext = extname(file);
  if (!['.json', '.js', '.mjs', '.html', '.sql', '.md'].includes(ext)) continue;
  const text = readFileSync(file, 'utf8');

  if (ext === '.json') {
    try { JSON.parse(text); } catch (e) { errors.push(`${file}: JSON lỗi — ${e.message}`); }
  }
  if (/service_role|sb_secret_/i.test(text) && !file.startsWith('docs') && !file.endsWith('.md') && !file.startsWith('tools')) {
    errors.push(`${file}: có dấu hiệu khoá bí mật`);
  }
  if ((ext === '.js' || ext === '.mjs') && file.startsWith('src')) { // cú pháp: lỗi đánh máy (vd. chú thích // cắt ngang dòng) làm trắng cả game
    const r = spawnSync(process.execPath, ['--experimental-default-type=module', '--check', file], { encoding: 'utf8' });
    if (r.status !== 0) errors.push(`${file}: lỗi cú pháp — ${(r.stderr.match(/SyntaxError[^\n]*/) || [r.stderr.trim().split('\n').pop()])[0]}`);
  }
  if ((ext === '.js' || ext === '.mjs') && file.startsWith('src') && text.split('\n').length > 400) {
    errors.push(`${file}: quá 400 dòng, hãy tách module`);
  }
  if (file === 'index.html' && /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(text)) {
    errors.push('index.html: không được chứa logic inline, chỉ nạp src/main.js');
  }
}

try {
  errors.push(...checkRefs());
} catch (e) {
  errors.push(`Kiểm tra tham chiếu ID lỗi — ${e.message}`);
}

if (errors.length) {
  console.error('❌ Kiểm tra thất bại:\n' + errors.map(e => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log('✅ Kiểm tra đạt');
