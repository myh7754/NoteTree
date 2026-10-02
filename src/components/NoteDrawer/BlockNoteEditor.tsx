import { useEffect, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { Extension, textInputRule } from '@tiptap/core';
import { ko } from '@blocknote/core/locales';
import { SYMBOL_RULES } from '../../utils/symbolRules';

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

  const editor = useCreateBlockNote({
    initialContent: parseNoteBlocks(note),
    _tiptapOptions: { extensions: [SymbolShortcuts] },
    // 메뉴와 안내 문구를 한국어로 — "/ 를 누르면 메뉴가 나온다"는 안내가 영어면 마크다운을
    // 모르는 사람은 그 메뉴가 있는 줄도 모른다
    dictionary: ko,
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

  const handleChange = () => {
    if (isProgrammaticUpdate.current || !nodeId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const serialized = JSON.stringify(editor.document);
      onSave(serialized);
    }, 300);
  };

  return (
    <div className="h-full overflow-y-auto bn-container" data-color-scheme="dark">
      <BlockNoteView
        editor={editor}
        theme="dark"
        editable={editable}
        onChange={handleChange}
        style={{ minHeight: '100%' }}
      />
    </div>
  );
}
