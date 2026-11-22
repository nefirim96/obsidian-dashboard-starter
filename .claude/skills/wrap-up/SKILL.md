---
name: wrap-up
title: 작업 마무리 및 세컨드브레인 동기화
scope: common
description: "현재 작업 세션에서 확정한 결정·노하우·새 스킬을 세컨드브레인(MEMORY, second-brain, .claude/skills)에 개인정보 없이 정리하고 대시보드 빌드 및 GitHub 푸시까지 마무리한다."
---
# 작업 마무리 및 세컨드브레인 동기화

한 작업 단위가 끝나면 아래 순서로 세컨드브레인을 최신화한다.

1. **세션 요약**: 이번 대화에서 해결한 문제, 확정한 규칙·수치, 새로 만든 파일이나 반복 가능한 프롬프트를 추린다.
2. **개인정보 점검**: 저장할 내용에 실명, 연락처, 계좌번호, 비밀번호, API 키, 사내 기밀이 섞여 있지 않은지 확인하고 제외한다.
3. **기억 및 영구 지식 반영**:
   - 날짜별 결정·진행 상황은 `MEMORY/YYYY-MM-DD-<주제>.md`에 기록하고 `MEMORY/_index.md`에 추가한다.
   - 재사용할 노하우나 해결법은 `second-brain/`의 알맞은 허브 노트에 반영한다.
   - 반복 실행할 작업은 `.claude/skills/<스킬명>/SKILL.md`로 저장한다.
4. **대시보드 갱신**:
   ```bash
   node dashboard/build.mjs
   ```
   끊어진 링크가 0개인지 확인한다.
5. **동기화 (사용자 확인 후)**:
   ```bash
   git add <수정한 파일들>
   git commit -m "chore(wrap-up): 작업 마무리 및 세컨드브레인 업데이트"
   git pull --rebase && git push
   ```

상위: [[AGENTS]]
