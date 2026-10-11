"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { z } from "zod";
import catalog from "@/data/products.json";
import { productSchema } from "@/domain/schemas";
import { PortableRoutineService } from "@/services/PortableRoutineService";
import { PortablePlanBoard } from "./PortablePlanBoard";
const products = z.array(productSchema).parse(catalog);
const service = new PortableRoutineService();
const subscribe = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};
const snapshot = () => window.location.hash;
const serverSnapshot = () => "";
export function SharedRoutineView() {
  const hash = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  let plan;
  let error = "";
  try {
    if (hash) plan = service.decode(new URLSearchParams(hash.slice(1)).get("plan") || "", products);
  } catch {
    error =
      "This link is incomplete, invalid or refers to an unavailable product. Ask for a new shared link.";
  }
  return (
    <main>
      <header className="site-header shell">
        <Link className="wordmark" href="/">
          SkinNear
        </Link>
        <Link href="/">Make your own routine ↗</Link>
      </header>
      {plan ? (
        <PortablePlanBoard snapshot={plan} products={service.resolve(plan, products)} />
      ) : (
        <section className="portable-plan shell">
          <h1>{error ? "This plan could not be opened." : "Open a shared SkinNear plan."}</h1>
          <p role={error ? "alert" : undefined}>
            {error ||
              "A shared link includes its product snapshot after the # in the address. Your private skin report is never included."}
          </p>
          <Link href="/">Return to SkinNear ↗</Link>
        </section>
      )}
    </main>
  );
}
