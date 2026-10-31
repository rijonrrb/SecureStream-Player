import Hls from 'hls.js';
import './style.css';
import './display.css';

export type StreamSubtitle = { label: string; language: string; src: string };
export type DisplayMode = 'fit' | 'fill' | 'stretch' | 'ratio-16-9' | 'ratio-4-3' | 'ratio-21-9';
export type ThumbnailSprite = { src: string; interval: number; columns: number; rows: number; width: number; height: number };
export type PlayerOptions = {
  container: HTMLElement;
  id: string;
  src: string;
  title?: string;
  poster?: string;
  watermark?: { text: string; enabled?: boolean };
  subtitles?: StreamSubtitle[];
  thumbnails?: ThumbnailSprite;
  autoPlay?: boolean;
  muted?: boolean;
};

type PlaybackPreferences = { speed: number; volume: number; muted: boolean };

const PROGRESS_PREFIX = 'securestream:progress:';
const PREFERENCES_KEY = 'securestream:preferences:v1';
const RETRIES = 3;

const svgIcon = (path: string): string => '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
const ICON = {
  play: svgIcon('<polygon points="7 4 20 12 7 20 7 4" fill="currentColor" stroke="none"/>'),
  pause: svgIcon('<rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/>'),
  back: svgIcon('<path d="M3 11a9 9 0 1 1 2.6 6.4"/><path d="M3 4v7h7"/>'),
  forward: svgIcon('<path d="M21 11a9 9 0 1 0-2.6 6.4"/><path d="M21 4v7h-7"/>'),
  mute: svgIcon('<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m17 9 4 6m0-6-4 6"/>'),
  volume: svgIcon('<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a5 5 0 0 1 0 6"/><path d="M18 5a10 10 0 0 1 0 14"/>'),
  captions: svgIcon('<rect x="2.5" y="4.5" width="19" height="15" rx="1"/><path d="M5.5 12h4m5 0h4M5.5 15h4m5 0h4"/>'),
  audio: svgIcon('<path d="M9 18V5l12-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="15" r="3"/>'),
  pip: svgIcon('<rect x="2" y="4" width="20" height="16" rx="1"/><rect x="12" y="11" width="8" height="6" rx=".5" fill="currentColor" stroke="none"/>'),
  fullscreen: svgIcon('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>'),
  menu: svgIcon('<circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>'),
};


export class SecureStreamPlayer {
  private readonly options: PlayerOptions;
  private readonly root: HTMLElement;
  private readonly video: HTMLVideoElement;
  private readonly quality: HTMLSelectElement;
  private readonly audio: HTMLSelectElement;
  private readonly captions: HTMLSelectElement;
  private readonly speed: HTMLSelectElement;
  private readonly theme: HTMLSelectElement;
  private readonly settings: HTMLElement;
  private readonly menuButton: HTMLButtonElement;
  private readonly watermarkToggle: HTMLInputElement;
  private showRemaining = false;
  private readonly displayMode: HTMLSelectElement;
  private readonly seek: HTMLInputElement;
  private readonly volume: HTMLInputElement;
  private readonly notice: HTMLElement;
  private readonly watermark: HTMLElement;
  private readonly preview: HTMLElement;
  private readonly progressTime: HTMLElement;
  private readonly playButton: HTMLButtonElement;
  private readonly muteButton: HTMLButtonElement;
  private hls?: Hls;
  private networkRetries = 0;
  private mediaRetries = 0;
  private lastSavedSecond = -1;
  private restored = false;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const element = event.target as HTMLElement;
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(element.tagName)) return;
    const action: Record<string, () => void> = {
      ' ': () => this.togglePlay(),
      k: () => this.togglePlay(),
      ArrowLeft: () => this.skip(-10),
      ArrowRight: () => this.skip(10),
      f: () => void this.toggleFullscreen(),
      m: () => this.toggleMute(),
      p: () => void this.togglePictureInPicture(),
    };
    if (event.key === 'Escape' && !this.settings.hidden) { this.closeMenu(); return; }
    const callback = action[event.key];
    if (callback) {
      event.preventDefault();
      callback();
    }
  };

  constructor(options: PlayerOptions) {
    if (!options.container || !options.src || !options.id) {
      throw new Error('SecureStream requires container, src and id.');
    }
    this.options = options;
    this.root = document.createElement('section');
    this.root.className = 'ssp-player';
    this.root.tabIndex = 0;
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', options.title ? 'Video player: ' + options.title : 'Video player');
    this.root.innerHTML = [
      '<div class="ssp-stage">',
      '  <video class="ssp-video" playsinline preload="metadata" crossorigin="anonymous"></video>',
      '  <div class="ssp-watermark" aria-hidden="true"></div>',
      '  <div class="ssp-notice" role="status" aria-live="polite"></div>',
      '  <div class="ssp-preview" aria-hidden="true"></div>',
      '  <button class="ssp-center-play" data-action="play" aria-label="Play video">▶</button>',
      '  <div class="ssp-overlay">',
      '    <div class="ssp-top">',
      '      <div class="ssp-title" data-role="title"></div>',
      '      <div class="ssp-top-actions">',
      '        <button data-action="captions-menu" title="Subtitles" aria-label="Subtitles and captions">CC</button>',
      '        <button data-action="audio-menu" title="Audio language" aria-label="Audio language">♫</button>',
      '        <button data-action="pip" title="Picture-in-Picture" aria-label="Picture-in-Picture">▣</button>',
      '        <button data-action="fullscreen" title="Fullscreen" aria-label="Fullscreen">⛶</button>',
      '        <button class="ssp-menu-toggle" data-action="menu" aria-label="More playback settings" aria-expanded="false" aria-controls="ssp-settings">⋮</button>',
      '      </div>',
      '    </div>',
      '    <div class="ssp-settings" id="ssp-settings" role="group" aria-label="Playback settings" hidden>',
      '      <div class="ssp-settings-header"><span>PLAYBACK SETTINGS</span><button data-action="close-menu" aria-label="Close settings">×</button></div>',
      '      <label>Quality<select data-role="quality" aria-label="Video quality"><option value="auto">Auto</option></select></label>',
      '      <label>Audio language<select data-role="audio" aria-label="Audio language"><option value="-1">Default</option></select></label>',
      '      <label>Subtitles<select data-role="captions" aria-label="Subtitles"><option value="off">Off</option></select></label>',
      '      <label>Playback speed<select data-role="speed" aria-label="Playback speed">',
      '        <option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1">1×</option>',
      '        <option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option>',
      '      </select></label>',
      '      <label>Video view<select data-role="display" aria-label="Video fit and aspect ratio">',
      '        <option value="fit">Fit</option><option value="fill">Fill / crop</option>',
      '        <option value="stretch">Stretch</option><option value="ratio-16-9">16:9 crop</option>',
      '        <option value="ratio-4-3">4:3 crop</option><option value="ratio-21-9">21:9 crop</option>',
      '      </select></label>',
      '      <label>Control theme<select data-role="theme" aria-label="Control theme"><option value="cinema">Cinema</option><option value="contrast">High contrast</option></select></label>',
      '      <label class="ssp-switch-row">Watermark<input data-role="watermark" type="checkbox" aria-label="Enable watermark" /></label>',
      '      <button class="ssp-mini-action" data-action="mini" title="Mini player">Toggle mini player</button>',
      '    </div>',
      '    <div class="ssp-bottom">',
      '      <div class="ssp-progress-line"><input data-role="seek" type="range" value="0" min="0" max="1000" step="1" aria-label="Seek video position" /></div>',
      '      <div class="ssp-buttons">',
      '        <div class="ssp-primary-buttons">',
      '          <button data-action="back" title="Rewind 10 seconds" aria-label="Rewind 10 seconds">↶<small>10</small></button>',
      '          <button data-action="play" title="Play or pause" aria-label="Play or pause">▶</button>',
      '          <button data-action="forward" title="Forward 10 seconds" aria-label="Forward 10 seconds"><small>10</small>↷</button>',
      '          <button class="ssp-time" data-role="time" data-action="time" title="Toggle between duration and time remaining" aria-label="Toggle elapsed and remaining time">0:00 / 0:00</button>',
      '        </div>',
      '        <div class="ssp-secondary-buttons">',
      '          <button data-action="mute" title="Mute" aria-label="Mute or unmute">◖))</button>',
      '          <input data-role="volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume" />',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('\n');
    const iconButtons: Record<string, string> = {
      play: ICON.play, back: ICON.back + '<small>10</small>',
      forward: '<small>10</small>' + ICON.forward, mute: ICON.volume,
      'captions-menu': ICON.captions, 'audio-menu': ICON.audio,
      pip: ICON.pip, fullscreen: ICON.fullscreen, menu: ICON.menu,
    };
    this.root.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach(button => {
      const icon = iconButtons[button.dataset.action || ''];
      if (icon) button.innerHTML = icon;
    });
    this.root.querySelector<HTMLButtonElement>('.ssp-center-play')!.innerHTML = ICON.play;
    options.container.replaceChildren(this.root);
    const get = <T extends HTMLElement>(selector: string): T => {
      const el = this.root.querySelector<T>(selector);
      if (!el) throw new Error('SecureStream missing element: ' + selector);
      return el;
    };
    this.video = get<HTMLVideoElement>('video');
    this.quality = get<HTMLSelectElement>('[data-role="quality"]');
    this.audio = get<HTMLSelectElement>('[data-role="audio"]');
    this.captions = get<HTMLSelectElement>('[data-role="captions"]');
    this.speed = get<HTMLSelectElement>('[data-role="speed"]');
    this.theme = get<HTMLSelectElement>('[data-role="theme"]');
    this.settings = get<HTMLElement>('.ssp-settings');
    this.menuButton = get<HTMLButtonElement>('[data-action="menu"]');
    this.watermarkToggle = get<HTMLInputElement>('[data-role="watermark"]');
    this.displayMode = get<HTMLSelectElement>('[data-role="display"]');
    this.seek = get<HTMLInputElement>('[data-role="seek"]');
    this.volume = get<HTMLInputElement>('[data-role="volume"]');
    this.notice = get<HTMLElement>('.ssp-notice');
    this.watermark = get<HTMLElement>('.ssp-watermark');
    this.preview = get<HTMLElement>('.ssp-preview');
    this.progressTime = get<HTMLElement>('[data-role="time"]');
    this.playButton = get<HTMLButtonElement>('.ssp-primary-buttons [data-action="play"]');
    get<HTMLElement>('[data-role="title"]').textContent = options.title || '';
    this.muteButton = get<HTMLButtonElement>('[data-action="mute"]');

    this.video.controls = false;
    this.video.muted = Boolean(options.muted);
    if (options.poster) this.video.poster = options.poster;
    if (options.watermark?.text) {
      this.watermark.textContent = options.watermark.text;
      this.watermark.hidden = options.watermark.enabled === false;
    } else {
      this.watermark.hidden = true;
    }
    this.watermarkToggle.checked = !this.watermark.hidden;
    this.watermarkToggle.disabled = !options.watermark?.text;
    this.root.dataset.display = 'fit';
    this.root.dataset.theme = 'cinema';
    const preferences = this.readPreferences();
    if (preferences) {
      this.video.playbackRate = preferences.speed;
      this.video.volume = preferences.volume;
      this.video.muted = preferences.muted;
    }
    this.speed.value = String(this.video.playbackRate);
    this.volume.value = String(this.video.volume);
    this.updateMuteLabel();
    this.attachEvents();
    this.mountExternalSubtitles();
    this.loadSource();
  }

  private attachEvents(): void {
    this.root.addEventListener('keydown', this.onKeyDown);
    this.root.addEventListener('pointerdown', (event) => {
      if (!this.settings.hidden && !this.settings.contains(event.target as Node) && !this.menuButton.contains(event.target as Node)) this.closeMenu();
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => {
      button.addEventListener('click', () => this.handleAction(button.dataset.action || ''));
    });
    this.video.addEventListener('click', () => this.togglePlay());
    this.video.addEventListener('play', () => this.updatePlayLabel());
    this.video.addEventListener('pause', () => this.updatePlayLabel());
    this.video.addEventListener('loadedmetadata', () => {
      this.restorePosition();
      this.refreshCaptions();
      this.updateProgress();
    });
    this.video.addEventListener('timeupdate', () => {
      this.updateProgress();
      this.persistProgress();
    });
    this.video.addEventListener('ended', () => this.removeProgress());
    this.video.addEventListener('error', () => this.showNotice('Playback error. Check the video URL and browser codec support.'));
    this.video.addEventListener('volumechange', () => this.updateMuteLabel());
    this.watermarkToggle.addEventListener('change', () => this.setWatermark(this.watermarkToggle.checked));
    this.theme.addEventListener('change', () => { this.root.dataset.theme = this.theme.value; });
    this.seek.addEventListener('input', () => this.updatePreview());
    this.seek.addEventListener('change', () => {
      const duration = this.video.duration;
      if (Number.isFinite(duration) && duration > 0) {
        this.video.currentTime = Number(this.seek.value) / 1000 * duration;
      }
      this.preview.classList.remove('ssp-visible');
    });
    this.volume.addEventListener('input', () => {
      this.video.volume = Number(this.volume.value);
      this.video.muted = this.video.volume === 0;
      this.savePreferences();
    });
    this.speed.addEventListener('change', () => {
      this.video.playbackRate = Number(this.speed.value);
      this.savePreferences();
    });
    this.displayMode.addEventListener('change', () => this.setDisplayMode(this.displayMode.value as DisplayMode));
    this.quality.addEventListener('change', () => {
      if (!this.hls) return;
      this.hls.currentLevel = this.quality.value === 'auto' ? -1 : Number(this.quality.value);
      this.showNotice(this.quality.selectedOptions[0]?.textContent || 'Quality updated');
    });
    this.audio.addEventListener('change', () => {
      if (!this.hls || this.audio.value === '-1') return;
      this.hls.audioTrack = Number(this.audio.value);
      this.showNotice('Audio: ' + (this.audio.selectedOptions[0]?.textContent || 'Selected'));
    });
    this.captions.addEventListener('change', () => this.changeCaptions());
  }

  private handleAction(action: string): void {
    switch (action) {
      case 'play': this.togglePlay(); break;
      case 'back': this.skip(-10); break;
      case 'forward': this.skip(10); break;
      case 'mute': this.toggleMute(); break;
      case 'menu': this.toggleMenu(); break;
      case 'close-menu': this.closeMenu(); break;
      case 'captions-menu': this.openMenu('captions'); break;
      case 'audio-menu': this.openMenu('audio'); break;
      case 'time': this.showRemaining = !this.showRemaining; this.updateProgress(); break;
      case 'mini': this.root.classList.toggle('ssp-mini'); break;
      case 'pip': void this.togglePictureInPicture(); break;
      case 'fullscreen': void this.toggleFullscreen(); break;
    }
  }

  private openMenu(focus?: 'captions' | 'audio'): void {
    this.settings.hidden = false;
    this.menuButton.setAttribute('aria-expanded', 'true');
    if (focus) (focus === 'captions' ? this.captions : this.audio).focus();
  }
  private closeMenu(): void {
    this.settings.hidden = true;
    this.menuButton.setAttribute('aria-expanded', 'false');
  }
  private toggleMenu(): void { if (this.settings.hidden) this.openMenu(); else this.closeMenu(); }

  private loadSource(): void {
    const isHls = /\.m3u8($|\?)/i.test(this.options.src);
    if (isHls && Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        capLevelToPlayerSize: true,
      });
      this.hls.on(Hls.Events.MEDIA_ATTACHED, () => this.hls?.loadSource(this.options.src));
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.updateLevels();
        this.refreshAudio();
        this.refreshCaptions();
        if (this.options.autoPlay) void this.tryPlay();
      });
      this.hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => this.refreshAudio());
      this.hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => this.refreshCaptions());
      this.hls.on(Hls.Events.LEVEL_SWITCHED, () => {
        if (this.hls?.autoLevelEnabled) this.showNotice('Auto quality');
      });
      this.hls.on(Hls.Events.FRAG_LOADED, () => {
        this.networkRetries = 0;
        this.mediaRetries = 0;
      });
      this.hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && this.networkRetries++ < RETRIES) {
          this.showNotice('Connection interrupted; retrying stream…');
          this.hls?.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && this.mediaRetries++ < 2) {
          this.showNotice('Recovering video decoder…');
          this.hls?.recoverMediaError();
        } else {
          this.showNotice('Stream unavailable. Try reloading or another source.');
          this.hls?.stopLoad();
        }
      });
      this.hls.attachMedia(this.video);
    } else {
      this.video.src = this.options.src;
      if (this.options.autoPlay) {
        this.video.addEventListener('loadedmetadata', () => { void this.tryPlay(); }, { once: true });
      }
      if (isHls && !this.video.canPlayType('application/vnd.apple.mpegurl')) {
        this.showNotice('This browser cannot play HLS. Please try another browser.');
      }
    }
  }

  private updateLevels(): void {
    if (!this.hls) return;
    this.quality.replaceChildren(new Option('Auto', 'auto'));
    const qualityLevels = this.hls.levels.map((level, index) => ({ level, index }));
    qualityLevels.sort((a, b) => b.level.height - a.level.height);
    for (const item of qualityLevels) {
      const label = item.level.height >= 2160 ? '4K (' + item.level.height + 'p)' :
        item.level.height ? item.level.height + 'p' : Math.round(item.level.bitrate / 1000) + ' kbps';
      this.quality.add(new Option(label, String(item.index)));
    }
    this.quality.value = 'auto';
    this.quality.disabled = this.hls.levels.length < 2;
  }

  private refreshAudio(): void {
    if (!this.hls) return;
    const previous = this.audio.value;
    this.audio.replaceChildren(new Option('Default', '-1'));
    this.hls.audioTracks.forEach((track, index) => {
      this.audio.add(new Option(track.name || track.lang || 'Track ' + (index + 1), String(index)));
    });
    this.audio.disabled = this.hls.audioTracks.length < 2;
    this.audio.value = this.hls.audioTracks.some((_, index) => String(index) === previous)
      ? previous : String(this.hls.audioTrack);
    if (this.audio.selectedIndex < 0) this.audio.value = '-1';
  }

  private mountExternalSubtitles(): void {
    for (const track of this.options.subtitles || []) {
      const element = document.createElement('track');
      element.kind = 'subtitles';
      element.label = track.label;
      element.srclang = track.language;
      element.src = track.src;
      this.video.append(element);
    }
  }

  private refreshCaptions(): void {
    const previous = this.captions.value;
    this.captions.replaceChildren(new Option('Off', 'off'));
    this.hls?.subtitleTracks.forEach((track, index) => {
      this.captions.add(new Option(track.name || track.lang || 'Subtitle ' + (index + 1), 'hls:' + index));
    });
    for (let i = 0; i < this.video.textTracks.length; i++) {
      const track = this.video.textTracks[i];
      if (track.kind === 'subtitles' || track.kind === 'captions') {
        this.captions.add(new Option(track.label || track.language || 'Captions', 'native:' + i));
      }
    }
    this.captions.value = [...this.captions.options].some(o => o.value === previous) ? previous : 'off';
    this.captions.disabled = this.captions.options.length < 2;
  }

  private changeCaptions(): void {
    const selected = this.captions.value;
    if (this.hls) {
      this.hls.subtitleDisplay = selected.startsWith('hls:');
      this.hls.subtitleTrack = selected.startsWith('hls:') ? Number(selected.split(':')[1]) : -1;
    }
    for (let i = 0; i < this.video.textTracks.length; i++) {
      this.video.textTracks[i].mode = selected === 'native:' + i ? 'showing' : 'disabled';
    }
    this.showNotice('Subtitles: ' + (this.captions.selectedOptions[0]?.textContent || 'Off'));
  }

  private formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00';
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = String(total % 60).padStart(2, '0');
    return hours > 0 ? hours + ':' + String(mins).padStart(2, '0') + ':' + secs : mins + ':' + secs;
  }

  private updateProgress(): void {
    const duration = this.video.duration;
    const current = this.video.currentTime;
    if (Number.isFinite(duration) && duration > 0) {
      this.seek.value = String(Math.min(1000, Math.max(0, Math.round(current / duration * 1000))));
    }
    const total = Number.isFinite(duration) ? duration : 0;
    this.progressTime.textContent = this.formatTime(current) + ' / ' + (this.showRemaining ? '−' + this.formatTime(Math.max(0, total - current)) : this.formatTime(total));
    this.seek.style.setProperty('--ssp-progress', (Number(this.seek.value) / 10) + '%');
  }

  private updatePreview(): void {
    const duration = this.video.duration;
    if (!Number.isFinite(duration) || !duration) return;
    const seconds = Number(this.seek.value) / 1000 * duration;
    this.preview.textContent = this.formatTime(seconds);
    const sprite = this.options.thumbnails;
    if (sprite) {
      const frame = Math.floor(seconds / sprite.interval);
      const column = frame % sprite.columns;
      const row = Math.min(sprite.rows - 1, Math.floor(frame / sprite.columns));
      this.preview.style.backgroundImage = 'url("' + sprite.src.replace(/"/g, '%22') + '")';
      this.preview.style.backgroundPosition = '-' + (column * sprite.width) + 'px -' + (row * sprite.height) + 'px';
      this.preview.style.backgroundSize = (sprite.columns * sprite.width) + 'px ' + (sprite.rows * sprite.height) + 'px';
      this.preview.style.width = sprite.width + 'px';
      this.preview.style.height = sprite.height + 'px';
    }
    this.preview.classList.add('ssp-visible');
  }

  private storageGet(key: string): string | null {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }
  private storageSet(key: string, value: string): void {
    try { window.localStorage.setItem(key, value); } catch { /* disabled storage */ }
  }
  private removeProgress(): void {
    try { window.localStorage.removeItem(PROGRESS_PREFIX + this.options.id); } catch { /* disabled */ }
  }
  private restorePosition(): void {
    if (this.restored) return;
    this.restored = true;
    const saved = Number(this.storageGet(PROGRESS_PREFIX + this.options.id));
    if (saved > 0 && Number.isFinite(this.video.duration) && saved < this.video.duration - 15) {
      this.video.currentTime = saved;
      this.showNotice('Resumed at ' + this.formatTime(saved));
    }
  }
  private persistProgress(): void {
    const seconds = Math.floor(this.video.currentTime);
    if (!Number.isFinite(seconds) || seconds === this.lastSavedSecond || seconds % 5 !== 0) return;
    if (!Number.isFinite(this.video.duration) || this.video.duration - seconds < 15) return;
    this.lastSavedSecond = seconds;
    this.storageSet(PROGRESS_PREFIX + this.options.id, String(seconds));
  }
  private readPreferences(): PlaybackPreferences | null {
    try {
      const raw = this.storageGet(PREFERENCES_KEY);
      if (!raw) return null;
      const data: Partial<PlaybackPreferences> = JSON.parse(raw);
      if (typeof data.speed !== 'number' || typeof data.volume !== 'number' || typeof data.muted !== 'boolean') return null;
      return { speed: data.speed, volume: Math.max(0, Math.min(1, data.volume)), muted: data.muted };
    } catch { return null; }
  }
  private savePreferences(): void {
    this.storageSet(PREFERENCES_KEY, JSON.stringify({
      speed: this.video.playbackRate, volume: this.video.volume, muted: this.video.muted,
    }));
  }
  private updateMuteLabel(): void {
    this.muteButton.innerHTML = this.video.muted || this.video.volume === 0 ? ICON.mute : ICON.volume;
    this.volume.value = String(this.video.volume);
  }
  private updatePlayLabel(): void {
    const playing = !this.video.paused;
    this.playButton.innerHTML = playing ? ICON.pause : ICON.play;
    const center = this.root.querySelector<HTMLButtonElement>('.ssp-center-play');
    if (center) { center.hidden = playing; center.innerHTML = ICON.play; }
  }
  private showNotice(message: string): void {
    this.notice.textContent = message;
  }
  private async tryPlay(): Promise<void> {
    try { await this.video.play(); } catch { this.showNotice('Press play to start playback.'); }
  }

  public setDisplayMode(mode: DisplayMode): void {
    const valid: DisplayMode[] = ['fit','fill','stretch','ratio-16-9','ratio-4-3','ratio-21-9'];
    if (!valid.includes(mode)) throw new Error('Unknown video display mode: ' + mode);
    this.root.dataset.display = mode;
    this.displayMode.value = mode;
    this.showNotice('View: ' + this.displayMode.selectedOptions[0]?.textContent);
  }
  public togglePlay(): void {
    if (this.video.paused) void this.tryPlay();
    else this.video.pause();
  }
  public skip(seconds: number): void {
    const max = Number.isFinite(this.video.duration) ? this.video.duration : Number.MAX_SAFE_INTEGER;
    this.video.currentTime = Math.max(0, Math.min(max, this.video.currentTime + seconds));
  }
  public toggleMute(): void {
    this.video.muted = !this.video.muted;
    this.savePreferences();
    this.updateMuteLabel();
  }
  public setWatermark(enabled: boolean): void {
    if (!this.options.watermark?.text) return;
    this.watermark.hidden = !enabled;
    this.watermarkToggle.checked = enabled;
    this.showNotice(enabled ? 'Watermark enabled' : 'Watermark disabled');
  }
  public async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement === this.root) await document.exitFullscreen();
    else if (this.root.requestFullscreen) await this.root.requestFullscreen();
  }
  public async togglePictureInPicture(): Promise<void> {
    try {
      if (document.pictureInPictureElement === this.video) await document.exitPictureInPicture();
      else if (document.pictureInPictureEnabled && this.video.requestPictureInPicture) {
        await this.video.requestPictureInPicture();
      } else this.showNotice('Picture-in-Picture is not supported by this browser.');
    } catch { this.showNotice('Picture-in-Picture could not start.'); }
  }
  public destroy(): void {
    if (Number.isFinite(this.video.currentTime) && this.video.currentTime > 0 && Number.isFinite(this.video.duration) && this.video.duration - this.video.currentTime >= 15) {
      this.storageSet(PROGRESS_PREFIX + this.options.id, String(Math.floor(this.video.currentTime)));
    }
    this.root.removeEventListener('keydown', this.onKeyDown);
    this.hls?.destroy();
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    this.root.remove();
  }
}

export default SecureStreamPlayer;
