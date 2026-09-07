import { useEffect, useMemo, useState } from 'react'
import { Bell, Bookmark, Bot, Check, ChevronRight, ExternalLink, Grid2X2, Heart, Home, Menu, Package, Search, Settings, Shirt, ShoppingBag, Smartphone, Sparkles, Tag, Trash2, UserRound, X } from 'lucide-react'
import './ShopAI.css'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const ASSOCIATE_TAG = import.meta.env.VITE_AMAZON_ASSOCIATE_TAG || 'buyora210b-21'

const photo = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=82&fm=webp`

const initialSmartphones = [
  ['iQOO Z9 5G', '₹18,999', '₹21,999', '13% OFF', '4.4', 'Amazon', 'photo-1598327105666-5b89351aff97', 'phone-1'],
  ['Redmi Note 13 5G', '₹16,999', '₹19,999', '15% OFF', '4.3', 'Flipkart', 'photo-1511707171634-5f897ff02aa9', 'phone-2'],
  ['Samsung Galaxy M14 5G', '₹13,490', '₹15,490', '13% OFF', '4.2', 'Amazon', 'photo-1556656793-08538906a9f8', 'phone-3'],
  ['OnePlus Nord CE4', '₹24,999', '₹29,999', '17% OFF', '4.5', 'Flipkart', 'photo-1592899677977-9c10ca588bbd', 'phone-4'],
  ['Nothing Phone 2a', '₹23,999', '₹27,999', '14% OFF', '4.3', 'Amazon', 'photo-1598327105666-5b89351aff97', 'phone-5'],
  ['Pixel 9a', '₹42,999', '₹49,999', '14% OFF', '4.6', 'Flipkart', 'photo-1511707171634-5f897ff02aa9', 'phone-6'],
].map(x => ({
  id: x[7],
  name: x[0],
  price: x[1],
  original: x[2],
  discount: x[3],
  rating: x[4],
  store: x[5],
  image: photo(x[6]),
  specs: '8GB RAM | 128GB',
  detail: '5000mAh Battery · 5G Camera',
  category: 'Smartphones'
}))

const initialFashion = [
  ['Black Party Dress', '₹1,299', '₹2,499', '48% OFF', '4.4', 'Myntra', 'photo-1566174053879-31528523f8ae', 'fashion-1'],
  ['Floral Maxi Dress', '₹1,499', '₹2,999', '50% OFF', '4.5', 'AJIO', 'photo-1595777457583-95e059d581b8', 'fashion-2'],
  ['Blue A-line Dress', '₹999', '₹1,999', '50% OFF', '4.3', 'Myntra', 'photo-1496747611176-843222e1e57c', 'fashion-3'],
  ['Linen Summer Shirt', '₹899', '₹1,499', '40% OFF', '4.4', 'Myntra', 'photo-1529139574466-a303027c1d8b', 'fashion-4'],
  ['Everyday Sneakers', '₹2,299', '₹3,499', '34% OFF', '4.5', 'AJIO', 'photo-1542291026-7eec264c27ff', 'fashion-5'],
  ['Classic Denim Jacket', '₹1,799', '₹2,999', '40% OFF', '4.2', 'Myntra', 'photo-1541099649105-f69ad21f3246', 'fashion-6'],
].map(x => ({
  id: x[7],
  name: x[0],
  price: x[1],
  original: x[2],
  discount: x[3],
  rating: x[4],
  store: x[5],
  image: photo(x[6]),
  specs: 'Cotton blend | Regular fit',
  detail: 'Easy returns · Verified seller',
  category: 'Fashion'
}))

const allDefaultProducts = [...initialSmartphones, ...initialFashion]

const nav = [
  ['Home', Home],
  ['Smartphones', Smartphone],
  ['Fashion', Shirt],
  ['Deals', Tag],
  ['Categories', Grid2X2],
  ['Orders', Package],
  ['Price Alerts', Bell],
  ['Saved', Bookmark],
  ['Settings', Settings]
]

const questions = [
  'Best 5G phone under ₹20,000',
  'iPhone under ₹50,000',
  'Black dress for party',
  'Summer dress under ₹1,500',
  'Wedding outfits'
]

function getAmazonOffer(product) {
  const tag = ASSOCIATE_TAG.trim()
  const query = `${product.name} ${product.specs || ''}`.trim()
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

const searchTerms = query => query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

const relatedProducts = (list, query) => {
  const terms = searchTerms(query)
  if (!terms.length) return list
  const matches = product => {
    const haystack = `${product.name} ${product.store} ${product.category} ${product.specs} ${product.detail}`.toLowerCase()
    const aliases = product.category === 'Smartphones'
      ? ['phone', 'smartphone', 'mobile', '5g', 'camera', 'battery', 'android', 'iphone']
      : ['dress', 'fashion', 'clothing', 'shirt', 'jeans', 'shoes', 'footwear', 'party', 'summer']
    return terms.some(term => haystack.includes(term) || aliases.some(alias => alias.startsWith(term) || term.startsWith(alias)))
  }
  const result = list.filter(matches)
  return result.length ? result : list.filter(product => terms.some(term => product.category.toLowerCase().includes(term) || product.store.toLowerCase().includes(term)))
}

function SettingsPanel() {
  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('shopai-settings')) || {
        name: 'Ananya',
        budget: '₹50,000',
        categories: ['Smartphones', 'Fashion'],
        brands: 'Samsung, OnePlus, Myntra',
        priceAlerts: true,
        dealAlerts: true,
        funMode: true
      }
    } catch {
      return {
        name: 'Ananya',
        budget: '₹50,000',
        categories: ['Smartphones', 'Fashion'],
        brands: 'Samsung, OnePlus, Myntra',
        priceAlerts: true,
        dealAlerts: true,
        funMode: true
      }
    }
  })

  const update = (key, value) => {
    setSettings(current => {
      const next = { ...current, [key]: value }
      localStorage.setItem('shopai-settings', JSON.stringify(next))
      fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: next })
      }).catch(() => {})
      return next
    })
  }

  return (
    <div className="shop-settings">
      <div className="shop-settings-heading">
        <div>
          <span>YOUR SHOPPING PROFILE</span>
          <h1>Settings</h1>
          <p>Personalize ShopAI around the way you actually shop.</p>
        </div>
        <div className="settings-avatar">{settings.name.slice(0, 1)}</div>
      </div>
      <div className="settings-layout">
        <section className="settings-card settings-profile">
          <div className="settings-card-title">
            <div>
              <b>Profile</b>
              <small>Used for your greeting and recommendations</small>
            </div>
            <button className="settings-outline">Saved</button>
          </div>
          <label>
            Name
            <input value={settings.name} onChange={e => update('name', e.target.value)} />
          </label>
          <label>
            Maximum shopping budget
            <input value={settings.budget} onChange={e => update('budget', e.target.value)} />
          </label>
        </section>
        <section className="settings-card">
          <div className="settings-card-title">
            <div>
              <b>Shopping preferences</b>
              <small>Help us prioritize better matches</small>
            </div>
            <Sparkles size={19} />
          </div>
          <label>
            Preferred categories
            <input
              value={settings.categories.join(', ')}
              onChange={e => update('categories', e.target.value.split(',').map(item => item.trim()).filter(Boolean))}
            />
          </label>
          <label>
            Preferred brands
            <input value={settings.brands} onChange={e => update('brands', e.target.value)} />
          </label>
        </section>
        <section className="settings-card">
          <div className="settings-card-title">
            <div>
              <b>Notifications</b>
              <small>Useful updates, never noise</small>
            </div>
            <Bell size={19} />
          </div>
          {[
            ['priceAlerts', 'Price drop alerts'],
            ['dealAlerts', 'Better deal notifications'],
            ['funMode', 'Fun shopping tips']
          ].map(([key, label]) => (
            <label className="settings-toggle" key={key}>
              {label}
              <input type="checkbox" checked={settings[key]} onChange={e => update(key, e.target.checked)} />
              <span />
            </label>
          ))}
        </section>
        <section className="settings-card settings-recommendation">
          <div className="settings-card-title">
            <div>
              <b>ShopAI recommendations</b>
              <small>Amazon affiliate automated</small>
            </div>
            <Bot size={20} />
          </div>
          <p>
            Keep Smartphones and Fashion selected, enable price alerts for shortlisted products, and use a ₹50,000 budget to make home recommendations more focused.
          </p>
          <div className="settings-pills">
            <span>₹ INR currency</span>
            <span>Tag: {ASSOCIATE_TAG}</span>
            <span>AI-assisted search</span>
          </div>
          <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted, #888)', lineHeight: '1.4' }}>
            As an Amazon Associate, Buyora earns from qualifying purchases. Store links may earn affiliate commission.
          </div>
        </section>
      </div>
    </div>
  )
}

function ProductCard({ product, saved, onSave, onOpen }) {
  return (
    <article className={saved ? 'shop-product saved-product' : 'shop-product'} onClick={() => onOpen(product)}>
      <div className="shop-product-image">
        <img
          className={product.category === 'Fashion' ? 'fashion-image' : 'contain-image'}
          loading="lazy"
          src={product.image}
          alt={`${product.name} product image`}
        />
        <span className="product-ribbon">{product.discount}</span>
        <button
          className={saved ? 'product-heart saved' : 'product-heart'}
          onClick={e => {
            e.stopPropagation()
            onSave(product.id)
          }}
          aria-label={`Save ${product.name}`}
        >
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <h3>{product.name}</h3>
      <div className="shop-price">
        <strong>{product.price}</strong>
        <s>{product.original}</s>
        <em>{product.discount}</em>
      </div>
      <p>{product.specs}</p>
      <p>{product.detail}</p>
      <div className="shop-rating">
        ★ {product.rating} <span>({product.category === 'Fashion' ? '1.8K' : '12.6K'})</span>
      </div>
      <div className="shop-card-footer">
        <span>{product.store}</span>
        <button
          onClick={e => {
            e.stopPropagation()
            onOpen(product)
          }}
        >
          View Deal <ChevronRight size={12} />
        </button>
      </div>
    </article>
  )
}

function Chat({ close, context }) {
  const [text, setText] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: `Hi Ananya! I can help compare ${context === 'Home' ? 'phones, fashion and deals' : context.toLowerCase()}. What are you shopping for?`
    }
  ])
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (!text.trim() || busy) return
    const next = text.trim()
    setMessages(m => [...m, { role: 'user', text: next }])
    setText('')
    setBusy(true)
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: next, context })
      })
      if (!response.ok) throw new Error('API failed')
      const data = await response.json()
      setMessages(m => [...m, { role: 'bot', text: data.reply }])
    } catch {
      try {
        const fallbackResp = await fetch(`${API_BASE}/assistant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: next, section: context })
        })
        const data = await fallbackResp.json()
        setMessages(m => [...m, { role: 'bot', text: data.reply }])
      } catch {
        setMessages(m => [
          ...m,
          {
            role: 'bot',
            text: 'I can help with phones and fashion using our demonstration catalogue. Ask for a budget, camera, battery, size, or comparison!'
          }
        ])
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shop-chat-backdrop">
      <aside className="shop-chat">
        <header>
          <div>
            <Bot size={19} />
            <span>
              <b>ShopAI Assistant</b>
              <small>{context} shopping mode</small>
            </span>
          </div>
          <button onClick={close}>
            <X size={19} />
          </button>
        </header>
        <div className="shop-messages">
          {messages.map((m, i) => (
            <div className={`shop-message ${m.role}`} key={i}>
              {m.text}
            </div>
          ))}
          {busy && <div className="shop-message">Thinking...</div>}
        </div>
        <div className="shop-chat-suggestions">
          <button onClick={() => setText('Best phone under ₹20,000')}>Best phone under ₹20k</button>
          <button onClick={() => setText('Black dress for a party')}>Black party dress</button>
        </div>
        <div className="shop-chat-input">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask anything..."
          />
          <button onClick={send} aria-label="Send message">
            <ChevronRight size={18} />
          </button>
        </div>
      </aside>
    </div>
  )
}

function ProductModal({ product, close }) {
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadCompare() {
      try {
        const res = await fetch(`${API_BASE}/products/${product.id}/compare`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setComparison(data)
            setLoading(false)
            return
          }
        }
      } catch {}

      if (!cancelled) {
        const base = Number(String(product.price).replace(/[₹,]/g, '')) || 15000
        const amazon = getAmazonOffer(product)
        const others = ['Flipkart', 'Meesho', 'Myntra', 'AJIO'].map((store, index) => ({
          store,
          price: Math.round((base * (1 + (index - 2) * 0.035)) / 10) * 10,
          delivery: index % 2 ? 'Free delivery' : '2 day delivery',
          offer: index === 2 ? 'Best price' : 'Bank offer',
          affiliate_url: null
        }))
        setComparison({ product, offers: [amazon, ...others] })
        setLoading(false)
      }
    }
    loadCompare()
    return () => {
      cancelled = true
    }
  }, [product])

  const offers = comparison?.offers || [getAmazonOffer(product)]

  return (
    <div className="shop-modal-backdrop" onClick={close}>
      <div className="shop-modal product-detail-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-x" onClick={close} aria-label="Close modal">
          <X size={18} />
        </button>
        <img
          className={product.category === 'Fashion' ? 'fashion-image detail-image' : 'contain-image detail-image'}
          loading="lazy"
          src={product.image}
          alt={`${product.name} product details`}
        />
        <div>
          <small>{product.category} · Store comparison</small>
          <h2>{product.name}</h2>
          <p>{product.detail}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '8px 0' }}>
            <strong>{product.price}</strong>
            <s>{product.original}</s>
            <span className="modal-offer">{product.discount}</span>
          </div>

          <div className="store-comparison" style={{ marginTop: '12px' }}>
            {offers.map((offer, index) => {
              const isAmazon = offer.store === 'Amazon'
              const buttonText = isAmazon
                ? offer.link_type === 'product'
                  ? 'View Deal'
                  : 'Search Amazon'
                : 'Demo View'
              const priceDisplay = isAmazon ? (offer.price ? `₹${offer.price.toLocaleString('en-IN')}` : 'Check on Amazon') : `₹${(offer.price || 0).toLocaleString('en-IN')}`

              return (
                <div className={isAmazon ? 'store-offer best' : 'store-offer'} key={offer.store}>
                  <b>{offer.store}</b>
                  <strong>{priceDisplay}</strong>
                  <small>
                    {offer.delivery} · {offer.offer}
                  </small>
                  {isAmazon && offer.affiliate_url ? (
                    <button
                      onClick={() => window.open(offer.affiliate_url, '_blank', 'noopener,noreferrer')}
                      title={`Open ${offer.store} with tag ${ASSOCIATE_TAG}`}
                    >
                      {buttonText} <ChevronRight size={12} />
                    </button>
                  ) : (
                    <button
                      style={{ opacity: 0.75, cursor: 'default' }}
                      onClick={() => {}}
                    >
                      Demo Store
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '10px 12px',
              background: 'rgba(0,0,0,0.03)',
              borderRadius: '8px',
              fontSize: '11px',
              lineHeight: '1.4',
              color: 'var(--text-muted, #777)'
            }}
          >
            <b>Affiliate Disclosure:</b> As an Amazon Associate, Buyora earns from qualifying purchases. Exact product availability, prices, and shipping are determined by Amazon.in. Non-Amazon store listings are simulated comparison data.
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ShopAI() {
  const [section, setSection] = useState('Home')
  const [query, setQuery] = useState('')
  const [drawer, setDrawer] = useState(false)
  const [chat, setChat] = useState(false)
  const [products, setProducts] = useState(allDefaultProducts)
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('shopai-saved')) || []
    } catch {
      return []
    }
  })
  const [modal, setModal] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/products`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map(p => ({
            id: p.id,
            name: p.name,
            price: typeof p.price === 'number' ? `₹${p.price.toLocaleString('en-IN')}` : p.price,
            original: typeof p.original_price === 'number' ? `₹${p.original_price.toLocaleString('en-IN')}` : p.original,
            discount: typeof p.discount === 'number' ? `${p.discount}% OFF` : p.discount,
            rating: String(p.rating),
            store: p.store,
            image: p.image,
            specs: p.specs,
            detail: p.highlights || p.detail,
            category: p.category === 'smartphones' ? 'Smartphones' : p.category === 'fashion' ? 'Fashion' : p.category
          }))
          setProducts(formatted)
        }
      })
      .catch(() => {})
  }, [])

  const save = id => {
    setSaved(items => {
      const exists = items.includes(id)
      const next = exists ? items.filter(x => x !== id) : [...items, id]
      localStorage.setItem('shopai-saved', JSON.stringify(next))
      if (!exists) {
        fetch(`${API_BASE}/saved`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: id })
        }).catch(() => {})
      } else {
        fetch(`${API_BASE}/saved/${id}`, { method: 'DELETE' }).catch(() => {})
      }
      return next
    })
  }

  const navigate = page => {
    setSection(page)
    setDrawer(false)
    setQuery('')
  }

  const smartphones = useMemo(() => products.filter(p => p.category === 'Smartphones'), [products])
  const fashion = useMemo(() => products.filter(p => p.category === 'Fashion'), [products])

  const filtered = useMemo(() => {
    const list =
      section === 'Smartphones'
        ? smartphones
        : section === 'Fashion'
        ? fashion
        : section === 'Deals'
        ? products.filter(p => p.discount && !p.discount.includes('13%'))
        : section === 'Saved'
        ? products.filter(p => saved.includes(p.id))
        : products
    return relatedProducts(list, query)
  }, [section, query, saved, products, smartphones, fashion])

  const home = section === 'Home' && !query

  return (
    <div className="shopai-shell">
      <div className={drawer ? 'shop-drawer-overlay visible' : 'shop-drawer-overlay'} onClick={() => setDrawer(false)} />
      <aside className={drawer ? 'shop-sidebar open' : 'shop-sidebar'}>
        <div className="shop-sidebar-top">
          <div className="shop-logo">
            <span>
              <ShoppingBagIcon />
            </span>
            <div>
              <b>ShopAI</b>
              <small>AI Shopping Assistant</small>
            </div>
          </div>
          <button className="shop-drawer-close" onClick={() => setDrawer(false)}>
            <X size={20} />
          </button>
        </div>
        <nav>
          {nav.map(([label, Icon]) => (
            <button key={label} className={section === label ? 'active' : ''} onClick={() => navigate(label)}>
              <Icon size={16} />
              {label}
              {label === 'Saved' && saved.length > 0 && <b>{saved.length}</b>}
            </button>
          ))}
        </nav>
        <button
          className="shop-ai-sidebar"
          onClick={() => {
            setChat(true)
            setDrawer(false)
          }}
        >
          <span>
            <b>AI Shopping</b>
            <small>Smarter choices, better prices.</small>
          </span>
          <ChevronRight size={15} />
        </button>
      </aside>

      <main className="shop-main">
        <header className="shop-topbar">
          <button className="shop-menu" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="shop-mobile-logo">
            <ShoppingBagIcon />
            <b>ShopAI</b>
          </div>
          <div className="shop-search">
            <Search size={16} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask anything... (e.g. Best phone under ₹20,000 / Black dress for party)"
            />
            <button onClick={() => setChat(true)} aria-label="Open AI Assistant">
              <Sparkles size={15} />
            </button>
          </div>
          <div className="shop-account">
            <button onClick={() => navigate('Saved')} aria-label="View Saved">
              <Heart size={19} />
            </button>
            <Bell size={17} />
            <span>A</span>
            <b>Ananya▾</b>
          </div>
        </header>

        <div className="shop-content">
          {home && (
            <>
              <section className="shop-hero">
                <div>
                  <p>✦ Hi Ananya! 👋</p>
                  <h1>What are you shopping for today?</h1>
                  <div>
                    <button onClick={() => navigate('Smartphones')}>
                      <Smartphone size={15} /> Smartphones
                    </button>
                    <button onClick={() => navigate('Fashion')}>
                      <Shirt size={15} /> Dresses
                    </button>
                  </div>
                </div>
                <div className="shop-hero-art">
                  <span className="hero-bag">◒</span>
                  <span className="hero-dress">♢</span>
                  <Bot size={45} />
                </div>
              </section>
              <section className="shop-popular">
                <h2>Popular searches</h2>
                <div>
                  {questions.map(q => (
                    <button key={q} onClick={() => setQuery(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {section === 'Categories' ? (
            <div className="shop-category-page">
              <h1>Categories</h1>
              <div>
                <button onClick={() => navigate('Smartphones')}>
                  <Smartphone size={30} />
                  <b>Smartphones</b>
                  <span>Camera, battery and 5G value</span>
                </button>
                <button onClick={() => navigate('Fashion')}>
                  <Shirt size={30} />
                  <b>Fashion</b>
                  <span>Styles, sizes and trusted offers</span>
                </button>
              </div>
            </div>
          ) : section === 'Settings' ? (
            <SettingsPanel />
          ) : section === 'Orders' || section === 'Price Alerts' ? (
            <div className="shop-simple-page">
              <span>SHOPAI SPACE</span>
              <h1>{section}</h1>
              <p>
                {section === 'Orders'
                  ? 'Demo order tracking will appear here after checkout.'
                  : 'Create alerts for products you want to watch.'}
              </p>
              <div className="shop-empty">
                <Sparkles size={25} />
                <b>No {section.toLowerCase()} yet</b>
                <small>ShopAI keeps your shopping organized in one calm place.</small>
              </div>
            </div>
          ) : (
            <>
              <div className="shop-section-title">
                <div>
                  <h2>{home ? 'Top Picks For You' : section}</h2>
                  <p>{home ? 'Personalized products from trusted stores' : `${filtered.length} products matched for you`}</p>
                </div>
                <button onClick={() => navigate(section === 'Home' ? 'Smartphones' : section)}>
                  View all <ChevronRight size={14} />
                </button>
              </div>

              {home ? (
                <>
                  <div className="shop-product-section">
                    <div className="shop-rail-title">
                      <strong>
                        <Smartphone size={14} /> Best Smartphones Under ₹20,000
                      </strong>
                      <button onClick={() => navigate('Smartphones')}>View all</button>
                    </div>
                    <div className="shop-product-grid">
                      {smartphones.slice(0, 3).map(p => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          saved={saved.includes(p.id)}
                          onSave={save}
                          onOpen={setModal}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="shop-product-section dresses">
                    <div className="shop-rail-title">
                      <strong>
                        <Shirt size={14} /> Trending Dresses
                      </strong>
                      <button onClick={() => navigate('Fashion')}>View all</button>
                    </div>
                    <div className="shop-product-grid">
                      {fashion.slice(0, 3).map(p => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          saved={saved.includes(p.id)}
                          onSave={save}
                          onOpen={setModal}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="shop-product-grid listing">
                  {filtered.length ? (
                    filtered.map(p => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        saved={saved.includes(p.id)}
                        onSave={save}
                        onOpen={setModal}
                      />
                    ))
                  ) : (
                    <div className="shop-empty">
                      <Search size={25} />
                      <b>No related products found</b>
                      <small>Try “phone”, “dress”, “camera”, “5G” or a store name.</small>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <nav className="shop-mobile-nav">
        {[
          ['Home', Home],
          ['Categories', Grid2X2],
          ['Deals', Tag],
          ['Saved', Bookmark],
          ['Account', UserRound]
        ].map(([label, Icon]) => (
          <button
            key={label}
            className={section === label ? 'active' : ''}
            onClick={() => navigate(label === 'Account' ? 'Settings' : label)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <button className="shop-floating-chat" onClick={() => setChat(true)}>
        <Bot size={19} />
        <span>AI Shopping</span>
      </button>

      {chat && <Chat close={() => setChat(false)} context={section} />}
      {modal && <ProductModal product={modal} close={() => setModal(null)} />}
    </div>
  )
}

function ShoppingBagIcon() {
  return <ShoppingBag size={20} />
}
