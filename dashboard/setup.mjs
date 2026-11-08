// 처음 한 번만 실행: node dashboard/setup.mjs
// 1) dashboard/config.json 이 없으면 기본값으로 만든다.
// 2) Claude Code 전역 설정(~/.claude/settings.json)에 기록 훅 2개를 등록한다.
//    - record-md.mjs  : Claude가 만들거나 고친 .md 경로를 최근 작업으로 남긴다
//    - record-flow.mjs: 세션별 도구 호출 순서(흐름 탭)를 남긴다
//    두 훅 모두 대화 내용·파일 내용은 저장하지 않는다.
// 기존 설정은 settings.json.bak-날짜 로 백업한 뒤 고친다. 여러 번 실행해도 중복 등록되지 않는다.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const slash = p => p.replace(/\\/g, '/');

// ---- 1) 설정 파일
const cfg = join(here, 'config.json');
if (!existsSync(cfg)) {
  writeFileSync(cfg, JSON.stringify({ githubDir: '~/Documents/GitHub', port: 8765 }, null, 2) + '\n');
  console.log('만듦: dashboard/config.json');
}
mkdirSync(join(here, 'data'), { recursive: true });

// ---- 2) 훅 등록
const dir = join(homedir(), '.claude');
const file = join(dir, 'settings.json');
mkdirSync(dir, { recursive: true });
let s = {};
if (existsSync(file)) {
  try { s = JSON.parse(readFileSync(file, 'utf8')); }
  catch { console.log('~/.claude/settings.json 을 읽을 수 없어 멈춥니다. 파일 형식을 먼저 고쳐 주세요.'); process.exit(1); }
  const bak = file + '.bak-' + new Date().toISOString().slice(0, 10);
  if (!existsSync(bak)) copyFileSync(file, bak);
  console.log('백업: ' + slash(bak));
}
s.hooks ??= {};
s.hooks.PostToolUse ??= [];
const want = [
  { matcher: 'Write|Edit|MultiEdit', script: 'record-md.mjs' },
  { matcher: '*', script: 'record-flow.mjs' },
];
for (const w of want) {
  const cmd = `node "${slash(join(here, 'hooks', w.script))}"`;
  // 같은 스크립트를 가리키는 예전 등록(다른 경로 포함)은 지우고 새로 넣는다
  s.hooks.PostToolUse = s.hooks.PostToolUse
    .map(e => ({ ...e, hooks: (e.hooks || []).filter(h => !String(h.command || '').includes(w.script)) }))
    .filter(e => e.hooks.length);
  s.hooks.PostToolUse.push({ matcher: w.matcher, hooks: [{ type: 'command', command: cmd, timeout: 10 }] });
  console.log('훅 등록: ' + w.script);
}
writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
console.log('\n끝. 이제 node dashboard/serve.mjs 를 실행하고 http://localhost:' + (JSON.parse(readFileSync(cfg, 'utf8')).port || 8765) + ' 을 여세요.');
console.log('Claude Code 창은 새로 열어야 훅이 적용됩니다.');
