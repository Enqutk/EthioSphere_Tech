import { useEffect } from 'react';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, absoluteUrl } from '@/shared/config/site';

type PageMeta = {
  title?: string;
  description?: string;
  path?: string;
};

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function usePageMeta({ title, description, path }: PageMeta) {
  useEffect(() => {
    const pageTitle = title ? `${title} · Programmers World` : DEFAULT_TITLE;
    const pageDescription = description ?? DEFAULT_DESCRIPTION;
    const pageUrl = path ? absoluteUrl(path) : absoluteUrl('/');

    document.title = pageTitle;
    setMeta('name', 'description', pageDescription);
    setMeta('property', 'og:title', pageTitle);
    setMeta('property', 'og:description', pageDescription);
    setMeta('property', 'og:url', pageUrl);
    setMeta('name', 'twitter:title', pageTitle);
    setMeta('name', 'twitter:description', pageDescription);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('name', 'description', DEFAULT_DESCRIPTION);
      setMeta('property', 'og:title', DEFAULT_TITLE);
      setMeta('property', 'og:description', DEFAULT_DESCRIPTION);
      setMeta('property', 'og:url', absoluteUrl('/'));
      setMeta('name', 'twitter:title', DEFAULT_TITLE);
      setMeta('name', 'twitter:description', DEFAULT_DESCRIPTION);
    };
  }, [title, description, path]);
}
