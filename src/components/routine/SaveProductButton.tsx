"use client";
import { useState } from "react";
import { Bookmark, Check } from "lucide-react";
import { useSavedProducts } from "@/hooks/useSavedProducts";
import { savedProductsStore } from "@/services/SavedProductsStore";
export function SaveProductButton({ id, name }: { id: string; name: string }) {
  const saved = useSavedProducts().includes(id);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        type="button"
        className="save-product-button"
        aria-pressed={saved}
        aria-label={`${saved ? "Unsave" : "Save"} ${name}`}
        onClick={() => {
          try {
            savedProductsStore.toggle(id);
            setError("");
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Could not save this product.",
            );
          }
        }}
      >
        {saved ? <Check size={15} /> : <Bookmark size={15} />}{" "}
        {saved ? "Saved" : "Save product"}
      </button>
      {error ? (
        <p className="field-note" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
