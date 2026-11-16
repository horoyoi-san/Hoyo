import type { PersistStorage, StateStorage, StorageValue } from "zustand/middleware";
import type { ZodType } from "zod";

export function createValidatedJSONStorage<S>(
  getStorage: () => StateStorage,
  stateSchema: ZodType<S>
): PersistStorage<S> | undefined {
  let storage: StateStorage;

  try {
    storage = getStorage();
  } catch {
    return undefined;
  }

  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const pendingValues = new Map<string, StorageValue<S>>();

  const cancelTimer = (name: string) => {
    const timer = debounceTimers.get(name);
    if (timer !== undefined) clearTimeout(timer);
    debounceTimers.delete(name);
  };

  const removeItem = (name: string) => {
    cancelTimer(name);
    pendingValues.delete(name);
    return storage.removeItem(name);
  };

  const removeInvalidItem = (name: string, reason: string) => {
    console.warn(`Invalid persisted store "${name}" was cleared: ${reason}`);
    removeItem(name);
  };

  const flush = (name: string) => {
    cancelTimer(name);
    const value = pendingValues.get(name);
    if (!value) return;
    const onSaved = () => {
      // An async storage write must not discard a newer pending value.
      if (pendingValues.get(name) === value) pendingValues.delete(name);
    };
    const onError = (error: unknown) => {
      console.error(`Failed to persist store "${name}":`, error);
    };
    try {
      const result = storage.setItem(name, JSON.stringify(value));
      if (isThenable(result)) void Promise.resolve(result).then(onSaved, onError);
      else onSaved();
    } catch (error) {
      onError(error);
    }
  };

  if (typeof window !== "undefined") {
    const flushPending = () => {
      for (const name of pendingValues.keys()) flush(name);
    };
    // Mobile browsers may suspend/kill background pages without beforeunload.
    window.addEventListener("pagehide", flushPending);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushPending();
    });
  }

  return {
    getItem: (name) => {
      // Rehydration within the debounce window must see the latest edit,
      // not overwrite it with the older value on disk.
      const pending = pendingValues.get(name);
      if (pending) return pending;
      let raw: ReturnType<StateStorage["getItem"]>;
      try {
        raw = storage.getItem(name);
      } catch (error) {
        console.warn(`Failed to read store "${name}":`, error);
        return null;
      }

      if (raw === null) {
        return null;
      }

      if (isThenable(raw)) {
        return Promise.resolve(raw).then((value) => parseStorageValue(name, value, stateSchema, removeInvalidItem));
      }

      return parseStorageValue(name, raw, stateSchema, removeInvalidItem);
    },
    setItem: (name, value) => {
      pendingValues.set(name, value);
      cancelTimer(name);
      debounceTimers.set(name, setTimeout(() => flush(name), 250));
    },
    removeItem,
  };
}

function isThenable(value: unknown): value is PromiseLike<string | null> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function parseStorageValue<S>(
  name: string,
  raw: string | null,
  stateSchema: ZodType<S>,
  removeInvalidItem: (name: string, reason: string) => void
): StorageValue<S> | null {
  if (raw === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    removeInvalidItem(name, "malformed JSON");
    return null;
  }

  if (!parsed || typeof parsed !== "object" || !("state" in parsed)) {
    removeInvalidItem(name, "missing persisted state");
    return null;
  }

  const storedValue = parsed as StorageValue<unknown>;
  const state = stateSchema.safeParse(storedValue.state);

  if (!state.success) {
    removeInvalidItem(name, "state schema mismatch");
    return null;
  }

  return {
    state: state.data,
    version: typeof storedValue.version === "number" ? storedValue.version : undefined,
  };
}
