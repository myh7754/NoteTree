/**
 * 개인정보 처리방침. 로그인 여부와 무관하게 보여야 해서 main.tsx의 분기보다 앞에서 렌더된다.
 *
 * 내용은 "지금 실제로 하는 처리"만 적는다 — 아직 붙이지 않은 도구를 미리 적어두면 사실과
 * 다른 고지가 된다. 도구를 붙이거나 떼는 날 이 파일도 같이 고친다.
 */
const UPDATED = '2026-10-01';
const CONTACT = 'myh4755@gmail.com';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export function PrivacyPolicy() {
  return (
    <div className="min-h-full overflow-y-auto bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-2xl pb-20">
        <a href="/" className="text-xs text-indigo-400 hover:text-indigo-300">
          ← 돌아가기
        </a>
        <h1 className="mt-4 text-2xl font-bold text-slate-50">개인정보 처리방침</h1>
        <p className="mt-2 text-xs text-slate-500">시행일 {UPDATED}</p>

        <Section title="1. 수집하는 항목">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b className="text-slate-200">계정 정보</b> — GitHub 로그인 과정에서 제공되는
              이메일과 프로필 정보. 비밀번호는 저장하지 않습니다.
            </li>
            <li>
              <b className="text-slate-200">이용자가 만든 내용</b> — 마인드맵의 노드, 노트, 제목.
            </li>
            <li>
              <b className="text-slate-200">접속 기록</b> — 서비스 운영 과정에서 남는 접속 로그와
              IP 주소.
            </li>
            <li>
              <b className="text-slate-200">이용 기록</b> — 어떤 기능을 썼는지(맵 생성, 노드 추가,
              검색, 내보내기)와 오류가 났을 때의 오류 내용. 어느 기능이 쓰이고 어디서 문제가
              생기는지 파악하는 데만 씁니다.
              <br />
              <span className="text-slate-400">
                이때 <b className="text-slate-300">마인드맵의 내용(노드 이름, 노트 본문, 맵 제목)은
                보내지 않습니다.</b> 화면 녹화도 하지 않습니다.
              </span>
            </li>
          </ul>
        </Section>

        <Section title="2. 이용 목적">
          <p>로그인과 본인 확인, 마인드맵 저장·동기화, 오류 대응과 서비스 운영에만 씁니다.</p>
          <p>광고나 마케팅에 쓰지 않고, 제3자에게 판매하지 않습니다.</p>
        </Section>

        <Section title="3. 보관 기간과 파기">
          <ul className="list-disc space-y-1 pl-5">
            <li>계정을 삭제하면 계정 정보와 작성한 마인드맵이 함께 즉시 삭제됩니다.</li>
            <li>삭제한 마인드맵은 다른 기기와의 동기화를 위해 표시만 해 두었다가 30일 뒤 완전히 지웁니다.</li>
            <li>접속 로그는 서비스 제공자(아래 4항)의 보관 정책에 따릅니다.</li>
            <li>
              장애 복구를 위해 주 1회 데이터베이스 백업본을 만들어 접근이 제한된 비공개 저장소에
              보관합니다. 계정을 삭제해도 그 이전에 만들어진 백업본에는 한동안 데이터가 남아
              있을 수 있으며, 백업본은 복구 목적 외에는 사용하지 않습니다.
            </li>
          </ul>
        </Section>

        <Section title="4. 처리 위탁과 국외 이전">
          <p>서비스 운영을 위해 아래 사업자의 기반 시설을 이용합니다.</p>
          <div className="overflow-x-auto">
            <table className="mt-2 w-full border-collapse text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="border border-slate-700 px-2 py-1 text-left">사업자</th>
                  <th className="border border-slate-700 px-2 py-1 text-left">맡기는 일</th>
                  <th className="border border-slate-700 px-2 py-1 text-left">보관 위치</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-700 px-2 py-1">Supabase</td>
                  <td className="border border-slate-700 px-2 py-1">계정·마인드맵 저장</td>
                  <td className="border border-slate-700 px-2 py-1">대한민국 (서울)</td>
                </tr>
                <tr>
                  <td className="border border-slate-700 px-2 py-1">Vercel</td>
                  <td className="border border-slate-700 px-2 py-1">웹사이트 전송, 접속 로그, 방문자 수 집계</td>
                  <td className="border border-slate-700 px-2 py-1">미국</td>
                </tr>
                <tr>
                  <td className="border border-slate-700 px-2 py-1">GitHub</td>
                  <td className="border border-slate-700 px-2 py-1">로그인 인증, 백업 보관</td>
                  <td className="border border-slate-700 px-2 py-1">미국</td>
                </tr>
                <tr>
                  <td className="border border-slate-700 px-2 py-1">Sentry</td>
                  <td className="border border-slate-700 px-2 py-1">오류 수집</td>
                  <td className="border border-slate-700 px-2 py-1">독일</td>
                </tr>
                <tr>
                  <td className="border border-slate-700 px-2 py-1">PostHog</td>
                  <td className="border border-slate-700 px-2 py-1">기능 이용 기록 분석</td>
                  <td className="border border-slate-700 px-2 py-1">유럽연합</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            마인드맵과 계정 정보는 국내(서울)에 저장되며, 접속 과정에서 위 사업자를 거칩니다.
          </p>
        </Section>

        <Section title="5. 이용자의 권리">
          <p>
            언제든지 본인의 정보를 열람·수정·삭제할 수 있습니다. 계정 삭제는 로그인 후
            <b className="text-slate-200"> 계정 메뉴 → 회원 탈퇴</b>에서 직접 할 수 있고, 되돌릴 수
            없습니다.
          </p>
        </Section>

        <Section title="6. 쿠키와 유사 기술">
          <p>
            광고·추적 목적의 쿠키는 쓰지 않습니다. 로그인 상태 유지와 화면 설정(노트 패널 위치 등)을
            위해 브라우저 저장소를 사용하며, 이 값은 이용자의 브라우저에만 남습니다.
          </p>
          <p>
            이용 기록 분석에는 이메일·이름 대신 임의의 계정 식별번호만 사용합니다. 방문자 수
            집계(Vercel)는 쿠키를 쓰지 않습니다.
          </p>
        </Section>

        <Section title="7. 문의처">
          <p>
            개인정보 보호 책임자: 운영자 ·{' '}
            <a className="text-indigo-400 hover:text-indigo-300" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
          </p>
        </Section>

        <Section title="8. 변경 고지">
          <p>내용이 바뀌면 이 페이지에 시행일과 함께 게시합니다.</p>
        </Section>
      </div>
    </div>
  );
}
