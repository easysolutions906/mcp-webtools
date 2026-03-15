#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import * as email from './tools/email.js';
import * as ip from './tools/ip.js';
import * as url from './tools/url.js';
import * as sentiment from './tools/sentiment.js';
import * as qr from './tools/qr.js';
import * as random from './tools/random.js';
import { authMiddleware, createKey, revokeKey, PLANS } from './keys.js';
import { createCheckoutSession, handleWebhook } from './stripe.js';

const server = new McpServer({
  name: 'mcp-webtools',
  version: '1.0.0',
});

// --- Email Validation ---

server.tool(
  'email_validate',
  'Validate an email address. Checks syntax, domain existence, MX records, disposable/temporary domain detection, and free provider detection. Returns a validity score (0-100) and detailed check results.',
  { email: z.string().describe('Email address to validate (e.g., "user@example.com")') },
  async ({ email: addr }) => ({
    content: [{ type: 'text', text: JSON.stringify(await email.validate(addr), null, 2) }],
  }),
);

// --- IP Geolocation ---

server.tool(
  'ip_lookup',
  'Geolocate an IP address. Returns country, region, city, coordinates, timezone, ISP, and organization. Supports both IPv4 and IPv6 addresses.',
  { ip: z.string().describe('IP address to look up (e.g., "8.8.8.8" or "2001:4860:4860::8888")') },
  async ({ ip: addr }) => ({
    content: [{ type: 'text', text: JSON.stringify(await ip.lookup(addr), null, 2) }],
  }),
);

server.tool(
  'ip_lookup_self',
  'Geolocate the caller\'s own public IP address. Returns country, region, city, coordinates, timezone, ISP, and organization for the machine running this MCP server.',
  {},
  async () => ({
    content: [{ type: 'text', text: JSON.stringify(await ip.lookupSelf(), null, 2) }],
  }),
);

// --- URL Scraping ---

server.tool(
  'url_scrape',
  'Scrape metadata from a URL. Returns title, description, Open Graph tags, Twitter cards, favicons, detected technologies (React, WordPress, etc.), H1 headings, link counts, and server info.',
  { url: z.string().describe('URL to scrape (e.g., "https://example.com"). HTTPS is prepended if no scheme is provided.') },
  async ({ url: target }) => ({
    content: [{ type: 'text', text: JSON.stringify(await url.scrape(target), null, 2) }],
  }),
);

// --- Sentiment Analysis ---

server.tool(
  'sentiment_analyze',
  'Analyze the sentiment of text. Returns sentiment classification (positive/negative/neutral), normalized score (-1 to 1), magnitude, and lists of positive/negative words found. Supports up to 10,000 characters.',
  { text: z.string().describe('Text to analyze for sentiment (e.g., a product review, tweet, or paragraph)') },
  async ({ text: input }) => ({
    content: [{ type: 'text', text: JSON.stringify(sentiment.analyze(input), null, 2) }],
  }),
);

// --- QR Code Generation ---

server.tool(
  'qr_generate_base64',
  'Generate a QR code as a base64-encoded PNG data URL. Useful for embedding QR codes in HTML or markdown. Supports custom size and colors.',
  {
    data: z.string().describe('Text or URL to encode in the QR code (max 2000 characters)'),
    size: z.number().optional().describe('Image width in pixels (default 300, max 1000)'),
    color: z.string().optional().describe('Foreground hex color without # (default "000000")'),
    bg: z.string().optional().describe('Background hex color without # (default "ffffff")'),
  },
  async ({ data, size, color, bg }) => ({
    content: [{ type: 'text', text: JSON.stringify(await qr.generateBase64(data, size, color, bg), null, 2) }],
  }),
);

// --- Random Data Generation ---

server.tool(
  'random_person',
  'Generate random person(s) with realistic fake data: name, email, phone, birthday, gender, and US address with coordinates.',
  { count: z.number().optional().describe('Number of persons to generate (default 1, max 100)') },
  async ({ count }) => ({
    content: [{ type: 'text', text: JSON.stringify(random.person(count), null, 2) }],
  }),
);

server.tool(
  'random_company',
  'Generate random company(ies) with realistic fake data: name, industry, phone, website, founding year, employee count, and US address.',
  { count: z.number().optional().describe('Number of companies to generate (default 1, max 100)') },
  async ({ count }) => ({
    content: [{ type: 'text', text: JSON.stringify(random.company(count), null, 2) }],
  }),
);

server.tool(
  'random_address',
  'Generate random US address(es) with street, city, state, ZIP code, and geographic coordinates.',
  { count: z.number().optional().describe('Number of addresses to generate (default 1, max 100)') },
  async ({ count }) => ({
    content: [{ type: 'text', text: JSON.stringify(random.address(count), null, 2) }],
  }),
);

server.tool(
  'random_uuid',
  'Generate random UUID v4 string(s). Uses Node.js crypto.randomUUID() for cryptographically secure generation.',
  { count: z.number().optional().describe('Number of UUIDs to generate (default 1, max 100)') },
  async ({ count }) => ({
    content: [{ type: 'text', text: JSON.stringify(random.uuid(count), null, 2) }],
  }),
);

server.tool(
  'random_text',
  'Generate random lorem ipsum placeholder text with configurable paragraph and sentence counts.',
  {
    paragraphs: z.number().optional().describe('Number of paragraphs (default 1, max 20)'),
    sentences: z.number().optional().describe('Sentences per paragraph (default 5, max 20)'),
  },
  async ({ paragraphs, sentences }) => ({
    content: [{ type: 'text', text: JSON.stringify(random.text(paragraphs, sentences), null, 2) }],
  }),
);

// --- Start ---

const TOOL_COUNT = 11;

const main = async () => {
  const port = process.env.PORT;

  if (port) {
    const app = express();
    app.use(express.json());

    app.get('/health', (_req, res) => {
      res.json({ status: 'ok' });
    });

    app.get('/', (_req, res) => {
      res.json({
        name: 'mcp-webtools',
        version: '1.0.0',
        tools: TOOL_COUNT,
        transport: 'streamable-http',
        plans: PLANS,
      });
    });

    // --- Stripe checkout ---
    app.post('/checkout', async (req, res) => {
      try {
        const { plan, success_url, cancel_url } = req.body;
        const session = await createCheckoutSession(plan, success_url, cancel_url);
        res.json(session);
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    });

    // --- Stripe webhook (raw body needed for signature verification) ---
    app.post('/webhook/stripe', express.raw({ type: 'application/json' }), (req, res) => {
      try {
        const result = handleWebhook(req.body, req.headers['stripe-signature']);
        res.json({ received: true, result });
      } catch (err) {
        console.error('[webhook] Error:', err.message);
        res.status(400).json({ error: err.message });
      }
    });

    // --- Admin key management ---
    const adminAuth = (req, res, next) => {
      const secret = process.env.ADMIN_SECRET;
      if (!secret || req.headers['x-admin-secret'] !== secret) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      next();
    };

    app.post('/admin/keys', adminAuth, (req, res) => {
      const { plan, email: userEmail } = req.body;
      const result = createKey(plan, userEmail);
      res.json(result);
    });

    app.delete('/admin/keys/:key', adminAuth, (req, res) => {
      const revoked = revokeKey(req.params.key);
      res.json({ revoked });
    });

    const transports = {};

    app.post('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'];
      let transport = transports[sessionId];

      if (!transport) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });
        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
          }
        };
        await server.connect(transport);
        transports[transport.sessionId] = transport;
      }

      await transport.handleRequest(req, res, req.body);
    });

    app.get('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'];
      const transport = transports[sessionId];
      if (!transport) {
        res.status(400).json({ error: 'No active session. Send a POST to /mcp first.' });
        return;
      }
      await transport.handleRequest(req, res);
    });

    app.delete('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'];
      const transport = transports[sessionId];
      if (!transport) {
        res.status(400).json({ error: 'No active session.' });
        return;
      }
      await transport.handleRequest(req, res);
    });

    app.listen(parseInt(port, 10), () => {
      console.log(`MCP webtools server running on HTTP port ${port}`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
};

main().catch((err) => {
  console.error('Failed to start MCP webtools server:', err);
  process.exit(1);
});
