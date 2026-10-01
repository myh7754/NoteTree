import { describe, it, expect, beforeEach } from 'vitest';
import { comboOf, checkCombo, sanitizeOverrides, actionFor, keysFor, shortcutGroups } from './shortcuts';
import { handleShortcut } from '../hooks/useGlobalShortcuts';
import { useMindMapStore } from '../store/useMindMapStore';

const ev = (key: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey', boolean>> = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

describe('단축키 조합', () => {
  it('키 이벤트를 조합 문자열로 바꾼다', () => {
    expect(comboOf(ev('Tab'))).toBe('Tab');
    expect(comboOf(ev(' '))).toBe('Space');
    expect(comboOf(ev('e', { ctrlKey: true }))).toBe('Ctrl+E');
    expect(comboOf(ev('E', { ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+E');
    expect(comboOf(ev('f', { metaKey: true }))).toBe('Ctrl+F'); // Mac의 ⌘
    expect(comboOf(ev('?', { shiftKey: true }))).toBe('?'); // 기호는 Shift를 따로 적지 않는다
    expect(comboOf(ev('Control', { ctrlKey: true }))).toBeNull();
  });

  it('바꿀 수 없는 키와 이미 쓰는 키는 지정을 막는다', () => {
    expect(checkCombo('addChild', 'Ctrl+Z')).toMatch('바꿀 수 없는');
    expect(checkCombo('addChild', 'Ctrl+W')).toMatch('바꿀 수 없는'); // 브라우저가 가져가는 키
    expect(checkCombo('addChild', 'Enter')).toMatch('형제 노드 추가');
    expect(checkCombo('addChild', 'Tab')).toBeNull(); // 자기 자신의 키
    expect(checkCombo('addChild', 'Insert')).toBeNull();
    // 형제 추가를 다른 키로 옮겼으면 Enter가 비어 쓸 수 있다
    expect(checkCombo('addChild', 'Enter', { addSibling: 'Shift+Enter' })).toBeNull();
  });

  it('저장소에서 읽은 값은 걸러서 쓴다', () => {
    expect(sanitizeOverrides(null)).toEqual({});
    expect(sanitizeOverrides('x')).toEqual({});
    expect(
      sanitizeOverrides({
        addChild: 'Insert',
        rename: 'F2', // 기본값과 같으면 저장할 필요가 없다
        search: 'Ctrl+Z', // 바꿀 수 없는 키
        help: 42,
        nope: 'A',
        addSibling: 'Insert', // 앞의 것과 겹친다
      })
    ).toEqual({ addChild: 'Insert' });
  });

  it('바꾼 키가 목록과 메뉴 표시에 반영된다', () => {
    const o = { expandAll: 'Alt+E' };
    expect(actionFor('Alt+E', o)).toBe('expandAll');
    expect(actionFor('Ctrl+E', o)).toBeUndefined();
    expect(keysFor('expandAll', o)).toBe('Alt + E');
    expect(shortcutGroups(o)[1].items.find((i) => i.action === 'expandAll')?.keys).toBe('Alt + E');
  });
});

describe('바꾼 단축키로 실제 동작한다', () => {
  const store = () => useMindMapStore.getState();
  const press = (key: string) => {
    const e = new KeyboardEvent('keydown', { key, cancelable: true });
    handleShortcut(e, () => {}, () => {});
    return e;
  };

  beforeEach(() => {
    localStorage.clear();
    store().resetShortcuts();
    store().loadFromPersisted(
      {
        id: 't',
        title: 't',
        rootId: 'root',
        children: { root: [] },
        nodes: { root: { id: 'root', type: 'text', label: 'r', note: '', collapsed: false } },
      },
      {}
    );
    store().setSelectedNodeId('root');
    store().setEditingNodeId(null);
  });

  it('자식 추가를 Insert로 바꾸면 Insert로 만들어지고 Tab은 더 이상 만들지 않는다', () => {
    store().setShortcut('addChild', 'Insert');
    press('Tab');
    expect(store().mindMapData.children.root).toHaveLength(0);
    press('Insert');
    expect(store().mindMapData.children.root).toHaveLength(1);
  });

  it('바꾼 값은 이 브라우저에 남고, 기본값으로 되돌리면 지워진다', () => {
    store().setShortcut('addChild', 'Insert');
    expect(JSON.parse(localStorage.getItem('shortcut-overrides')!)).toEqual({ addChild: 'Insert' });
    store().setShortcut('addChild', 'Tab'); // 기본값과 같아지면 저장할 게 없다
    expect(store().shortcutOverrides).toEqual({});
  });
});
