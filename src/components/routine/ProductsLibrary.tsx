"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { X, Search, Bookmark } from "lucide-react";
import { productSchema, type Product } from "@/domain/schemas";
import { CURRENCIES, formatMoney } from "@/domain/regions";
import { CATEGORY_LABELS } from "@/domain/sample";
import { SkinNearApi } from "@/lib/client-api";
import { useSavedProducts } from "@/hooks/useSavedProducts";
import { PortableRoutineService } from "@/services/PortableRoutineService";
import { ProductImage } from "./ProductImage";
import { SaveProductButton } from "./SaveProductButton";
import { PlanActions } from "./PlanActions";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Button } from "@/components/ui/Button";

const api = new SkinNearApi();
const portable = new PortableRoutineService();
const categories = [
  { value: "all", label: "All product types" },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];
export default function ProductsLibrary({
  initialCurrency,
  budget,
  onClose,
}: {
  initialCurrency: string;
  budget?: number;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const saved = useSavedProducts();
  const [currency, setCurrency] = useState(initialCurrency || "INR");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadedCurrency, setLoadedCurrency] = useState("");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [tab, setTab] = useState("all");
  const [error, setError] = useState("");
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    api
      .request<{ products: unknown }>(
        `/api/products?currency=${encodeURIComponent(currency)}`,
        { signal: controller.signal },
      )
      .then((result) => {
        setProducts(z.array(productSchema).parse(result.products));
        setLoadedCurrency(currency);
        setError("");
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Catalog unavailable.",
          );
      });
    return () => controller.abort();
  }, [currency, retry]);
  const loading = currency !== loadedCurrency && !error;
  const savedProducts = products.filter((product) =>
    saved.includes(product.id),
  );
  const brands = [
    { value: "all", label: "All brands" },
    ...[...new Set(products.map((product) => product.brand))]
      .sort()
      .map((brand) => ({ value: brand, label: brand })),
  ];
  const visible = products.filter(
    (product) =>
      (tab !== "saved" || saved.includes(product.id)) &&
      (category === "all" || product.category === category) &&
      (brand === "all" || product.brand === brand) &&
      `${product.brand} ${product.name} ${product.ingredientHighlights.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  const actualCurrency = loadedCurrency || currency;
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
      <p>
        Browse the curated catalog and save products in this browser. A saved
        product is a wishlist item, not a prescription or an addition to your
        budgeted routine.
      </p>
      <div className="library-tabs">
        <button aria-pressed={tab === "all"} onClick={() => setTab("all")}>
          Explore products ({products.length})
        </button>
        <button aria-pressed={tab === "saved"} onClick={() => setTab("saved")}>
          <Bookmark size={15} /> Saved products ({savedProducts.length})
        </button>
      </div>
      <div className="library-controls">
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
        <SearchableSelect
          label="Brand"
          value={brand}
          options={brands}
          onChange={setBrand}
        />
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
      {budget && currency === initialCurrency ? (
        <p className="field-note">
          Your routine budget is {formatMoney(budget, currency)}. Saving items
          never spends or reallocates it.
        </p>
      ) : null}
      {tab === "saved" && savedProducts.length && !loading && !error ? (
        <div className="library-list-summary">
          <div>
            <strong>
              {formatMoney(
                savedProducts.reduce(
                  (sum, product) => sum + product.referencePrice,
                  0,
                ),
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
            {visible.length} products · Prices are planning estimates; confirm
            formulas, stock and delivery with the seller.
          </p>
          <div className="library-grid">
            {visible.map((product) => (
              <article className="library-card" key={product.id}>
                <ProductImage product={product} />
                <small>
                  {product.brand} · {product.size}
                </small>
                <h3>{product.name}</h3>
                <strong>
                  {formatMoney(product.referencePrice, actualCurrency)}{" "}
                  <small>estimate</small>
                </strong>
                <ul>
                  {product.benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
                {product.category === "serum" ||
                product.category === "retinoid" ? (
                  <p>
                    {product.usageNote ||
                      "Do not start a treatment without checking suitability and the current label."}
                  </p>
                ) : null}
                <SaveProductButton id={product.id} name={product.name} />
                <a href={product.sourceUrl} target="_blank" rel="noreferrer">
                  Brand & ingredients ↗
                </a>
              </article>
            ))}
          </div>
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
