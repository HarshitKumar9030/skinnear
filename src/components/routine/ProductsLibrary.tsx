"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { X, Search, Bookmark } from "lucide-react";
import { productSchema, type Product } from "@/domain/schemas";
import { COUNTRIES, CURRENCIES, defaultCurrency, formatMoney } from "@/domain/regions";
import { CATEGORY_LABELS } from "@/domain/sample";
import { SkinNearApi } from "@/lib/client-api";
import { useSavedProducts } from "@/hooks/useSavedProducts";
import { PortableRoutineService } from "@/services/PortableRoutineService";
import { LibraryProductCard } from "./LibraryProductCard";
import { PlanActions } from "./PlanActions";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Button } from "@/components/ui/Button";

const api = new SkinNearApi();
const portable = new PortableRoutineService();
const PAGE_SIZE = 24;
const categories = [
  { value: "all", label: "All product types" },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];
export default function ProductsLibrary({
  initialCurrency,
  initialCountry,
  budget,
  onClose,
}: {
  initialCurrency: string;
  initialCountry: string;
  budget?: number;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const saved = useSavedProducts();
  const [currency, setCurrency] = useState(initialCurrency || "INR");
  const [country, setCountry] = useState(initialCountry);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadedCurrency, setLoadedCurrency] = useState("");
  const [loadedCountry, setLoadedCountry] = useState("");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [tab, setTab] = useState("all");
  const [error, setError] = useState("");
  const [page, setPage] = useState({ key: "", count: PAGE_SIZE });
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    api
      .request<{ products: unknown }>(
        `/api/products?currency=${encodeURIComponent(currency)}&country=${encodeURIComponent(country)}`,
        { signal: controller.signal },
      )
      .then((result) => {
        setProducts(z.array(productSchema).parse(result.products));
        setLoadedCurrency(currency);
        setLoadedCountry(country);
        setError("");
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : "Catalog unavailable.");
      });
    return () => controller.abort();
  }, [currency, country, retry]);
  const loading = (currency !== loadedCurrency || country !== loadedCountry) && !error;
  const marketProducts = products.filter(
    (product) => !country || !product.markets.length || product.markets.includes(country),
  );
  const savedProducts = products.filter((product) => saved.includes(product.id));
  const brands = [
    { value: "all", label: "All brands" },
    ...[
      ...new Set(
        (tab === "saved" ? savedProducts : marketProducts).map((product) => product.brand),
      ),
    ]
      .sort()
      .map((brand) => ({ value: brand, label: brand })),
  ];
  const visible = products.filter(
    (product) =>
      (tab !== "saved" || saved.includes(product.id)) &&
      (tab === "saved" ||
        !country ||
        !product.markets.length ||
        product.markets.includes(country)) &&
      (category === "all" || product.category === category) &&
      (brand === "all" || product.brand === brand) &&
      `${product.brand} ${product.name} ${product.ingredientHighlights.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  const actualCurrency = loadedCurrency || currency;
  const pageKey = JSON.stringify([country, currency, category, brand, query, tab]);
  const shownCount = page.key === pageKey ? page.count : PAGE_SIZE;
  return (
    <dialog
      ref={dialog}
      className="product-library-dialog"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-top">
        <span>Discover · Save · Come back</span>
        <button aria-label="Close product library" onClick={onClose}>
          <X size={24} />
        </button>
      </div>
      <h2>Your shelf, your choices.</h2>
      <p>Find a product. Save it for later.</p>
      <div className="library-tabs">
        <button aria-pressed={tab === "all"} onClick={() => setTab("all")}>
          Explore products ({marketProducts.length})
        </button>
        <button aria-pressed={tab === "saved"} onClick={() => setTab("saved")}>
          <Bookmark size={15} /> Saved products ({savedProducts.length})
        </button>
      </div>
      <div className="library-controls">
        <SearchableSelect
          label="Shopping country"
          value={country}
          options={[
            { value: "", label: "All country collections" },
            ...COUNTRIES.map((item) => ({
              value: item.code,
              label: item.name,
            })),
          ]}
          onChange={(value) => {
            setError("");
            setCountry(value);
            setBrand("all");
            if (value) setCurrency(defaultCurrency(value));
          }}
        />
        <label className="library-search">
          <Search size={17} />
          <input
            aria-label="Search products"
            placeholder="Search brand, product or ingredient"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <SearchableSelect
          label="Product type"
          value={category}
          options={categories}
          onChange={setCategory}
        />
        <SearchableSelect label="Brand" value={brand} options={brands} onChange={setBrand} />
        <SearchableSelect
          label="List currency"
          value={currency}
          options={CURRENCIES.map((value) => ({ value, label: value }))}
          onChange={(value) => {
            setError("");
            setCurrency(value);
          }}
        />
      </div>
      {budget && currency === initialCurrency && country === initialCountry ? (
        <p className="field-note">
          Your routine budget is {formatMoney(budget, currency)}. Saving items never spends or
          reallocates it.
        </p>
      ) : null}
      {tab === "saved" && savedProducts.length && !loading && !error ? (
        <div className="library-list-summary">
          <div>
            <strong>
              {formatMoney(
                savedProducts.reduce((sum, product) => sum + product.referencePrice, 0),
                actualCurrency,
              )}
            </strong>
            <p>Wishlist planning total · may exceed your routine budget</p>
          </div>
          <div className="workspace-actions">
            <PlanActions
              snapshot={portable.fromProducts(savedProducts, actualCurrency)}
              products={savedProducts}
            />
          </div>
        </div>
      ) : null}
      {loading ? (
        <p role="status">Loading products and currency estimates…</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <Button
            variant="text"
            onClick={() => {
              setError("");
              setRetry((value) => value + 1);
            }}
          >
            Retry catalog
          </Button>
        </div>
      ) : null}
      {!loading && !error ? (
        <>
          <p className="field-note" role="status">
            {visible.length} products · Prices are planning estimates; confirm formulas, stock and
            delivery with the seller.
          </p>
          <div className="library-grid">
            {visible.slice(0, shownCount).map((product) => (
              <LibraryProductCard key={product.id} product={product} currency={actualCurrency} />
            ))}
          </div>
          {visible.length > shownCount ? (
            <div className="workspace-actions">
              <Button
                variant="secondary"
                onClick={() => setPage({ key: pageKey, count: shownCount + PAGE_SIZE })}
              >
                Show {Math.min(PAGE_SIZE, visible.length - shownCount)} more products
              </Button>
              <span className="field-note">
                Showing {shownCount} of {visible.length}
              </span>
            </div>
          ) : null}
          {!visible.length ? (
            <div className="library-empty">
              <h3>
                {tab === "saved"
                  ? "Your shelf is ready for a first pick."
                  : "No products match these filters."}
              </h3>
              <p>
                {tab === "saved"
                  ? "Save products from the catalog or your routine. You can download and share the list once it contains a product."
                  : "Try a different brand, product type or search term."}
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </dialog>
  );
}
