"use client";

export const modalLoaders = {
  connect: () => import("@/components/connectBar"),
  extra: () => import("@/components/extraSettingBar"),
  lightcone: () => import("@/components/lightconeBar"),
  relic: () => import("@/components/relicBar"),
  profileManager: () => import("@/components/profileManager"),
  copyImport: () => import("@/components/importBar/copy"),
  monster: () => import("@/components/monsterBar"),
  configJson: () => import("@/components/configJsonExport"),
  freesr: () => import("@/components/importBar/freesr"),
  hoyolab: () => import("@/components/importBar/hoyolab"),
  fribbels: () => import("@/components/importBar/fribbels"),
  enka: () => import("@/components/importBar/enka"),
  changelog: () => import("@/components/changelog"),
} as const;

export type ModalKey = keyof typeof modalLoaders;


const PRELOAD_STAGES: ModalKey[][] = [
  ["monster", "relic"],
  ["lightcone"],
  ["connect", "extra"],
  ["configJson"],
  ["freesr", "hoyolab", "fribbels", "enka"],
  ["profileManager", "copyImport"],
];

const preloadedKeys = new Set<string>();
let isPreloadStarted = false;

export function preloadModal(key: ModalKey): void {
  if (typeof window === "undefined" || preloadedKeys.has(key)) return;
  preloadedKeys.add(key);

  try {
    const loader = modalLoaders[key];
    if (loader) {
      loader().catch((err) => {
        // Suppress network/chunk error during preload without throwing
        console.warn(`[Preload] Error preloading modal "${key}":`, err);
        preloadedKeys.delete(key);
      });
    }
  } catch {
    preloadedKeys.delete(key);
  }
}

function runWhenIdle(callback: () => void, timeout = 2500): void {
  if (typeof window === "undefined") return;

  if ("requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number })
      .requestIdleCallback(() => callback(), { timeout });
  } else {
    setTimeout(callback, 50);
  }
}

export function startPreloadModals(): void {
  if (typeof window === "undefined" || isPreloadStarted) return;
  isPreloadStarted = true;

  let delay = 100; // Initial delay after data load ready
  const STAGE_INTERVAL = 300; // ms interval between priority stages
  const ITEM_INTERVAL = 150; // ms interval between items within a stage

  for (const stage of PRELOAD_STAGES) {
    for (const key of stage) {
      const scheduledKey = key;
      const scheduledDelay = delay;

      setTimeout(() => {
        runWhenIdle(() => {
          preloadModal(scheduledKey);
        });
      }, scheduledDelay);

      delay += ITEM_INTERVAL;
    }
    delay += STAGE_INTERVAL;
  }
}
