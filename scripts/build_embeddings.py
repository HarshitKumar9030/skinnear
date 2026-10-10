"""Precompute public product embeddings and generic concern queries; no user data."""
import concurrent.futures
import hashlib
import json
import math
import time
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import dotenv_values


class CatalogEmbeddingBuilder:
    MODEL = 'gemini-embedding-001'
    QUERIES = {
        'moisture':'Gentle skincare to hydrate dry-feeling skin and maintain the moisture barrier.',
        'redness':'Gentle fragrance-free skincare for sensitive skin comfort and moisture barrier support.',
        'oiliness':'Lightweight non-greasy skincare that removes excess surface oil and reduces visible shine.',
        'pore':'Gentle cleansing and lightweight hydration for oily-looking skin and visible pores.',
        'acne':'Simple gentle cleansing hydration and sun protection for breakout-prone skin without stronger actives.',
    }

    def __init__(self, root):
        self.root = root
        self.key = dotenv_values(root/'.env.local').get('GEMINI_API_KEY')
        if not self.key:
            raise ValueError('Set GEMINI_API_KEY locally before indexing')
        self.path = root/'src/data/product-embeddings.json'
        self.cache = json.loads(self.path.read_text(encoding='utf8')) if self.path.exists() else {}

    @staticmethod
    def document(product):
        return ' | '.join([product['brand'], product['name'], product['category'],
            ' '.join(product['ingredientHighlights']), ' '.join(product['benefits'])])

    def embed(self, task):
        key, text, query = task
        digest = hashlib.sha256(text.encode()).hexdigest()
        existing = self.cache.get('queries' if query else 'products',{}).get(key)
        if self.cache.get('model') == self.MODEL and existing and existing['hash']==digest:
            return key, existing, query
        body = {'taskType':'RETRIEVAL_QUERY' if query else 'RETRIEVAL_DOCUMENT',
            'outputDimensionality':768,'content':{'parts':[{'text':text}]}}
        for attempt in range(3):
            request = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{self.MODEL}:embedContent',
                data=json.dumps(body).encode(),headers={'Content-Type':'application/json','x-goog-api-key':self.key})
            try:
                with urllib.request.urlopen(request,timeout=30) as response:
                    values = json.load(response)['embedding']['values']
                if len(values)!=768 or not all(math.isfinite(x) for x in values):
                    raise ValueError('Invalid embedding response')
                norm = math.sqrt(sum(x*x for x in values))
                if not norm:
                    raise ValueError('Empty embedding')
                return key, {'hash':digest,'vector':[round(x/norm,7) for x in values]}, query
            except urllib.error.HTTPError as error:
                if error.code not in [429,500,503] or attempt==2:
                    raise ValueError(f'Embedding request failed (HTTP {error.code}); no index written') from None
                time.sleep(20)

    def run(self):
        products = json.loads((self.root/'src/data/products.json').read_text(encoding='utf8'))
        tasks = [(p['id'], self.document(p), False) for p in products]+[(k,v,True) for k,v in self.QUERIES.items()]
        result = {'model':self.MODEL,'dimensions':768,'products':{},'queries':{}}
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            for index,(key,value,query) in enumerate(pool.map(self.embed,tasks)):
                result['queries' if query else 'products'][key] = value
                if index % 30 == 0:
                    print(f'Indexed {index+1}/{len(tasks)} public documents',flush=True)
        temporary = self.path.with_suffix('.tmp')
        temporary.write_text(json.dumps(result,separators=(',',':'))+'\n',encoding='utf8')
        temporary.replace(self.path)
        print(f'Embedding index ready: {len(products)} products, 5 generic queries')


if __name__=='__main__':
    CatalogEmbeddingBuilder(Path(__file__).resolve().parents[1]).run()
