# MCP Web Tools Server

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server bundling web and data tools for use with Claude Desktop, Cursor, and other MCP clients.

## Tools (11 total)

### Email Validation
| Tool | Description |
|------|-------------|
| `email_validate` | Validate an email address — syntax, MX records, disposable/free detection, scoring |

### IP Geolocation
| Tool | Description |
|------|-------------|
| `ip_lookup` | Get country, city, coordinates, timezone, ISP for any IP address |
| `ip_lookup_self` | Get geolocation for the caller's own IP |

### URL Metadata
| Tool | Description |
|------|-------------|
| `url_scrape` | Extract title, description, Open Graph tags, and images from a URL |

### Sentiment Analysis
| Tool | Description |
|------|-------------|
| `sentiment_analyze` | Analyze English text sentiment (-1 to +1 score, positive/negative words) |

### QR Code Generation
| Tool | Description |
|------|-------------|
| `qr_generate_base64` | Generate a QR code as base64 PNG with custom size and colors |

### Random Data
| Tool | Description |
|------|-------------|
| `random_person` | Generate random person(s) with name, email, phone, address |
| `random_company` | Generate random company(ies) with name, industry, address |
| `random_address` | Generate random US address(es) with coordinates |
| `random_uuid` | Generate random UUID v4(s) |
| `random_text` | Generate lorem ipsum text with configurable length |

## Install

```bash
npx @easysolutions906/mcp-webtools
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "webtools": {
      "command": "npx",
      "args": ["-y", "@easysolutions906/mcp-webtools"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "webtools": {
      "command": "npx",
      "args": ["-y", "@easysolutions906/mcp-webtools"]
    }
  }
}
```

## Transport

- **stdio** (default) — for local use with Claude Desktop and Cursor
- **HTTP** — set `PORT` env var to start in Streamable HTTP mode on `/mcp`
