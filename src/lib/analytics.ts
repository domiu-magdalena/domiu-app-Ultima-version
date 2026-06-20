import { getEnv } from '@/lib/env';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const analytics = {
  pageView(pathname: string) {
    if (typeof window === 'undefined') return;
    const gaId = getEnv().NEXT_PUBLIC_GA_ID;
    if (!gaId) return;
    try {
      (window as any).gtag?.('config', gaId, { page_path: pathname });
    } catch { /* ignore */ }
  },
};

export function initAnalytics() {
  if (getEnv().NODE_ENV !== 'production') return;
  const gaId = getEnv().NEXT_PUBLIC_GA_ID;
  if (!gaId) return;
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  script.async = true;
  document.head.appendChild(script);
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) { (window as any).dataLayer.push(args); }
  gtag('js', new Date());
  gtag('config', gaId);
}
