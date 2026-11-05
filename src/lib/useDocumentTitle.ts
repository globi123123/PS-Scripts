import { useEffect } from 'react';
import { siteConfig } from '../config';

/** Sets the browser tab title, e.g. "Get-PendingReboot · PS-Scripts". */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${siteConfig.name}` : `${siteConfig.name} · ${siteConfig.tagline}`;
  }, [title]);
}
