from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json, os, sqlite3, sys
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from amazon_affiliate import amazon_offer, mappings, remove_duplicates
from dotenv import load_dotenv
import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv(BASE_DIR / '.env')
DB = BASE_DIR / 'shopai.db'
STORES = ['Amazon', 'Flipkart', 'Meesho', 'Myntra', 'Ajio']

phone_specs = ['8GB RAM | 128GB', '8GB RAM | 256GB', '12GB RAM | 256GB', '6GB RAM | 128GB']
fashion_specs = ['Cotton blend | Regular fit', 'Rayon | Relaxed fit', 'Satin | Party wear', 'Denim | Slim fit']
phone_names = ['iQOO Z9 5G', 'Redmi Note 13 5G', 'Samsung Galaxy M14 5G', 'OnePlus Nord CE 4', 'Realme P1 5G', 'Nothing Phone (2a)', 'Motorola Edge 50', 'POCO X6 Neo', 'Vivo T3x 5G', 'CMF Phone 1', 'Google Pixel 7a', 'OnePlus 12R']
fashion_names = ['Black Party Dress', 'Floral Maxi Dress', 'Blue A-line Dress', 'Linen Summer Shirt', 'Relaxed Cargo Jeans', 'Everyday White Sneakers', 'Satin Evening Top', 'Classic Denim Jacket', 'Cotton Co-ord Set', 'Comfort Footwear', 'Printed Kurta Set', 'Minimal Tote Bag']
phone_images = ['photo-1598327105666-5b89351aff97','photo-1511707171634-5f897ff02aa9','photo-1556656793-08538906a9f8','photo-1592899677977-9c10ca588bbd','photo-1607936854279-55e8f4bc06b7','photo-1598327105666-5b89351aff97']
fashion_images = ['photo-1566174053879-31528523f8ae','photo-1595777457583-95e059d581b8','photo-1496747611176-843222e1e57c','photo-1529139574466-a303027c1d8b','photo-1541099649105-f69ad21f3246','photo-1542291026-7eec264c27ff']

def image_url(photo):
    return f'https://images.unsplash.com/{photo}?auto=format&fit=crop&w=640&q=85'

def seed_products():
    rows=[]
    for i, name in enumerate(phone_names):
        price = 13490 + (i * 1273) % 24500
        rows.append((f'phone-{i+1}', name, 'smartphones', price, round(price * 1.18), 4.1 + (i % 5) * .1, 1200 + i * 817, phone_specs[i % len(phone_specs)], 14 + i * 7, STORES[i % 3], image_url(phone_images[i % len(phone_images)]), '5G | 5000mAh battery | AMOLED display'))
    for i, name in enumerate(fashion_names):
        price = 699 + (i * 211) % 2600
        rows.append((f'fashion-{i+1}', name, 'fashion', price, round(price * 1.85), 4.0 + (i % 6) * .1, 450 + i * 141, fashion_specs[i % len(fashion_specs)], 18 + i * 4, STORES[(i+2) % 3 + 2], image_url(fashion_images[i % len(fashion_images)]), 'Easy returns | Verified seller | New season'))
    return rows

def conn():
    db=sqlite3.connect(DB); db.row_factory=sqlite3.Row; return db

def init_db():
    db=conn(); db.executescript('''CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT, category TEXT, price INTEGER, original_price INTEGER, rating REAL, reviews INTEGER, specs TEXT, stock INTEGER, store TEXT, image TEXT, highlights TEXT); CREATE TABLE IF NOT EXISTS saved (product_id TEXT PRIMARY KEY); CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id TEXT, target_price INTEGER, enabled INTEGER DEFAULT 1); CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id TEXT, store TEXT, price INTEGER, status TEXT, order_date TEXT, delivery TEXT); CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT); CREATE TABLE IF NOT EXISTS chats (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, messages TEXT, updated_at TEXT)''')
    if db.execute('SELECT COUNT(*) FROM products').fetchone()[0] == 0:
        db.executemany('INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', seed_products())
    if not db.execute('SELECT 1 FROM settings WHERE id=1').fetchone():
        db.execute('INSERT INTO settings VALUES (1,?)', (json.dumps({'name':'Ananya','budget':50000,'categories':['Smartphones','Fashion'],'brands':'Samsung, OnePlus, Myntra','theme':'light','language':'English','priceAlerts':True,'dealAlerts':True,'orderAlerts':True,'funMode':True}),))
    mappings()  # Validate exact product mappings before serving purchase links.
    remove_duplicates(db)
    db.commit(); db.close()

def product(row):
    p=dict(row); p['discount']=round((1-p['price']/p['original_price'])*100); p['saved']=False; return p

@asynccontextmanager
async def lifespan(app): init_db(); yield
app=FastAPI(title='ShopAI API', lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'https://buyora-ai-shopping.netlify.app',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5050',
        'http://127.0.0.1:5050',
    ],
    allow_origin_regex=r"^https:\/\/.*\.netlify\.app$",
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

class SaveBody(BaseModel):
    product_id: str = Field(min_length=1, max_length=100)

class AlertBody(BaseModel):
    product_id: str = Field(min_length=1, max_length=100)
    target_price: int = Field(gt=0, le=10000000)
    enabled: bool = True

class SettingsBody(BaseModel):
    data: dict

class ChatBody(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: Optional[int] = None
    context: str = Field(default='Home', max_length=100)

@app.get('/api/health')
def health(): return {'status':'ok','demo_mode':not bool(os.getenv('GEMINI_API_KEY'))}

@app.get('/api/products')
def products(category: Optional[str]=None, q: Optional[str]=None, deals: bool=False):
    db=conn(); sql='SELECT * FROM products WHERE 1=1'; args=[]
    if category in ('smartphones','fashion'): sql+=' AND category=?'; args.append(category)
    if q: sql+=' AND (lower(name) LIKE ? OR lower(specs) LIKE ?)'; args += [f'%{q.lower()}%',f'%{q.lower()}%']
    if deals: sql+=' AND price < original_price * .82'
    result=[product(r) for r in db.execute(sql+' ORDER BY rating DESC',args)]; saved={r['product_id'] for r in db.execute('SELECT product_id FROM saved')}; db.close()
    for p in result: p['saved']=p['id'] in saved
    return result

@app.get('/api/products/{product_id}')
def detail(product_id: str):
    db=conn(); row=db.execute('SELECT * FROM products WHERE id=?',(product_id,)).fetchone(); db.close()
    if not row: raise HTTPException(404,'Product not found')
    return product(row)

@app.get('/api/products/{product_id}/compare')
def compare(product_id: str):
    p=detail(product_id)
    offers=[amazon_offer(p)]
    offers += [{'store':s,'price':round(p['price']*(1+(i-2)*.035)),
                'delivery':'Demo delivery','stock':max(2,p['stock']-i*3),
                'rating':round(p['rating']-(i%3)*.1,1),'offer':'Demo offer',
                'affiliate_url':None} for i,s in enumerate(STORES) if s != 'Amazon']
    return {'product':p,'offers':offers}

@app.get('/api/saved')
def saved():
    db=conn(); rows=db.execute('SELECT p.* FROM products p JOIN saved s ON s.product_id=p.id').fetchall(); db.close(); return [product(r) for r in rows]

@app.post('/api/saved')
def save(body: SaveBody):
    db=conn(); db.execute('INSERT OR IGNORE INTO saved VALUES (?)',(body.product_id,)); db.commit(); db.close(); return {'saved':True}

@app.delete('/api/saved/{product_id}')
def unsave(product_id: str):
    db=conn(); db.execute('DELETE FROM saved WHERE product_id=?',(product_id,)); db.commit(); db.close(); return {'saved':False}

@app.get('/api/alerts')
def alerts():
    db=conn(); rows=db.execute('SELECT a.*,p.name,p.image,p.price,p.original_price,p.store FROM alerts a JOIN products p ON p.id=a.product_id').fetchall(); db.close(); return [dict(r) for r in rows]

@app.post('/api/alerts')
def create_alert(body: AlertBody):
    db=conn()
    if not db.execute('SELECT 1 FROM products WHERE id=?', (body.product_id,)).fetchone():
        db.close()
        raise HTTPException(404, 'Product not found')
    cur=db.execute('INSERT INTO alerts(product_id,target_price,enabled) VALUES (?,?,?)',(body.product_id,body.target_price,body.enabled)); db.commit(); item={'id':cur.lastrowid,**body.model_dump()}; db.close(); return item

@app.patch('/api/alerts/{alert_id}')
def update_alert(alert_id:int, body:AlertBody):
    db=conn(); db.execute('UPDATE alerts SET target_price=?,enabled=? WHERE id=?',(body.target_price,body.enabled,alert_id)); db.commit(); db.close(); return {'ok':True}

@app.delete('/api/alerts/{alert_id}')
def delete_alert(alert_id:int):
    db=conn(); db.execute('DELETE FROM alerts WHERE id=?',(alert_id,)); db.commit(); db.close(); return {'ok':True}

@app.get('/api/orders')
def orders():
    db=conn(); rows=db.execute('SELECT o.*,p.name,p.image FROM orders o JOIN products p ON p.id=o.product_id ORDER BY o.id DESC').fetchall(); db.close(); return [dict(r) for r in rows]

@app.get('/api/settings')
def settings():
    db=conn(); data=json.loads(db.execute('SELECT data FROM settings WHERE id=1').fetchone()['data']); db.close(); return data

@app.put('/api/settings')
def update_settings(body:SettingsBody):
    db=conn(); db.execute('UPDATE settings SET data=? WHERE id=1',(json.dumps(body.data),)); db.commit(); db.close(); return body.data

@app.get('/api/chats')
def chats():
    db=conn(); rows=db.execute('SELECT id,title,updated_at FROM chats ORDER BY updated_at DESC').fetchall(); db.close(); return [dict(r) for r in rows]

def demo_reply(message, context):
    db=conn(); category='smartphones' if context.lower() in ('smartphones','phone') else 'fashion' if context.lower()=='fashion' else None; rows=db.execute('SELECT * FROM products WHERE category=? ORDER BY rating DESC LIMIT 3',(category,)).fetchall() if category else db.execute('SELECT * FROM products ORDER BY rating DESC LIMIT 3').fetchall(); db.close(); top=[product(r) for r in rows]
    names=', '.join(p['name'] for p in top); return f"I found a strong demo-data shortlist for your request: {names}. {top[0]['name']} is the best-rated value at ₹{top[0]['price']:,}. I can compare stores, delivery and offers for any of these. Prices and stock are demo data until official store feeds are connected."

def gemini_reply(message, context):
    key = os.getenv('GEMINI_API_KEY')
    if not key: return None
    prompt = f"You are ShopAI, a shopping comparison assistant. Context: {context}. Only answer shopping questions. Clearly label demo data and never invent prices, stock or offers. User: {message}"
    try:
        response = httpx.post(f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}', json={'contents':[{'parts':[{'text':prompt}]}]}, timeout=12)
        response.raise_for_status()
        return response.json()['candidates'][0]['content']['parts'][0]['text']
    except (httpx.HTTPError, KeyError, IndexError, TypeError):
        return None

@app.post('/api/chat')
def chat(body:ChatBody):
    db=conn(); now=datetime.now(timezone.utc).isoformat(); reply=gemini_reply(body.message,body.context) or demo_reply(body.message,body.context)
    if body.conversation_id:
        row=db.execute('SELECT * FROM chats WHERE id=?',(body.conversation_id,)).fetchone(); messages=json.loads(row['messages']) if row else [] ; messages += [{'role':'user','content':body.message},{'role':'assistant','content':reply}]; db.execute('UPDATE chats SET messages=?,updated_at=? WHERE id=?',(json.dumps(messages),now,body.conversation_id)); cid=body.conversation_id
    else:
        messages=[{'role':'user','content':body.message},{'role':'assistant','content':reply}]; cur=db.execute('INSERT INTO chats(title,messages,updated_at) VALUES (?,?,?)',(body.message[:35],json.dumps(messages),now)); cid=cur.lastrowid
    db.commit(); db.close(); return {'id':cid,'reply':reply,'messages':messages,'demo_mode':not bool(os.getenv('GEMINI_API_KEY'))}

@app.get('/api/chats/{chat_id}')
def chat_detail(chat_id:int):
    db=conn(); row=db.execute('SELECT * FROM chats WHERE id=?',(chat_id,)).fetchone(); db.close();
    if not row: raise HTTPException(404,'Conversation not found')
    return {'id':row['id'],'title':row['title'],'messages':json.loads(row['messages'])}

@app.delete('/api/chats/{chat_id}')
def delete_chat(chat_id:int):
    db=conn(); db.execute('DELETE FROM chats WHERE id=?',(chat_id,)); db.commit(); db.close(); return {'ok':True}
