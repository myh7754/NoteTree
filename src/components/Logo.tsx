/**
 * NoteTree 로고: 뿌리 하나에서 가지 둘이 뻗는 트리 표시 + 이름.
 * 이모지(🗺, 🌳)는 운영체제마다 모양이 달라서 SVG로 직접 그린다.
 */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-400">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="5" cy="12" r="2.2" fill="currentColor" />
        <path d="M7 12h4M11 5.5h3M11 18.5h3M11 5.5v13" />
        <circle cx="17" cy="5.5" r="2.2" />
        <circle cx="17" cy="18.5" r="2.2" />
      </svg>
      NoteTree
    </span>
  );
}
