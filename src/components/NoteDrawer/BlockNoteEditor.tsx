import { useEffect, useRef, useState } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { Extension, textInputRule } from '@tiptap/core';
import { ko } from '@blocknote/core/locales';
import { useResolvedTheme } from '../../utils/colorMode';
import { SYMBOL_RULES } from '../../utils/symbolRules';
import { isCloudEnabled } from '../../db/supabase';
import { uploadNoteImage } from '../../db/images';

// -> 를 치면 → 로, != 를 치면 ≠ 로 바꾼다. 코드 안에서는 바뀌지 않는다.
const SymbolShortcuts = Extension.create({
  name: 'symbolShortcuts',
  addInputRules() {
    return SYMBOL_RULES.map(([find, replace]) => textInputRule({ find, replace }));
  },
});

interface BlockNoteEditorProps {
  nodeId: string | null;
  note: string;
  editable?: boolean;
  onSave: (content: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseNoteBlocks(note: string): any[] {
  if (!note) return [{ type: 'paragraph', content: '' }];
  try {
    return JSON.parse(note);
  } catch {
    return [{ type: 'paragraph', content: '' }];
  }
}

export function BlockNoteEditor({ nodeId, note, editable = true, onSave }: BlockNoteEditorProps) {
  const isProgrammaticUpdate = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (!uploadError) return;
    const t = setTimeout(() => setUploadError(''), 6000);
    return () => clearTimeout(t);
  }, [uploadError]);

  const editor = useCreateBlockNote({
    initialContent: parseNoteBlocks(note),
    _tiptapOptions: { extensions: [SymbolShortcuts] },
    // 메뉴와 안내 문구를 한국어로 — "/ 를 누르면 메뉴가 나온다"는 안내가 영어면 마크다운을
    // 모르는 사람은 그 메뉴가 있는 줄도 모른다
    dictionary: ko,
    // 사진 파일을 끌어다 놓기·붙여넣기·파일 고르기로 넣는다. 올릴 곳(클라우드)이 없는 로컬 모드에서는
    // 넘기지 않는다 — 그러면 편집기가 지금까지처럼 주소 입력만 보여 준다.
    uploadFile: isCloudEnabled
      ? async (file: File) => {
          try {
            return await uploadNoteImage(file);
          } catch (err) {
            // 편집기는 실패해도 "업로드 실패"라고만 하거나(파일 고르기) 아무 말도 없다(붙여넣기).
            // 이유(로그인 필요, 공간 부족)는 여기서 알린다.
            setUploadError(err instanceof Error ? err.message : '사진을 올리지 못했습니다.');
            throw err;
          }
        }
      : undefined,
  });

  // nodeId가 바뀌면 해당 노드의 note로 에디터 내용 교체
  useEffect(() => {
    if (!editor) return;
    isProgrammaticUpdate.current = true;
    const blocks = parseNoteBlocks(note);
    editor.replaceBlocks(editor.document, blocks);
    // onChange가 동기적으로 발생할 수 있으므로 다음 tick에 플래그 해제
    setTimeout(() => {
      isProgrammaticUpdate.current = false;
    }, 0);
  // note가 아닌 nodeId 변경 시에만 에디터 내용을 교체 (외부 저장과 구분)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  const theme = useResolvedTheme();

  const handleChange = () => {
    if (isProgrammaticUpdate.current || !nodeId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const serialized = JSON.stringify(editor.document);
      onSave(serialized);
    }, 300);
  };

  return (
    <div className="h-full overflow-y-auto bn-container" data-color-scheme={theme}>
      {uploadError && (
        <div role="alert" className="sticky top-0 z-10 bg-red-900/90 px-3 py-2 text-xs text-red-100">
          {uploadError}
        </div>
      )}
      <BlockNoteView
        editor={editor}
        theme={theme}
        editable={editable}
        onChange={handleChange}
        style={{ minHeight: '100%' }}
      />
    </div>
  );
}
