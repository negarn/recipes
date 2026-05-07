export function scrollToPageTop() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const scrollToTopOptions: ScrollToOptions = {
    top: 0,
    left: 0,
    behavior: 'auto'
  };

  document.scrollingElement?.scrollTo(scrollToTopOptions);
  window.scrollTo(scrollToTopOptions);

  // Keep direct assignments for browsers that do not fully honor scrollTo on all roots.
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
