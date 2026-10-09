"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Repeat2, X, Search, ExternalLink } from "lucide-react";
import type { Listing, RoutineItem } from "@/domain/schemas";
import { CATEGORY_LABELS } from "@/domain/sample";
import { SkinNearApi } from "@/lib/client-api";
import { Button } from "@/components/ui/Button";

const api = new SkinNearApi();
export function ProductRow({ item, index, city, pincode, busy, onSwap }: { item: RoutineItem; index: number; city: string; pincode: string; busy: boolean; onSwap: (id: string) => Promise<void> }) {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const { product } = item;
  useEffect(() => { const node = dialog.current; return () => node?.close(); }, []);

  async function search() {
    setSearching(true); setError("");
    try { const result = await api.post<{ listings: Listing[] }>("/api/shopping", { productId: product.id, city }); setListings(result.listings); }
    catch (err) { setError(err instanceof Error ? err.message : "Search could not be completed."); }
    finally { setSearching(false); }
  }

  return <article className="product-row">
    <div className={`product-swatch ${product.tone}`} aria-hidden><span>0{index + 1}</span><span>{CATEGORY_LABELS[product.category]}</span></div>
    <div className="product-info"><div className="product-kicker"><span>{product.brand} · {product.size}</span><span>{product.category === "sunscreen" ? "AM" : "AM + PM"}</span></div><h3>{product.name}</h3><p>{item.reason}</p>
      <div className="ingredient-tags">{product.ingredientHighlights.map((ingredient) => <span key={ingredient}>{ingredient}</span>)}</div>
      <div className="product-actions"><button onClick={() => dialog.current?.showModal()}><Search size={15} /> Find sellers in {city} <ArrowUpRight size={15} /></button><button onClick={() => onSwap(product.id)} disabled={busy || !item.alternatives.length}><Repeat2 size={15} /> Find an alternative</button></div>
    </div>
    <div className="product-price"><strong>₹{product.referencePrice.toLocaleString("en-IN")}</strong><span>Planning estimate</span><a href={product.sourceUrl} target="_blank" rel="noreferrer">Brand & ingredients <ExternalLink size={12} /></a></div>
    <dialog ref={dialog} className="seller-dialog" onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <div className="dialog-top"><span>Shopping in {city}</span><button aria-label="Close seller search" onClick={() => dialog.current?.close()}><X size={22} /></button></div><h2>{product.name}</h2><p>Search finds listings, not verified stock. Confirm the exact size, ingredients, and {pincode ? `delivery to ${pincode}` : "delivery"} with the retailer.</p>
      <Button loading={searching} onClick={search}>Search regional listings <Search size={17} /></Button>
      {error ? <p className="dialog-notice" role="status">{error}</p> : null}
      {listings ? <div className="seller-list">{listings.length ? listings.map((listing) => <a href={listing.url} key={listing.url} target="_blank" rel="noreferrer"><div><strong>{listing.seller}</strong><span>{listing.title}</span><small>Listing discovered · Stock and delivery unknown · {new Date(listing.checkedAt).toLocaleDateString()}</small></div><span>{listing.price || "Check price"}<ArrowUpRight size={16} /></span></a>) : <p>No seller listings found. Try the brand page below.</p>}</div> : null}
      <a className="brand-link" href={product.sourceUrl} target="_blank" rel="noreferrer">View the official brand page <ArrowUpRight size={16} /></a>
    </dialog>
  </article>;
}
