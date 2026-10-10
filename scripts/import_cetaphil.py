"""Import manually reviewed regional Cetaphil pages; prices are editorial estimates."""
import concurrent.futures
import json
import re
import urllib.request
from datetime import date
from pathlib import Path
from urllib.parse import urljoin, quote

from bs4 import BeautifulSoup
from import_reviewed_catalog import IngredientReader


class CetaphilImporter:
    def __init__(self, root: Path):
        self.root = root
        self.cache = root / 'output/qa/research'
        self.cache.mkdir(parents=True, exist_ok=True)

    def build(self, row):
        page = self.cache / (row['id']+'.html')
        if not page.exists():
            url = quote(row['url'], safe=':/,%()-')
            request = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(request, timeout=30) as response:
                page.write_text(response.read().decode('utf8','replace'), encoding='utf8')
        soup = BeautifulSoup(page.read_text(encoding='utf8'), 'html.parser')
        image = soup.select_one('img.carousel-img[src^="https://"]')
        if not image:
            raise ValueError('Missing packaging image: '+row['id'])
        ingredients = IngredientReader().read(soup)
        ingredients = [re.sub(r'\.?\s*FIL\.[\w.]+$', '', ingredient).rstrip('.') for ingredient in ingredients]
        fragrance = bool(re.search(r'fragrance|parfum|linalool|limonene', ', '.join(ingredients), re.I))
        product = dict(id=row['id'], brand='Cetaphil', name=row['name'], size=row['size'],
            category=row['category'], referencePrice=row['price'], referenceCurrency=row['currency'],
            markets=[row['country']], regionalPrices=[], priceKind='planning estimate',
            concerns=[] if row['category']=='sunscreen' else ['moisture'], sensitive=row['sensitive'],
            fragranceFree=(bool(ingredients) or row.get('fragranceClaim',False)) and not fragrance,
            ingredientHighlights=row['highlights'], ingredients=ingredients, ingredientsComplete=bool(ingredients),
            sourceUrl=row['url'], sourceCheckedAt=date.today().isoformat(), benefits=row['benefits'],
            imageUrl=urljoin(row['url'],image['src']), routineEligible=not row.get('browseOnly',False), tone='sage')
        if row.get('browseOnly'):
            product['reviewNote']='Nighttime cream: explore separately and check the current label. Not automatically added to your routine.'
            product['eveningOnly']=True
        return product

    def run(self):
        selections = json.loads((self.root/'scripts/cetaphil_selections.json').read_text(encoding='utf8'))
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            additions = list(pool.map(self.build,selections))
        path = self.root/'src/data/products.json'
        products = json.loads(path.read_text(encoding='utf8'))
        ids = {p['id'] for p in additions}
        products = [p for p in products if p['id'] not in ids]+additions
        path.write_text(json.dumps(products,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
        print(f'Added/reviewed {len(additions)} regional Cetaphil products; total {len(products)}')


if __name__=='__main__':
    CetaphilImporter(Path(__file__).resolve().parents[1]).run()
