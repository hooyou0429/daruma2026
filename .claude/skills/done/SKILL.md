---
name: done
description: Commit and push the current changes in C:\일본어연습 (the daruma2026 Japanese-study project) to its GitHub repo. Trigger this whenever the user types "/done" or says things like "done", "커밋해줘", "푸시해줘", "저장해줘", "여기까지 올려줘", or otherwise signals they're wrapping up this session's work in C:\일본어연습 and want it saved to git. The commit message must summarize what was actually done in this session, not a fixed placeholder.
---

# done

세션 중 `C:\일본어연습` 폴더에서 벌어진 변경사항을 git에 커밋하고 GitHub(`https://github.com/hooyou0429/daruma2026.git`, `origin/main`)로 push한다. 이 스킬이 트리거되면 아래 순서를 그대로 따르되, 커밋 메시지만큼은 매번 새로 써야 한다 — 고정 문구를 재사용하지 않는다.

## 왜 커밋 메시지를 직접 써야 하는가

이 저장소를 보는 사람은 나중에 커밋 로그만 보고 "그 세션에서 뭘 했는지"를 알아야 한다. 그래서 커밋 메시지는 이번 대화(세션)에서 실제로 수행한 작업을 근거로 작성한다 — 어떤 파일을 왜 바꿨는지, 새로 추가한 기능/문제/수정이 무엇인지. 세션 컨텍스트가 없으면 `git diff`/`git status`로 변경 내용을 보고 유추해서 쓴다. 절대로 "다루마 최초적용" 같은 예전 메시지나 "작업 완료" 같은 의미 없는 문구를 재사용하지 않는다.

## 절차

1. **작업 디렉토리 확인**
   ```bash
   cd "C:\일본어연습" && git status --short
   ```
   출력이 비어 있으면 커밋할 변경사항이 없다는 뜻이다 — 이 경우 커밋/push를 하지 말고 사용자에게 "변경사항 없음"이라고 알린 뒤 종료한다.

2. **Windows 잡파일 제외**
   `desktop.ini`, `Thumbs.db` 같은 OS가 만든 파일은 추적하지 않는다. `.gitignore`가 없으면 이 시점에 만들어서 함께 커밋한다:
   ```
   desktop.ini
   Thumbs.db
   ```

3. **스테이징**
   ```bash
   git add -A
   ```
   `git status`로 스테이징된 내용이 의도한 파일인지 확인한다 (예: 실수로 큰 바이너리나 민감한 파일이 섞이지 않았는지).

4. **커밋 메시지 작성**
   이번 세션 대화 내용을 돌아보고, 실제로 무엇을 했는지 1~3줄 정도의 한국어 문장으로 요약한다. 예:
   - `Questions.js에 3단원 어휘 문제 20개 추가`
   - `index.html 다루마 애니메이션 타이밍 버그 수정, README 업데이트`

   대화 내용만으로 부족하면 `git diff --staged`로 실제 변경분을 훑어보고 그걸 근거로 쓴다.

5. **커밋**
   ```bash
   git commit -m "<위에서 작성한 메시지>"
   ```

6. **push**
   ```bash
   git push origin main
   ```
   - 이 스킬은 사용자가 매번 확인받지 않고 바로 push되도록 만든 것이므로, 별도 확인 없이 push까지 진행한다.
   - **단, fast-forward가 아니라서 push가 거부되면 강제 push(`--force`)를 하지 않는다.** 이 경우 상황을 사용자에게 알리고 `git pull --rebase origin main` 등 어떻게 처리할지 물어본다.

7. **결과 보고**
   커밋 해시(짧게)와 커밋 메시지, push 성공 여부를 사용자에게 간단히 알린다.

## 참고

- `origin`은 이미 `https://github.com/hooyou0429/daruma2026.git`로, 로컬 기본 브랜치는 `main`으로 설정되어 있다. 혹시 `git remote -v`에 origin이 없다면 그때만 `git remote add origin https://github.com/hooyou0429/daruma2026.git`로 다시 연결한다.
- git 사용자 정보(`user.name`/`user.email`)가 비어 있으면 커밋이 실패한다 — 이 경우 사용자에게 물어보고 `git config user.name`/`user.email`을 로컬 저장소에 설정한 뒤 진행한다.
