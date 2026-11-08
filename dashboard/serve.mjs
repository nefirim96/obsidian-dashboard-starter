// 사용법: node dashboard/serve.mjs  →  http://localhost:8765
// 새로고침할 때마다 노트를 다시 읽으므로 고친 내용이 바로 보인다.
// 볼트·스킬·깃허브 폴더의 md 가 바뀌거나 훅이 recent.json 을 갱신하면
// 열려 있는 대시보드에 알려서 자동으로 다시 불러오게 한다 (/events).
import { createServer } from 'node:http';
import { readFileSync, watch, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { build, CONFIG } from './build.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const clients = new Set();

// ---- 파일 감시
const IGNORE = /(^|[\\/])(node_modules|\.git|\.obsidian|\.trash|_backup[^\\/]*)([\\/]|$)|dashboard[\\/]index\.html$|\.tmp$/i;
let timer = null;
const notify = (file) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    for (const res of clients) res.write(`event: change\ndata: ${JSON.stringify(file || '')}\n\n`);
  }, 250);
};
const watchDir = (dir, base) => {
  if (!existsSync(dir)) return;
  try {
    watch(dir, { recursive: true }, (_e, f) => {
      if (!f || IGNORE.test(f)) return;
      if (/\.md$/i.test(f) || (base === 'vault' && /dashboard[\\/]data[\\/][^\\/]+\.(json|jsonl)$/i.test(f))) notify(f);
    });
  } catch (e) { console.log('감시 실패: ' + dir + ' (' + e.message + ')'); }
};
watchDir(root, 'vault');
watchDir(join(homedir(), '.claude', 'skills'), 'skills');
if (CONFIG.githubDir) watchDir(CONFIG.githubDir.replace(/^~(?=$|[\\/])/, homedir()), 'github');

createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    res.write('retry: 3000\n\n');
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
    return;
  }
  if (url !== '/') { res.writeHead(404); return res.end(); }
  try {
    build();
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(readFileSync(join(here, 'index.html')));
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('대시보드 생성 실패: ' + e.message);
  }
}).listen(CONFIG.port, '127.0.0.1', () => console.log(`http://localhost:${CONFIG.port} (실시간 감시 중)`));
