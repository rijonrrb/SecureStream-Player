import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { SecureStreamPlayer } from '../src/player';

describe('SecureStreamPlayer', () => {
  let host: HTMLElement;
  let player: SecureStreamPlayer | undefined;
  beforeEach(() => {
    localStorage.clear();
    host = document.createElement('div');
    document.body.append(host);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    Object.defineProperty(HTMLMediaElement.prototype, 'textTracks', { configurable: true, get: () => [] });
  });
  afterEach(() => {
    player?.destroy();
    player = undefined;
    host.remove();
    vi.restoreAllMocks();
  });
  const setup = (id = 'sample') => new SecureStreamPlayer({
    container: host, id, src: 'https://example.org/video.mp4',
    watermark: { text: 'Demo Watermark', enabled: true },
  });

  it('mounts accessible controls and watermark', () => {
    player = setup();
    expect(host.querySelector('[role="region"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="Rewind 10 seconds"]')).not.toBeNull();
    expect(host.querySelector('.ssp-watermark')?.textContent).toBe('Demo Watermark');
  });
  it('toggles watermark without changing the source video', () => {
    player = setup();
    const mark = host.querySelector<HTMLElement>('.ssp-watermark')!;
    player.setWatermark(false);
    expect(mark.hidden).toBe(true);
    player.setWatermark(true);
    expect(mark.hidden).toBe(false);
  });
  it('rewinds and forwards by 10 seconds', () => {
    player = setup();
    const video = host.querySelector('video')!;
    video.currentTime = 30;
    player.skip(-10);
    expect(video.currentTime).toBe(20);
    player.skip(10);
    expect(video.currentTime).toBe(30);
  });
  it('restores the previous watch position for the same movie', () => {
    localStorage.setItem('securestream:progress:movie-1', '42');
    player = setup('movie-1');
    const video = host.querySelector('video')!;
    Object.defineProperty(video, 'duration', { configurable: true, value: 180 });
    video.dispatchEvent(new Event('loadedmetadata'));
    expect(video.currentTime).toBe(42);
  });
  it('saves playback position periodically', () => {
    player = setup('movie-2');
    const video = host.querySelector('video')!;
    Object.defineProperty(video, 'duration', { configurable: true, value: 180 });
    video.currentTime = 35;
    video.dispatchEvent(new Event('timeupdate'));
    expect(localStorage.getItem('securestream:progress:movie-2')).toBe('35');
  });
  it('switches Fit / Stretch / Fill and preset aspect ratio modes', () => {
    player = setup();
    const root = host.querySelector<HTMLElement>('.ssp-player')!;
    const view = host.querySelector<HTMLSelectElement>('[data-role="display"]')!;
    expect(view.value).toBe('fit');
    player.setDisplayMode('stretch');
    expect(root.dataset.display).toBe('stretch');
    view.value = 'fill';
    view.dispatchEvent(new Event('change'));
    expect(root.dataset.display).toBe('fill');
    player.setDisplayMode('ratio-21-9');
    expect(root.dataset.display).toBe('ratio-21-9');
    expect(() => player?.setDisplayMode('bad' as any)).toThrow();
  });
  it('changes playback speed from the selector', () => {
    player = setup();
    const select = host.querySelector<HTMLSelectElement>('[data-role="speed"]')!;
    const video = host.querySelector('video')!;
    select.value = '1.5';
    select.dispatchEvent(new Event('change'));
    expect(video.playbackRate).toBe(1.5);
  });
});
