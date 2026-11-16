/**
 * Helper to offload image processing and canvas encoding to Web Workers.
 * Keeps the main UI thread at 60 FPS without jank during card export.
 */

let workerInstance: Worker | null = null;
let workerFailed = false;

function getWorker(): Worker | null {
  if (workerFailed) return null;
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") return null;

  if (!workerInstance) {
    try {
      const workerScript = `
        self.onmessage = async (e) => {
          const { id, bitmap } = e.data;
          try {
            const offscreen = new OffscreenCanvas(bitmap.width, bitmap.height);
            const ctx = offscreen.getContext('2d');
            if (!ctx) throw new Error("Offscreen 2D context not available");
            ctx.drawImage(bitmap, 0, 0);
            bitmap.close();
            const blob = await offscreen.convertToBlob({ type: 'image/png' });
            self.postMessage({ id, success: true, blob });
          } catch (err) {
            self.postMessage({ id, success: false, error: err ? err.message : "Conversion failed" });
          }
        };
      `;
      const blob = new Blob([workerScript], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      workerInstance = new Worker(url);
    } catch (e) {
      console.warn("Could not create Web Worker for canvas conversion:", e);
      workerFailed = true;
      return null;
    }
  }
  return workerInstance;
}

/**
 * Encodes an HTMLCanvasElement to a PNG Blob in a Web Worker using OffscreenCanvas.
 * Falls back to main thread canvas.toBlob() if Workers or OffscreenCanvas are unavailable.
 */
export async function canvasToBlobWorker(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const worker = getWorker();

  if (worker && typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(canvas);
      const id = Math.random().toString(36).slice(2);

      return await new Promise<Blob | null>((resolve, reject) => {
        const timeout = setTimeout(() => {
          worker.removeEventListener("message", handler);
          reject(new Error("Worker conversion timed out"));
        }, 15000);

        const handler = (e: MessageEvent) => {
          if (e.data && e.data.id === id) {
            clearTimeout(timeout);
            worker.removeEventListener("message", handler);
            if (e.data.success && e.data.blob) {
              resolve(e.data.blob);
            } else {
              reject(new Error(e.data.error || "Worker conversion error"));
            }
          }
        };

        worker.addEventListener("message", handler);
        worker.postMessage({ id, bitmap }, [bitmap]);
      });
    } catch (err) {
      console.warn("Worker canvas conversion failed, falling back to main thread:", err);
    }
  }

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

const imageCache = new Map<string, string>();

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Preloads an image and stores it in the in-memory Base64 cache.
 */
export async function preloadAndCacheImage(src: string): Promise<string | null> {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return src;
  if (imageCache.has(src)) return imageCache.get(src)!;

  try {
    const corsUrl = src.includes("?") ? `${src}&_cors=1` : `${src}?_cors=1`;
    const response = await fetch(corsUrl, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    imageCache.set(src, base64);
    return base64;
  } catch (e) {
    console.warn("Preload image failed:", src, e);
    return null;
  }
}

/**
 * Inlines all images inside a cloned DOM container with cached Base64 strings.
 * Ensures html2canvas renders offline without network requests or canvas tainting.
 */
export async function inlineClonedImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    images.map(async (img) => {
      const src = img.currentSrc || img.src;
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;
      try {
        if (imageCache.has(src)) {
          img.src = imageCache.get(src)!;
          await img.decode().catch(() => {});
          return;
        }
        const base64 = await preloadAndCacheImage(src);
        if (base64) {
          img.src = base64;
          await img.decode().catch(() => {});
        }
      } catch (e) {
        console.warn("Could not inline image for canvas capture:", src, e);
      }
    })
  );
}

/**
 * Background prewarmer: quietly fetches and caches images while the user is viewing the card.
 */
export function prewarmCardImages(container: HTMLElement | null): void {
  if (!container) return;
  const images = Array.from(container.querySelectorAll<HTMLImageElement>("img"));
  images.forEach((img) => {
    const src = img.currentSrc || img.src;
    if (!src || src.startsWith("data:") || src.startsWith("blob:") || imageCache.has(src)) return;
    preloadAndCacheImage(src).catch(() => {});
  });
}
