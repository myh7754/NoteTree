import { useState } from 'react';
import { claimHandle } from '../../db/publish';
import { validateHandle, normalizeHandle } from '../../utils/publish';

/**
 * 닉네임 정하기. 툴바의 공개 패널과 설정창 두 곳에서 쓴다 —
 * 검증 규칙과 문구가 한 벌이어야 해서 따로 떼어 냈다.
 */
export function HandleForm({ onClaimed }: { onClaimed: (handle: string) => void }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    const normalized = normalizeHandle(input);
    const reason = validateHandle(normalized);
    if (reason) {
      setError(reason);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await claimHandle(normalized);
      onClaimed(normalized);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="mt-1 mb-2 text-[11px] leading-relaxed text-slate-400">
        공개하려면 먼저 닉네임이 필요합니다. 공개 주소에 쓰이고, 나중에 바꾸기 어렵습니다.
      </p>
      <div className="flex items-center gap-1 text-[11px] text-slate-500">
        <span>/u/</span>
        <input
          className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 outline-none focus:border-indigo-600"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="my-handle"
          aria-label="닉네임"
        />
      </div>
      <button
        className="mt-2 h-8 w-full rounded-md bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        onClick={submit}
        disabled={busy}
      >
        {busy ? '저장 중…' : '닉네임 정하기'}
      </button>
      {error && <div className="mt-2 break-words text-[11px] text-red-300">{error}</div>}
    </>
  );
}
