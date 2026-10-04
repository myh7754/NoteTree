import { AccountMenu } from '../components/Toolbar/AccountMenu';
import { Logo } from '../components/Logo';
import { IntroPreview } from './IntroPreview';

/**
 * 비로그인 첫 화면 (/).
 *
 * 예전에는 여기가 운영자 맵 뷰어였다. 공개 발행이 생기면서 그 자리는 /u/<닉네임>으로
 * 옮겼고, 이 페이지는 서비스 소개가 됐다. 다만 이력서에 이미 뿌린 '/' 링크가 끊기면
 * 안 되므로, 운영자 공개 목록으로 가는 버튼을 가장 크게 둔다.
 *
 * 글만 있던 첫 화면에 실제 공개 맵을 끼웠다(2026-10-04) — 무엇을 하는 앱인지 읽기 전에 보인다.
 */

/** 운영자 닉네임. 소개 페이지의 "예시 맵 열어 보기"가 여기로 간다. */
const SHOWCASE_HANDLE = 'myh';
/** 미리보기로 보여 줄 운영자의 공개 맵. 공개를 끄거나 이름을 바꾸면 미리보기만 사라진다. */
const SHOWCASE_SLUG = '자바';

export function Intro() {
  return (
    <div className="min-h-full overflow-y-auto bg-slate-950">
      <header className="flex items-center gap-2 border-b border-slate-800 px-4 py-2">
        <Logo />
        <div className="flex-1" />
        <AccountMenu />
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* 좁은 화면에서는 미리보기가 글 아래로 내려간다 */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center">
          <div className="lg:w-[400px] lg:flex-shrink-0">
            <h1 className="break-keep text-3xl font-bold leading-snug text-slate-50 sm:text-4xl">
              공부한 걸 트리로 정리하고, 그대로 남에게 보여주세요
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              마인드맵으로 구조를 잡고, 각 노드에 노트를 답니다. 브라우저에 바로 저장되고,
              로그인하면 다른 기기에서도 이어서 볼 수 있습니다.
            </p>
            <a
              href={`/u/${SHOWCASE_HANDLE}`}
              className="mt-8 inline-block rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              예시 맵 열어 보기
            </a>
          </div>
          <IntroPreview handle={SHOWCASE_HANDLE} slug={SHOWCASE_SLUG} />
        </div>

        {/* 번호 대신 그 단계에서 실제로 누르는 키를 앞에 둔다 */}
        <section className="mt-12 grid gap-x-6 gap-y-8 border-t border-slate-800 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <Step keys={['Tab', 'Enter']} title="가지를 친다">
            자식과 형제를 만듭니다. 배치는 자동이라 선을 끌 일이 없습니다.
          </Step>
          <Step keys={['노트 버튼']} title="노트를 단다">
            노드를 고르면 그 위에 뜨는 도구에서 노트를 엽니다. 설명, 코드, 링크를 적습니다.
          </Step>
          <Step keys={['Ctrl', 'F']} title="찾는다">
            노드 이름과 노트 본문을 한꺼번에 찾습니다. 접혀 있던 가지도 알아서 펼쳐집니다.
          </Step>
          <Step keys={['공개 스위치']} title="보여준다">
            링크를 받은 사람은 로그인 없이 읽을 수 있고, 고칠 수는 없습니다.
          </Step>
        </section>

        <section className="mt-16 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-100">공개는 켜야 켜집니다</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            모든 맵은 처음에 <b className="text-slate-300">비공개</b>입니다. 공개로 켠 맵만
            남이 볼 수 있고, 언제든 다시 끌 수 있습니다. 공개 페이지에 이메일은 나오지
            않습니다 — 보이는 것은 직접 정한 닉네임과 맵 내용뿐입니다.
          </p>
        </section>

        <footer className="mt-20 border-t border-slate-900 pt-6">
          <a href="/privacy" className="text-[11px] text-slate-600 hover:text-slate-400">
            개인정보 처리방침
          </a>
        </footer>
      </main>
    </div>
  );
}

function Step({ keys, title, children }: { keys: string[]; title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-1">
        {keys.map((k) => (
          <kbd
            key={k}
            className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300"
          >
            {k}
          </kbd>
        ))}
      </div>
      <b className="mt-2.5 block text-sm text-slate-200">{title}</b>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{children}</p>
    </div>
  );
}
