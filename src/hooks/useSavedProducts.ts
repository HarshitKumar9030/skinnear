"use client";
import { useSyncExternalStore } from "react";
import { savedProductsStore } from "@/services/SavedProductsStore";
export function useSavedProducts() {
  return useSyncExternalStore(
    savedProductsStore.subscribe,
    savedProductsStore.snapshot,
    savedProductsStore.serverSnapshot,
  );
}
