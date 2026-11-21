// ==========================================================================
// js/modals.js — Accessible Dialogs, FAQ Accordion & Cloud Viewer Controls
// ==========================================================================

    // FAQ Accordion Controls
    function toggleFAQ(btn) {
      var item = btn.closest('.faq-item');
      if (item) {
        var isActive = item.classList.toggle('active');
        btn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      }
    }
    function expandAllFAQs(expand) {
      var items = document.querySelectorAll('.faq-item');
      items.forEach(function(item) {
        var btn = item.querySelector('.faq-question');
        if (expand) {
          item.classList.add('active');
          if (btn) btn.setAttribute('aria-expanded', 'true');
        } else {
          item.classList.remove('active');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      });
    }
    window.openPortalFAQ = function openPortalFAQ() {
      const modal = document.getElementById('portal-faq-modal');
      if (modal) {
        modal.classList.add('open');
        const items = modal.querySelectorAll('.faq-item');
        if (items.length > 0) {
          if (!items[0].classList.contains('active')) items[0].classList.add('active');
          const btn0 = items[0].querySelector('.faq-question');
          if (btn0) btn0.setAttribute('aria-expanded', 'true');
        }
        if (items.length > 1) {
          if (!items[1].classList.contains('active')) items[1].classList.add('active');
          const btn1 = items[1].querySelector('.faq-question');
          if (btn1) btn1.setAttribute('aria-expanded', 'true');
        }
        if (window.__trackClickstream) {
          window.__trackClickstream('FAQ_OPEN', 'portal-faq-modal', 'Opened Frequently Asked Questions Modal');
        }
      }
    };
    window.closePortalFAQ = function closePortalFAQ() {
      const modal = document.getElementById('portal-faq-modal');
      if (modal) modal.classList.remove('open');
    };
    window.scrollToPortalFAQ = window.openPortalFAQ;
