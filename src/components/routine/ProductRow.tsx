"use client";

import { formatMoney, countryName } from "@/domain/regions";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Repeat2, X, Search, ExternalLink } from "lucide-react";
import type { Listing, RoutineItem, ShoppingResult, Retailer } from "@/domain/schemas";
import { CATEGORY_LABELS } from "@/domain/sample";
import { SkinNearApi } from "@/lib/client-api";
import { Button } from "@/components/ui/Button";
import { RetailerLinks } from "./RetailerLinks";
import { ProductImage } from "./ProductImage";
import { ProductAlternatives } from "./ProductAlternatives";

const api = new SkinNearApi();
export function ProductRow({ item, city, pincode, country, currency, busy, onSwap, onChoose }: { item: RoutineItem; city: string; pincode: string; country: string; currency: string; busy: boolean; onSwap: (id: string) => Promise<void>; onChoose: (id: string) => Promise<void> }) {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retailer, setRetailer] = useState<Retailer | undefined>();
  const dialog = useRef<HTMLDialogElement>(null);
  const { product } = item;
  useEffect(() => { const node = dialog.current; return () => node?.close(); }, []);

  async function search() {
    setSearching(true); setError("");
    try { const result = await api.post<ShoppingResult>("/api/shopping", { productId: product.id, city, country, retailer }); setListings(result.listings); setMessage(result.message); }
    catch (err) { setError(err instanceof Error ? err.message : "Search could not be completed."); }
    finally { setSearching(false); }
  }

  return <article className="product-row">
    <ProductImage product={product} />
    <div className="product-info"><div className="product-kicker"><span>{product.brand} · {CATEGORY_LABELS[product.category]}</span><span>{product.category === "sunscreen" ? "Daytime" : "Morning + evening"}</span></div><h3>{product.name}</h3><div className="product-inline-price">{product.size}<span>{formatMoney(product.referencePrice, currency)}</span><small>estimate</small></div><p>{item.reason}</p>
      {product.benefits?.length ? <ul className="product-benefits" aria-label="Brand-described benefits">{product.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul> : null}
      <div className="product-shop-links"><RetailerLinks country={country} product={product} /><a href={product.sourceUrl} target="_blank" rel="noreferrer">Benefits & ingredients from the brand <ExternalLink size={12} /></a></div>
    </div>
    <div className="product-action-column"><Button onClick={() => dialog.current?.showModal()}>Find sellers <ArrowUpRight size={17} /></Button><button className="swap-button" aria-label={`Find an alternative to ${product.name}`} title="Rebuild this routine without this product" onClick={() => onSwap(product.id)} disabled={busy || !item.alternatives.length}><Repeat2 size={18} /></button></div>
    {item.alternatives.length ? <ProductAlternatives products={item.alternatives} currency={currency} busy={busy} onChoose={onChoose} /> : null}
    <dialog ref={dialog} className="seller-dialog" onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <div className="dialog-top"><span>Shopping in {city}, {countryName(country)}</span><button aria-label="Close seller search" onClick={() => dialog.current?.close()}><X size={22} /></button></div><h2>{product.name}</h2><p>Search finds listings, not verified stock. Confirm the exact size, ingredients, and {pincode ? `delivery to ${pincode}` : "delivery"} with the retailer.</p>
      <RetailerLinks country={country} product={product} detailed />
      <p className="retailer-address-note">Set your delivery address with the seller to check local stock. Postal codes are not sent in these links.</p>
      {country === "IN" ? <div className="lookup-tabs" aria-label="Seller search filter">{([{ id: undefined, label: "All sellers" }, { id: "blinkit" as const, label: "Blinkit" }, { id: "zepto" as const, label: "Zepto" }]).map((option) => <button key={option.label} aria-pressed={retailer === option.id} onClick={() => { setRetailer(option.id); setListings(null); setMessage(""); setError(""); }} disabled={searching}>{option.label}</button>)}</div> : null}
      <Button variant="secondary" loading={searching} onClick={search}>Look up seller listings <Search size={17} /></Button>
      {message ? <p className="dialog-notice" role="status">{message}</p> : null}
      {error ? <p className="dialog-notice" role="status">{error}</p> : null}
      {listings?.length ? <div className="seller-list">{listings.map((listing) => <a href={listing.url} key={listing.url} target="_blank" rel="noreferrer"><div><strong>{listing.seller}</strong><span>{listing.title}</span><small>Listing discovered · Stock and delivery unknown · {new Date(listing.checkedAt).toLocaleDateString()}</small></div><span>{listing.price || "Check price"}<ArrowUpRight size={16} /></span></a>)}</div> : null}
      <a className="brand-link" href={product.sourceUrl} target="_blank" rel="noreferrer">View the official brand page <ArrowUpRight size={16} /></a>
    </dialog>
  </article>;
}
