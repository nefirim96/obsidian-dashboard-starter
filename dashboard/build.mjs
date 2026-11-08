// 사용법: node dashboard/build.mjs  →  dashboard/index.html 생성
// 볼트의 모든 마크다운을 읽어 노트, [[링크]], 백링크를 대시보드에 반영한다.
// 개인 스킬(~/.claude/skills)과 플러그인 스킬(~/.claude/plugins)도 함께 읽는다.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const userClaude = join(homedir(), '.claude');
const rd = p => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n');
const fm = t => {
  const m = t.match(/^---\n([\s\S]*?)\n---/); const o = {};
  if (!m) return o;
  // key: value 와 여러 줄 값(>- , |)을 읽는다
  let key = null, block = false;
  for (const l of m[1].split('\n')) {
    if (block && /^\s+\S/.test(l)) { o[key] = (o[key] ? o[key] + ' ' : '') + l.trim(); continue; }
    block = false;
    const i = l.indexOf(':');
    if (i > 0 && !/^\s/.test(l)) {
      key = l.slice(0, i).trim(); const v = l.slice(i + 1).trim();
      if (/^[>|][-+]?$/.test(v)) { o[key] = ''; block = true; } else o[key] = v.replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return o;
};
const ls = d => existsSync(join(root, d)) ? readdirSync(join(root, d)) : [];
const walk = d => ls(d).flatMap(f => {
  const p = d ? `${d}/${f}` : f;
  if (statSync(join(root, p)).isDirectory()) return walk(p);
  return f.endsWith('.md') ? [p] : [];
});

// 사용자 폴더 아래의 SKILL.md를 모두 찾는다 (깊이 제한, node_modules·.git 제외)
function findSkillFiles(dir, depth = 0, out = []) {
  if (!existsSync(dir) || depth > 7) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name.startsWith('_backup')) continue; // 휴지통(.trash)·백업 제외
    const p = join(dir, e.name);
    if (e.isDirectory()) findSkillFiles(p, depth + 1, out);
    else if (e.name === 'SKILL.md') out.push(p);
  }
  return out;
}
function externalSkills(taken) {
  const items = [
    ...findSkillFiles(join(userClaude, 'skills')).map(p => ({ p, source: '개인 스킬' })),
    ...findSkillFiles(join(userClaude, 'plugins')).map(p => ({ p, source: '플러그인' })),
  ];
  const out = [];
  for (const { p, source } of items) {
    const name = basename(dirname(p));
    if (taken.has(name)) continue;
    taken.add(name);
    const raw = readFileSync(p, 'utf8').replace(/\r\n/g, '\n'), meta = fm(raw);
    out.push({
      id: 'ext/' + name, path: p.replace(homedir(), '~').replace(/\\/g, '/'), name,
      title: meta.title || meta.name || name, group: 'skills', hub: false,
      body: raw.replace(/^---\n[\s\S]*?\n---\n?/, ''), meta: { ...meta, source }, links: [],
    });
  }
  return out;
}

// 깃허브 작업 폴더(프로젝트별 README·문서 등)의 마크다운을 모두 모은다
// 설정은 dashboard/config.json 에서 읽는다 (없으면 기본값)
export const CONFIG = (() => {
  const def = { githubDir: join(homedir(), 'Documents', 'GitHub'), port: 8765 };
  try { return { ...def, ...JSON.parse(readFileSync(join(here, 'config.json'), 'utf8')) }; } catch { return def; }
})();
const GITHUB = (CONFIG.githubDir || '').replace(/^~(?=$|[\\/])/, homedir());
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '__pycache__', 'vendor', '.next', 'target']);
function findMd(dir, depth = 0, out = []) {
  if (!existsSync(dir) || depth > 6) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) findMd(p, depth + 1, out);
    else if (e.name.toLowerCase().endsWith('.md')) out.push(p);
  }
  return out;
}
function githubDocs() {
  if (!GITHUB || !existsSync(GITHUB)) return [];
  // 이 볼트 자신이 깃허브 폴더 안에 있으면 중복해서 읽지 않는다
  const self = root.toLowerCase();
  return findMd(GITHUB).filter(p => !p.toLowerCase().startsWith(self)).map(p => {
    const raw = readFileSync(p, 'utf8').replace(/\r\n/g, '\n'), meta = fm(raw);
    const rel = p.slice(GITHUB.length + 1).replace(/\\/g, '/');
    const heading = (raw.replace(/^---\n[\s\S]*?\n---\n?/, '').match(/^#\s+(.+)$/m) || [])[1];
    const name = basename(p, '.md');
    return {
      id: 'gh/' + rel.replace(/\.md$/i, ''), path: p.replace(homedir(), '~').replace(/\\/g, '/'), name,
      title: meta.title || heading || name, group: 'github', hub: false,
      body: raw.replace(/^---\n[\s\S]*?\n---\n?/, ''), meta: { ...meta, project: rel.split('/')[0] }, links: [],
    };
  });
}

export function build() {
  const files = ['AGENTS.md', 'CLAUDE.md', ...['second-brain', 'MEMORY', 'inbox', 'projects', 'archive', 'routines', '.claude/skills'].flatMap(walk)].filter(p => existsSync(join(root, p)));

  const groupOf = p => {
    const s = p.split('/');
    if (p === 'AGENTS.md' || p === 'CLAUDE.md') return 'core';
    if (s[0] === 'second-brain') return s[1].replace('.md', '');
    if (s[0] === '.claude') return 'skills';
    return s[0];
  };
  const notes = files.map(p => {
    const raw = rd(p), meta = fm(raw), id = p.replace(/\.md$/, '');
    const name = basename(id) === 'SKILL' ? basename(dirname(id)) : basename(id);
    return { id, path: p, name, title: meta.title || name, group: groupOf(p), hub: /^second-brain\/[^/]+\.md$/.test(p), body: raw.replace(/^---\n[\s\S]*?\n---\n?/, ''), meta, links: [] };
  });

  // 경로 또는 파일 이름으로 [[링크]]를 찾는다
  const byId = new Map(notes.map(n => [n.id, n])), byName = new Map();
  notes.forEach(n => { if (!byName.has(n.name)) byName.set(n.name, n); });
  const resolve = l => { const t = l.split('|')[0].split('#')[0].trim(); return byId.get(t) || byName.get(basename(t)) || null; };
  const broken = [];
  notes.forEach(n => {
    const set = new Set();
    for (const m of n.body.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const t = resolve(m[1]);
      if (t && t !== n) set.add(t.id); else if (!t) broken.push(`${n.path} -> ${m[1]}`);
    }
    n.links = [...set];
  });

  const extra = [...externalSkills(new Set(notes.filter(n => n.group === 'skills').map(n => n.name))), ...githubDocs()];

  // 훅이 기록한 "Claude가 최근 만들거나 고친 md" 목록. 이미 읽은 파일이면 그 노트를 가리키고,
  // 볼트·스킬·깃허브 밖의 파일이면 '최근 작업' 노트로 새로 읽어 온다.
  const absOf = n => (n.path.startsWith('~') ? homedir() + n.path.slice(1) : /^[A-Za-z]:/.test(n.path) ? n.path : join(root, n.path)).replace(/\\/g, '/').toLowerCase();
  const byAbs = new Map([...notes, ...extra].map(n => [absOf(n), n]));
  const recentRaw = existsSync(join(root, 'dashboard/data/recent.json')) ? (() => { try { return JSON.parse(rd('dashboard/data/recent.json')); } catch { return []; } })() : [];
  // 작업 흐름: 세션별로 묶은 도구 호출 기록 (대화 내용은 없다)
  const flow = (() => {
    if (!existsSync(join(root, 'dashboard/data/flow.jsonl'))) return [];
    const rows = rd('dashboard/data/flow.jsonl').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const by = new Map();
    for (const r of rows) { const k = r.sid || 'unknown'; if (!by.has(k)) by.set(k, []); by.get(k).push(r); }
    return [...by.entries()].map(([sid, list]) => {
      const cwd = (list.findLast(x => x.cwd) || {}).cwd || '';
      return { sid, cwd, project: cwd ? basename(cwd) : '', start: list[0].at, end: list[list.length - 1].at, n: list.length,
        steps: list.slice(-300).map(x => ({ at: x.at, tool: x.tool, path: x.path ? x.path.split('/').pop() : '', full: x.path || '', skill: x.skill || '', sub: x.sub || '' })) };
    }).sort((a, b) => (a.end < b.end ? 1 : -1)).slice(0, 60);
  })();
  const recent = [];
  for (const r of recentRaw) {
    if (!existsSync(r.path)) continue; // 지워진 파일은 건너뛴다
    let n = byAbs.get(r.path.toLowerCase());
    if (!n) {
      const raw = readFileSync(r.path, 'utf8').replace(/\r\n/g, '\n'), meta = fm(raw);
      const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, '');
      const home = homedir().replace(/\\/g, '/');
      n = {
        id: 'rc/' + r.path, path: r.path.startsWith(home) ? '~' + r.path.slice(home.length) : r.path, name: r.name,
        title: meta.title || meta.name || (body.match(/^#\s+(.+)$/m) || [])[1] || r.name,
        group: r.skill ? 'skills' : 'recent', hub: false, body, meta: { ...meta, source: r.skill ? '최근 작업 스킬' : '최근 작업', project: r.cwd ? basename(r.cwd) : '' }, links: [],
      };
      extra.push(n); byAbs.set(r.path.toLowerCase(), n);
    }
    recent.push({ id: n.id, at: r.at, count: r.count || 1, cwd: r.cwd || '', tool: r.tool || '' });
  }

  // 볼트 밖 파일(스킬·깃허브·최근 작업)의 [[링크]]도 이어서, 지식 그래프가 쓰는 만큼 촘촘해지게 한다
  const allById = new Map([...notes, ...extra].map(n => [n.id, n])), allByName = new Map();
  [...notes, ...extra].forEach(n => { if (!allByName.has(n.name)) allByName.set(n.name, n); if (!allByName.has(n.title)) allByName.set(n.title, n); });
  const resolveAll = l => { const t = l.split('|')[0].split('#')[0].trim(); return allById.get(t) || allByName.get(basename(t)) || allByName.get(t) || null; };
  extra.forEach(n => {
    const set = new Set();
    for (const m of n.body.matchAll(/\[\[([^\]]+)\]\]/g)) { const t = resolveAll(m[1]); if (t && t !== n) set.add(t.id); }
    n.links = [...set];
  });
  // 파일이 언제 마지막으로 바뀌었는지 (그래프에서 새로 쌓인 지식을 밝게 보여 주는 데 쓴다)
  const mt = p => { try { return Math.round(statSync(p).mtimeMs); } catch { return 0; } };
  notes.forEach(n => { n.mtime = mt(join(root, n.path)); });
  extra.forEach(n => { n.mtime = mt(n.path.startsWith('~') ? homedir() + n.path.slice(1) : n.path); });

  // 영어 스킬은 한국어 제목·설명을 붙여 한글로 찾을 수 있게 한다
  const ko = existsSync(join(root, 'dashboard/data/skills-ko.json')) ? JSON.parse(rd('dashboard/data/skills-ko.json')) : {};
  [...notes, ...extra].filter(n => n.group === 'skills' && ko[n.name]).forEach(n => { n.meta.ko_t = ko[n.name][0]; n.meta.ko_d = ko[n.name][1]; });
  notes.filter(n => n.group === 'skills' && !n.meta.source).forEach(n => { n.meta.source = '업무 노트 볼트'; });

  const skills = ls('.claude/skills').filter(d => existsSync(join(root, `.claude/skills/${d}/SKILL.md`))).map(d => fm(rd(`.claude/skills/${d}/SKILL.md`)));
  const routines = ls('routines').map(f => fm(rd(`routines/${f}`)));
  const profiles = {};
  for (const f of ls('profiles')) {
    const m = fm(rd(`profiles/${f}`));
    const list = s => (s || '').replace(/[\[\]]/g, '').split(',').map(x => x.trim()).filter(Boolean);
    profiles[f.replace('.md', '')] = { name: m.name, focus: list(m.focus), connectors: list(m.connectors) };
  }
  // 일정·메일·주간 할 일은 연결한 사람만 채운다. 파일이 없으면 빈 값으로 둔다.
  const opt = (name, def) => { const f = `dashboard/data/${name}.json`; if (!existsSync(join(root, f))) return def; try { return JSON.parse(rd(f)); } catch { return def; } };
  if (!profiles.home) profiles.home = { name: '기본', focus: [], connectors: [] };
  const data = {
    notes, extra, recent, flow, skills, routines, profiles, broken, vault: basename(root), root: root.split(String.fromCharCode(92)).join('/'),
    calendar: opt('calendar', { source: 'none', events: [] }), mail: opt('mail', { source: 'none', mails: [] }),
    weekly: opt('weekly', null),
  };
  // </script> 가 노트에 들어 있어도 페이지가 깨지지 않게 < 를 이스케이프한다
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const html = readFileSync(join(here, 'template.html'), 'utf8').replace('/*DATA*/null', () => json);
  writeFileSync(join(here, 'index.html'), html);
  return data;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const d = build();
  console.log(`dashboard/index.html 생성 완료: 노트 ${d.notes.length}개, 추가 스킬 ${d.extra.length}개, 끊어진 링크 ${d.broken.length}개`);
  d.broken.forEach(b => console.log('  끊어진 링크: ' + b));
}
