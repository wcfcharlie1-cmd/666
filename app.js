(function () {
  'use strict';

  const state = {
    manifest: { items: [] },
    flatNotes: [],
    currentSlug: null
  };

  const elements = {
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    menuToggle: document.getElementById('menu-toggle'),
    sidebarClose: document.getElementById('sidebar-close'),
    searchInput: document.getElementById('search-input'),
    navTree: document.getElementById('nav-tree'),
    breadcrumb: document.getElementById('breadcrumb'),
    markdownBody: document.getElementById('markdown-body'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    themeLabel: document.getElementById('theme-label'),
    hljsLight: document.getElementById('hljs-theme-light'),
    hljsDark: document.getElementById('hljs-theme-dark')
  };

  /* =========================================
     1. 深色 / 淺色模式切換
     ========================================= */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pkb-theme', theme);

    const isDark = theme === 'dark';
    elements.themeIcon.textContent = isDark ? '☀️' : '🌙';
    elements.themeLabel.textContent = isDark ? '淺色' : '深色';

    if (elements.hljsLight && elements.hljsDark) {
      elements.hljsLight.disabled = isDark;
      elements.hljsDark.disabled = !isDark;
    }
  }

  function initTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current);

    elements.themeToggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }

  /* =========================================
     2. 手機版側邊欄開關
     ========================================= */
  function openSidebar() {
    elements.sidebar.classList.add('open');
    elements.sidebarOverlay.classList.add('open');
  }

  function closeSidebar() {
    elements.sidebar.classList.remove('open');
    elements.sidebarOverlay.classList.remove('open');
  }

  function initMobileMenu() {
    elements.menuToggle.addEventListener('click', openSidebar);
    elements.sidebarClose.addEventListener('click', closeSidebar);
    elements.sidebarOverlay.addEventListener('click', closeSidebar);
  }

  /* =========================================
     3. 目錄索引解析與渲染
     ========================================= */
  function flattenItems(items, categoryName = null) {
    const result = [];
    for (const item of items) {
      if (Array.isArray(item.children)) {
        result.push(...flattenItems(item.children, item.category));
      } else if (item.slug && item.path) {
        result.push({ ...item, category: categoryName });
      }
    }
    return result;
  }

  function renderNavTree(items, keyword = '') {
    const query = keyword.trim().toLowerCase();
    elements.navTree.innerHTML = '';

    const ul = buildNavList(items, query);
    if (!ul || ul.children.length === 0) {
      elements.navTree.innerHTML = '<div class="nav-empty">找不到符合的筆記主題</div>';
      return;
    }

    elements.navTree.appendChild(ul);
  }

  function buildNavList(items, query) {
    const ul = document.createElement('ul');
    ul.className = 'nav-list';

    for (const item of items) {
      if (Array.isArray(item.children)) {
        const categoryMatches = item.category && item.category.toLowerCase().includes(query);
        const childUl = buildNavList(item.children, categoryMatches ? '' : query);

        if (childUl && childUl.children.length > 0) {
          const li = document.createElement('li');
          li.className = 'nav-item';

          const details = document.createElement('details');
          details.className = 'nav-folder';
          details.open = true;

          const summary = document.createElement('summary');
          summary.className = 'nav-folder-summary';
          summary.textContent = item.category;

          details.appendChild(summary);
          details.appendChild(childUl);
          li.appendChild(details);
          ul.appendChild(li);
        }
      } else if (item.slug && item.path) {
        const titleMatches = item.title.toLowerCase().includes(query);
        const slugMatches = item.slug.toLowerCase().includes(query);
        if (query && !titleMatches && !slugMatches) continue;

        const li = document.createElement('li');
        li.className = 'nav-item';

        const link = document.createElement('a');
        link.href = `#/${item.slug}`;
        link.className = 'nav-link';
        if (item.slug === state.currentSlug) {
          link.classList.add('active');
        }

        const titleSpan = document.createElement('span');
        titleSpan.textContent = item.title;
        link.appendChild(titleSpan);

        if (item.updatedAt) {
          const metaSpan = document.createElement('span');
          metaSpan.className = 'nav-meta';
          metaSpan.textContent = `更新：${item.updatedAt}`;
          link.appendChild(metaSpan);
        }

        link.addEventListener('click', () => closeSidebar());
        li.appendChild(link);
        ul.appendChild(li);
      }
    }

    return ul;
  }

  /* =========================================
     4. 讀取並渲染 Markdown 筆記（含路徑容錯）
     ========================================= */
  function resolveRelativeUrl(relPath) {
    const clean = relPath.replace(/^\.\//, '');
    const base = window.location.href.split('#')[0].split('?')[0];
    const baseDir = base.endsWith('/') ? base : base.substring(0, base.lastIndexOf('/') + 1);
    return new URL(clean, baseDir).href;
  }

  async function fetchMarkdownWithFallback(primaryPath) {
    const fileName = primaryPath.split('/').pop();
    const candidates = Array.from(
      new Set([
        primaryPath,
        `./${fileName}`,
        `./Notes/${fileName}`
      ])
    );

    let lastStatus = '404';
    for (const candidate of candidates) {
      const url = resolveRelativeUrl(candidate);
      const res = await fetch(url);
      if (res.ok) {
        return await res.text();
      }
      lastStatus = `HTTP ${res.status}`;
    }

    const err = new Error(lastStatus);
    err.resolvedUrl = resolveRelativeUrl(primaryPath);
    throw err;
  }

  async function loadNoteBySlug(slug) {
    if (state.flatNotes.length === 0) {
      elements.markdownBody.innerHTML = '<p class="status-text">目前知識庫尚無任何筆記。</p>';
      return;
    }

    const target = state.flatNotes.find((n) => n.slug === slug) || state.flatNotes[0];
    state.currentSlug = target.slug;

    // 同步側邊欄高亮與麵包屑
    renderNavTree(state.manifest.items, elements.searchInput.value);
    elements.breadcrumb.textContent = target.category
      ? `${target.category} / ${target.title}`
      : target.title;
    document.title = `${target.title} | 個人知識庫`;

    try {
      const mdText = await fetchMarkdownWithFallback(target.path);
      marked.setOptions({
        gfm: true,
        breaks: false
      });

      elements.markdownBody.innerHTML = marked.parse(mdText);
      enhanceRenderedMarkdown();
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (err) {
      const isLocalFile = window.location.protocol === 'file:';
      const detailHint = isLocalFile
        ? `<p>偵測到你正在本機以 <code>file://</code> 直接雙擊開啟網頁，請改用本地伺服器（如 <code>python3 -m http.server 8000</code>）或部署至 GitHub Pages 瀏覽。</p>`
        : `
          <p>實際請求網址：<code>${err.resolvedUrl || target.path}</code></p>
          <ul>
            <li>請確認 GitHub Repository 根目錄下已建立 <code>notes/</code> 資料夾，且檔案完整路徑為 <code>${target.path.replace(/^\.\//, '')}</code>（注意資料夾名稱需為全小寫 <code>notes</code>）。</li>
            <li>請確認 Repository 根目錄已上傳 <code>.nojekyll</code> 空白檔，避免 GitHub Pages 的 Jekyll 機制影響 <code>.md</code> 檔案讀取。</li>
          </ul>
        `;

      elements.markdownBody.innerHTML = `
        <h2>無法載入筆記檔案</h2>
        <p>讀取路徑 <code>${target.path}</code> 時發生錯誤（${err.message}）。</p>
        ${detailHint}
      `;
    }
  }

  function enhanceRenderedMarkdown() {
    // 1. 程式碼語法高亮與複製按鈕
    elements.markdownBody.querySelectorAll('pre code').forEach((codeBlock) => {
      if (window.hljs) {
        window.hljs.highlightElement(codeBlock);
      }

      const pre = codeBlock.parentElement;
      if (!pre || pre.querySelector('.copy-code-btn')) return;

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'copy-code-btn';
      copyBtn.textContent = '複製';

      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(codeBlock.innerText);
          copyBtn.textContent = '已複製 ✓';
          setTimeout(() => {
            copyBtn.textContent = '複製';
          }, 1800);
        } catch {
          copyBtn.textContent = '複製失敗';
        }
      });

      pre.appendChild(copyBtn);
    });

    // 2. 辨識 [AI 補充提示] 引用區塊並加上專屬樣式
    elements.markdownBody.querySelectorAll('blockquote').forEach((bq) => {
      if (bq.textContent.includes('[AI 補充提示]')) {
        bq.classList.add('ai-tip-callout');
      }
    });

    // 3. 渲染數學與化學反應箭頭公式
    if (window.renderMathInElement) {
      window.renderMathInElement(elements.markdownBody, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    }
  }

  function getSlugFromHash() {
    const hash = window.location.hash || '';
    return hash.replace(/^#\/?/, '').trim();
  }

  /* =========================================
     5. 初始化應用程式
     ========================================= */
  async function init() {
    initTheme();
    initMobileMenu();

    elements.searchInput.addEventListener('input', (e) => {
      renderNavTree(state.manifest.items, e.target.value);
    });

    window.addEventListener('hashchange', () => {
      loadNoteBySlug(getSlugFromHash());
    });

    try {
      const manifestUrl = resolveRelativeUrl('./manifest.json');
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      state.manifest = await response.json();
      state.flatNotes = flattenItems(state.manifest.items || []);

      const initialSlug = getSlugFromHash();
      await loadNoteBySlug(initialSlug);
    } catch (err) {
      elements.navTree.innerHTML = '<div class="nav-empty">目錄載入失敗</div>';
      elements.markdownBody.innerHTML = `
        <h2>無法讀取 manifest.json</h2>
        <p>錯誤訊息：<code>${err.message}</code></p>
        <p>請確認專案根目錄存在 <code>manifest.json</code>，並透過 HTTP 伺服器或 GitHub Pages 開啟本網站。</p>
      `;
    }
  }

  init();
})();
