# 업무 노트 스타터

Claude Code와 함께 쓰는 **개인 지식 볼트 + 대시보드** 빈 틀입니다.
대화하면서 만든 노트·스킬·기억이 대시보드(연결망 그래프, 작업 흐름, 스킬 목록)에 실시간으로 반영됩니다.
처음엔 비어 있고, 아래 프롬프트 하나로 **각자 하는 일에 맞게** 구성합니다.

## 필요한 것
- [Node.js](https://nodejs.org) 18 이상
- [Claude Code](https://claude.com/claude-code) (데스크톱 앱 또는 터미널)
- git (다른 PC와 같이 쓸 때)
- Obsidian 은 선택입니다. 노트는 그냥 마크다운 파일이라 없어도 됩니다.

## 설치 (5분)

1. 이 저장소를 내 계정으로 복사합니다.
   GitHub 에서 **Use this template → Create a new repository**, 공개 범위는 **Private** 으로 고릅니다.
   (템플릿 버튼이 없으면 아래처럼 바로 내려받아도 됩니다.)

```bash
git clone https://github.com/<내-아이디>/<내-저장소>.git my-notes
```

2. Claude Code 에서 `my-notes` 폴더를 열고, 아래 **설정 프롬프트**를 붙여 넣습니다.

3. 설정이 끝나면 대시보드를 켭니다.

```bash
node dashboard/serve.mjs
```

브라우저에서 http://localhost:8765 를 엽니다.

## 설정 프롬프트

Claude Code 에 그대로 붙여 넣으세요.

```text
이 폴더는 업무 노트 스타터(빈 틀)야. .claude/skills/vault-setup/SKILL.md 를 읽고 그 순서대로
나를 짧게 인터뷰한 다음, 내 일과 관심사에 맞게 허브·스킬·루틴·프로필·AGENTS.md 를 구성해 줘.
파일을 고치기 전에 만들 목록을 먼저 보여 주고 내 승인을 받아. 끝나면 build 로 끊어진 링크를 확인해 줘.
```

`/vault-setup` 이라고만 입력해도 같은 설정이 시작됩니다.

## 폴더 구조

| 폴더 | 역할 |
|---|---|
| `second-brain/` | 주제별 지식. `허브.md` 하나 + 같은 이름 폴더 안의 노트들 |
| `MEMORY/` | AI가 기억할 사실 (결정, 마감일, 선호). `_index.md` 가 목록 |
| `inbox/` | 어디 둘지 애매한 자료 임시 보관 |
| `projects/` · `archive/` | 진행 중 / 끝난 일 |
| `routines/` | 정해진 시간에 하는 일 |
| `profiles/` | 집·회사 PC 별로 대시보드에서 먼저 보여 줄 분야 |
| `.claude/skills/` | 반복 업무를 Claude 스킬로 |
| `dashboard/` | 대시보드 코드 (고칠 필요 없음) |

노트끼리 `[[노트이름]]` 으로 이으면 연결망 그래프에 선이 생깁니다.

## 실시간 반영 (선택, 권장)

```bash
node dashboard/setup.mjs
```

Claude Code 전역 설정(`~/.claude/settings.json`)에 기록 훅 두 개를 등록합니다. 기존 설정은 자동으로 백업합니다.
- 어느 Claude 창에서든 `.md` 를 만들거나 고치면 대시보드 **최근 작업**에 뜹니다.
- **흐름** 탭에서 세션별로 어떤 도구를 어떤 순서로 썼는지 봅니다.
- 두 훅 모두 **대화 내용·명령어·파일 내용은 저장하지 않습니다.** 경로와 도구 이름만 이 PC의 `dashboard/data/` 에 남고, 깃에는 올라가지 않습니다.

훅을 등록한 뒤에는 Claude Code 창을 새로 여세요.

## 설정 파일

`dashboard/config.json` (setup 이 만들어 줍니다. 없으면 기본값)

```json
{ "githubDir": "~/Documents/GitHub", "port": 8765 }
```

- `githubDir`: 이 폴더 안 프로젝트들의 `.md`(README 등)도 대시보드에 함께 보여 줍니다. 쓰지 않으면 `""`.
- `port`: 대시보드 주소의 포트.

메일·일정은 `dashboard/data/mail.example.json`, `calendar.example.json` 형식대로 `mail.json`, `calendar.json` 을 채우면 회사 프로필에 보입니다. (Claude 에게 "구글 캘린더 이번 주 일정을 calendar.json 형식으로 저장해 줘"처럼 부탁하면 됩니다.)

## 집·회사 PC 같이 쓰기

이 폴더를 **비공개** 저장소로 두고, 작업 전 `git pull`, 작업 후 `git add -A && git commit -m "노트" && git push`.
PC별 기록(최근 작업, 흐름, 메일, 일정)은 `.gitignore` 로 빠져 있어 섞이지 않습니다.

## 지켜 주세요
- 비밀번호, 계좌번호, API 키는 노트에 적지 마세요.
- 개인 노트가 쌓인 저장소는 공개(Public)로 바꾸지 마세요.
