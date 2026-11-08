// Claude Code 훅: Write/Edit 로 .md 파일(SKILL.md 포함)이 만들어지거나 고쳐지면
// 그 경로만 dashboard/data/recent.json 에 기록한다. 파일 내용은 읽지도 보내지도 않는다.
// 어떤 오류가 나도 Claude Code 작업을 막지 않도록 항상 조용히 끝낸다.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX = 300;
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'recent.json');

try {
  let raw = '';
  for await (const c of process.stdin) raw += c;
  const ev = JSON.parse(raw || '{}');
  const p = ev.tool_input?.file_path || ev.tool_input?.notebook_path || '';
  if (!/\.md$/i.test(p)) process.exit(0);

  const path = p.replace(/\\/g, '/');
  // 임시 폴더·휴지통·node_modules 는 기록하지 않는다
  if (/\/(node_modules|\.git|\.trash|_backup[^/]*)\//i.test(path) || /\/AppData\/Local\/Temp\//i.test(path)) process.exit(0);

  let list = [];
  try { list = JSON.parse(readFileSync(out, 'utf8')); if (!Array.isArray(list)) list = []; } catch {}
  const prev = list.find(x => x.path.toLowerCase() === path.toLowerCase());
  list = list.filter(x => x !== prev);
  list.unshift({
    path,
    name: basename(path) === 'SKILL.md' ? basename(dirname(path)) : basename(path, '.md'),
    skill: basename(path) === 'SKILL.md',
    tool: ev.tool_name || '',
    cwd: (ev.cwd || '').replace(/\\/g, '/') || prev?.cwd || '',
    at: new Date().toISOString(),
    count: (prev?.count || 0) + 1,
    first: prev?.first || new Date().toISOString(),
  });
  const tmp = out + '.tmp';
  writeFileSync(tmp, JSON.stringify(list.slice(0, MAX), null, 1));
  renameSync(tmp, out);
} catch {}
process.exit(0);
