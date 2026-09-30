# 회원 탈퇴 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 앱에서 자기 계정과 모든 데이터를 스스로 지울 수 있게 한다.

**Architecture:** 계정 삭제는 `service_role` 권한이 필요해 브라우저에서 불가능하다. Supabase
Edge Function이 그 키를 서버에서만 쓰고, **호출자 JWT에서 꺼낸 id만** 삭제한다. 맵·프로필은
`on delete cascade`로 따라 지워진다. 클라이언트는 서버 삭제가 성공한 뒤에만 로컬 사본을 지운다.

**Tech Stack:** Supabase Edge Functions(Deno), @supabase/supabase-js, React 19, Vitest,
@testing-library/react, idb

**Spec:** `docs/superpowers/specs/2026-09-30-privacy-and-backup-design.md` (1번 항목)

## Global Constraints

- 주석과 UI 문구는 한국어로 쓴다. 기존 코드 스타일을 따른다.
- **새 의존성을 추가하지 않는다.** 필요한 것은 이미 다 있다.
- `service_role` 키는 Edge Function 안에서만 쓴다. 클라이언트 코드·`.env`·저장소에 절대 넣지 않는다.
- 테스트는 `npx vitest run --no-file-parallelism` 으로 돌린다 (이 PC는 여유 RAM이 적어 병렬 워커가 죽는다).
- 커밋은 태스크 단위로 한다.

## Review Focus

- **서버 삭제가 실패했는데 로컬만 지우는 경우** — 데이터가 사라진 것처럼 보이지만 서버엔 남는다. 순서가 뒤집히면 최악이다. (Task 2)
- **로그인하지 않은 상태에서 탈퇴 호출** — 401이어야 하고, UI에는 버튼 자체가 없어야 한다. (Task 3, 4)
- **남의 계정 삭제 시도** — 요청 본문에 남의 id를 넣어도 무시하고 JWT의 id만 지워야 한다. (Task 3)
- **탈퇴 버튼 연타** — 중복 호출로 두 번째가 401을 받아 에러 문구가 뜨면 안 된다. (Task 4)
- **클라우드가 꺼진 로컬 전용 모드** — 탈퇴 UI가 뜨면 안 된다(지울 계정이 없다). (Task 4)

---

## File Structure

| 파일 | 책임 |
|---|---|
| `src/db/mindmapDB.ts` (수정) | `clearLocalData()` 추가 — 이 브라우저의 로컬 사본 제거 |
| `src/db/account.ts` (생성) | `deleteAccount()` — Edge Function 호출 → 로컬 정리 → 로그아웃 |
| `supabase/functions/delete-account/index.ts` (생성) | 서버: JWT 확인 후 본인 계정 삭제 |
| `src/components/Toolbar/AccountMenu.tsx` (수정) | 탈퇴 버튼 + 2단계 확인 UI |

---

### Task 1: 로컬 데이터 삭제 유틸

**Files:**
- Modify: `src/db/mindmapDB.ts`
- Test: `src/db/mindmapDB.clear.test.ts` (생성)

**Interfaces:**
- Consumes: 모듈 내부의 `dbName`(현재 계정의 IndexedDB 이름), `LEGACY_CLAIMED_KEY`
- Produces: `clearLocalData(): Promise<void>`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
// src/db/mindmapDB.clear.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setDbUser, clearLocalData } from './mindmapDB';

describe('clearLocalData', () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom에는 indexedDB가 없다. 호출 여부만 확인하면 되므로 경계를 가짜로 둔다.
    vi.stubGlobal('indexedDB', {
      deleteDatabase: vi.fn(() => {
        const req: Record<string, unknown> = {};
        // 비동기로 성공 콜백을 때린다
        setTimeout(() => (req.onsuccess as () => void)?.(), 0);
        return req;
      }),
    });
  });

  it('현재 계정의 IndexedDB를 지운다', async () => {
    setDbUser('user-1');
    await clearLocalData();
    expect(indexedDB.deleteDatabase).toHaveBeenCalledWith('mindmap-db:user-1');
  });

  it('앱이 쓰는 localStorage 키를 지운다', async () => {
    setDbUser('user-1');
    localStorage.setItem('last-map-id', 'abc');
    localStorage.setItem('note-panel-width', '360');
    localStorage.setItem('note-panel-side', 'left');
    await clearLocalData();
    expect(localStorage.getItem('last-map-id')).toBeNull();
    expect(localStorage.getItem('note-panel-width')).toBeNull();
    expect(localStorage.getItem('note-panel-side')).toBeNull();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/db/mindmapDB.clear.test.ts --no-file-parallelism`
Expected: FAIL — `clearLocalData is not a function`

- [ ] **Step 3: 최소 구현을 넣는다**

`src/db/mindmapDB.ts` 끝에 추가한다.

```ts
/**
 * 이 브라우저에 남은 이 계정의 흔적을 지운다 (탈퇴용).
 * 서버 삭제가 성공한 뒤에만 부를 것 — 반대로 하면 서버엔 남고 화면에서만 사라진다.
 */
export async function clearLocalData(): Promise<void> {
  const name = dbName;
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    // 다른 탭이 DB를 잡고 있으면 blocked가 온다. 기다리지 않고 넘어간다 —
    // 서버 데이터는 이미 지워졌고, 남은 로컬 사본은 다음 실행에서 사라진다.
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
  for (const key of ['last-map-id', 'note-panel-width', 'note-panel-side', LEGACY_CLAIMED_KEY]) {
    localStorage.removeItem(key);
  }
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run src/db/mindmapDB.clear.test.ts --no-file-parallelism`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/db/mindmapDB.ts src/db/mindmapDB.clear.test.ts
git commit -m "feat: 탈퇴용 로컬 데이터 삭제 유틸"
```

---

### Task 2: 클라이언트 탈퇴 함수

**Files:**
- Create: `src/db/account.ts`
- Test: `src/db/account.test.ts`

**Interfaces:**
- Consumes: `supabase` (from `./supabase`), `clearLocalData()` (Task 1)
- Produces: `deleteAccount(): Promise<void>` — 실패 시 `Error`를 던진다

- [ ] **Step 1: 실패하는 테스트를 쓴다**

가장 중요한 것은 **순서**다. 서버 삭제가 실패하면 로컬을 건드리면 안 된다.

```ts
// src/db/account.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
const signOut = vi.fn().mockResolvedValue({ error: null });
const clearLocalData = vi.fn().mockResolvedValue(undefined);

vi.mock('./supabase', () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) }, auth: { signOut } },
  isCloudEnabled: true,
}));
vi.mock('./mindmapDB', () => ({ clearLocalData: () => clearLocalData() }));

import { deleteAccount } from './account';

beforeEach(() => {
  invoke.mockReset();
  signOut.mockClear();
  clearLocalData.mockClear();
});

describe('deleteAccount', () => {
  it('서버 삭제 후 로컬을 지우고 로그아웃한다', async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    await deleteAccount();
    expect(invoke).toHaveBeenCalledWith('delete-account');
    expect(clearLocalData).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
  });

  it('서버 삭제가 실패하면 로컬을 지우지 않는다', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: '401' } });
    await expect(deleteAccount()).rejects.toThrow(/탈퇴/);
    expect(clearLocalData).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/db/account.test.ts --no-file-parallelism`
Expected: FAIL — `Failed to resolve import "./account"`

- [ ] **Step 3: 최소 구현을 넣는다**

```ts
// src/db/account.ts
import { supabase } from './supabase';
import { clearLocalData } from './mindmapDB';

/**
 * 회원 탈퇴. 계정 삭제는 service_role 권한이 필요해 브라우저에서 못 한다 —
 * Edge Function이 서버에서 처리하고, 여기서는 그 결과를 받아 뒷정리만 한다.
 *
 * 순서가 중요하다: 서버가 먼저다. 로컬을 먼저 지우면 서버 삭제가 실패했을 때
 * 사용자 눈에만 사라지고 데이터는 남는다.
 */
export async function deleteAccount(): Promise<void> {
  if (!supabase) throw new Error('클라우드가 꺼져 있어 탈퇴할 계정이 없습니다.');

  const { error } = await supabase.functions.invoke('delete-account');
  if (error) throw new Error(`탈퇴에 실패했습니다: ${error.message}`);

  await clearLocalData();
  await supabase.auth.signOut();
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run src/db/account.test.ts --no-file-parallelism`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/db/account.ts src/db/account.test.ts
git commit -m "feat: 클라이언트 탈퇴 함수 (서버 성공 후에만 로컬 정리)"
```

---

### Task 3: Edge Function

**Files:**
- Create: `supabase/functions/delete-account/index.ts`
- Verify: 배포 후 curl (아래 Step 4)

**Interfaces:**
- Consumes: 환경변수 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase가 자동 주입)
- Produces: `POST /functions/v1/delete-account` → 성공 `200 {"ok":true}`, 미인증 `401`

- [ ] **Step 1: 함수를 작성한다**

```ts
// supabase/functions/delete-account/index.ts
// 회원 탈퇴. service_role 키를 쓰는 유일한 곳이며, 절대 클라이언트로 나가면 안 된다.
//
// 삭제 대상은 요청 본문이 아니라 JWT에서 꺼낸다. 본문으로 받으면 남의 id를 넣어
// 남의 계정을 지울 수 있다.
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 토큰이 가리키는 사용자를 확인한다. 위조된 토큰이면 여기서 걸린다.
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ error: 'unauthorized' }, 401);

  // maps·profiles는 on delete cascade로 함께 사라진다.
  const { error: delErr } = await admin.auth.admin.deleteUser(data.user.id);
  if (delErr) return json({ error: delErr.message }, 500);

  return json({ ok: true }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 2: 배포한다**

```bash
npx supabase login          # 브라우저로 토큰 발급 — 사용자가 직접 해야 한다
npx supabase link --project-ref aobgrdbreyzqldhdfcxb
npx supabase functions deploy delete-account
```

`SUPABASE_SERVICE_ROLE_KEY`는 Supabase가 함수 실행 환경에 자동으로 넣어주므로 따로 등록하지 않는다.

- [ ] **Step 3: 미인증 호출이 막히는지 확인한다**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "https://aobgrdbreyzqldhdfcxb.supabase.co/functions/v1/delete-account"
```

Expected: `401`

- [ ] **Step 4: 남의 id를 넣어도 무시하는지 확인한다**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "https://aobgrdbreyzqldhdfcxb.supabase.co/functions/v1/delete-account" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"00000000-0000-0000-0000-000000000000"}'
```

Expected: `401` (Authorization 헤더가 없으므로). 함수가 본문을 아예 읽지 않는다는 점을 코드로 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add supabase/functions/delete-account/index.ts
git commit -m "feat: 회원 탈퇴 Edge Function (JWT의 본인만 삭제)"
```

---

### Task 4: 탈퇴 UI

**Files:**
- Modify: `src/components/Toolbar/AccountMenu.tsx`
- Test: `src/components/Toolbar/AccountMenu.test.tsx` (생성)

**Interfaces:**
- Consumes: `deleteAccount()` (Task 2), `useAuth()`
- Produces: 없음 (화면 컴포넌트)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```tsx
// src/components/Toolbar/AccountMenu.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const deleteAccount = vi.fn().mockResolvedValue(undefined);
vi.mock('../../db/account', () => ({ deleteAccount: () => deleteAccount() }));
vi.mock('../../db/cloudSync', () => ({ syncNow: vi.fn() }));
vi.mock('../../db/mindmapDB', () => ({ listMaps: vi.fn().mockResolvedValue([]), loadMindMap: vi.fn() }));

const auth = { session: { user: { id: 'u1', email: 'me@example.com' } }, ready: true, cloudEnabled: true };
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => auth,
  signInWith: vi.fn(),
  signOut: vi.fn(),
}));

import { AccountMenu } from './AccountMenu';

beforeEach(() => {
  deleteAccount.mockClear();
  auth.session = { user: { id: 'u1', email: 'me@example.com' } };
  auth.cloudEnabled = true;
});

const openMenu = () => fireEvent.click(screen.getByText(/me@example.com/));

describe('AccountMenu 회원 탈퇴', () => {
  it('한 번 눌러서는 지워지지 않는다 (확인 단계가 있다)', () => {
    render(<AccountMenu />);
    openMenu();
    fireEvent.click(screen.getByText('회원 탈퇴'));
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(screen.getByText(/되돌릴 수 없습니다/)).toBeInTheDocument();
  });

  it('확인을 누르면 탈퇴한다', async () => {
    render(<AccountMenu />);
    openMenu();
    fireEvent.click(screen.getByText('회원 탈퇴'));
    fireEvent.click(screen.getByText('정말 탈퇴'));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
  });

  it('연타해도 한 번만 호출한다', async () => {
    render(<AccountMenu />);
    openMenu();
    fireEvent.click(screen.getByText('회원 탈퇴'));
    const confirm = screen.getByText('정말 탈퇴');
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
  });

  it('로그인하지 않았으면 탈퇴 버튼이 없다', () => {
    auth.session = null as unknown as typeof auth.session;
    render(<AccountMenu />);
    expect(screen.queryByText('회원 탈퇴')).not.toBeInTheDocument();
  });

  it('클라우드가 꺼져 있으면 아무것도 그리지 않는다', () => {
    auth.cloudEnabled = false;
    const { container } = render(<AccountMenu />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/components/Toolbar/AccountMenu.test.tsx --no-file-parallelism`
Expected: FAIL — `Unable to find an element with the text: 회원 탈퇴`

- [ ] **Step 3: UI를 구현한다**

`AccountMenu.tsx` 상단에 import와 상태를 추가한다.

```tsx
import { deleteAccount } from '../../db/account';
```

컴포넌트 안, `const [message, setMessage] = useState<string | null>(null);` 아래에 추가한다.

```tsx
  // 탈퇴는 되돌릴 수 없어 2단계로 받는다. deleting은 연타 방지용.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const runDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
      location.reload(); // 계정이 사라졌으니 처음 화면으로
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };
```

로그아웃 버튼 아래(`<div className="mt-1 text-[10px] text-slate-600">…</div>` 다음)에 넣는다.

```tsx
            <div className="mt-3 border-t border-slate-800 pt-2">
              {!confirmingDelete ? (
                <button
                  className="w-full text-left text-[11px] text-slate-500 hover:text-red-300"
                  onClick={() => setConfirmingDelete(true)}
                >
                  회원 탈퇴
                </button>
              ) : (
                <>
                  <div className="text-[11px] text-red-300">
                    계정과 모든 맵이 지워집니다. 되돌릴 수 없습니다.
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="h-7 flex-1 rounded-md bg-red-900/60 text-[11px] text-red-100 hover:bg-red-900 disabled:opacity-50"
                      onClick={runDelete}
                      disabled={deleting}
                    >
                      {deleting ? '지우는 중…' : '정말 탈퇴'}
                    </button>
                    <button
                      className="h-7 flex-1 rounded-md bg-slate-800 text-[11px] text-slate-300 hover:bg-slate-700"
                      onClick={() => setConfirmingDelete(false)}
                    >
                      취소
                    </button>
                  </div>
                </>
              )}
            </div>
```

이 블록은 `{isOpen && …}` 안, 즉 **로그인 상태에서만 그려지는 패널** 안에 둔다. 비로그인
패널(로그인 버튼이 있는 쪽)에는 넣지 않는다 — 지울 계정이 없다.

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run src/components/Toolbar/AccountMenu.test.tsx --no-file-parallelism`
Expected: PASS (5 tests)

- [ ] **Step 5: 전체 검사**

```bash
npx tsc -b && npx eslint src && npx vitest run --no-file-parallelism
```

Expected: 타입·lint 통과, 기존 196개 + 새 9개 테스트 모두 통과

- [ ] **Step 6: 커밋**

```bash
git add src/components/Toolbar/AccountMenu.tsx src/components/Toolbar/AccountMenu.test.tsx
git commit -m "feat: 계정 메뉴에 회원 탈퇴 (2단계 확인)"
```

---

### Task 5: 실제 계정으로 검증

자동 테스트는 전부 가짜 경계를 쓴다. **진짜로 지워지는지는 실제 계정으로 한 번 확인해야 한다.**

- [ ] **Step 1: 테스트용 계정을 만든다**

배포된 앱에서 두 번째 GitHub 계정(myh4755@gachon.ac.kr 쪽)으로 로그인하고 맵을 하나 만든다.

- [ ] **Step 2: 삭제 전 상태를 기록한다**

```bash
curl -s "https://aobgrdbreyzqldhdfcxb.supabase.co/rest/v1/maps?select=id,owner_id" \
  -H "apikey: sb_publishable_GQdMl12TkeZqP5XRfB8rsg_7IyRTGG6"
```

공개 맵만 보이므로, 정확한 확인은 Supabase Studio의 SQL Editor에서 한다.

```sql
select count(*) from auth.users;
select count(*) from public.maps;
```

- [ ] **Step 3: 그 계정으로 탈퇴한다**

앱에서 계정 메뉴 → 회원 탈퇴 → 정말 탈퇴.

- [ ] **Step 4: 사라졌는지 확인한다**

같은 SQL을 다시 돌려 `auth.users`와 `public.maps`가 각각 1씩(맵 개수만큼) 줄었는지 본다.
브라우저 개발자도구 → Application → IndexedDB에 `mindmap-db:<그 계정 id>`가 없는지도 본다.

- [ ] **Step 5: 운영자 계정이 멀쩡한지 확인한다**

운영자 계정으로 로그인해 맵 5개가 그대로인지 확인한다. 남의 계정을 지우는 사고가
없었는지 보는 마지막 관문이다.
