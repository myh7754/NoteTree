// vitest 설정(test 키)까지 타입이 맞으려면 vite가 아니라 vitest/config의
// defineConfig를 써야 한다. (vite의 UserConfig에는 test 키가 없다)
import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // 워크트리(.claude/worktrees/…)에는 이 저장소의 사본이 통째로 들어 있다.
    // 제외하지 않으면 같은 테스트를 두 벌 돌려 엉뚱한 실패가 난다.
    exclude: [...configDefaults.exclude, '**/.claude/**'],
  },
});
