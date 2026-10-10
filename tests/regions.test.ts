import { test } from "node:test";
import assert from "node:assert/strict";
import { CURRENCIES, defaultCurrency, formatMoney, budgetPresets } from "../src/domain/regions";
import { preferencesSchema } from "../src/domain/schemas";
import { DEFAULT_PREFERENCES } from "../src/hooks/useSkinJourney";

test("new sessions start without an assumed country or currency", () => {
  assert.equal(DEFAULT_PREFERENCES.country, "");
  assert.equal(DEFAULT_PREFERENCES.currency, "");
  assert.equal(preferencesSchema.safeParse({ ...DEFAULT_PREFERENCES, city: "London" }).success, false);
});
test("country currency mapping covers regions outside the original India pilot", () => {
  for (const [country, currency] of [["GB", "GBP"], ["US", "USD"], ["AE", "AED"], ["JP", "JPY"], ["FR", "EUR"], ["UA", "UAH"], ["KZ", "KZT"], ["ZW", "ZWG"]]) {
    assert.equal(defaultCurrency(country), currency);
    assert.ok(CURRENCIES.includes(currency));
  }
  assert.ok(CURRENCIES.length > 100);
});
test("money and preset amounts use the selected currency without INR fallback", () => {
  assert.match(formatMoney(50, "GBP"), /£/);
  assert.match(formatMoney(50, "EUR"), /€/);
  assert.match(formatMoney(50, "USD"), /\$/);
  assert.doesNotMatch(formatMoney(50, "GBP"), /INR|₹/);
  assert.ok(budgetPresets("JPY")[1] > budgetPresets("USD")[1]);
});
