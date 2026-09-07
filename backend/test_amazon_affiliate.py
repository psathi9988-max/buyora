import sqlite3
import unittest
from unittest.mock import patch
from urllib.parse import urlsplit, parse_qs
from amazon_affiliate import amazon_offer, exact_asin, remove_duplicates

class AffiliateTests(unittest.TestCase):
    def test_search_is_labeled_and_tagged(self):
        with patch('amazon_affiliate.mappings', return_value={}):
            offer=amazon_offer({'id':'p','name':'Phone','specs':'8GB | 128GB'})
        self.assertEqual(offer['link_type'],'search')
        self.assertIsNone(offer['price'])
        self.assertEqual(parse_qs(urlsplit(offer['affiliate_url']).query)['tag'],['buyora210b-21'])
    def test_exact_link_replaces_old_tag(self):
        asin=exact_asin('https://www.amazon.in/example/dp/B012345678?tag=other-21')
        with patch('amazon_affiliate.mappings',return_value={'p':asin}):
            offer=amazon_offer({'id':'p'})
        self.assertEqual(offer['affiliate_url'],'https://www.amazon.in/dp/B012345678?tag=buyora210b-21')
    def test_untrusted_links_rejected(self):
        for url in ['https://amazon.in.evil.com/dp/B012345678','javascript:alert(1)','https://amzn.in/short','https://www.amazon.in/s?k=phone']:
            with self.assertRaises(ValueError): exact_asin(url)
    def test_duplicate_cleanup_preserves_references_and_variants(self):
        db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
        db.executescript('CREATE TABLE products(id TEXT PRIMARY KEY,name TEXT,specs TEXT); CREATE TABLE saved(product_id TEXT PRIMARY KEY); CREATE TABLE alerts(product_id TEXT); CREATE TABLE orders(product_id TEXT);')
        db.executemany('INSERT INTO products VALUES (?,?,?)',[('a','Phone','128GB'),('b',' Phone ','128GB'),('c','Phone','256GB')])
        for table in ['saved','alerts','orders']: db.execute(f'INSERT INTO {table} VALUES (?)',('b',))
        self.assertEqual(remove_duplicates(db),1)
        self.assertEqual(remove_duplicates(db),0)
        self.assertEqual(db.execute('SELECT COUNT(*) FROM products').fetchone()[0],2)
        for table in ['saved','alerts','orders']: self.assertEqual(db.execute(f'SELECT product_id FROM {table}').fetchone()[0],'a')

if __name__=='__main__': unittest.main()
