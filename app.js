(() => {
  'use strict';

  const menuToggle = document.getElementById('menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  const copyEmailButton = document.getElementById('copy-email');
  const printButton = document.getElementById('print-resume');
  const toast = document.getElementById('toast');
  let toastTimer;

  function setMenuOpen(open, restoreFocus = false) {
    if (!menuToggle || !mobileNav) return;
    mobileNav.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    if (restoreFocus) menuToggle.focus();
  }

  if (menuToggle && mobileNav) {
    setMenuOpen(false);
    menuToggle.addEventListener('click', () => {
      setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
    });

    mobileNav.addEventListener('click', (event) => {
      const link = event.target?.closest?.('a[href]');
      if (link && mobileNav.contains(link)) setMenuOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !mobileNav.hidden) {
        setMenuOpen(false, true);
      }
    });
  }

  function showToast(message, success) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.dataset.state = success ? 'success' : 'error';
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, success ? 5000 : 8000);
  }

  function copyWithSelection(text) {
    if (!document.body || typeof document.execCommand !== 'function') {
      return false;
    }

    const previousFocus = document.activeElement;
    const field = document.createElement('textarea');
    field.value = text;
    field.readOnly = true;
    field.tabIndex = -1;
    field.setAttribute('aria-label', '用于复制的邮箱地址');
    Object.assign(field.style, {
      position: 'fixed',
      left: '-9999px',
      top: '0',
      opacity: '0',
      pointerEvents: 'none',
    });

    try {
      document.body.appendChild(field);
      field.focus({ preventScroll: true });
      field.select();
      field.setSelectionRange(0, text.length);
      return document.execCommand('copy') === true;
    } catch {
      return false;
    } finally {
      field.remove();
      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus({ preventScroll: true });
      }
    }
  }

  async function copyText(text) {
    try {
      if (typeof navigator.clipboard?.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Some browsers deny clipboard access; try a selection-based copy next.
    }
    return copyWithSelection(text);
  }

  if (copyEmailButton) {
    copyEmailButton.addEventListener('click', async () => {
      const email = copyEmailButton.dataset.email?.trim();
      if (!email) {
        showToast('未找到邮箱地址，请手动复制页面上的邮箱。', false);
        return;
      }

      const wasDisabled = copyEmailButton.disabled;
      copyEmailButton.disabled = true;
      copyEmailButton.setAttribute('aria-busy', 'true');
      try {
        const copied = await copyText(email);
        showToast(
          copied ? '邮箱已复制，可以粘贴发送邮件。' : '复制未成功，请手动选择并复制邮箱地址。',
          copied,
        );
      } catch {
        showToast('复制未成功，请手动选择并复制邮箱地址。', false);
      } finally {
        copyEmailButton.disabled = wasDisabled;
        copyEmailButton.removeAttribute('aria-busy');
      }
    });
  }

  if (printButton) {
    printButton.addEventListener('click', () => {
      if (typeof window.print === 'function') window.print();
    });
  }

  // Keep anchors native; observing sections only updates navigation state.
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const sectionMap = new Map();
  const linkedSections = [];

  for (const link of navLinks) {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#') || href.length < 2) continue;
    let id;
    try {
      id = decodeURIComponent(href.slice(1));
    } catch {
      continue;
    }
    const section = document.getElementById(id);
    if (!section) continue;
    sectionMap.set(id, section);
    linkedSections.push({ link, id });
  }

  function markActiveSection(id) {
    for (const item of linkedSections) {
      const active = item.id === id;
      item.link.classList.toggle('is-active', active);
      if (active) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
    }
  }

  if (sectionMap.size && typeof window.IntersectionObserver === 'function') {
    const visibleSections = new Map();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visibleSections.set(entry.target.id, entry);
        else visibleSections.delete(entry.target.id);
      }
      const candidates = Array.from(visibleSections.values()).sort(
        (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
      );
      if (candidates.length) markActiveSection(candidates[0].target.id);
    }, {
      rootMargin: '-15% 0px -60% 0px',
      threshold: 0,
    });

    sectionMap.forEach((section) => observer.observe(section));
  }
})();
