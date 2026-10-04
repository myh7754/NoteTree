import { useState } from 'react';
import { saveAs } from 'file-saver';
import { useMindMapStore } from '../../store/useMindMapStore';
import { exportToMarkdown } from '../../utils/exportMarkdown';
import { downloadJson, loadJsonFile } from '../../utils/exportJson';
import { importFromMarkdown, pickTextFile } from '../../utils/importMarkdown';
import { exportToPng } from '../../utils/exportImage';
import { track } from '../../lib/analytics';
import { Icon } from '../Icon';

/**
 * 더보기(⋯) 메뉴: 파일 입출력, 단축키, 설정.
 *
 * 전에는 툴바에 버튼 다섯 개가 나란히 있었다. 하루에 한 번 쓸까 말까 한
 * 기능들이 매분 쓰는 버튼(추가·검색·되돌리기)과 같은 무게로 자리를 차지해
 * 툴바가 두 줄로 넘쳤다. 접어두면 폭이 절반 가까이 준다.
 */
export function FileMenu() {
  const mindMapData = useMindMapStore((s) => s.mindMapData);
  const rfNodes = useMindMapStore((s) => s.rfNodes);
  const loadFromPersisted = useMindMapStore((s) => s.loadFromPersisted);
  const openMap = useMindMapStore((s) => s.openMap);
  const applyLayout = useMindMapStore((s) => s.applyLayout);
  const setSaveStatus = useMindMapStore((s) => s.setSaveStatus);
  const setShortcutsOpen = useMindMapStore((s) => s.setShortcutsOpen);
  const setSettingsOpen = useMindMapStore((s) => s.setSettingsOpen);

  const [isOpen, setIsOpen] = useState(false);

  // 실패를 alert로 띄우면 확장 프로그램·자동화가 멈추고 사용자도 맥락을 잃는다.
  // 툴바의 저장 상태 표시에 얹어 화면 안에서 알린다.
  const fail = (e: unknown) => setSaveStatus('error', (e as Error).message);

  // 동기 동작(JSON 저장 등)은 동기로 돌린다 — Promise로 감싸면 클릭과 실행 사이에
  // 이유 없는 한 틱이 생긴다. 비동기인 것만 catch를 붙인다.
  const run = (fn: () => void | Promise<void>) => {
    setIsOpen(false);
    try {
      fn()?.catch(fail);
    } catch (e) {
      fail(e);
    }
  };

  // 내보내기 3종의 공통 래퍼. 성공한 것만 센다 — 실패한 시도까지 "썼다"고 세면
  // 지표가 사실과 달라진다.
  const exported = <T,>(format: 'json' | 'markdown' | 'png', fn: () => T): T => {
    const result = fn();
    if (result instanceof Promise) result.then(() => track('export_used', { format }));
    else track('export_used', { format });
    return result;
  };

  const handleExportMarkdown = () => {
    const md = exportToMarkdown(mindMapData);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `${mindMapData.title}.md`);
  };

  const handleLoadJson = async () => {
    const data = await loadJsonFile();
    loadFromPersisted(data, {});
    setTimeout(applyLayout, 50);
  };

  // 가져온 마크다운은 새 맵으로 연다 (지금 보던 과목을 덮어쓰지 않는다)
  const handleImportMarkdown = async () => {
    const { name, text } = await pickTextFile('.md,.markdown,.txt');
    const fallback = name.replace(/\.(md|markdown|txt)$/i, '');
    openMap(importFromMarkdown(text, fallback), {});
  };

  return (
    <div className="relative">
      <button
        className="flex items-center rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        onClick={() => setIsOpen((v) => !v)}
        title="파일 · 단축키 · 설정"
        aria-label="더보기"
        aria-expanded={isOpen}
      >
        <Icon name="more" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-1 z-40 w-52 rounded-lg border border-slate-700 bg-slate-900 shadow-xl py-1">
            <Item label="열기" onClick={() => run(handleLoadJson)} />
            <Item label="JSON 저장" onClick={() => run(() => exported('json', () => downloadJson(mindMapData)))} />

            <div className="my-1 border-t border-slate-800" />

            <Item label="MD 가져오기" onClick={() => run(handleImportMarkdown)} />
            <Item label="MD 내보내기" onClick={() => run(() => exported('markdown', handleExportMarkdown))} />
            <Item label="PNG로 저장" onClick={() => run(() => exported('png', () => exportToPng(rfNodes, mindMapData.title)))} />

            <div className="my-1 border-t border-slate-800" />

            <Item label="단축키" onClick={() => run(() => setShortcutsOpen(true))} />
            <Item label="설정" onClick={() => run(() => setSettingsOpen(true))} />
          </div>
        </>
      )}
    </div>
  );
}

function Item({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      // block: 툴바의 whitespace-nowrap을 물려받아, 인라인이면 항목들이 한 줄로 흘러 넘친다
      className="block w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
