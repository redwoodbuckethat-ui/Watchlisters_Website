(function () {
  const config = window.SITE_CONFIG || {};
  const page = document.body.dataset.page;

  function updateSiteText() {
    document.title = document.title.replace('Neon Archive', config.siteTitle || 'Neon Archive');
    const brandEls = document.querySelectorAll('.brand');
    brandEls.forEach((el) => (el.textContent = config.siteTitle || 'Neon Archive'));
    const label = document.getElementById('countdownLabel');
    if (label) label.textContent = config.countdownLabel || 'Next transmission in...';
  }

  function setPasswordGate() {
  const overlay = document.getElementById('passwordOverlay');
  const form = document.getElementById('passwordForm');
  const input = document.getElementById('passwordInput');
  const message = document.getElementById('passwordMessage');

  if (!overlay || !form || !input) return;

  const expected = config.password || '';
  const unlocked = sessionStorage.getItem('story-site-unlocked') === expected;

  if (!expected || unlocked) {
    overlay.classList.add('hidden');
    return;
  }

  overlay.classList.remove('hidden');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (input.value === expected) {
      sessionStorage.setItem('story-site-unlocked', expected);
      overlay.classList.add('hidden');
      message.textContent = '';
    } else {
      message.textContent = 'Wrong password. Try again.';
    }
  });
}

  function getChapterStatus(chapter) {
    const releasedByDate = new Date(chapter.releaseDate).getTime() <= Date.now();
    return chapter.published || releasedByDate ? 'live' : 'locked';
  }

  function renderChapterList() {
    const list = document.getElementById('chapterList');
    if (!list) return;

    list.innerHTML = '';
    (config.chapters || []).forEach((chapter) => {
      const status = getChapterStatus(chapter);
      const card = document.createElement('article');
      card.className = 'chapter-card';
      const href = status === 'live' ? chapter.file : '#';
      const releaseDate = new Date(chapter.releaseDate).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      card.innerHTML = `
        <div>
          <p class="eyebrow">Chapter ${chapter.number}</p>
          <h3>${chapter.title}</h3>
          <p class="muted">${chapter.excerpt}</p>
          <p class="muted">Release: ${releaseDate}</p>
        </div>
        <div>
          <span class="chapter-status ${status === 'live' ? 'status-live' : 'status-locked'}">
            ${status === 'live' ? 'Live' : 'Locked'}
          </span>
        </div>
      `;
      if (status === 'live') {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => (window.location.href = href));
      }
      list.appendChild(card);
    });
  }

  function renderChapterNavigation() {
    const nav = document.getElementById('chapterNav');
    const chapterId = document.body.dataset.chapterId;
    if (!nav || !chapterId) return;

    const chapters = (config.chapters || []).filter((chapter) => getChapterStatus(chapter) === 'live');
    const currentIndex = chapters.findIndex((chapter) => chapter.id === chapterId);
    const previous = chapters[currentIndex - 1];
    const next = chapters[currentIndex + 1];

    nav.innerHTML = `
      ${previous ? `<a class="btn btn-secondary" href="../${previous.file}">← Previous Chapter</a>` : ''}
      <a class="btn btn-secondary" href="../index.html">Archive</a>
      ${next ? `<a class="btn btn-primary" href="../${next.file}">Next Chapter →</a>` : ''}
    `;
  }

  function renderChapterTitle() {
    const chapterId = document.body.dataset.chapterId;
    if (!chapterId) return;

    const chapter = (config.chapters || []).find((item) => item.id === chapterId);
    const title = document.getElementById('chapterTitle');
    if (chapter && title) {
      title.textContent = `Chapter ${chapter.number}: ${chapter.title}`;
      document.title = `Chapter ${chapter.number} | ${config.siteTitle || 'Neon Archive'}`;
    }
  }

  function updateCountdown() {
    const ids = ['days', 'hours', 'minutes', 'seconds'];
    if (!ids.every((id) => document.getElementById(id))) return;

    const now = new Date();
    const next = new Date(now);
    const releaseDay = Number.isInteger(config.releaseDay) ? config.releaseDay : 6;
    const releaseHour = Number.isInteger(config.releaseHour) ? config.releaseHour : 12;
    const releaseMinute = Number.isInteger(config.releaseMinute) ? config.releaseMinute : 0;
    const diff = (releaseDay - now.getDay() + 7) % 7;

    next.setDate(now.getDate() + diff);
    next.setHours(releaseHour, releaseMinute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 7);

    const remaining = next - now;
    const seconds = Math.floor(remaining / 1000);
    const days = Math.floor(seconds / (60 * 60 * 24));
    const hours = Math.floor((seconds % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = seconds % 60;

    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(secs).padStart(2, '0');
  }

  async function setupComments() {
    if (page !== 'chapter' || !window.supabase) return;

    const chapterId = document.body.dataset.chapterId;
    const list = document.getElementById('commentList');
    const form = document.getElementById('commentForm');
    const message = document.getElementById('commentMessage');
    const nameInput = document.getElementById('commentName');
    const textInput = document.getElementById('commentText');

    if (!chapterId || !list || !form) return;
    if (!config.supabaseUrl || !config.supabaseAnonKey || config.supabaseUrl.includes('PASTE_')) {
      list.innerHTML = '<p class="muted">Connect Supabase to enable comments.</p>';
      return;
    }

    const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

    async function loadComments() {
      const { data, error } = await client
        .from('comments')
        .select('id, chapter_id, name, comment, created_at')
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false });

      if (error) {
        list.innerHTML = '<p class="muted">Could not load comments yet.</p>';
        return;
      }

      if (!data.length) {
        list.innerHTML = '<p class="muted">No comments yet. Be the first to leave one.</p>';
        return;
      }

      list.innerHTML = '';
      data.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'comment-card';
        const created = new Date(item.created_at).toLocaleString();
        card.innerHTML = `
          <div class="comment-meta">
            <strong>${escapeHtml(item.name)}</strong>
            <span class="muted">${created}</span>
          </div>
          <p>${escapeHtml(item.comment)}</p>
        `;
        list.appendChild(card);
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      message.textContent = 'Posting...';

      const payload = {
        chapter_id: chapterId,
        name: nameInput.value.trim(),
        comment: textInput.value.trim()
      };

      const { error } = await client.from('comments').insert(payload);
      if (error) {
        message.textContent = 'Could not post comment.';
        return;
      }

      form.reset();
      message.textContent = 'Comment posted.';
      await loadComments();
    });

    await loadComments();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  updateSiteText();
  setPasswordGate();
  renderChapterList();
  renderChapterTitle();
  renderChapterNavigation();
  updateCountdown();
  setInterval(updateCountdown, 1000);
  setupComments();
})();
