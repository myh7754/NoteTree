/**
 * 이용약관. 처리방침과 같이 로그인 여부와 무관하게 보여야 해서 main.tsx의 분기보다 앞에서 렌더된다.
 *
 * 만든 이유(2026-10-04): 지금은 무료로 제공하지만 나중에 유료로 바꿀 수 있다. 약관 없이 무료로
 * 제공하다가 바꾸면 "바뀔 수 있다"는 근거가 없다. 3항이 그 근거다.
 *
 * 처리방침과 같은 원칙으로, **지금 실제로 하는 것만** 적는다. 용량 숫자를 바꾸면
 * supabase/schema.sql의 트리거, src/db/storage.ts, src/db/images.ts와 함께 여기 4항도 고친다.
 */
import { CONTACT } from '../utils/contact';

const UPDATED = '2026-10-04';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export function Terms() {
  return (
    <div className="min-h-full overflow-y-auto bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-2xl pb-20">
        <a href="/" className="text-xs text-indigo-400 hover:text-indigo-300">
          ← 돌아가기
        </a>
        <h1 className="mt-4 text-2xl font-bold text-slate-50">이용약관</h1>
        <p className="mt-2 text-xs text-slate-500">시행일 {UPDATED}</p>

        <Section title="1. 서비스">
          <p>
            NoteTree는 마인드맵을 만들고, 노드마다 노트를 달고, 원하면 링크로 공개할 수 있는
            서비스입니다. 개인이 운영합니다. 로그인하면 이 약관에 동의한 것으로 봅니다.
          </p>
        </Section>

        <Section title="2. 계정">
          <p>
            GitHub, Google 또는 카카오 계정으로 로그인합니다. 계정은 본인만 사용해야 하며,
            언제든지 <b className="text-slate-200">설정 → 계정 → 회원 탈퇴</b>에서 직접 삭제할 수
            있습니다.
          </p>
        </Section>

        <Section title="3. 이용 요금과 유료 전환">
          <p>
            서비스는 <b className="text-slate-200">현재 무료</b>로 제공합니다.
          </p>
          <p>
            운영자는 앞으로 서비스의 전부 또는 일부를 <b className="text-slate-200">유료로 전환</b>
            하거나, 무료로 제공하는 범위(저장 용량, 만들 수 있는 맵의 수, 쓸 수 있는 기능)를
            바꿀 수 있습니다.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              그렇게 바꿀 때는 시행 <b className="text-slate-200">30일 전</b>까지 서비스 화면과 이
              페이지에 알립니다. 가입할 때 쓴 이메일로도 알릴 수 있습니다.
            </li>
            <li>
              유료로 전환되더라도 이용자가 <b className="text-slate-200">직접 결제하기 전에는 요금이
              청구되지 않습니다.</b> 자동으로 결제되는 일은 없습니다.
            </li>
            <li>
              바뀐 조건에 동의하지 않으면 탈퇴할 수 있습니다. 알린 날부터 시행일까지는 자신의
              마인드맵을 파일(JSON, 마크다운, PNG)로 내보낼 수 있습니다.
            </li>
          </ul>
        </Section>

        <Section title="4. 저장 용량">
          <p>
            노드 개수에는 제한이 없습니다. 클라우드에 저장할 수 있는 양은 현재 마인드맵 하나에
            10MB, 계정 전체에 30MB까지입니다. 이 한도를 넘으면 클라우드 저장이 되지 않고 화면에
            안내가 표시됩니다.
          </p>
          <p>
            노트에는 사진 파일을 넣을 수 있습니다. 큰 사진은 올릴 때 자동으로 줄여서(긴 변 1600px)
            저장하며, 한 장에 2MB, 계정 전체에 50MB까지입니다. 노트에서 사진을 지워도 이 사용량은
            바로 줄지 않습니다.
          </p>
          <p>
            올린 사진은 추측할 수 없는 긴 주소로 저장되고, <b className="text-slate-200">그 주소를
            아는 사람은 로그인 없이 볼 수 있습니다.</b> 공개한 마인드맵을 방문자가 볼 수 있게 하기
            위한 것으로, 비공개 마인드맵에 넣은 사진에도 똑같이 적용됩니다.
          </p>
          <p>한도는 3항에 따라 바뀔 수 있습니다.</p>
        </Section>

        <Section title="5. 이용자가 만든 내용">
          <p>
            마인드맵과 노트의 권리는 만든 이용자에게 있습니다. 운영자는 서비스를 제공하는 데
            필요한 범위(저장, 전송, 화면 표시, 백업)에서만 그 내용을 다룹니다.
          </p>
          <p>
            이용자가 공개로 켠 마인드맵은 로그인하지 않은 사람도 링크로 볼 수 있습니다. 공개
            여부는 이용자가 직접 정하고 언제든 끌 수 있습니다.
          </p>
        </Section>

        <Section title="6. 하면 안 되는 일">
          <ul className="list-disc space-y-1 pl-5">
            <li>법을 어기거나 다른 사람의 권리(저작권, 개인정보, 명예)를 침해하는 내용을 공개하는 일</li>
            <li>서비스나 다른 이용자의 이용을 방해하는 일 (과도한 요청, 취약점 악용 등)</li>
            <li>다른 사람의 계정을 쓰는 일</li>
          </ul>
          <p>
            이런 일이 확인되면 운영자는 해당 마인드맵의 공개를 중단하거나 삭제하고, 계정 이용을
            제한할 수 있습니다.
          </p>
        </Section>

        <Section title="7. 서비스의 변경과 중단">
          <p>
            운영자는 기능을 추가하거나 바꾸거나 없앨 수 있습니다. 서비스를 종료할 때는 30일
            전까지 서비스 화면에 알립니다. 다만 장애나 외부 사업자의 사정처럼 미리 알 수 없는
            경우에는 사후에 알릴 수 있습니다.
          </p>
          <p>
            운영자는 데이터를 지키기 위해 주기적으로 백업하지만, 무료로 제공하는 동안에는 데이터가
            손실되지 않는다고 보증하지 않습니다. 중요한 내용은 내보내기로 따로 보관해 주세요.
            운영자의 고의나 중대한 과실이 없는 한, 무료로 제공하는 서비스의 이용과 관련해 생긴
            손해에 대해 책임지지 않습니다.
          </p>
        </Section>

        <Section title="8. 약관의 변경">
          <p>
            약관이 바뀌면 이 페이지에 시행일과 함께 게시합니다. 이용자에게 불리한 변경은 시행
            30일 전에, 그 밖의 변경은 7일 전에 알립니다.
          </p>
        </Section>

        <Section title="9. 문의처">
          <p>
            운영자 ·{' '}
            <a className="text-indigo-400 hover:text-indigo-300" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
          </p>
          <p>
            개인정보를 어떻게 다루는지는{' '}
            <a className="text-indigo-400 hover:text-indigo-300" href="/privacy">
              개인정보 처리방침
            </a>
            에 따로 적어 두었습니다.
          </p>
        </Section>
      </div>
    </div>
  );
}
