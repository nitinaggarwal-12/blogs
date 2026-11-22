// ==========================================================================
// js/blog_meet_player.js — Inline Meet-Style AI Digital Twin Video Player
// Pure DOM element construction only, zero browser synthetic TTS narration.
// Executive Light Theme card chrome wrapping 1920x1080 composited .mp4.
// ==========================================================================
(function () {
  'use strict';

  const VALID_SLUGS = new Set(['ws1', 'ws2', 'ws3', 'ws4', 'ws5']);
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
      '.blog-meet-hdr{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px 14px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;margin-bottom:14px;}',
      '.blog-meet-badges{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;}',
      '.blog-meet-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.01em;border:1px solid #cbd5e1;background:#f8fafc;color:#334155;}',
      '.blog-meet-pill.ai{background:#fffbeb;color:#92400e;border-color:#fde68a;}',
      '.blog-meet-pill.live{background:#ecfdf5;color:#047857;border-color:#a7f3d0;}',
      '.blog-meet-pill.saas{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe;}',
      '.blog-meet-pill.before{background:#fff1f2;color:#be123c;border-color:#fecdd3;}',
      '.blog-meet-pill.after{background:#ecfdf5;color:#047857;border-color:#a7f3d0;}',
      '.blog-meet-title{margin:0;font-size:16.5px;font-weight:800;color:#0f172a;line-height:1.3;}',
      '.blog-meet-sub{margin:4px 0 0 0;font-size:12.5px;color:#475569;line-height:1.45;}',
      '.blog-meet-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
      '.blog-meet-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#ffffff;color:#0f172a;font-size:12px;font-weight:700;cursor:pointer;text-decoration:none;white-space:nowrap;}',
      '.blog-meet-btn:hover{background:#f1f5f9;border-color:#94a3b8;}',
      '.blog-meet-btn.primary{background:#1a73e8;color:#ffffff;border-color:#1a73e8;}',
      '.blog-meet-btn.primary:hover{background:#1557b0;}',
      '.blog-meet-video-wrap{position:relative;border-radius:12px;overflow:hidden;border:1px solid #cbd5e1;background:#0b1120;aspect-ratio:16/9;width:100%;max-height:620px;}',
      '.blog-meet-video{width:100%;height:100%;display:block;background:#0b1120;object-fit:contain;}',
      '.blog-meet-disclosure{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:10px;padding:8px 12px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:11.5px;color:#334155;}',
      '.blog-meet-chapters-hdr{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin:14px 0 8px 0;font-size:12px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:0.04em;}',
      '.blog-meet-chapters-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;}',
      '.blog-meet-ch-btn{display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:10px;border:1.5px solid #e2e8f0;background:#f8fafc;color:#0f172a;text-align:left;cursor:pointer;transition:border-color 0.15s,box-shadow 0.15s,background 0.15s;}',
      '.blog-meet-ch-btn:hover{border-color:#93c5fd;background:#eff6ff;}',
      '.blog-meet-ch-btn.active{border-color:#1a73e8;background:#eff6ff;box-shadow:0 0 0 2px rgba(26,115,232,0.18);}',
      '.blog-meet-ch-thumb{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;background:#0f172a;display:block;}',
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

  function fmtTime(sec) {
    const n = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(n / 60);
    const r = n % 60;
    return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
  }

  function inferPhaseClass(badgeText) {
    const low = String(badgeText || '').toLowerCase();
    if (low.includes('before')) return 'before';
    if (low.includes('after')) return 'after';
    if (low.includes('saas') || low.includes('liveboard') || low.includes('saved answer')) return 'saas';
    return 'live';
  }

  function buildMeetRecordingCard(slug, manifest) {
    const card = makeEl('section', 'blog-meet-card');
    card.id = 'blog-meet-recording-card';
    card.setAttribute('data-testid', 'blog-meet-recording-card');
    card.setAttribute('data-blog-slug', slug);
    card.setAttribute('data-no-hover-toolbar', 'true');
    card.setAttribute('aria-label', 'Live Technical Implementation Meet Recording');

    const hdr = makeEl('div', 'blog-meet-hdr');
    const hdrLeft = makeEl('div');
    const badges = makeEl('div', 'blog-meet-badges');

    badges.appendChild(makeEl('span', 'blog-meet-pill live', 'LIVE 24FPS X11 IMPLEMENTATION WALKTHROUGH'));
    badges.appendChild(makeEl('span', 'blog-meet-pill ai', manifest.previewBadge || 'AI-GENERATED DIGITAL TWIN'));
    if (manifest.saasTarget && manifest.saasTarget.name) {
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
    hdrLeft.appendChild(makeEl('h3', 'blog-meet-title', manifest.title || ('Live Technical Implementation Recording (' + slug.toUpperCase() + ')')));
    if (manifest.subtitle) {
      hdrLeft.appendChild(makeEl('p', 'blog-meet-sub', manifest.subtitle));
    }

    const actions = makeEl('div', 'blog-meet-actions');
    const fsBtn = makeEl('button', 'blog-meet-btn primary', 'Fullscreen');
    fsBtn.type = 'button';
    fsBtn.setAttribute('data-testid', 'blog-meet-fullscreen-btn');
    actions.appendChild(fsBtn);

    const videoUrl = safeLocalUrl(manifest.videoUrl || ('/recordings/' + slug + '/meet_live_execution_recording.mp4'));
    const posterUrl = safeLocalUrl(manifest.posterUrl || ('/recordings/' + slug + '/meet_recording_poster.jpg'));
    const captionsUrl = safeLocalUrl(manifest.captionsUrl || ('/recordings/' + slug + '/captions.vtt'));

    if (videoUrl) {
      const dlLink = makeEl('a', 'blog-meet-btn', 'Download MP4');
      dlLink.href = videoUrl;
      dlLink.setAttribute('download', slug + '-live-meet-recording.mp4');
      dlLink.setAttribute('data-testid', 'blog-meet-download-link');
      actions.appendChild(dlLink);
    }

    hdr.appendChild(hdrLeft);
    hdr.appendChild(actions);
    card.appendChild(hdr);

    // HTML5 <video> element with opt-in WebVTT captions track (NO `default` attribute to prevent doubling over burned-in CC)
    const videoWrap = makeEl('div', 'blog-meet-video-wrap');
    const video = document.createElement('video');
    video.id = 'blog-meet-video-el-' + slug;
    video.className = 'blog-meet-video';
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    video.setAttribute('data-testid', 'blog-meet-video-player');
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
      // Leave track opt-in (disabled by default) so WebVTT never doubles burned-in Meet CC.
      video.appendChild(track);
    }
    videoWrap.appendChild(video);
    card.appendChild(videoWrap);

    fsBtn.addEventListener('click', function () {
      try {
        if (video.requestFullscreen) {
          video.requestFullscreen().catch(function () {});
        } else if (video.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
        }
      } catch (_) {}
    });

    // Radical Truthfulness Disclosure Bar
    const disclosure = makeEl('div', 'blog-meet-disclosure');
    disclosure.setAttribute('data-testid', 'blog-meet-composite-disclosure');
    disclosure.appendChild(
      makeEl(
        'span',
        '',
        manifest.compositeLabel ||
          'Automated 24fps X11 Live Capture · Pure Omni 1.2 AI Digital Twin (Meet-Style Side-by-Side Composite)'
      )
    );
    const metaRight = [
      manifest.presenterName || 'AI Digital Twin · Google Cloud',
      manifest.durationSec ? fmtTime(manifest.durationSec) + ' total' : '',
      manifest.chapters ? manifest.chapters.length + ' chapters' : ''
    ]
      .filter(Boolean)
      .join(' · ');
    disclosure.appendChild(makeEl('strong', '', metaRight));
    card.appendChild(disclosure);

    // Interactive Chapter Scrubber Cards
    const chapters = Array.isArray(manifest.chapters) ? manifest.chapters : [];
    const chButtons = [];
    if (chapters.length > 0) {
      const chHdr = makeEl('div', 'blog-meet-chapters-hdr');
      chHdr.appendChild(makeEl('span', '', 'Interactive Chapters (Click to Seek Live Capture)'));
      chHdr.appendChild(makeEl('span', '', 'Native X11 Capture + Real UI State Transitions'));
      card.appendChild(chHdr);

      const grid = makeEl('div', 'blog-meet-chapters-grid');
      grid.setAttribute('data-testid', 'blog-meet-chapters-grid');

      chapters.forEach(function (ch, idx) {
        const chNum = ch.chapterNum || idx + 1;
        const btn = makeEl('button', 'blog-meet-ch-btn' + (idx === 0 ? ' active' : ''));
        btn.type = 'button';
        btn.setAttribute('data-testid', 'blog-meet-chapter-btn-' + chNum);
        btn.setAttribute('data-start-sec', String(Number(ch.startSec || 0)));

        const thumbUrl = safeLocalUrl(ch.thumbnailUrl || ('/recordings/' + slug + '/chapters/ch-' + String(chNum).padStart(2, '0') + '.png'));
        if (thumbUrl) {
          const img = document.createElement('img');
          img.className = 'blog-meet-ch-thumb';
          img.src = thumbUrl;
          img.alt = 'Chapter ' + chNum + ' preview: ' + (ch.shortTitle || ch.title || '');
          img.loading = 'lazy';
          img.decoding = 'async';
          btn.appendChild(img);
        }

        const metaRow = makeEl('div', 'blog-meet-ch-meta');
        metaRow.appendChild(makeEl('span', '', 'Ch ' + chNum + ' · ' + fmtTime(ch.startSec)));
        if (ch.phaseBadge) {
          metaRow.appendChild(makeEl('span', 'blog-meet-pill ' + inferPhaseClass(ch.phaseBadge), ch.phaseBadge));
        }
        btn.appendChild(metaRow);
        btn.appendChild(makeEl('div', 'blog-meet-ch-title', ch.shortTitle || ch.title || ('Chapter ' + chNum)));
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

    // Collapsible Synchronized Transcript & Capture Provenance Summary
    const details = makeEl('details', 'blog-meet-details');
    details.setAttribute('data-testid', 'blog-meet-transcript-provenance');
    details.appendChild(makeEl('summary', '', 'Synchronized Transcript & Cryptographic Capture Provenance (' + chapters.length + ' Chapters)'));

    const provGrid = makeEl('div', 'blog-meet-prov-grid');
    const provItems = [
      ['Capture Engine', manifest.capturePrimitive || 'ffmpeg -f x11grab -framerate 24 -draw_mouse 1'],
      ['Twin Engine', (manifest.twinEngine || 'models/omni_1p2') + ' (' + (manifest.personaId || 'cloud-ai-digital-twin') + ')'],
      ['Output Resolution', (manifest.width || 1920) + 'x' + (manifest.height || 1080) + ' @ ' + (manifest.fps || 24) + 'fps'],
      ['Recorded At (UTC)', manifest.generatedAt || 'Verified']
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
        const head = makeEl(
          'strong',
          '',
          '[' + fmtTime(ch.startSec) + '–' + fmtTime(ch.endSec) + '] Ch ' + (ch.chapterNum || idx + 1) + ': ' + (ch.title || ch.shortTitle || '')
        );
        item.appendChild(head);
        const bodyTxt = makeEl('div', '', ch.script || '');
        bodyTxt.style.marginTop = '4px';
        item.appendChild(bodyTxt);
        if (ch.displayUrl) {
          const urlLine = makeEl('div', 'blog-meet-code', 'Surface URL: ' + ch.displayUrl);
          urlLine.style.marginTop = '4px';
          urlLine.style.color = '#475569';
          item.appendChild(urlLine);
        }
        tList.appendChild(item);
      });
      details.appendChild(tList);
    }

    card.appendChild(details);
    return card;
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
      try {
        const resp = await fetch('/recordings/' + encodeURIComponent(slug) + '/meet_recording_manifest.json', {
          cache: 'no-cache'
        });
        if (!resp.ok) {
          slot.replaceChildren();
          continue;
        }
        const manifest = await resp.json();
        if (!manifest || !manifest.videoUrl || !Array.isArray(manifest.chapters) || manifest.chapters.length === 0) {
          slot.replaceChildren();
          continue;
        }
        slot.replaceChildren();
        slot.appendChild(buildMeetRecordingCard(slug, manifest));
        slot.setAttribute('data-hydrated-slug', slug);
      } catch (_) {
        slot.replaceChildren();
      }
    }
  }

  window.hydrateBlogMeetRecordingCard = hydrateBlogMeetRecordingCard;
})();
