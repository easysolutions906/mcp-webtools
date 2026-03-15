import { load } from 'cheerio';

const TECH_SIGNATURES = Object.freeze({
  'WordPress': ['wp-content', 'wp-includes', 'wordpress'],
  'React': ['react', 'reactDOM', '__NEXT_DATA__', '_next/'],
  'Next.js': ['__NEXT_DATA__', '_next/static', '_next/image'],
  'Vue.js': ['vue', '__vue__', 'nuxt', '_nuxt/'],
  'Nuxt': ['_nuxt/', '__NUXT__'],
  'Angular': ['ng-version', 'ng-app', 'angular'],
  'Svelte': ['__svelte'],
  'Gatsby': ['gatsby', '___gatsby'],
  'Shopify': ['shopify', 'cdn.shopify.com'],
  'Squarespace': ['squarespace'],
  'Wix': ['wix.com', 'parastorage.com'],
  'Webflow': ['webflow'],
  'Bootstrap': ['bootstrap'],
  'Tailwind CSS': ['tailwindcss', 'tailwind'],
  'jQuery': ['jquery'],
  'Google Analytics': ['google-analytics.com', 'gtag', 'googletagmanager'],
  'Google Tag Manager': ['googletagmanager.com'],
  'Cloudflare': ['cloudflare', 'cf-ray'],
  'Vercel': ['vercel', 'v0.dev'],
  'Netlify': ['netlify'],
  'Stripe': ['stripe.com', 'js.stripe.com'],
  'Intercom': ['intercom', 'intercomcdn'],
  'HubSpot': ['hubspot', 'hs-scripts'],
  'Segment': ['segment.com', 'analytics.js'],
  'Hotjar': ['hotjar'],
  'Laravel': ['laravel'],
  'Django': ['csrfmiddlewaretoken', 'django'],
  'Rails': ['csrf-token', 'turbolinks'],
});

const FETCH_TIMEOUT_MS = 10000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const MAX_HEADINGS = 5;
const ALLOWED_SCHEMES = /^https?:\/\//i;
const BLOCKED_SCHEMES = /^(javascript|data|file|ftp):/i;
const MAX_URL_LENGTH = 2000;

const validateUrl = (url) => {
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required');
  }
  if (url.length > MAX_URL_LENGTH) {
    throw new Error(`URL must be ${MAX_URL_LENGTH} characters or fewer`);
  }
  if (BLOCKED_SCHEMES.test(url)) {
    throw new Error('Invalid URL scheme');
  }
  const normalized = ALLOWED_SCHEMES.test(url) ? url : `https://${url}`;
  try {
    new URL(normalized);
  } catch {
    throw new Error('Invalid URL format');
  }
  return normalized;
};

const fetchPage = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MetadataBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new Error('Response too large');
    }

    const html = await response.text();
    if (html.length > MAX_RESPONSE_BYTES) {
      throw new Error('Response too large');
    }

    return { html, status: response.status, finalUrl: response.url, headers: response.headers };
  } finally {
    clearTimeout(timeout);
  }
};

const extractMeta = ($, name) => {
  const selectors = [
    `meta[name="${name}"]`,
    `meta[property="${name}"]`,
    `meta[name="${name}" i]`,
    `meta[property="${name}" i]`,
  ];

  const match = selectors.reduce((found, sel) => found || $(sel).attr('content'), null);
  return match ? match.trim() : null;
};

const extractMetadata = (html, finalUrl) => {
  const $ = load(html);

  const title = $('title').first().text().trim() || null;
  const description = extractMeta($, 'description');
  const canonical = $('link[rel="canonical"]').attr('href') || null;
  const language = $('html').attr('lang') || extractMeta($, 'language') || null;
  const author = extractMeta($, 'author');
  const keywords = extractMeta($, 'keywords');

  const og = {
    title: extractMeta($, 'og:title'),
    description: extractMeta($, 'og:description'),
    image: extractMeta($, 'og:image'),
    url: extractMeta($, 'og:url'),
    type: extractMeta($, 'og:type'),
    site_name: extractMeta($, 'og:site_name'),
    locale: extractMeta($, 'og:locale'),
  };

  const twitter = {
    card: extractMeta($, 'twitter:card'),
    title: extractMeta($, 'twitter:title'),
    description: extractMeta($, 'twitter:description'),
    image: extractMeta($, 'twitter:image'),
    site: extractMeta($, 'twitter:site'),
    creator: extractMeta($, 'twitter:creator'),
  };

  const favicons = $('link[rel*="icon"]')
    .toArray()
    .map((el) => $(el).attr('href'))
    .filter(Boolean)
    .map((href) => ({
      href: href.startsWith('http') ? href : new URL(href, finalUrl).href,
      type: null,
      sizes: null,
    }));

  if (favicons.length === 0) {
    const baseUrl = new URL(finalUrl);
    favicons.push({ href: `${baseUrl.origin}/favicon.ico`, type: null, sizes: null });
  }

  return { title, description, canonical, language, author, keywords, og, twitter, favicons };
};

const detectTech = (html) => {
  const htmlLower = html.toLowerCase();
  return Object.entries(TECH_SIGNATURES)
    .filter(([, signatures]) => signatures.some((sig) => htmlLower.includes(sig.toLowerCase())))
    .map(([tech]) => tech);
};

const extractHeadings = ($) =>
  $('h1')
    .toArray()
    .map((el) => $(el).text().trim())
    .filter(Boolean)
    .slice(0, MAX_HEADINGS);

const extractLinks = ($, finalUrl) => {
  const baseHost = new URL(finalUrl).hostname;

  const { internal, external } = $('a[href]')
    .toArray()
    .map((el) => $(el).attr('href'))
    .filter((href) => href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:'))
    .reduce((acc, href) => {
      try {
        const resolved = new URL(href, finalUrl);
        const key = resolved.hostname === baseHost ? 'internal' : 'external';
        acc[key].add(resolved.href);
      } catch {
        // skip invalid URLs
      }
      return acc;
    }, { internal: new Set(), external: new Set() });

  return {
    internal: internal.size,
    external: external.size,
    total: internal.size + external.size,
  };
};

const scrape = async (url) => {
  const normalized = validateUrl(url);
  const { html, status, finalUrl, headers } = await fetchPage(normalized);
  const $ = load(html);

  const metadata = extractMetadata(html, finalUrl);
  const technologies = detectTech(html);
  const headings = extractHeadings($);
  const links = extractLinks($, finalUrl);

  return {
    url: normalized,
    finalUrl,
    status,
    ...metadata,
    headings,
    technologies,
    links,
    server: {
      software: headers.get('server') || null,
      poweredBy: headers.get('x-powered-by') || null,
      contentType: headers.get('content-type') || null,
    },
  };
};

export { scrape };
