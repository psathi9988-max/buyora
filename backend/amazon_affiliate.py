"""Automatic India affiliate links; no scraping or invented product identifiers."""
import json
import os
import re
from pathlib import Path
from urllib.parse import urlencode, urlsplit

CATALOG = Path(__file__).with_name('amazon_products.json')

def exact_asin(value):
    value = str(value).strip()
    if re.fullmatch(r'[A-Za-z0-9]{10}', value):
        return value.upper()
    url = urlsplit(value)
    if url.scheme != 'https' or url.hostname not in ('amazon.in', 'www.amazon.in', 'm.amazon.in') or url.username or url.password or url.port not in (None,443):
        raise ValueError('Use an ASIN or a full HTTPS amazon.in product URL (not a shortened URL).')
    match = re.search(r'/(?:dp|gp/product|gp/aw/d)/([A-Za-z0-9]{10})(?:/|$)', url.path)
    if not match:
        raise ValueError('Amazon URL must contain a product ASIN.')
    return match.group(1).upper()

def mappings():
    data = json.loads(CATALOG.read_text(encoding='utf-8'))
    if not isinstance(data, dict):
        raise ValueError('amazon_products.json must map product IDs to ASINs or product URLs.')
    return {key: exact_asin(value) for key, value in data.items()}

def amazon_offer(p):
    tag = os.getenv('AMAZON_ASSOCIATE_TAG', 'buyora210b-21').strip()
    if not re.fullmatch(r'[A-Za-z0-9-]+-21', tag):
        raise ValueError('AMAZON_ASSOCIATE_TAG must be an India tracking ID ending in -21.')
    asin = mappings().get(p['id'])
    params = {'tag': tag}
    if asin:
        base = f'https://www.amazon.in/dp/{asin}'
    else:
        base = 'https://www.amazon.in/s'
        params['k'] = f"{p['name']} {p['specs']}"
    return {'store':'Amazon', 'price':None, 'delivery':'Check on Amazon', 'stock':None,
            'rating':None, 'offer':'Exact product link' if asin else 'Search results — confirm model and variant',
            'link_type':'product' if asin else 'search', 'affiliate_url':base+'?'+urlencode(params)}

def remove_duplicates(db):
    """Merge only identical catalog rows, preserving saved items and references."""
    seen = {}; removed = 0
    for row in db.execute('SELECT * FROM products ORDER BY rowid').fetchall():
        p = dict(row)
        # Different stores, specifications, images, prices and metadata stay distinct.
        key = tuple((k, ' '.join(v.casefold().split()) if isinstance(v,str) else v)
                    for k,v in p.items() if k != 'id')
        if key not in seen:
            seen[key] = p['id']; continue
        keep = seen[key]
        db.execute('INSERT OR IGNORE INTO saved(product_id) SELECT ? FROM saved WHERE product_id=?',(keep,p['id']))
        db.execute('DELETE FROM saved WHERE product_id=?',(p['id'],))
        for table in ('alerts','orders'):
            db.execute(f'UPDATE {table} SET product_id=? WHERE product_id=?',(keep,p['id']))
        db.execute('DELETE FROM products WHERE id=?',(p['id'],)); removed += 1
    return removed
