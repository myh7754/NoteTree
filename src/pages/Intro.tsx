import { AccountMenu } from '../components/Toolbar/AccountMenu';

/**
 * 비로그인 첫 화면 (/).
 *
 * 예전에는 여기가 운영자 맵 뷰어였다. 공개 발행이 생기면서 그 자리는 /u/<닉네임>으로
 * 옮겼고, 이 페이지는 서비스 소개가 됐다. 다만 이력서에 이미 뿌린 '/' 링크가 끊기면
 * 안 되므로, 운영자 공개 목록으로 가는 버튼을 가장 크게 둔다.
 */

/** 운영자 닉네임. 소개 페이지의 "예시 보기"가 여기로 간다. */
const SHOWCASE_HANDLE = 'myh';

export function Intro() {
  return (
    <div className="min-h-full overflow-y-auto bg-slate-950">
      <header className="flex items-center gap-2 border-b border-slate-800 px-4 py-2">
        <span className="text-sm font-semibold text-indigo-400">🌳 NoteTree</span>
        <div className="flex-1" />
        <AccountMenu />
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold leading-snug text-slate-50 sm:text-4xl">
          공부한 걸 트리로 정리하고,
          <br />
          그대로 남에게 보여주세요
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          마인드맵으로 구조를 잡고, 각 노드에 노트를 답니다. 브라우저에 바로 저장되고,
          로그인하면 다른 기기에서도 이어서 볼 수 있습니다.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={`/u/${SHOWCASE_HANDLE}`}
            className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            예시 보기 — 운영자의 공부 기록
          </a>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="rounded-md border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-900"
          >
            사용법
          </a>
        </div>

        <section id="how" className="mt-20 scroll-mt-8">
          <h2 className="text-lg font-semibold text-slate-100">사용법</h2>
          <ol className="mt-4 space-y-4 text-sm leading-relaxed text-slate-400">
            <Step n={1} title="가지를 친다">
              노드를 고르고 <Key>Tab</Key>으로 자식을, <Key>Enter</Key>로 형제를 만듭니다.
              배치는 자동이라 선을 끌 일이 없습니다.
            </Step>
            <Step n={2} title="노트를 단다">
              노드를 더블클릭하면 오른쪽에 노트 창이 열립니다. 제목만으로 부족한 설명,
              코드, 링크를 여기에 적습니다. 창은 왼쪽으로 옮길 수 있습니다.
            </Step>
            <Step n={3} title="찾는다">
              <Key>Ctrl</Key>+<Key>F</Key>로 노드 이름과 노트 본문을 한꺼번에 찾습니다.
              접혀 있던 가지도 알아서 펼쳐집니다.
            </Step>
            <Step n={4} title="보여준다">
              로그인한 뒤 툴바의 <b className="text-slate-300">공개</b> 스위치를 켜면 링크가
              생깁니다. 그 링크를 받은 사람은 로그인 없이 읽을 수 있고, 고칠 수는 없습니다.
            </Step>
          </ol>
        </section>

        <section className="mt-16">
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

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">
        {n}
      </span>
      <div>
        <b className="text-slate-200">{title}</b>
        <div className="mt-1">{children}</div>
      </div>
    </li>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300">
      {children}
    </kbd>
  );
}
