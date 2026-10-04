import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { PublicMapViewer } from './PublicMapViewer';
import { PublicProfile } from './pages/PublicProfile';
import { Intro } from './pages/Intro';
import { LegacyMapRedirect } from './pages/LegacyMapRedirect';
import { useAuth } from './hooks/useAuth';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { parseRoute } from './utils/route';
import { initSentry } from './lib/sentry';
import { initAnalytics, identify, track } from './lib/analytics';
import { Analytics } from '@vercel/analytics/react';
import { onAccountShortcuts } from './db/shortcutSync';
import { useMindMapStore } from './store/useMindMapStore';
import { applyColorMode, watchSystemTheme } from './utils/colorMode';
import './index.css';

// 앱보다 먼저 켠다 — 초기화 중에 터진 에러도 잡으려면 가장 앞이어야 한다.
initSentry();
initAnalytics();
// 첫 그림 전에 색 모드를 붙인다 — 라이트 사용자에게 어두운 화면이 번쩍이지 않게.
applyColorMode(useMindMapStore.getState().colorMode);
watchSystemTheme(() => useMindMapStore.getState().colorMode);
// 로그인하면 계정에 저장해 둔 단축키 설정을 가져온다
onAccountShortcuts((raw) => useMindMapStore.getState().setShortcutOverrides(raw));

/**
 * 주소와 로그인 여부로 화면이 갈린다.
 * - /privacy        처리방침 (누구에게나, 로그인 확인을 기다리지 않고)
 * - /u/<닉네임>      그 사람이 공개한 맵 목록
 * - /m/<닉네임>/<슬러그>  공개 맵 하나 (읽기전용)
 * - /m/<옛 슬러그>   예전 주소 → 새 주소로 넘김
 * - /  비로그인      서비스 소개
 * - /  로그인        내 계정의 맵을 편집 (계정마다 저장소가 따로)
 * - 클라우드 꺼짐    지금까지처럼 브라우저 저장 앱 (로컬 개발)
 */
function Root() {
  const { session, ready, cloudEnabled } = useAuth();
  // 분석 도구에 넘기는 식별자는 UUID 하나뿐이다. 이메일·이름은 넘기지 않는다.
  const uid = session?.user.id;
  React.useEffect(() => {
    if (uid) {
      identify(uid);
      track('app_opened');
    }
  }, [uid]);

  const route = parseRoute(location.pathname);
  // 공개 화면과 처리방침은 로그인 확인을 기다리지 않는다 — 로그인 없이 보는 게 요점이다.
  if (route.kind === 'privacy') return <PrivacyPolicy />;
  if (route.kind === 'map') return <PublicMapViewer handle={route.handle} slug={route.slug} />;
  if (route.kind === 'legacyMap') return <LegacyMapRedirect slug={route.slug} />;
  if (route.kind === 'profile') return <PublicProfile handle={route.handle} />;

  if (!ready) return null;
  if (cloudEnabled && !session) return <Intro />;
  const userId = session?.user.id ?? null;
  // key: 계정이 바뀌면 이전 계정의 맵·undo·저장 타이머를 통째로 버리고 새로 시작한다
  return <App key={userId ?? 'local'} userId={userId} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
    {/* 방문자 수. 쿠키를 쓰지 않아 동의 배너가 필요 없다. */}
    <Analytics />
  </React.StrictMode>
);
