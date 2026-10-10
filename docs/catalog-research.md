# Reviewed skincare catalog

Reviewed on 10 October 2026. The bundled catalog increased from **53 to 231 products**, across **25 brands**. The expansion adds 178 distinct products, each with an official product link, packaging image, size, native price estimate, two short cosmetic benefit summaries and country collection metadata.

## Research method

Read public catalog metadata from 17 official brand storefronts, including separate US/UK stores and the Geek & Gorgeous US store. Explicitly shortlist individual face products, then retrieve their public product pages to check ingredients, formula labels and sizes. The committed selection CSV records the selected variant index, size, benefit summaries, ingredient highlights and recommendation eligibility. Seven shortlisted product URLs were unavailable and were omitted rather than imported from hidden catalog metadata.

Exclude bundles, duplicate sizes, refills, body products, eye products and unsupported categories. Preserve existing product IDs so saved lists and shared plans continue working. Match regional price overrides by official handle and selected variant; retain native-currency estimates and avoid permanent sale prices by using the higher listed regular/compare-at price. All prices are planning estimates, not checkout quotes.

The catalog has 56 cleansers, 63 moisturizers, 38 sunscreens, 60 serums and 14 retinoids. The library shows 98 records for India, 126 for the US and 105 for the UK, including three international discovery entries; these counts overlap. Explicit editorial collections cover 19 countries. Coverage describes discovery and possible imports, not verified distribution, regulatory approval, stock or shipping.

## Official sources and collection additions

| Brand | Total records | Official storefront |
| --- | ---: | --- |
| Minimalist | 21 | https://beminimalist.co |
| Deconstruct | 18 | https://thedeconstruct.in |
| Plum | 6 | https://plumgoodness.com |
| Dot & Key | 24 | https://www.dotandkey.com |
| Foxtale | 9 | https://foxtale.in |
| Re'equil | 10 | https://www.reequil.com |
| COSRX | 21 | https://www.cosrx.com |
| Beauty of Joseon | 10 | https://beautyofjoseon.com |
| SKIN1004 | 16 | https://www.skin1004.com |
| Round Lab | 14 | https://roundlab.com |
| BYOMA | 10 | https://byoma.com · https://uk.byoma.com |
| The INKEY List | 15 | https://www.theinkeylist.com · https://uk.theinkeylist.com |
| Geek & Gorgeous | 13 | https://geekandgorgeous.com · https://geekandgorgeous.us |
| Naturium | 16 | https://naturium.com |

The retained collection also includes CeraVe, Cetaphil, Simple, Bioderma, Neutrogena, The Ordinary, La Roche-Posay, Vanicream, Aveeno, Eucerin and Bioré. Every individual record links its source. US Round Lab sunscreen records follow the US storefront labels; global Korean sunscreen records are not automatically classified as US formulas.

## Ingredient and recommendation limits

137 records have extracted or previously reviewed complete ingredient lists. Others retain ingredient highlights and mark complete ingredients as unknown. Function-group fragments and marketing prose are not accepted as complete INCI. Fragrance-free filtering requires a complete list without fragrance/aromatic ingredients or an explicit brand claim; “allergen-free fragrance” still counts as fragrance. Complete formulas can change: the current package label takes precedence.

65 products are browse-only. Acid cleansers/creams, stronger treatments, double-cleansing oils/balms, overnight-only creams and unsupported brightening/texture/soothing goals are not silently inserted into essentials. The existing treatment flow still requires consent, a supported persistent goal, safety confirmations and remaining budget. Severe/uncertain breakouts do not trigger a product prescription. The app recommends at most one supported extra and may recommend none.

BYOMA's public ingredient-function groups are intentionally marked incomplete. Users specifying ingredient exclusions cannot receive incomplete formulas in automatic routines. Saving or sharing a browse-only item creates a wishlist entry, not a suitability recommendation.

## Repeatable local maintenance

Install `scripts/requirements.txt`, then run from the repository root:

```powershell
python -X utf8 scripts/research_catalog.py catalogs
python -X utf8 scripts/research_catalog.py pages
python -X utf8 scripts/import_reviewed_catalog.py
```

The importer requires explicit entries in `scripts/catalog_selections.csv`; it never chooses products automatically. Inspect the ignored preview and evidence audit in `output/qa/research`, compare the selected formula/size with its page, and only then apply:

```powershell
python -X utf8 scripts/import_reviewed_catalog.py --apply
python -X utf8 tests/test_catalog_research.py
npm run catalog:validate
npm test
```

`npm run catalog:seed` explicitly upserts the reviewed records into a configured MongoDB database. Read-only discovery merges bundled additions into older seeded catalogs and falls back to the bundled source when the database is unavailable. The importer does not fetch retailer stock or determine medical suitability. Recheck pages and estimates before future releases; images remain remote and have an in-app fallback.
