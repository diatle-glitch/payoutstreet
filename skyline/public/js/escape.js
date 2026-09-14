(function (root) {
  const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => MAP[ch]);
  }
  function safeUrl(value) {
    const text = String(value || '').trim();
    if (/^https:\/\//i.test(text) || text.startsWith('/')) return text;
    return '';
  }
  root.escapeHtml = escapeHtml;
  root.safeUrl = safeUrl;
})(typeof globalThis !== 'undefined' ? globalThis : this);
