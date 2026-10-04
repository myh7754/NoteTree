/**
 * NoteTree 로고: 펼친 책에서 새싹이 나는 표시 + 이름.
 * 이모지(🗺, 🌳)는 운영체제마다 모양이 달라서 SVG로 직접 그린다.
 *
 * 그림은 public/favicon.svg와 같다 — 모양을 바꾸면 둘 다 고치고,
 * design/logo/make_icon.py로 PNG(미리보기 이미지 등)도 다시 만든다.
 * 색을 글자로 박아 둔 이유: 탭 아이콘과 똑같이 보여야 해서, 색 모드에 따라 바뀌면 안 된다.
 */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-400">
      <svg width="20" height="20" viewBox="0 0 128 128" aria-hidden="true">
        <rect width="128" height="128" rx="28" fill="#4f46e5" />
        <path
          d="M64 112C40 100 24 100 14 104V70C24 66 40 66 64 78C88 66 104 66 114 70V104C104 100 88 100 64 112Z"
          fill="#fff"
        />
        <path d="M64 80V110" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" />
        <path d="M64 78V44" stroke="#c7d2fe" strokeWidth="6" strokeLinecap="round" />
        <path transform="translate(64 56) rotate(-50)" d="M0 0C-13-10.2-13-25.5 0-34C13-25.5 13-10.2 0 0Z" fill="#c7d2fe" />
        <path transform="translate(64 48) rotate(46)" d="M0 0C-13-10.8-13-27 0-36C13-27 13-10.8 0 0Z" fill="#c7d2fe" />
      </svg>
      NoteTree
    </span>
  );
}
