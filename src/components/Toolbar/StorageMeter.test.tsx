import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const getStorageUsed = vi.fn();
vi.mock('../../db/storage', async (orig) => ({
  ...(await orig<typeof import('../../db/storage')>()),
  getStorageUsed: () => getStorageUsed(),
}));

import { StorageMeter } from './StorageMeter';
import { STORAGE_CHANGED, QUOTA_BYTES } from '../../db/storage';
import { useMindMapStore } from '../../store/useMindMapStore';

beforeEach(() => {
  getStorageUsed.mockReset();
  useMindMapStore.setState({ isSettingsOpen: false });
});

describe('StorageMeter', () => {
  it('쓴 비율을 막대와 숫자로 보여 준다', async () => {
    getStorageUsed.mockResolvedValue(QUOTA_BYTES * 0.1);
    render(<StorageMeter />);

    expect(await screen.findByText('10%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10');
  });

  it('조금이라도 썼으면 0%가 아니라 1%로 보인다 — 0%는 "아무것도 없다"로 읽힌다', async () => {
    getStorageUsed.mockResolvedValue(1000);
    render(<StorageMeter />);
    expect(await screen.findByText('1%')).toBeInTheDocument();
  });

  it('사용량을 읽지 못하면 아무것도 그리지 않는다 — 틀린 숫자를 보여 주느니 숨긴다', async () => {
    getStorageUsed.mockResolvedValue(null);
    const { container } = render(<StorageMeter />);
    await waitFor(() => expect(getStorageUsed).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('읽다가 실패해도 조용히 숨는다', async () => {
    getStorageUsed.mockRejectedValue(new Error('network'));
    const { container } = render(<StorageMeter />);
    await waitFor(() => expect(getStorageUsed).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('동기화가 끝나면 다시 읽는다 — 서버에 올라간 양이 그때 바뀐다', async () => {
    getStorageUsed.mockResolvedValue(QUOTA_BYTES * 0.1);
    render(<StorageMeter />);
    await screen.findByText('10%');

    getStorageUsed.mockResolvedValue(QUOTA_BYTES * 0.5);
    window.dispatchEvent(new Event(STORAGE_CHANGED));

    expect(await screen.findByText('50%')).toBeInTheDocument();
  });

  it('누르면 설정창이 열린다', async () => {
    getStorageUsed.mockResolvedValue(QUOTA_BYTES * 0.1);
    render(<StorageMeter />);
    fireEvent.click(await screen.findByRole('button', { name: /저장 공간/ }));
    expect(useMindMapStore.getState().isSettingsOpen).toBe(true);
  });
});
