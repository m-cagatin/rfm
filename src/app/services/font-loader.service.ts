import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FontLoaderService {
  private loaded = new Set<string>();
  private loading = new Set<string>();

  // Expose loaded fonts list (useful for UI)
  public availableFonts = signal<string[]>([]);

  /** Load a Google Font family dynamically and resolve when it's ready. */
  async loadGoogleFont(family: string): Promise<void> {
    const clean = family.replace(/"/g, '').trim();
    if (!clean || this.loaded.has(clean) || this.loading.has(clean)) return;
    this.loading.add(clean);

    // Create or reuse a combined Google Fonts link tag
    // For simplicity, load each family with its own <link>. Browsers will dedupe.
    const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(clean)}:wght@300;400;600;700&display=swap`;
    await this.appendStylesheet(href);

    // Wait for the font to be usable
    try {
      await (document as any).fonts.load(`16px "${clean}"`);
    } catch { /* ignore */ }

    this.loaded.add(clean);
    this.loading.delete(clean);
  }

  /** Register an uploaded font file with a given family name. */
  async registerUploadedFont(family: string, file: File): Promise<void> {
    const clean = family.replace(/"/g, '').trim();
    if (!clean) return;

    const blobUrl = URL.createObjectURL(file);
    const fontFace = new FontFace(clean, `url(${blobUrl})`);
    await fontFace.load();
    (document as any).fonts.add(fontFace);
    this.loaded.add(clean);

    // Add to available list for UI
    const next = new Set(this.availableFonts());
    next.add(clean);
    this.availableFonts.set(Array.from(next).sort());
  }

  private appendStylesheet(href: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .some(l => (l as HTMLLinkElement).href === href);
      if (existing) { resolve(); return; }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error('Failed to load font CSS'));
      document.head.appendChild(link);
    });
  }
}
