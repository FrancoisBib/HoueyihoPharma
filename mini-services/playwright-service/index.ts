import { chromium, Browser, Page, BrowserContext } from 'playwright';

const PORT = 3002;

// ─── Types ────────────────────────────────────────────────────────────────────
interface MedicationResult {
  success: boolean;
  medicationName: string;
  supplier: string;
  available: boolean;
  price: number | null;
  currency: string | null;
  expiryDate: string | null;
  productUrl: string | null;
  sku: string | null;
  searchStrategy?: string;
  error?: string;
  timestamp: string;
}

interface SupplierConfig {
  name: string;
  baseUrl: string;
  loginUrl: string;
  searchUrl: string;
  username: string;
  password: string;
  selectors: {
    usernameInput: string;
    passwordInput: string;
    loginButton: string;
    productCard: string;
    productName: string;
    productPrice: string;
    addToCartButton: string;
    ajaxReadyIndicator: string;
  };
}

// ─── Config fournisseurs ──────────────────────────────────────────────────────
const getSupplierConfigs = (): SupplierConfig[] => [
  {
    name: 'ubipharm',
    baseUrl: 'https://client-benin.ubipharm.com',
    loginUrl: 'https://client-benin.ubipharm.com/Identification',
    searchUrl: 'https://client-benin.ubipharm.com/RechercheProduits',
    username: process.env.UBIPHARM_USERNAME || '',
    password: process.env.UBIPHARM_PASSWORD || '',
    selectors: {
      usernameInput: 'input[name="Login"]',
      passwordInput: 'input[name="Password"]',
      loginButton: 'button[type="submit"]',
      // ✅ Sélecteurs Ubipharm (même structure que Laborex)
      productCard: 'div.product-row, tr.odd, tr.even',
      productName: '.product-row-name, .popup-produit',
      productPrice: '.product-row-price strong, .cell-pspven',
      addToCartButton: 'button[addtocard-item-button], .btn-add-cart',
      ajaxReadyIndicator: 'div.product-row, tbody tr.odd, tbody tr.even',
    }
  },
  {
    name: 'laborex',
    baseUrl: 'https://www.laborex-benin.com',
    loginUrl: 'https://www.laborex-benin.com/fr/login',
    searchUrl: 'https://www.laborex-benin.com/fr/search',
    username: process.env.LABOREX_USERNAME || '',
    password: process.env.LABOREX_PASSWORD || '',
    selectors: {
      usernameInput: 'input[name="ShopLoginForm_Login"]',
      passwordInput: 'input[name="ShopLoginForm_Password"]',
      loginButton: 'button[name="login"]',
      // ✅ Sélecteurs issus du vrai HTML Laborex
      productCard: 'div.product-row',
      productName: '.product-row-name',
      productPrice: '.product-row-price strong',
      // Disponibilité = bouton panier sans attribut "disabled"
      addToCartButton: 'button[addtocard-item-button]',
      ajaxReadyIndicator: 'div.product-row',
    }
  }
];

// ─── Attente AJAX robuste ─────────────────────────────────────────────────────
async function waitForAjaxContent(page: Page, indicator: string): Promise<boolean> {
  // Stratégie 1 : sélecteur direct
  try {
    await page.waitForSelector(indicator, { timeout: 8000, state: 'attached' });
    return true;
  } catch {}

  // Stratégie 2 : polling toutes les 500ms
  try {
    await page.waitForFunction(
      (sel: string) => document.querySelectorAll(sel).length > 0,
      indicator,
      { timeout: 6000, polling: 500 }
    );
    return true;
  } catch {}

  // Stratégie 3 : networkidle en dernier recours
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    return true;
  } catch {}

  return false;
}

// ─── Fermeture popup ──────────────────────────────────────────────────────────
async function dismissPopup(page: Page): Promise<void> {
  for (const sel of ['.modal-close', '.popup-close', '[data-dismiss="modal"]', 'button.close', '.modal .btn-close']) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) {
        await el.click();
        await page.waitForTimeout(300);
        return;
      }
    } catch {}
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

// ─── BrowserManager ───────────────────────────────────────────────────────────
class BrowserManager {
  private browser: Browser | null = null;
  private contexts: Map<string, BrowserContext> = new Map();
  private lastUsed: Map<string, number> = new Map();
  private readonly TTL = 30 * 60 * 1000;

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
               '--disable-gpu', '--disable-web-security']
      });
    }
    return this.browser;
  }

  async getContext(supplier: string): Promise<BrowserContext> {
    const now = Date.now();
    const existing = this.contexts.get(supplier);
    if (existing && (now - (this.lastUsed.get(supplier) || 0)) < this.TTL) {
      this.lastUsed.set(supplier, now);
      return existing;
    }
    if (existing) await existing.close();

    const ctx = await (await this.getBrowser()).newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'fr-FR'
    });
    this.contexts.set(supplier, ctx);
    this.lastUsed.set(supplier, now);
    return ctx;
  }
}

const browserManager = new BrowserManager();

// ─── Login (avec retry automatique) ──────────────────────────────────────────
async function login(page: Page, config: SupplierConfig): Promise<boolean> {
  const attempt = async (): Promise<boolean> => {
    try {
      await page.goto(config.loginUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await dismissPopup(page);

      // Déjà connecté ?
      const field = await page.$(config.selectors.usernameInput).catch(() => null);
      if (!field) {
        console.log(`[Login] ${config.name} already logged in`);
        return true;
      }

      await page.waitForSelector(config.selectors.usernameInput, { state: 'visible', timeout: 10000 });
      await page.fill(config.selectors.usernameInput, config.username);
      await page.fill(config.selectors.passwordInput, config.password);
      await page.click(config.selectors.loginButton);

      await Promise.race([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 6000 }),
        page.waitForTimeout(6000)
      ]).catch(() => {});

      const url = page.url();
      const ok = !url.includes('login') && !url.includes('connexion') && !url.includes('Identification');
      console.log(`[Login] ${config.name} → ${ok ? '✅' : '❌'} (${url})`);
      return ok;
    } catch (err) {
      console.error(`[Login] ${config.name} error:`, err instanceof Error ? err.message : err);
      return false;
    }
  };

  // Premier essai
  const first = await attempt();
  if (first) return true;

  // Retry automatique après 500ms (gère ERR_NETWORK_CHANGED)
  console.log(`[Login] Retrying ${config.name} in 500ms...`);
  await page.waitForTimeout(500);
  return attempt();
}

// ─── Extraction d'un produit ──────────────────────────────────────────────────
async function extractProduct(
  card: any,
  config: SupplierConfig,
  fallbackName: string
): Promise<Omit<MedicationResult, 'success' | 'supplier' | 'timestamp' | 'searchStrategy' | 'error'>> {
  if (!card) throw new Error('No card element');

  try {
    const sku = await card.getAttribute('data-product-row-sku').catch(() => null);

    // Nom
    const nameEl = await card.$(config.selectors.productName).catch(() => null);
    const medicationName = nameEl
      ? (await nameEl.textContent() || fallbackName).trim()
      : fallbackName;

    // Prix
    let price: number | null = null;
    let currency: string | null = null;
    const priceEl = await card.$(config.selectors.productPrice).catch(() => null);
    if (priceEl) {
      const raw = (await priceEl.textContent() || '').trim();
      const match = raw.match(/[\d\s]+/);
      if (match) price = parseInt(match[0].replace(/\s/g, ''), 10) || null;
      currency = (raw.includes('CFA') || raw.includes('XOF')) ? 'FCFA' : raw.includes('€') ? 'EUR' : null;
    }

    // Disponibilité
    let available = false;
    const cartBtn = await card.$(config.selectors.addToCartButton).catch(() => null);
    if (cartBtn) {
      available = (await cartBtn.getAttribute('disabled')) === null;
    } else {
      const text = (await card.textContent() || '').toLowerCase();
      available = text.includes('en stock') || text.includes('disponible') || text.includes('available');
    }

    // Date de péremption
    const allText = await card.textContent() || '';
    const expiryMatch = allText.match(/p[eé]remption\s*:\s*([\d/]+)/i);
    const expiryDate = expiryMatch ? expiryMatch[1] : null;

    // URL
    let productUrl: string | null = null;
    const link = await card.$('a').catch(() => null);
    if (link) {
      const href = await link.getAttribute('href');
      if (href) productUrl = href.startsWith('http') ? href : config.baseUrl + href;
    }

    return { medicationName, available, price, currency, expiryDate, productUrl, sku };
  } catch (err) {
    console.error(`[Extract] Error: ${err}`);
    // Return fallback on error
    return { medicationName: fallbackName, available: false, price: null, currency: null, expiryDate: null, productUrl: null, sku: null };
  }
}

// ─── Recherche Laborex (POST via form submission) ─────────────────────────
async function searchLaborex(page: Page, config: SupplierConfig, medicationName: string): Promise<MedicationResult[]> {
  const timestamp = new Date().toISOString();

  console.log(`[Laborex] POST search for "${medicationName}"`);

  // First navigate to the search page
  await page.goto(config.baseUrl + '/fr/search', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await dismissPopup(page);

  // Submit POST form via JavaScript
  await page.evaluate(
    ({ baseUrl, medicationName }: { baseUrl: string; medicationName: string }) => {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = baseUrl + '/fr/search';
      
      const fields: Record<string, string> = {
        search: medicationName,
        SearchTerm: medicationName
      };
      
      for (const [name, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      
      document.body.appendChild(form);
      form.submit();
    },
    { baseUrl: config.baseUrl, medicationName }
  );

  // Wait for navigation after form submission
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
  await dismissPopup(page);

  const loaded = await waitForAjaxContent(page, config.selectors.ajaxReadyIndicator);
  console.log(`[Laborex] AJAX loaded: ${loaded} | URL: ${page.url()}`);

  const cards = await page.$$(config.selectors.productCard) as any[];
  console.log(`[Laborex] ${cards.length} products found`);

  if (cards.length === 0) {
    // Debug: check page content
    const html = await page.content();
    console.log(`[Laborex] HTML length: ${html.length} | has product-row: ${html.includes('product-row')}`);
    // Log first 500 chars of HTML
    console.log(`[Laborex] HTML preview: ${html.substring(0, 500)}`);
    return [{ success: true, medicationName, supplier: 'laborex', available: false, price: null, currency: null, expiryDate: null, productUrl: null, sku: null, error: 'No products found', timestamp }];
  }

  // Extract ALL products
  const results: MedicationResult[] = [];
  for (const card of cards) {
    try {
      const data = await extractProduct(card, config, medicationName);
      results.push({ success: true, supplier: 'laborex', timestamp, ...data });
    } catch (err) {
      console.error(`[Laborex] Error extracting product:`, err);
    }
  }

  console.log(`[Laborex] ✅ Extracted ${results.length} products`);
  return results;
}

// ─── Recherche Ubipharm (POST avec cascade DCI → NOM → CODE) ─────────────────
async function postUbipharm(page: Page, config: SupplierConfig, typeRecherche: string, medicationName: string): Promise<number> {
  await page.goto(config.searchUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await dismissPopup(page);

  await page.evaluate(
    ({ url, type, name }: { url: string; type: string; name: string }) => {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;
      for (const [k, v] of Object.entries({ typeRecherche: type, filtreRecherche: 'C', motifRecherche: name })) {
        const i = document.createElement('input');
        i.type = 'hidden'; i.name = k; i.value = v;
        form.appendChild(i);
      }
      document.body.appendChild(form);
      form.submit();
    },
    { url: config.searchUrl, type: typeRecherche, name: medicationName }
  );

  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
  await dismissPopup(page);

  try {
    await page.waitForSelector(config.selectors.ajaxReadyIndicator, { timeout: 6000 });
  } catch {}

  const cards = await page.$$(config.selectors.productCard) as any[];
  if (cards.length === 0) return 0;

  // Vérifier que ce ne sont pas des lignes "Aucun élément"
  const firstText = (await cards[0].textContent() || '').toLowerCase();
  if (firstText.includes('aucun') || firstText.includes('no result')) return 0;

  return cards.length;
}

async function searchUbipharm(page: Page, config: SupplierConfig, medicationName: string): Promise<MedicationResult[]> {
  const timestamp = new Date().toISOString();

  // ✅ Cascade : DCI (molécule) → NOM (commercial) → CODE (CIP/EAN)
  const strategies = [
    { type: 'DCI',  label: 'molécule (DCI)' },
    { type: 'NOM',  label: 'nom commercial' },
    { type: 'CODE', label: 'code CIP/EAN' },
  ];

  for (const s of strategies) {
    console.log(`[Ubipharm] Trying ${s.label} for "${medicationName}"...`);
    const count = await postUbipharm(page, config, s.type, medicationName);

    if (count > 0) {
      console.log(`[Ubipharm] ✅ ${count} results via ${s.label}`);
      const cards = await page.$$(config.selectors.productCard) as any[];
      
      // Extract ALL products
      const results: MedicationResult[] = [];
      for (const card of cards) {
        try {
          const data = await extractProduct(card, config, medicationName);
          results.push({ success: true, supplier: 'ubipharm', timestamp, searchStrategy: s.label, ...data });
        } catch (err) {
          console.error(`[Ubipharm] Error extracting product:`, err);
        }
      }
      
      console.log(`[Ubipharm] ✅ Extracted ${results.length} products`);
      return results;
    }

    console.log(`[Ubipharm] 0 results via ${s.label}`);
  }

  console.log(`[Ubipharm] No results for "${medicationName}" with any strategy`);
  return [{ success: true, medicationName, supplier: 'ubipharm', available: false, price: null, currency: null, expiryDate: null, productUrl: null, sku: null, error: 'No results with DCI, NOM or CODE', timestamp }];
}

// ─── Handler principal ────────────────────────────────────────────────────────
async function handleSearch(medicationName: string): Promise<MedicationResult[]> {
  const configs = getSupplierConfigs().filter(c => c.username && c.password);
  
  // Sequential search: try each supplier one at a time
  // Stop and return results as soon as one supplier returns products
  const allResults: MedicationResult[] = [];
  
  for (const config of configs) {
    try {
      const context = await browserManager.getContext(config.name);
      const page = await context.newPage();

      try {
        const loggedIn = await login(page, config);
        if (!loggedIn) {
          allResults.push({ success: false, medicationName, supplier: config.name, available: false, price: null, currency: null, expiryDate: null, productUrl: null, sku: null, error: 'Login failed', timestamp: new Date().toISOString() });
          continue;
        }

        const results = config.name === 'laborex'
          ? await searchLaborex(page, config, medicationName)
          : await searchUbipharm(page, config, medicationName);

        // Log summary
        const availableCount = results.filter(r => r.available).length;
        console.log(`[Search] ${config.name} → ${results.length} products, ${availableCount} available`);
        
        // Add results to our collection
        allResults.push(...results);
        
        // If we found products (even unavailable ones), stop here and return
        // This reduces search time by not waiting for the next supplier
        if (results.length > 0 && !results[0].error?.includes('No products found')) {
          console.log(`[Search] ✅ Found ${results.length} results from ${config.name}, stopping search`);
          break;
        }
        
        console.log(`[Search] No results from ${config.name}, trying next supplier...`);
      } finally {
        await page.close();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[Search] Error on ${config.name}:`, msg);
      allResults.push({ success: false, medicationName, supplier: config.name, available: false, price: null, currency: null, expiryDate: null, productUrl: null, sku: null, error: msg, timestamp: new Date().toISOString() });
    }
  }
  
  // Sort: available products first
  const sortedResults = allResults.sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0));

  return sortedResults;
}

// ─── Serveur HTTP ─────────────────────────────────────────────────────────────
Bun.serve({
  port: PORT,
  fetch(request) {
    return (async () => {
      const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

      const url = new URL(request.url);

      if (url.pathname === '/health') {
        return Response.json({ status: 'ok', timestamp: new Date().toISOString() }, { headers: cors });
      }

      if (url.pathname === '/api/search' && request.method === 'POST') {
        try {
          const { medicationName } = await request.json();
          if (!medicationName?.trim()) {
            return Response.json({ error: 'medicationName is required' }, { status: 400, headers: cors });
          }
          console.log(`\n[API] 🔍 "${medicationName}"`);
          const results = await handleSearch(medicationName.trim());
          return Response.json({ success: true, query: medicationName, results, timestamp: new Date().toISOString() }, { headers: cors });
        } catch (err) {
          console.error('[API] Error:', err);
          return Response.json({ error: 'Internal server error' }, { status: 500, headers: cors });
        }
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: cors });
    })();
  }
});

console.log(`🚀 Playwright service running on port ${PORT}`);