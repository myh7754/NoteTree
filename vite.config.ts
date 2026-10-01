// vitest 설정(test 키)까지 타입이 맞으려면 vite가 아니라 vitest/config의
// defineConfig를 써야 한다. (vite의 UserConfig에는 test 키가 없다)
import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 이 파일은 Node에서 돌지만 타입만 필요하다. @types/node 한 패키지를 들이는 대신
// 쓰는 것 하나만 선언한다 (tsconfig.node.json은 이 파일만 포함한다).
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Sentry가 "어느 배포에서 난 에러인지" 구분할 수 있게 커밋 해시를 심는다.
  // VERCEL_GIT_COMMIT_SHA는 Vercel이 빌드 때 넣어준다(로컬에서는 'dev').
  define: {
    __RELEASE__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev'),
  },
  build: {
    // 소스맵을 배포본에 같이 올린다. Sentry가 알아서 받아가 스택트레이스를 복원하므로
    // 인증 토큰도 CI 업로드 단계도 필요 없다. 저장소가 공개라 새로 드러날 비밀도 없다.
    //
    // 배포(Vercel)에서만 만든다. 번들이 2MB가 넘어 소스맵 생성이 메모리를 크게 먹는데,
    // 개발 PC에서는 그걸로 빌드가 통째로 죽는다. 로컬 빌드는 minify된 코드를 들여다볼
    // 일이 없으니 맵도 필요 없다.
    sourcemap: Boolean(process.env.VERCEL),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // 워크트리(.claude/worktrees/…)에는 이 저장소의 사본이 통째로 들어 있다.
    // 제외하지 않으면 같은 테스트를 두 벌 돌려 엉뚱한 실패가 난다.
    exclude: [...configDefaults.exclude, '**/.claude/**'],
  },
});
