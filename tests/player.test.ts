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
  it('keeps advanced settings behind the three-dot menu', () => {
    player = setup();
    const button = host.querySelector<HTMLButtonElement>('[data-action="menu"]')!;
    const menu = host.querySelector<HTMLElement>('.ssp-settings')!;
    expect(menu.hidden).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('[data-action="theater"]')).toBeNull();
    button.click();
    expect(menu.hidden).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('[data-role="quality"]')).not.toBeNull();
    expect(host.querySelector('[data-role="audio"]')).not.toBeNull();
    expect(host.querySelector('[data-role="captions"]')).not.toBeNull();
    expect(host.querySelector('[data-role="display"]')).not.toBeNull();
    expect(host.querySelector('[data-role="theme"]')).not.toBeNull();
    expect(host.querySelector('[data-role="watermark"]')).not.toBeNull();
    host.querySelector<HTMLButtonElement>('[data-action="close-menu"]')!.click();
    expect(menu.hidden).toBe(true);
  });
  it('provides independent audio and subtitle popovers without the mini player', () => {
    player = setup();
    expect(host.querySelector('[data-action="mini"]')).toBeNull();
    const advanced = host.querySelector<HTMLElement>('.ssp-settings')!;
    const captions = host.querySelector<HTMLButtonElement>('[data-action="captions-menu"]')!;
    const audio = host.querySelector<HTMLButtonElement>('[data-action="audio-menu"]')!;
    captions.click();
    expect(advanced.hidden).toBe(true);
    expect(host.querySelector<HTMLElement>('[data-quick="captions"]')!.hidden).toBe(false);
    expect(host.querySelector('[data-quick="captions"]')!.textContent).toContain('No subtitles available');
    audio.click();
    expect(host.querySelector<HTMLElement>('[data-quick="captions"]')!.hidden).toBe(true);
    expect(host.querySelector<HTMLElement>('[data-quick="audio"]')!.hidden).toBe(false);
    expect(host.querySelector('[data-quick="audio"]')!.textContent).toContain('No alternate audio languages');
    expect(advanced.hidden).toBe(true);
    host.querySelector<HTMLButtonElement>('[data-action="menu"]')!.click();
    expect(host.querySelector<HTMLElement>('[data-quick="audio"]')!.hidden).toBe(true);
    expect(advanced.hidden).toBe(false);
  });
  it('offers actual embedded text tracks in the subtitle popover', () => {
    const fakeTracks = [{ kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' }];
    Object.defineProperty(HTMLMediaElement.prototype, 'textTracks', { configurable: true, get: () => fakeTracks });
    player = setup();
    const video = host.querySelector('video')!;
    video.dispatchEvent(new Event('loadedmetadata'));
    host.querySelector<HTMLButtonElement>('[data-action="captions-menu"]')!.click();
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('[data-quick="captions"] .ssp-quick-option')];
    expect(buttons.map(b => b.textContent)).toEqual(['Off', 'English']);
    buttons[1].click();
    expect(fakeTracks[0].mode).toBe('showing');
    expect(host.querySelector<HTMLElement>('[data-quick="captions"]')!.hidden).toBe(true);
  });
  it('presents actual alternate audio tracks and switches the selected language', () => {
    player = setup();
    const mockHls = { audioTracks: [
      { name: 'stream_5', lang: 'en' },
      { name: 'stream_4', lang: 'de' },
    ], audioTrack: 0, destroy: vi.fn() };
    (player as any).hls = mockHls;
    (player as any).refreshAudio();
    host.querySelector<HTMLButtonElement>('[data-action="audio-menu"]')!.click();
    const options = [...host.querySelectorAll<HTMLButtonElement>('[data-quick="audio"] .ssp-quick-option')];
    expect(options.map(o => o.textContent)).toEqual(['English','German']);
    options[1].click();
    expect(mockHls.audioTrack).toBe(1);
    expect(host.querySelector<HTMLSelectElement>('[data-role="audio"]')!.value).toBe('1');
  });
  it('does not disable hls.js managed text tracks after selecting an HLS subtitle', () => {
    const managedTracks = [{ kind: 'subtitles', label: 'Internal HLS', language: 'en', mode: 'showing' }];
    Object.defineProperty(HTMLMediaElement.prototype, 'textTracks', { configurable: true, get: () => managedTracks });
    player = setup();
    const mockHls = { subtitleTracks: [{ name: 'stream_0', lang: 'en' }], subtitleDisplay: false, subtitleTrack: -1, destroy: vi.fn() };
    (player as any).hls = mockHls;
    (player as any).refreshCaptions();
    host.querySelector<HTMLButtonElement>('[data-action="captions-menu"]')!.click();
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('[data-quick="captions"] .ssp-quick-option')];
    expect(buttons.map(button => button.textContent)).toEqual(['Off','English']);
    buttons[1].click();
    expect(mockHls.subtitleTrack).toBe(0);
    expect(mockHls.subtitleDisplay).toBe(true);
    expect(managedTracks[0].mode).toBe('showing');
  });
  it('toggles elapsed/full duration to time remaining', () => {
    player = setup();
    const video = host.querySelector('video')!;
    Object.defineProperty(video, 'duration', { configurable: true, value: 125 });
    video.currentTime = 40;
    video.dispatchEvent(new Event('timeupdate'));
    const timer = host.querySelector<HTMLButtonElement>('[data-action="time"]')!;
    expect(timer.textContent).toContain('0:40 / 2:05');
    timer.click();
    expect(timer.textContent).toContain('0:40 / −1:25');
    timer.click();
    expect(timer.textContent).toContain('0:40 / 2:05');
  });
  it('does not alter stage dimensions for fit/fill/stretch and aspect presets', () => {
    player = setup();
    const stage = host.querySelector<HTMLElement>('.ssp-stage')!;
    const originalStyle = stage.getAttribute('style');
    const originalClass = stage.className;
    for (const mode of ['fit','fill','stretch','ratio-16-9','ratio-4-3','ratio-21-9'] as const) {
      player.setDisplayMode(mode);
      expect(stage.getAttribute('style')).toBe(originalStyle);
      expect(stage.className).toBe(originalClass);
    }
  });
  it('toggles watermark from the advanced settings checkbox', () => {
    player = setup();
    const mark = host.querySelector<HTMLElement>('.ssp-watermark')!;
    const toggle = host.querySelector<HTMLInputElement>('[data-role="watermark"]')!;
    expect(toggle.checked).toBe(true);
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    expect(mark.hidden).toBe(true);
    expect(toggle.checked).toBe(false);
  });

});
