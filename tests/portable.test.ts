import { test } from "node:test";
import assert from "node:assert/strict";
import catalog from "../src/data/products.json";
import { productSchema } from "../src/domain/schemas";
import { PortableRoutineService } from "../src/services/PortableRoutineService";
import { SavedProductsStore } from "../src/services/SavedProductsStore";

const products = catalog.map((product) => productSchema.parse(product));
const service = new PortableRoutineService();
test("share links carry only product IDs, planning prices and currency", () => {
  const snapshot = service.fromProducts(products.slice(0, 3), "USD");
  const url = new URL(service.shareUrl(snapshot, "https://skinnear.example"));
  assert.equal(url.pathname, "/shared");
  assert.equal(url.search, "");
  const decoded = service.decode(
    new URLSearchParams(url.hash.slice(1)).get("plan")!,
    products,
  );
  assert.deepEqual(decoded, snapshot);
  assert.deepEqual(Object.keys(decoded).sort(), [
    "currency",
    "items",
    "kind",
    "version",
  ]);
  assert.deepEqual(Object.keys(decoded.items[0]).sort(), ["id", "price"]);
  assert.equal(
    service.resolve(decoded, products)[0].referencePrice,
    snapshot.items[0].price,
  );
});
test("forged, oversized, duplicate and over-budget shared plans are rejected", () => {
  const snapshot = service.fromProducts(products.slice(0, 1), "INR");
  for (const encoded of [
    "!",
    "A".repeat(16001),
    btoa("not-json"),
    service.encode({ ...snapshot, items: [{ id: "unknown", price: 1 }] }),
  ])
    assert.throws(() => service.decode(encoded, products));
  assert.throws(() =>
    service.encode({
      ...snapshot,
      items: [...snapshot.items, ...snapshot.items],
    }),
  );
  assert.throws(() =>
    service.encode({ ...snapshot, kind: "routine", budget: 1 }),
  );
  assert.throws(() => service.encode({ ...snapshot, currency: "invalid" }));
});
test("download is interactive, escaped and contains no private routine fields", () => {
  const malicious = { ...products[0], name: '<script>alert("x")</script>' };
  const html = service.html(service.fromProducts([malicious], "INR"), [
    malicious,
  ]);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes(malicious.name));
  for (const expected of [
    'type="checkbox"',
    'data-time="morning"',
    'data-time="evening"',
    "Reset checklist",
    "window.print()",
  ])
    assert.ok(html.includes(expected));
  assert.equal(
    productSchema.safeParse({
      ...products[0],
      sourceUrl: "javascript:alert(1)",
    }).success,
    false,
  );
});
test("saved products persist, toggle and reject corrupted or oversized storage", () => {
  const descriptors = ["window", "localStorage"].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  let raw: string | null = null;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    },
  });
  try {
    const store = new SavedProductsStore();
    assert.deepEqual(store.snapshot(), []);
    store.toggle(products[0].id);
    assert.deepEqual(new SavedProductsStore().snapshot(), [products[0].id]);
    assert.equal(store.snapshot(), store.snapshot());
    store.toggle(products[0].id);
    assert.deepEqual(store.snapshot(), []);
    for (const invalid of ["{}", '["<script>"]', "x".repeat(6001)]) {
      raw = invalid;
      assert.deepEqual(store.snapshot(), []);
    }
    raw = JSON.stringify(Array.from({ length: 50 }, (_, i) => `product-${i}`));
    assert.throws(() => store.toggle("one-more"), /50 products/);
  } finally {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
