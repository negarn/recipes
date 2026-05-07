const DEFAULT_FAVICON_HREF = '/favicon.svg?v=7';
const TIMER_DONE_FAVICON_HREF = '/favicon-notification.svg?v=7';

function getFaviconLink() {
  if (typeof document === 'undefined') {
    return null;
  }

  const existingLink = document.getElementById('app-favicon');

  if (existingLink instanceof HTMLLinkElement) {
    return existingLink;
  }

  const fallbackLink = document.querySelector('link[rel~="icon"]');

  if (fallbackLink instanceof HTMLLinkElement) {
    fallbackLink.id = 'app-favicon';
    return fallbackLink;
  }

  const link = document.createElement('link');
  link.id = 'app-favicon';
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.sizes = 'any';
  document.head.appendChild(link);
  return link;
}

function setFavicon(href: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const faviconLink = getFaviconLink();

  if (!faviconLink) {
    return;
  }

  const resolvedHref = new URL(href, window.location.origin).toString();

  faviconLink.rel = 'icon';
  faviconLink.type = 'image/svg+xml';
  faviconLink.sizes = 'any';

  if (faviconLink.href === resolvedHref) {
    return;
  }

  faviconLink.href = resolvedHref;
}

export function resetAppFavicon() {
  setFavicon(DEFAULT_FAVICON_HREF);
}

export function showTimerDoneFavicon() {
  setFavicon(TIMER_DONE_FAVICON_HREF);
}
