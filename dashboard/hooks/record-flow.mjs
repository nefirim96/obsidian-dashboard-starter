// Claude Code 훅: 모든 도구 호출을 한 줄씩 dashboard/data/flow.jsonl 에 남긴다.
// 대화 내용·명령어 본문·파일 내용은 저장하지 않는다. 남기는 것은
//   세션 id, 시각, 도구 이름, 파일 경로(파일 도구일 때), 스킬 이름(Skill 도구일 때),
//   하위 작업자 종류(Task 도구일 때) 뿐이다.
// 어떤 오류가 나도 Claude Code 작업을 막지 않도록 항상 조용히 끝낸다.
import { appendFileSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_LINES = 5000;
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'flow.jsonl');

try {
  let raw = '';
  for await (const c of process.stdin) raw += c;
  const ev = JSON.parse(raw || '{}');
  const ti = ev.tool_input || {};
  const tool = ev.tool_name || '';
  if (!tool) process.exit(0);

  const row = {
    sid: ev.session_id || '',
    at: new Date().toISOString(),
    tool,
    cwd: (ev.cwd || '').replace(/\\/g, '/'),
  };
  const fp = ti.file_path || ti.notebook_path || '';
  if (fp) row.path = fp.replace(/\\/g, '/');
  if (tool === 'Skill' && ti.skill) row.skill = String(ti.skill);
  if ((tool === 'Task' || tool === 'Agent') && ti.subagent_type) row.sub = String(ti.subagent_type);

  appendFileSync(out, JSON.stringify(row) + '\n');

  // 너무 커지면 최근 것만 남긴다 (약 1000줄마다 점검)
  if (Math.random() < 0.001 && existsSync(out) && statSync(out).size > 0) {
    const lines = readFileSync(out, 'utf8').split('\n').filter(Boolean);
    if (lines.length > MAX_LINES) writeFileSync(out, lines.slice(-MAX_LINES).join('\n') + '\n');
  }
} catch {}
process.exit(0);
