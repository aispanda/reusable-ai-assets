// Provider data only: no provider requests, arbitrary embed HTML or tracking params.
export const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
export function normalizeYouTubeUrl(input) {
  if (typeof input !== 'string' || input.length > 2048 || /[\x00-\x1f\x7f]/.test(input)) throw new Error('Enter a valid YouTube video URL.');
  let url;
  try { url = new URL(input.trim()); } catch { throw new Error('Enter the full https:// YouTube video URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Use a secure YouTube video URL without credentials or a custom port.');
  let videoId;
  if (url.hostname === 'youtu.be') videoId = /^\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1];
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
    if (url.pathname === '/watch' && url.searchParams.getAll('v').length === 1) videoId = url.searchParams.get('v');
    else videoId = /^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1];
  } else if (url.hostname === 'www.youtube-nocookie.com') videoId = /^\/embed\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1];
  if (!videoId || !YOUTUBE_VIDEO_ID.test(videoId)) throw new Error('Use a YouTube watch, shortened, Shorts or video embed URL. Playlists and channel links are not supported.');
  return { videoId };
}

export function youtubeMarkup(videoId) {
  if (typeof videoId !== 'string' || !YOUTUBE_VIDEO_ID.test(videoId)) throw new Error('Invalid YouTube video identifier.');
  return ['figure', { 'data-studio-youtube': '', 'data-youtube-id': videoId },
    ['div', { class: 'blog-youtube-player', 'data-youtube-player': '' },
      ['button', { type: 'button', 'data-youtube-load': '' }, 'Load YouTube player']],
    ['figcaption', {},
      ['p', {}, 'YouTube connects only after you load the player. Press Play to start. If the video is unavailable, use the link below.'],
      ['a', { href: `https://www.youtube.com/watch?v=${videoId}`, target: '_blank', rel: 'noopener noreferrer nofollow' }, 'Watch on YouTube (opens a new tab)']],
  ];
}

// Self-contained so preview can run precisely this trusted source under a script
// hash CSP, without granting same-origin/authenticated access to preview HTML.
export function mountYouTubePlayers(root = document) {
  for (const figure of root.querySelectorAll('figure[data-studio-youtube]')) {
    const id = figure.getAttribute('data-youtube-id');
    const button = figure.querySelector('[data-youtube-load]');
    const container = figure.querySelector('[data-youtube-player]');
    if (!/^[A-Za-z0-9_-]{11}$/.test(id ?? '') || !button || !container || button.dataset.youtubeBound) continue;
    button.dataset.youtubeBound = 'true';
    button.addEventListener('click', () => {
      if (container.querySelector('iframe')) return;
      const frame = figure.ownerDocument.createElement('iframe');
      frame.title = 'YouTube video player';
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&playsinline=1`;
      frame.allow = 'encrypted-media; fullscreen; picture-in-picture';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
      container.append(frame);
      button.hidden = true;
      // Cross-origin load does not prove a playable/available video. The separate
      // canonical fallback link remains visible for every outcome, even offline.
      frame.focus();
    });
  }
}
