"""Build curated products from explicit selections and cached official sources.

Research first with research_catalog.py. This importer never selects products itself.
It writes a preview and evidence audit; pass --apply to update the bundled catalog.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import unicodedata
from datetime import date
from pathlib import Path

from bs4 import BeautifulSoup


class IngredientReader:
    @staticmethod
    def split(value: str) -> list[str]:
        parts, start, depth = [], 0, 0
        for index, character in enumerate(value):
            depth += int(character == '(') - int(character == ')')
            numeric = index > 0 and index+1 < len(value) and value[index-1].isdigit() and value[index+1].isdigit()
            if character == ',' and depth == 0 and not numeric:
                parts.append(value[start:index].strip())
                start = index+1
        parts.append(value[start:].strip().rstrip('.'))
        return [part for part in parts if part]

    def read(self, soup: BeautifulSoup, source: str = '') -> list[str]:
        # BYOMA renders separate ingredient/function groups, not a complete INCI.
        if source.startswith('byoma'):
            return []
        candidates = list(soup.select('.full_ingredients, .modal-body, .modal-body-mobile'))
        candidates += soup.find_all('p')
        for node in candidates:
            text = node.get_text(' ', strip=True)
            text = re.split(r'Learn more|\*?Please note|\bE-\d{4,}', text, maxsplit=1, flags=re.I)[0].strip()
            if not re.match(r'^(?:Water|Aqua|Avena|Centella|Glycerin|Propolis|Olea|Prunus|Hippophae|Citrus|Butylene|Caprylic|Lactobacillus|Galactomyces|Camellia|Bifida|Squalane|Saccharomyces|Ethylhexyl|Dibutyl)', text, re.I):
                continue
            if text.count(',') < 5 or len(text) > 5000 or re.search(r'how to|customer|review|benefits|directions|shop now|helps|which|ideal for|naturally found|our |restore|support|promot|replenish|boost|improv|binds|draws|contains|known for|skin barrier|skin suppleness', text, re.I):
                continue
            return self.split(text)
        return []


class ReviewedCatalogImporter:
    SOURCES = {
        'cosrx': ('COSRX', 'USD', ['KR','US','GB','CA','AU','SG','DE','FR','NL']),
        'boj': ('Beauty of Joseon', 'USD', ['KR','US','GB','CA','AU','SG','DE','FR','NL']),
        'skin1004': ('SKIN1004', 'USD', ['KR','US','GB','CA','AU','SG','DE','FR','NL']),
        'roundlab': ('Round Lab', 'USD', ['KR','US','GB','CA','AU','SG','DE','FR','NL']),
        'byoma-us': ('BYOMA', 'USD', ['US','GB']),
        'inkey-us': ('The INKEY List', 'USD', ['US','GB']),
        'geek': ('Geek & Gorgeous', 'EUR', ['HU','DE','FR','NL','BE','ES','IT','PT','PL','AT','IE','GB','US']),
        'dotkey': ('Dot & Key', 'INR', ['IN']),
        'foxtale': ('Foxtale', 'INR', ['IN']),
        'minimalist': ('Minimalist', 'INR', ['IN']),
        'deconstruct': ('Deconstruct', 'INR', ['IN']),
        'plum': ('Plum', 'INR', ['IN']),
        'naturium': ('Naturium', 'USD', ['US']),
        'reequil': ("Re'equil", 'INR', ['IN']),
    }
    REGIONAL = {'byoma-us': ('byoma-gb','GB','GBP'), 'inkey-us': ('inkey-gb','GB','GBP'), 'geek': ('geek-us','US','USD')}

    def __init__(self, root: Path) -> None:
        self.root = root
        self.research = root / 'output/qa/research'
        self.reader = IngredientReader()
        self.catalogs: dict[str, dict] = {}
        self.audit: list[dict] = []

    def source(self, key: str) -> dict:
        if key not in self.catalogs:
            rows = json.loads((self.research / f'{key}-review.json').read_text(encoding='utf8'))
            self.catalogs[key] = {row['handle']: row for row in rows}
        return self.catalogs[key]

    @staticmethod
    def price(variant: dict) -> float:
        return max(float(variant['price']), float(variant.get('compare') or 0))

    def build(self, row: dict) -> dict | None:
        key, handle = row['source'], row['handle']
        source = self.source(key)[handle]
        page = self.research / f'{key}--{handle}.html'
        if not page.exists():
            self.audit.append({'sourceUrl':source['source'], 'status':'omitted: public product page unavailable'})
            return None
        soup = BeautifulSoup(page.read_text(encoding='utf8'), 'html.parser')
        ingredients = self.reader.read(soup, key)
        brand, currency, markets = self.SOURCES[key]
        markets = list(markets)
        # Global Korean sunscreen records are not presumed to be US formula variants.
        if key in ['cosrx','skin1004','boj'] and row['category'] == 'sunscreen':
            markets.remove('US')
        if key == 'roundlab' and row['category'] == 'sunscreen':
            markets = ['US']
        variant = source['variants'][int(row['variant'])]
        price = self.price(variant)
        if price <= 0 or not source['image']:
            raise ValueError(f'Missing price or packaging image: {handle}')
        description = source['description']
        # Only an explicit brand claim or a reviewed complete INCI can establish this filter.
        explicit = bool(re.search(r'fragrance(?:\s*&\s*essential oil)?[ -]free|free (?:from|of) fragrance', description, re.I))
        fragrance = bool(re.search(r'parfum|fragrance|linalool|limonene|(?:flower|leaf|peel) oil|(?:melaleuca|salvia|lavandula|citrus|mentha|eucalyptus)[^,]*oil', ', '.join(ingredients), re.I))
        free = (bool(ingredients) or explicit) and not fragrance
        # Strong actives never enter an essential step simply because the label says "cream".
        strong = bool(re.search(r'salicylic|glycolic|mandelic|gluconolactone|lactobionic|retinol|retinal|benzoyl peroxide|azelaic', ' '.join(ingredients + row['highlights'].split('|')), re.I))
        eligible = row['mode'] == 'routine' and not (row['category'] in ['cleanser','moisturizer','sunscreen'] and strong)
        if strong and row['goal'] not in ['breakouts', 'fine-lines']:
            eligible = False
        if row['goal'] in ['brightening','texture','soothing']:
            eligible = False
        slug = unicodedata.normalize('NFKD', key+'-'+handle).encode('ascii','ignore').decode()
        slug = re.sub(r'[^a-z0-9]+','-',slug.lower()).strip('-')
        if len(slug) > 80:
            slug = slug[:67].rstrip('-')+'-'+hashlib.sha256(slug.encode()).hexdigest()[:10]
        regional = []
        if key in self.REGIONAL:
            other, country, code = self.REGIONAL[key]
            match = self.source(other).get(handle)
            if match and len(match['variants']) == len(source['variants']):
                other_variant = match['variants'][int(row['variant'])]
                regional.append({'country':country, 'currency':code, 'price':self.price(other_variant), 'sourceUrl':match['source']})
        note = None
        if not eligible:
            note = 'Explore separately: this product is not automatically added to your routine. Check suitability and the current label first.'
        if not free and not fragrance and not explicit and not ingredients:
            note = (note+' ' if note else '')+'Fragrance-free status is unverified.'
        product = dict(id=slug, brand=brand, name=source['name'], size=row['size'], category=row['category'],
            referencePrice=price, referenceCurrency=currency, markets=markets, regionalPrices=regional,
            priceKind='planning estimate', concerns=[] if row['category']=='sunscreen' else ['moisture'],
            sensitive=row['sensitive']=='true', fragranceFree=free, ingredientHighlights=row['highlights'].split('|'),
            ingredientsComplete=bool(ingredients), ingredients=ingredients, sourceUrl=source['source'],
            sourceCheckedAt=date.today().isoformat(), tone=['sage','rose','lavender'][len(self.audit)%3],
            benefits=[row['benefit1'],row['benefit2']], imageUrl=source['image'], routineEligible=eligible)
        if row['goal']:
            product.update(treatmentGoal=row['goal'], primaryActive=row['active'],
                usageNote='Introduce one new product at a time, test first and follow the current label. Stop if irritation occurs. Check suitability before use.')
            if row['goal'] == 'oil-balance':
                product['concerns'] = ['oiliness','pore']
            if row['goal'] == 'breakouts':
                product['concerns'] = ['acne','pore']
                product.update(eveningOnly=True, usageNote='Exfoliating treatment: introduce slowly as directed by the label. Do not combine with another exfoliating acid or retinoid. Use daily SPF 30+. Deep or scarring acne needs a dermatologist.')
            if row['category'] == 'retinoid':
                product.update(eveningOnly=True, usageNote='Evening only. Introduce slowly and follow the current label. Do not combine with another retinoid or exfoliating active. Use daily SPF 30+. Avoid during pregnancy, trying to conceive or breastfeeding; stop if irritated.')
        if note:
            product['reviewNote'] = note
        self.audit.append({'id':slug, 'sourceUrl':source['source'], 'status':'reviewed', 'priceBasis':'official regular/compare-at price; planning estimate, not live quote',
            'referenceCurrency':currency, 'ingredientsComplete':bool(ingredients), 'fragranceFree':free, 'routineEligible':eligible})
        return product

    def run(self, apply: bool) -> None:
        path = self.root / 'src/data/products.json'
        catalog = json.loads(path.read_text(encoding='utf8'))
        with (self.root / 'scripts/catalog_selections.csv').open(encoding='utf8', newline='') as file:
            selections = list(csv.DictReader(file))
        additions = [product for row in selections if (product := self.build(row))]
        known_urls = {product['sourceUrl'] for product in catalog}
        original_ids = {product['id'] for product in catalog}
        known_ids = {product['id'] for product in additions}
        # Existing IDs stay stable for saved/shareable lists; never duplicate the same official SKU.
        catalog = [product for product in catalog if product['id'] not in known_ids]
        catalog += [product for product in additions if product['sourceUrl'] not in known_urls or product['id'] in original_ids]
        preview = self.research / 'catalog-preview.json'
        preview.write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
        (self.research/'audit.json').write_text(json.dumps(self.audit, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
        if apply:
            path.write_text(preview.read_text(encoding='utf8'), encoding='utf8')
        print(f'{len(catalog)} products, {len({p["brand"] for p in catalog})} brands; {sum(p["status"]=="reviewed" for p in self.audit)} selected sources reviewed')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    ReviewedCatalogImporter(Path(__file__).resolve().parents[1]).run(parser.parse_args().apply)
