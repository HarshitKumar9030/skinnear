"""Read public official-brand Shopify catalog metadata for manual curation.

Never imports automatically: output/qa/research is an ignored review workspace.
Run: python scripts/research_catalog.py
"""
from __future__ import annotations

import concurrent.futures
import argparse
import csv
import json
import urllib.request
from pathlib import Path
from html.parser import HTMLParser


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data.strip())

    @classmethod
    def extract(cls, markup: str) -> str:
        parser = cls()
        parser.feed(markup or '')
        return ' '.join(part for part in parser.parts if part)


class OfficialCatalogResearch:
    SOURCES = {
        'cosrx': 'https://www.cosrx.com',
        'boj': 'https://beautyofjoseon.com',
        'skin1004': 'https://www.skin1004.com',
        'roundlab': 'https://roundlab.com',
        'byoma-us': 'https://byoma.com',
        'byoma-gb': 'https://uk.byoma.com',
        'inkey-us': 'https://www.theinkeylist.com',
        'inkey-gb': 'https://uk.theinkeylist.com',
        'geek': 'https://geekandgorgeous.com',
        'dotkey': 'https://www.dotandkey.com',
        'foxtale': 'https://foxtale.in',
        'minimalist': 'https://beminimalist.co',
        'deconstruct': 'https://thedeconstruct.in',
        'plum': 'https://plumgoodness.com',
        'geek-us': 'https://geekandgorgeous.us',
        'naturium': 'https://naturium.com',
        'reequil': 'https://www.reequil.com',
    }

    def __init__(self, destination: Path) -> None:
        self.destination = destination
        destination.mkdir(parents=True, exist_ok=True)

    def fetch(self, source: tuple[str, str]) -> str:
        key, origin = source
        try:
            req = urllib.request.Request(origin+'/products.json?limit=250', headers={'User-Agent':'SkinNear-Catalog-Research/1.0'})
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.load(response)
            self.destination.joinpath(key+'.json').write_text(json.dumps(data, ensure_ascii=False), encoding='utf8')
            entries = []
            for product in data['products']:
                entries.append({'handle':product['handle'], 'name':product['title'],
                    'type':product['product_type'], 'tags':product.get('tags', []),
                    'description':TextExtractor.extract(product['body_html']),
                    'variants':[{'size':v['title'], 'price':v['price'], 'compare':v.get('compare_at_price')} for v in product['variants']],
                    'image':product['images'][0]['src'] if product['images'] else None,
                    'source':origin+'/products/'+product['handle']})
            self.destination.joinpath(key+'-review.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf8')
            return f'{key}: {len(entries)} official records read'
        except Exception as error:
            return f'{key}: {type(error).__name__}: {error}'

    def run(self) -> None:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            for result in executor.map(self.fetch, self.SOURCES.items()):
                print(result)

    def pages(self) -> None:
        with Path('scripts/catalog_selections.csv').open(encoding='utf8', newline='') as file:
            selections = list(csv.DictReader(file))
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            for result in executor.map(self.page, selections):
                print(result)

    def page(self, selection: dict) -> str:
        from bs4 import BeautifulSoup
        key, handle = selection['source'], selection['handle']
        target = self.destination / f'{key}--{handle}.html'
        try:
            url = self.SOURCES[key]+'/products/'+urllib.parse.quote(handle)
            if not target.exists():
                req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=25) as response:
                    target.write_text(response.read().decode('utf8', 'replace'), encoding='utf8')
            soup = BeautifulSoup(target.read_text(encoding='utf8'), 'html.parser')
            for tag in soup(['script','style','nav','footer']):
                tag.decompose()
            text = soup.get_text(' ', strip=True)
            self.destination.joinpath(f'{key}--{handle}.txt').write_text(text, encoding='utf8')
            return f'{key}/{handle}: page reviewed metadata ready'
        except Exception as error:
            return f'{key}/{handle}: {type(error).__name__}'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['catalogs', 'pages'], default='catalogs', nargs='?')
    researcher = OfficialCatalogResearch(Path('output/qa/research'))
    args = parser.parse_args()
    researcher.pages() if args.command == 'pages' else researcher.run()
