# Reviewed skincare catalog

Reviewed on 10 October 2026. The bundled catalog increased from **53 to 267 products**, across **26 brands**. The expansion adds 214 distinct products, each with an official product link, packaging image, size, native price estimate, two short cosmetic benefit summaries and country collection metadata.

## Research method

Read public catalog metadata from 18 official brand storefronts, including separate US/UK stores and the Geek & Gorgeous US store. Explicitly shortlist individual face products, then retrieve their public product pages to check ingredients, formula labels and sizes. The committed selection CSV records the selected variant index, size, benefit summaries, ingredient highlights and recommendation eligibility. Seven shortlisted product URLs were unavailable and were omitted rather than imported from hidden catalog metadata.

Exclude bundles, duplicate sizes, refills, body products, eye products and unsupported categories. Preserve existing product IDs so saved lists and shared plans continue working. Match regional price overrides by official handle and selected variant; retain native-currency estimates and avoid permanent sale prices by using the higher listed regular/compare-at price. All prices are planning estimates, not checkout quotes. Twelve additional Cetaphil records were reviewed separately against explicit official pages: five India and seven US entries. Their estimates are editorial planning amounts because those pages do not supply checkout prices; they are not official selling-price claims. The versioned Cetaphil manifest records these regional selections. Packaging images come from the product carousel rather than the site logo. Regional formulas remain separate.

The catalog has 66 cleansers, 73 moisturizers, 47 sunscreens, 66 serums and 15 retinoids. The library shows 127 records for India, 133 for the US and 105 for the UK, including three international discovery entries; these counts overlap. Explicit editorial collections cover 19 countries. Coverage describes discovery and possible imports, not verified distribution, regulatory approval, stock or shipping.

## Official sources and collection additions

| Brand | Total records | Official storefront |
| --- | ---: | --- |
| The Derma Co | 24 | https://thedermaco.com |
| Cetaphil | 15 | https://www.cetaphil.in · https://www.cetaphil.com |
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

164 records have extracted or previously reviewed complete ingredient lists. Others retain ingredient highlights and mark complete ingredients as unknown. Function-group fragments and marketing prose are not accepted as complete INCI. Fragrance-free filtering requires a complete list without fragrance/aromatic ingredients or an explicit brand claim; “allergen-free fragrance” still counts as fragrance. Complete formulas can change: the current package label takes precedence.

76 products are browse-only. Acid cleansers/creams, stronger treatments, double-cleansing oils/balms, overnight-only creams and unsupported brightening/texture/soothing goals are not silently inserted into essentials. The existing treatment flow still requires consent, a supported persistent goal, safety confirmations and remaining budget. Severe/uncertain breakouts do not trigger a product prescription. The app recommends at most one supported extra and may recommend none.

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
python -X utf8 scripts/import_cetaphil.py
python -X utf8 scripts/build_embeddings.py
python -X utf8 tests/test_catalog_research.py
npm run catalog:validate
npm test
```

`npm run catalog:seed` explicitly upserts the reviewed records into a configured MongoDB database. Read-only discovery merges bundled additions into older seeded catalogs and falls back to the bundled source when the database is unavailable. The importer does not fetch retailer stock or determine medical suitability. Recheck pages and estimates before future releases; images remain remote and have an in-app fallback.

The embedding refresh requires `GEMINI_API_KEY` and consumes API quota. It sends public catalog text and generic concern templates only, never user skin scores. Hash-validated vectors support local retrieval; hard suitability and budget rules remain deterministic. The bundled index works without a key.
