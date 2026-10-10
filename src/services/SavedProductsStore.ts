import { z } from "zod";

const idsSchema = z.array(z.string().regex(/^[a-z0-9-]{1,80}$/)).max(50);
const EMPTY: readonly string[] = [];
export class SavedProductsStore {
  private readonly key = "skinnear:products:v1";
  private raw: string | null | undefined;
  private ids: readonly string[] = EMPTY;
  private readonly listeners = new Set<() => void>();
  serverSnapshot = () => EMPTY;
  snapshot = (): readonly string[] => {
    if (typeof window === "undefined") return EMPTY;
    let raw: string | null;
    try {
      raw = localStorage.getItem(this.key);
    } catch {
      return this.ids;
    }
    if (raw !== this.raw) {
      this.raw = raw;
      try {
        if (raw && raw.length > 6000) throw new Error("Invalid stored list");
        this.ids = [...new Set(idsSchema.parse(JSON.parse(raw || "[]")))];
      } catch {
        this.ids = EMPTY;
      }
    }
    return this.ids;
  };
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    const sync = (event: StorageEvent) => {
      if (event.key === this.key || event.key === null) listener();
    };
    window.addEventListener("storage", sync);
    return () => {
      this.listeners.delete(listener);
      window.removeEventListener("storage", sync);
    };
  };
  toggle(id: string) {
    const current = this.snapshot();
    const next = current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id];
    if (next.length > 50)
      throw new Error(
        "Your shelf holds 50 products. Remove one before saving another.",
      );
    idsSchema.parse(next);
    try {
      localStorage.setItem(this.key, JSON.stringify(next));
    } catch {
      throw new Error(
        "This browser could not save products. Enable local storage or download the list instead.",
      );
    }
    this.listeners.forEach((listener) => listener());
  }
}
export const savedProductsStore = new SavedProductsStore();
