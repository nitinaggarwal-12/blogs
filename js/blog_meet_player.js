// ==========================================================================
// js/blog_meet_player.js — ge-demos Dual-Video Digital Twin Delivery Player
// Video 1: Narrated Slide Deck Presentation (slide_deck_delivery_recording.mp4)
// Video 2: Live Technical Execution Meet Recording (meet_live_execution_recording.mp4)
// Pure DOM element construction only, zero browser synthetic TTS narration.
// ==========================================================================
(function () {
  'use strict';

  const VALID_SLUGS = new Set(['ws1', 'ws2', 'ws3', 'ws4', 'ws5']);
  const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
  let _stylesInjected = false;

  function ensurePlayerStyles() {
    if (_stylesInjected || document.getElementById('blog-meet-player-styles')) {
      _stylesInjected = true;
      return;
    }
    const style = document.createElement('style');
    style.id = 'blog-meet-player-styles';
    style.textContent = [
      '.blog-meet-card{background:#ffffff;border:1.5px solid #cbd5e1;border-radius:14px;padding:16px 18px;margin:14px 0 18px 0;box-shadow:0 4px 16px rgba(15,23,42,0.06);color:#0f172a;font-family:"Google Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,sans-serif;}',
      '.blog-meet-hdr{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px 14px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;margin-bottom:12px;}',
      '.blog-meet-badges{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;}',
      '.blog-meet-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.01em;border:1px solid #cbd5e1;background:#f8fafc;color:#334155;}',
      '.blog-meet-pill.ai{background:#fffbeb;color:#92400e;border-color:#fde68a;}',
      '.blog-meet-pill.live{background:#ecfdf5;color:#047857;border-color:#a7f3d0;}',
      '.blog-meet-pill.slides{background:#eef2ff;color:#3730a3;border-color:#c7d2fe;}',
      '.blog-meet-pill.saas{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe;}',
      '.blog-meet-pill.before{background:#fff1f2;color:#be123c;border-color:#fecdd3;}',
      '.blog-meet-pill.after{background:#ecfdf5;color:#047857;border-color:#a7f3d0;}',
      '.blog-meet-title{margin:0;font-size:16.5px;font-weight:800;color:#0f172a;line-height:1.3;}',
      '.blog-meet-sub{margin:4px 0 0 0;font-size:12.5px;color:#475569;line-height:1.45;}',
      '.dual-video-switcher{display:inline-flex;align-items:center;gap:6px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:10px;padding:4px;flex-wrap:wrap;}',
      '.dual-video-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:7px;border:1px solid transparent;background:transparent;color:#334155;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all 0.15s ease;}',
      '.dual-video-pill:hover:not(:disabled){background:#ffffff;color:#0f172a;}',
      '.dual-video-pill.active{background:#1a73e8;color:#ffffff;border-color:#1a73e8;box-shadow:0 2px 6px rgba(26,115,232,0.28);}',
      '.dual-video-pill:disabled{opacity:0.6;cursor:not-allowed;color:#64748b;}',
      '.blog-meet-video-wrap{position:relative;border-radius:12px;overflow:hidden;border:1px solid #cbd5e1;background:#0b1120;aspect-ratio:16/9;width:100%;max-height:620px;}',
      '.blog-meet-video{width:100%;height:100%;display:block;background:#0b1120;object-fit:contain;}',
      '.meet-controls-strip{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:10px;padding:8px 12px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;}',
      '.meet-controls-left,.meet-controls-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
      '.meet-speed-group{display:inline-flex;align-items:center;gap:4px;background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:2px;}',
      '.meet-speed-btn{padding:3px 7px;border-radius:6px;border:0;background:transparent;color:#334155;font-size:11.5px;font-weight:700;cursor:pointer;}',
      '.meet-speed-btn.active{background:#1a73e8;color:#ffffff;}',
      '.blog-meet-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:8px;border:1px solid #cbd5e1;background:#ffffff;color:#0f172a;font-size:12px;font-weight:700;cursor:pointer;text-decoration:none;white-space:nowrap;}',
      '.blog-meet-btn:hover{background:#f1f5f9;border-color:#94a3b8;}',
      '.blog-meet-btn.primary{background:#1a73e8;color:#ffffff;border-color:#1a73e8;}',
      '.blog-meet-btn.primary:hover{background:#1557b0;}',
      '.blog-meet-disclosure{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:8px;padding:8px 12px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:11.5px;color:#334155;}',
      '.blog-meet-chapters-hdr{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin:14px 0 8px 0;font-size:12px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:0.04em;}',
      '.blog-meet-chapters-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;}',
      '.blog-meet-ch-btn{display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:10px;border:1.5px solid #e2e8f0;background:#f8fafc;color:#0f172a;text-align:left;cursor:pointer;transition:border-color 0.15s,box-shadow 0.15s,background 0.15s;}',
      '.blog-meet-ch-btn:hover{border-color:#93c5fd;background:#eff6ff;}',
      '.blog-meet-ch-btn.active{border-color:#1a73e8;background:#eff6ff;box-shadow:0 0 0 2px rgba(26,115,232,0.18);}',
      '.blog-meet-ch-thumb{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;background:#0f172a;display:block;}',
      '.blog-meet-ch-meta{display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:10.5px;font-weight:700;color:#475569;}',
      '.blog-meet-ch-title{font-size:12px;font-weight:700;color:#0f172a;line-height:1.3;}',
      '.blog-meet-ch-surface{font-size:11px;color:#475569;line-height:1.3;}',
      '.blog-meet-details{margin-top:12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;padding:10px 14px;}',
      '.blog-meet-details summary{cursor:pointer;font-size:12.5px;font-weight:700;color:#1e293b;}',
      '.blog-meet-transcript-list{display:flex;flex-direction:column;gap:8px;margin-top:10px;}',
      '.blog-meet-transcript-item{background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 11px;font-size:12px;line-height:1.45;color:#1e293b;}',
      '.blog-meet-prov-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-top:10px;font-size:11.5px;color:#334155;}',
      '.blog-meet-prov-box{background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;}',
      '.blog-meet-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;word-break:break-all;color:#0f172a;}'
    ].join('\n');
    document.head.appendChild(style);
    _stylesInjected = true;
  }

  function makeEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
  }

  function safeLocalUrl(rawUrl) {
    const s = String(rawUrl || '').trim();
    if (!s) return '';
    if (s.startsWith('/') && !s.startsWith('//')) return s;
    return '';
  }

  function safeExternalUrl(rawUrl) {
    const s = String(rawUrl || '').trim();
    if (s.startsWith('https://docs.google.com/presentation/d/')) return s;
    return '';
  }

  function fmtTime(sec) {
    const n = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(n / 60);
    const r = n % 60;
    return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
  }

  function fmtMb(bytes) {
    const n = Number(bytes || 0);
    if (!n) return '';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function inferPhaseClass(badgeText) {
    const low = String(badgeText || '').toLowerCase();
    if (low.includes('slide')) return 'slides';
    if (low.includes('before')) return 'before';
    if (low.includes('after')) return 'after';
    if (low.includes('saas') || low.includes('liveboard') || low.includes('saved answer')) return 'saas';
    return 'live';
  }

  function buildDualVideoDeliveryCard(slug, slideManifest, liveManifest) {
    const card = makeEl('section', 'blog-meet-card');
    card.id = 'blog-meet-recording-card';
    card.setAttribute('data-testid', 'blog-meet-recording-card');
    card.setAttribute('data-blog-slug', slug);
    card.setAttribute('data-no-hover-toolbar', 'true');
    card.setAttribute('aria-label', 'Digital Twin Slide Presentation and Live Technical Execution Recordings');

    const hasSlides = Boolean(slideManifest && slideManifest.videoUrl && Array.isArray(slideManifest.chapters) && slideManifest.chapters.length > 0);
    const hasLive = Boolean(liveManifest && liveManifest.videoUrl && Array.isArray(liveManifest.chapters) && liveManifest.chapters.length > 0);

    let urlPreferred = '';
    try {
      const qs = new URLSearchParams(window.location.search || '');
      urlPreferred = String(qs.get('video') || '').toLowerCase();
    } catch (_) {}

    let activeTrack = 'slides';
    if (urlPreferred === 'slides' && hasSlides) {
      activeTrack = 'slides';
    } else if (urlPreferred === 'live' && hasLive) {
      activeTrack = 'live';
    } else if (hasLive) {
      activeTrack = 'live';
    } else if (hasSlides) {
      activeTrack = 'slides';
    }

    let currentSpeed = 1;

    function renderTrack() {
      const isSlideTrack = activeTrack === 'slides';
      const manifest = isSlideTrack ? slideManifest : liveManifest;
      card.setAttribute('data-active-track', activeTrack);
      card.replaceChildren();

      // Header with ge-demos Dual-Video Switcher Bar
      const hdr = makeEl('div', 'blog-meet-hdr');
      const hdrLeft = makeEl('div');
      const badges = makeEl('div', 'blog-meet-badges');

      badges.appendChild(
        makeEl(
          'span',
          'blog-meet-pill ' + (isSlideTrack ? 'slides' : 'live'),
          isSlideTrack ? 'VIDEO 1 · DIGITAL TWIN SLIDE PRESENTATION' : 'VIDEO 2 · LIVE 24FPS X11 TECHNICAL EXECUTION'
        )
      );
      badges.appendChild(makeEl('span', 'blog-meet-pill ai', manifest.previewBadge || 'AI-GENERATED DIGITAL TWIN'));
      badges.appendChild(
        makeEl(
          'span',
          'blog-meet-pill',
          (manifest.width || 1920) + '×' + (manifest.height || 1080) + ' · ' + (manifest.fps || 24) + 'fps'
        )
      );
      if (!isSlideTrack && manifest.saasTarget && manifest.saasTarget.name) {
        badges.appendChild(
          makeEl(
            'span',
            'blog-meet-pill saas',
            (manifest.saasTarget.saasId ? manifest.saasTarget.saasId + ' · ' : '') +
              manifest.saasTarget.name +
              (manifest.saasTarget.mode ? ' (' + manifest.saasTarget.mode + ')' : '')
          )
        );
      }

      hdrLeft.appendChild(badges);
      hdrLeft.appendChild(
        makeEl(
          'h3',
          'blog-meet-title',
          manifest.title ||
            (isSlideTrack
              ? 'Digital Twin Slide Deck Presentation (' + slug.toUpperCase() + ')'
              : 'Live Technical Execution Meet Recording (' + slug.toUpperCase() + ')')
        )
      );
      if (manifest.subtitle) {
        hdrLeft.appendChild(makeEl('p', 'blog-meet-sub', manifest.subtitle));
      }

      // ge-demos Dual-Video Delivery Switcher (Video 1: Slide Deck <-> Video 2: Live Technical Demo)
      const switcher = makeEl('div', 'dual-video-switcher');
      switcher.id = 'dualVideoDeliveryBar';
      switcher.setAttribute('role', 'group');
      switcher.setAttribute('aria-label', 'Select Digital Twin delivery video');
      switcher.setAttribute('data-testid', 'blog-dual-video-switcher');

      const slideTabBtn = makeEl(
        'button',
        'dual-video-pill' + (isSlideTrack ? ' active' : ''),
        hasSlides
          ? '1 · Slide Deck (' + slideManifest.chapters.length + 'S · ' + fmtTime(slideManifest.durationSec) + ')'
          : '1 · Slide Deck (Pending)'
      );
      slideTabBtn.type = 'button';
      slideTabBtn.id = 'btnVideoSlideDeck';
      slideTabBtn.setAttribute('data-testid', 'blog-video-tab-slides');
      slideTabBtn.setAttribute('aria-pressed', String(isSlideTrack));
      slideTabBtn.disabled = !hasSlides;
      slideTabBtn.addEventListener('click', function () {
        if (!hasSlides || activeTrack === 'slides') return;
        activeTrack = 'slides';
        renderTrack();
      });
      switcher.appendChild(slideTabBtn);

      const liveTabBtn = makeEl(
        'button',
        'dual-video-pill' + (!isSlideTrack ? ' active' : ''),
        hasLive
          ? '2 · Live Demo (' + liveManifest.chapters.length + 'Ch · ' + fmtTime(liveManifest.durationSec) + ')'
          : '2 · Live Demo (SaaS Sign-In Pending)'
      );
      liveTabBtn.type = 'button';
      liveTabBtn.id = 'btnVideoLiveDemo';
      liveTabBtn.setAttribute('data-testid', 'blog-video-tab-live');
      liveTabBtn.setAttribute('aria-pressed', String(!isSlideTrack));
      liveTabBtn.disabled = !hasLive;
      liveTabBtn.addEventListener('click', function () {
        if (!hasLive || activeTrack === 'live') return;
        activeTrack = 'live';
        renderTrack();
      });
      switcher.appendChild(liveTabBtn);

      hdr.appendChild(hdrLeft);
      hdr.appendChild(switcher);
      card.appendChild(hdr);

      // HTML5 <video> element with opt-in WebVTT captions track (NO default attribute to prevent doubling burned-in CC)
      const videoUrl = safeLocalUrl(manifest.videoUrl);
      const posterUrl = safeLocalUrl(manifest.posterUrl);
      const captionsUrl = safeLocalUrl(manifest.captionsUrl);

      const videoWrap = makeEl('div', 'blog-meet-video-wrap');
      const video = document.createElement('video');
      video.id = 'blog-meet-video-el-' + slug + '-' + activeTrack;
      video.className = 'blog-meet-video';
      video.controls = true;
      video.preload = 'metadata';
      video.playsInline = true;
      video.playbackRate = currentSpeed;
      video.setAttribute('data-testid', 'blog-meet-video-player');
      video.setAttribute('data-track', activeTrack);
      if (posterUrl) video.poster = posterUrl;

      if (videoUrl) {
        const source = document.createElement('source');
        source.src = videoUrl;
        source.type = 'video/mp4';
        video.appendChild(source);
      }
      if (captionsUrl) {
        const track = document.createElement('track');
        track.kind = 'captions';
        track.src = captionsUrl;
        track.srclang = 'en';
        track.label = 'English (Verified Transcript)';
        video.appendChild(track);
      }
      videoWrap.appendChild(video);
      card.appendChild(videoWrap);

      // ge-demos Controls Strip: Speed selector + Fullscreen + Edit Slides + Video 1 & Video 2 Downloads
      const controlsStrip = makeEl('div', 'meet-controls-strip');
      const ctrlLeft = makeEl('div', 'meet-controls-left');
      const spdLabel = makeEl('span', '', 'Speed');
      spdLabel.style.fontSize = '12px';
      spdLabel.style.fontWeight = '700';
      spdLabel.style.color = '#475569';
      ctrlLeft.appendChild(spdLabel);

      const spdGroup = makeEl('div', 'meet-speed-group');
      spdGroup.setAttribute('role', 'group');
      spdGroup.setAttribute('aria-label', 'Video playback speed');
      const spdBtns = [];
      SPEEDS.forEach(function (rate) {
        const b = makeEl('button', 'meet-speed-btn' + (rate === currentSpeed ? ' active' : ''), rate + '×');
        b.type = 'button';
        b.addEventListener('click', function () {
          currentSpeed = rate;
          video.playbackRate = rate;
          spdBtns.forEach(function (sb, i) {
            sb.classList.toggle('active', SPEEDS[i] === rate);
          });
        });
        spdBtns.push(b);
        spdGroup.appendChild(b);
      });
      ctrlLeft.appendChild(spdGroup);

      const ctrlRight = makeEl('div', 'meet-controls-right');
      const fsBtn = makeEl('button', 'blog-meet-btn primary', 'Fullscreen');
      fsBtn.type = 'button';
      fsBtn.setAttribute('data-testid', 'blog-meet-fullscreen-btn');
      fsBtn.addEventListener('click', function () {
        try {
          if (video.requestFullscreen) {
            video.requestFullscreen().catch(function () {});
          } else if (video.webkitEnterFullscreen) {
            video.webkitEnterFullscreen();
          }
        } catch (_) {}
      });
      ctrlRight.appendChild(fsBtn);

      if (hasSlides) {
        const gSlidesUrl = safeExternalUrl(slideManifest.googleSlidesUrl);
        if (gSlidesUrl) {
          const gLink = makeEl('a', 'blog-meet-btn', 'Google Slides ↗');
          gLink.href = gSlidesUrl;
          gLink.target = '_blank';
          gLink.rel = 'noopener noreferrer';
          ctrlRight.appendChild(gLink);
        }
        const sUrl = safeLocalUrl(slideManifest.videoUrl);
        if (sUrl) {
          const sDl = makeEl(
            'a',
            'blog-meet-btn' + (isSlideTrack ? ' primary' : ''),
            '⬇ Video 1: Slides' + (slideManifest.fileSizeBytes ? ' (' + fmtMb(slideManifest.fileSizeBytes) + ')' : '')
          );
          sDl.href = sUrl;
          sDl.setAttribute('download', slideManifest.downloadFilename || slug + '_slide_deck_delivery.mp4');
          sDl.setAttribute('data-testid', isSlideTrack ? 'blog-meet-download-link' : 'blog-slide-download-link');
          ctrlRight.appendChild(sDl);
        }
      }

      if (hasLive) {
        const lUrl = safeLocalUrl(liveManifest.videoUrl);
        if (lUrl) {
          const lDl = makeEl(
            'a',
            'blog-meet-btn' + (!isSlideTrack ? ' primary' : ''),
            '⬇ Video 2: Live Demo' + (liveManifest.fileSizeBytes ? ' (' + fmtMb(liveManifest.fileSizeBytes) + ')' : '')
          );
          lDl.href = lUrl;
          lDl.setAttribute('download', liveManifest.downloadFilename || slug + '_meet_live_execution.mp4');
          lDl.setAttribute('data-testid', !isSlideTrack ? 'blog-meet-download-link' : 'blog-live-download-link');
          ctrlRight.appendChild(lDl);
        }
      }

      controlsStrip.appendChild(ctrlLeft);
      controlsStrip.appendChild(ctrlRight);
      card.appendChild(controlsStrip);

      // Radical Truthfulness Disclosure Bar
      const disclosure = makeEl('div', 'blog-meet-disclosure');
      disclosure.setAttribute('data-testid', 'blog-meet-composite-disclosure');
      disclosure.appendChild(
        makeEl(
          'span',
          '',
          manifest.compositeLabel ||
            (isSlideTrack
              ? 'Narrated Slide Deck Presentation · Pure Omni 1.2 AI Digital Twin (ge-demos Side-by-Side Format)'
              : 'Automated 24fps X11 Live Capture · Pure Omni 1.2 AI Digital Twin (Meet-Style Side-by-Side Composite)')
        )
      );
      const unitPlural = isSlideTrack ? 'slides' : 'chapters';
      const metaRight = [
        manifest.presenterName || 'AI Digital Twin · Google Cloud',
        manifest.durationSec ? fmtTime(manifest.durationSec) + ' total' : '',
        manifest.chapters ? manifest.chapters.length + ' ' + unitPlural : ''
      ]
        .filter(Boolean)
        .join(' · ');
      disclosure.appendChild(makeEl('strong', '', metaRight));
      card.appendChild(disclosure);

      // Interactive Slide / Chapter Scrubber Cards
      const chapters = Array.isArray(manifest.chapters) ? manifest.chapters : [];
      const chButtons = [];
      if (chapters.length > 0) {
        const chHdr = makeEl('div', 'blog-meet-chapters-hdr');
        chHdr.appendChild(
          makeEl(
            'span',
            '',
            isSlideTrack
              ? 'Interactive Slide Navigator (Click Any Slide to Seek)'
              : 'Interactive Live Chapters (Click to Seek Live Capture)'
          )
        );
        chHdr.appendChild(
          makeEl(
            'span',
            '',
            isSlideTrack
              ? '1920×1080 Verified Architecture Slides + Pure Omni 1.2 Clone'
              : 'Native 24fps X11 Capture + Real UI State Transitions'
          )
        );
        card.appendChild(chHdr);

        const grid = makeEl('div', 'blog-meet-chapters-grid');
        grid.setAttribute('data-testid', 'blog-meet-chapters-grid');

        chapters.forEach(function (ch, idx) {
          const chNum = ch.chapterNum || idx + 1;
          const btn = makeEl('button', 'blog-meet-ch-btn' + (idx === 0 ? ' active' : ''));
          btn.type = 'button';
          btn.setAttribute('data-testid', 'blog-meet-chapter-btn-' + chNum);
          btn.setAttribute('data-start-sec', String(Number(ch.startSec || 0)));

          const fallbackThumb = isSlideTrack
            ? '/slides/previews/' + slug + '-12slide-visual-deck/slide_' + String(chNum).padStart(2, '0') + '.png'
            : '/recordings/' + slug + '/chapters/ch-' + String(chNum).padStart(2, '0') + '.png';
          const thumbUrl = safeLocalUrl(ch.thumbnailUrl || fallbackThumb);
          if (thumbUrl) {
            const img = document.createElement('img');
            img.className = 'blog-meet-ch-thumb';
            img.src = thumbUrl;
            img.alt = (isSlideTrack ? 'Slide ' : 'Chapter ') + chNum + ' preview: ' + (ch.shortTitle || ch.title || '');
            img.loading = 'lazy';
            img.decoding = 'async';
            btn.appendChild(img);
          }

          const metaRow = makeEl('div', 'blog-meet-ch-meta');
          metaRow.appendChild(makeEl('span', '', (isSlideTrack ? 'Slide ' : 'Ch ') + chNum + ' · ' + fmtTime(ch.startSec)));
          if (ch.phaseBadge) {
            metaRow.appendChild(makeEl('span', 'blog-meet-pill ' + inferPhaseClass(ch.phaseBadge), ch.phaseBadge));
          }
          btn.appendChild(metaRow);
          btn.appendChild(makeEl('div', 'blog-meet-ch-title', ch.shortTitle || ch.title || ((isSlideTrack ? 'Slide ' : 'Chapter ') + chNum)));
          if (ch.surface) {
            btn.appendChild(makeEl('div', 'blog-meet-ch-surface', ch.surface));
          }

          btn.addEventListener('click', function () {
            const t = Math.max(0, Number(ch.startSec || 0));
            chButtons.forEach(function (b, bIdx) {
              b.classList.toggle('active', bIdx === idx);
            });
            try {
              if (video.readyState >= 1) {
                video.currentTime = t;
              } else {
                video.addEventListener(
                  'loadedmetadata',
                  function onLoaded() {
                    video.removeEventListener('loadedmetadata', onLoaded);
                    video.currentTime = t;
                  },
                  { once: true }
                );
                video.load();
              }
            } catch (_) {}
          });

          chButtons.push(btn);
          grid.appendChild(btn);
        });
        card.appendChild(grid);

        video.addEventListener('timeupdate', function () {
          const cur = Number(video.currentTime || 0);
          let activeIdx = 0;
          for (let i = 0; i < chapters.length; i++) {
            if (cur >= Number(chapters[i].startSec || 0) - 0.15) {
              activeIdx = i;
            }
          }
          chButtons.forEach(function (b, bIdx) {
            b.classList.toggle('active', bIdx === activeIdx);
          });
        });
      }

      // Collapsible Synchronized Transcript & Provenance Summary
      const details = makeEl('details', 'blog-meet-details');
      details.setAttribute('data-testid', 'blog-meet-transcript-provenance');
      details.appendChild(
        makeEl(
          'summary',
          '',
          'Synchronized Transcript & Cryptographic Provenance (' + chapters.length + ' ' + (isSlideTrack ? 'Slides' : 'Chapters') + ')'
        )
      );

      const provGrid = makeEl('div', 'blog-meet-prov-grid');
      const provItems = [
        [
          isSlideTrack ? 'Presentation Source' : 'Capture Engine',
          isSlideTrack
            ? manifest.captureMethod || 'Verified 1920x1080 Slides + Pure Omni 1.2 Digital Twin'
            : manifest.capturePrimitive || 'ffmpeg -f x11grab -framerate 24 -draw_mouse 1'
        ],
        ['Twin Engine', (manifest.twinEngine || 'models/omni_1p2') + ' (' + (manifest.personaId || 'cloud-ai-digital-twin') + ')'],
        ['Output Format', (manifest.width || 1920) + '×' + (manifest.height || 1080) + ' @ ' + (manifest.fps || 24) + 'fps (ge-demos v2-clean-exec)'],
        ['Generated At (UTC)', manifest.generatedAt || 'Verified']
      ];
      if (manifest.videoSha256) {
        provItems.push(['MP4 SHA-256', manifest.videoSha256]);
      }
      if (manifest.contentViewportCrop) {
        provItems.push(['Gate 3 Viewport Crop', manifest.contentViewportCrop]);
      }
      provItems.forEach(function (pair) {
        const box = makeEl('div', 'blog-meet-prov-box');
        box.appendChild(makeEl('div', '', pair[0]));
        box.appendChild(makeEl('div', 'blog-meet-code', pair[1]));
        provGrid.appendChild(box);
      });
      details.appendChild(provGrid);

      if (chapters.length > 0) {
        const tList = makeEl('div', 'blog-meet-transcript-list');
        chapters.forEach(function (ch, idx) {
          const item = makeEl('div', 'blog-meet-transcript-item');
          const prefix = isSlideTrack ? 'Slide ' : 'Ch ';
          const head = makeEl(
            'strong',
            '',
            '[' + fmtTime(ch.startSec) + '–' + fmtTime(ch.endSec) + '] ' + prefix + (ch.chapterNum || idx + 1) + ': ' + (ch.title || ch.shortTitle || '')
          );
          item.appendChild(head);
          const bodyTxt = makeEl('div', '', ch.script || '');
          bodyTxt.style.marginTop = '4px';
          item.appendChild(bodyTxt);
          if (ch.displayUrl) {
            const urlLine = makeEl('div', 'blog-meet-code', 'Surface: ' + ch.displayUrl);
            urlLine.style.marginTop = '4px';
            urlLine.style.color = '#475569';
            item.appendChild(urlLine);
          }
          tList.appendChild(item);
        });
        details.appendChild(tList);
      }

      card.appendChild(details);
    }

    renderTrack();
    return card;
  }

  async function fetchJsonOptional(url) {
    try {
      const resp = await fetch(url, { cache: 'no-cache' });
      if (!resp.ok) return null;
      return await resp.json();
    } catch (_) {
      return null;
    }
  }

  async function hydrateBlogMeetRecordingCard(rootEl) {
    ensurePlayerStyles();
    const root = rootEl || document;
    const slots = Array.from(root.querySelectorAll('#blog-meet-recording-slot, [data-blog-meet-slot]'));
    for (const slot of slots) {
      const slug = String(slot.getAttribute('data-blog-slug') || '').trim().toLowerCase();
      if (!VALID_SLUGS.has(slug)) {
        slot.replaceChildren();
        continue;
      }
      if (slot.getAttribute('data-hydrated-slug') === slug && slot.querySelector('#blog-meet-recording-card')) {
        continue;
      }
      const encSlug = encodeURIComponent(slug);
      const pair = await Promise.all([
        fetchJsonOptional('/recordings/' + encSlug + '/slide_deck_delivery_manifest.json'),
        fetchJsonOptional('/recordings/' + encSlug + '/meet_recording_manifest.json')
      ]);
      const slideManifest = pair[0];
      const liveManifest = pair[1];
      const hasSlides = Boolean(slideManifest && slideManifest.videoUrl && Array.isArray(slideManifest.chapters) && slideManifest.chapters.length > 0);
      const hasLive = Boolean(liveManifest && liveManifest.videoUrl && Array.isArray(liveManifest.chapters) && liveManifest.chapters.length > 0);
      if (!hasSlides && !hasLive) {
        slot.replaceChildren();
        continue;
      }
      slot.replaceChildren();
      slot.appendChild(buildDualVideoDeliveryCard(slug, hasSlides ? slideManifest : null, hasLive ? liveManifest : null));
      slot.setAttribute('data-hydrated-slug', slug);
    }
  }

  window.hydrateBlogMeetRecordingCard = hydrateBlogMeetRecordingCard;
})();
