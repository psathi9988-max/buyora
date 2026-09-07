import fs from 'node:fs'
import path from 'node:path'

const STORES = ['Amazon', 'Flipkart', 'Meesho', 'Myntra', 'Ajio']
const ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG || 'buyora210b-21'

const phone_specs = ['8GB RAM | 128GB', '8GB RAM | 256GB', '12GB RAM | 256GB', '6GB RAM | 128GB']
const fashion_specs = ['Cotton blend | Regular fit', 'Rayon | Relaxed fit', 'Satin | Party wear', 'Denim | Slim fit']
const phone_names = ['iQOO Z9 5G', 'Redmi Note 13 5G', 'Samsung Galaxy M14 5G', 'OnePlus Nord CE 4', 'Realme P1 5G', 'Nothing Phone (2a)', 'Motorola Edge 50', 'POCO X6 Neo', 'Vivo T3x 5G', 'CMF Phone 1', 'Google Pixel 7a', 'OnePlus 12R']
const fashion_names = ['Black Party Dress', 'Floral Maxi Dress', 'Blue A-line Dress', 'Linen Summer Shirt', 'Relaxed Cargo Jeans', 'Everyday White Sneakers', 'Satin Evening Top', 'Classic Denim Jacket', 'Cotton Co-ord Set', 'Comfort Footwear', 'Printed Kurta Set', 'Minimal Tote Bag']
const phone_images = ['photo-1598327105666-5b89351aff97','photo-1511707171634-5f897ff02aa9','photo-1556656793-08538906a9f8','photo-1592899677977-9c10ca588bbd','photo-1607936854279-55e8f4bc06b7','photo-1598327105666-5b89351aff97']
const fashion_images = ['photo-1566174053879-31528523f8ae','photo-1595777457583-95e059d581b8','photo-1496747611176-843222e1e57c','photo-1529139574466-a303027c1d8b','photo-1541099649105-f69ad21f3246','photo-1542291026-7eec264c27ff']

function imageUrl(photo) {
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=640&q=85`
}

function getInitialProducts() {
  const list = []
  phone_names.forEach((name, i) => {
    const price = 13490 + (i * 1273) % 24500
    list.push({
      id: `phone-${i + 1}`,
      name,
      category: 'smartphones',
      price,
      original_price: Math.round(price * 1.18),
      rating: +(4.1 + (i % 5) * 0.1).toFixed(1),
      reviews: 1200 + i * 817,
      specs: phone_specs[i % phone_specs.length],
      stock: 14 + i * 7,
      store: STORES[i % 3],
      image: imageUrl(phone_images[i % phone_images.length]),
      highlights: '5G | 5000mAh battery | AMOLED display',
      discount: Math.round((1 - price / Math.round(price * 1.18)) * 100),
      saved: false
    })
  })
  fashion_names.forEach((name, i) => {
    const price = 699 + (i * 211) % 2600
    list.push({
      id: `fashion-${i + 1}`,
      name,
      category: 'fashion',
      price,
      original_price: Math.round(price * 1.85),
      rating: +(4.0 + (i % 6) * 0.1).toFixed(1),
      reviews: 450 + i * 141,
      specs: fashion_specs[i % fashion_specs.length],
      stock: 18 + i * 4,
      store: STORES[(i + 2) % 3 + 2],
      image: imageUrl(fashion_images[i % fashion_images.length]),
      highlights: 'Easy returns | Verified seller | New season',
      discount: Math.round((1 - price / Math.round(price * 1.85)) * 100),
      saved: false
    })
  })
  return list
}

let memoryProducts = getInitialProducts()
let memorySaved = new Set()
let memoryAlerts = []
let memoryOrders = [
  { id: 1, product_id: 'phone-1', name: 'iQOO Z9 5G', store: 'Amazon', price: 18999, status: 'Confirmed', order_date: 'Today', delivery: 'Tomorrow', image: imageUrl(phone_images[0]) },
  { id: 2, product_id: 'fashion-6', name: 'Everyday White Sneakers', store: 'Meesho', price: 2299, status: 'Shipped', order_date: 'Yesterday', delivery: 'In 2 days', image: imageUrl(fashion_images[5]) }
]
let memorySettings = {
  name: 'Ananya',
  budget: 50000,
  categories: ['Smartphones', 'Fashion'],
  brands: 'Samsung, OnePlus, Myntra',
  theme: 'light',
  language: 'English',
  priceAlerts: true,
  dealAlerts: true,
  orderAlerts: true,
  funMode: true
}
let memoryChats = []

function getExactMappings() {
  try {
    const jsonPath = path.resolve('backend/amazon_products.json')
    if (fs.existsSync(jsonPath)) {
      const content = fs.readFileSync(jsonPath, 'utf8')
      const data = JSON.parse(content)
      const res = {}
      for (const [k, v] of Object.entries(data)) {
        const val = String(v).trim()
        if (/^[A-Za-z0-9]{10}$/.test(val)) {
          res[k] = val.toUpperCase()
        }
      }
      return res
    }
  } catch {}
  return {}
}

function getAmazonOffer(p) {
  const mappings = getExactMappings()
  const asin = mappings[p.id]
  const tag = ASSOCIATE_TAG.trim()
  if (asin) {
    return {
      store: 'Amazon',
      price: null,
      delivery: 'Check on Amazon',
      stock: null,
      rating: null,
      offer: 'Exact product link',
      link_type: 'product',
      affiliate_url: `https://www.amazon.in/dp/${asin}?tag=${encodeURIComponent(tag)}`
    }
  }
  const query = `${p.name} ${p.specs || ''}`.trim()
  return {
    store: 'Amazon',
    price: null,
    delivery: 'Check on Amazon',
    stock: null,
    rating: null,
    offer: 'Search results — confirm model and variant',
    link_type: 'search',
    affiliate_url: `https://www.amazon.in/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(tag)}`
  }
}

export async function handler(event) {
  const method = event.httpMethod || 'GET'
  let rawPath = event.path || '/'
  // Normalize path stripping leading /.netlify/functions/api or /api
  let cleanPath = rawPath.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '')
  if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath
  if (cleanPath === '') cleanPath = '/'

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  }

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  try {
    const params = event.queryStringParameters || {}

    // GET /api/health
    if (cleanPath === '/health') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'ok', demo_mode: !Boolean(process.env.GEMINI_API_KEY) })
      }
    }

    // GET /api/products
    if (cleanPath === '/products' && method === 'GET') {
      let result = [...memoryProducts]
      if (params.category) {
        const cat = params.category.toLowerCase()
        if (cat === 'smartphones' || cat === 'fashion') {
          result = result.filter(p => p.category === cat)
        }
      }
      if (params.q) {
        const q = params.q.toLowerCase()
        result = result.filter(p => p.name.toLowerCase().includes(q) || (p.specs && p.specs.toLowerCase().includes(q)))
      }
      if (params.deals === 'true') {
        result = result.filter(p => p.price < p.original_price * 0.82)
      }
      result.sort((a, b) => b.rating - a.rating)
      const mapped = result.map(p => ({
        ...p,
        saved: memorySaved.has(p.id)
      }))
      return { statusCode: 200, headers, body: JSON.stringify(mapped) }
    }

    // GET /api/products/:id/compare
    const compareMatch = cleanPath.match(/^\/products\/([^/]+)\/compare$/)
    if (compareMatch && method === 'GET') {
      const prodId = compareMatch[1]
      const p = memoryProducts.find(x => x.id === prodId)
      if (!p) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Product not found' }) }
      }
      const prodObj = { ...p, saved: memorySaved.has(p.id) }
      const offers = [getAmazonOffer(prodObj)]
      STORES.filter(s => s !== 'Amazon').forEach((s, idx) => {
        offers.push({
          store: s,
          price: Math.round(p.price * (1 + (idx - 2) * 0.035)),
          delivery: 'Demo delivery',
          stock: Math.max(2, p.stock - idx * 3),
          rating: +(p.rating - (idx % 3) * 0.1).toFixed(1),
          offer: 'Demo offer',
          affiliate_url: null
        })
      })
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ product: prodObj, offers })
      }
    }

    // GET /api/products/:id
    const prodMatch = cleanPath.match(/^\/products\/([^/]+)$/)
    if (prodMatch && method === 'GET') {
      const p = memoryProducts.find(x => x.id === prodMatch[1])
      if (!p) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Product not found' }) }
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ...p, saved: memorySaved.has(p.id) }) }
    }

    // GET /api/saved
    if (cleanPath === '/saved' && method === 'GET') {
      const savedProds = memoryProducts
        .filter(p => memorySaved.has(p.id))
        .map(p => ({ ...p, saved: true }))
      return { statusCode: 200, headers, body: JSON.stringify(savedProds) }
    }

    // POST /api/saved
    if (cleanPath === '/saved' && method === 'POST') {
      const body = JSON.parse(event.body || '{}')
      if (body.product_id) memorySaved.add(body.product_id)
      return { statusCode: 200, headers, body: JSON.stringify({ saved: true }) }
    }

    // DELETE /api/saved/:id
    const unsaveMatch = cleanPath.match(/^\/saved\/([^/]+)$/)
    if (unsaveMatch && method === 'DELETE') {
      memorySaved.delete(unsaveMatch[1])
      return { statusCode: 200, headers, body: JSON.stringify({ saved: false }) }
    }

    // GET /api/alerts
    if (cleanPath === '/alerts' && method === 'GET') {
      return { statusCode: 200, headers, body: JSON.stringify(memoryAlerts) }
    }

    // POST /api/alerts
    if (cleanPath === '/alerts' && method === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const p = memoryProducts.find(x => x.id === body.product_id)
      const newAlert = {
        id: Date.now(),
        product_id: body.product_id,
        target_price: Number(body.target_price) || 0,
        enabled: body.enabled !== false,
        name: p ? p.name : 'Product',
        image: p ? p.image : '',
        price: p ? p.price : 0,
        original_price: p ? p.original_price : 0,
        store: p ? p.store : 'Store'
      }
      memoryAlerts.push(newAlert)
      return { statusCode: 200, headers, body: JSON.stringify(newAlert) }
    }

    // DELETE /api/alerts/:id
    const delAlertMatch = cleanPath.match(/^\/alerts\/([^/]+)$/)
    if (delAlertMatch && method === 'DELETE') {
      const alertId = Number(delAlertMatch[1])
      memoryAlerts = memoryAlerts.filter(a => a.id !== alertId)
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
    }

    // GET /api/orders
    if (cleanPath === '/orders' && method === 'GET') {
      return { statusCode: 200, headers, body: JSON.stringify(memoryOrders) }
    }

    // GET /api/settings
    if (cleanPath === '/settings' && method === 'GET') {
      return { statusCode: 200, headers, body: JSON.stringify(memorySettings) }
    }

    // PUT /api/settings
    if (cleanPath === '/settings' && method === 'PUT') {
      const body = JSON.parse(event.body || '{}')
      if (body.data) memorySettings = { ...memorySettings, ...body.data }
      return { statusCode: 200, headers, body: JSON.stringify(memorySettings) }
    }

    // GET /api/chats
    if (cleanPath === '/chats' && method === 'GET') {
      return { statusCode: 200, headers, body: JSON.stringify(memoryChats) }
    }

    // POST /api/chat
    if (cleanPath === '/chat' && method === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const msg = body.message || ''
      const context = body.context || 'Home'
      const scope = context.toLowerCase().includes('phone') ? 'smartphones' : context.toLowerCase().includes('fashion') ? 'fashion' : null
      const subset = scope ? memoryProducts.filter(p => p.category === scope) : memoryProducts
      const top = subset.slice(0, 3)
      const topNames = top.map(p => p.name).join(', ')
      const reply = `I found a strong demo-data shortlist for your request: ${topNames}. ${top[0]?.name || 'Top pick'} is the best-rated value at ₹${(top[0]?.price || 0).toLocaleString('en-IN')}. I can compare stores, delivery and offers for any of these. Prices and stock are demo data until official store feeds are connected.`

      const chatObj = {
        id: Date.now(),
        reply,
        messages: [
          { role: 'user', content: msg },
          { role: 'assistant', content: reply }
        ],
        demo_mode: true
      }
      memoryChats.unshift({ id: chatObj.id, title: msg.slice(0, 35), updated_at: new Date().toISOString() })
      return { statusCode: 200, headers, body: JSON.stringify(chatObj) }
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Endpoint not found', path: cleanPath }) }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', message: err.message })
    }
  }
}
