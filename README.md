# BrowserTrail ◎

Real-time network diagnostics that trace every packet, every hop, every handshake between your machine and any website.

Enter a URL. BrowserTrail performs **real** DNS resolution, runs a traceroute, completes a TLS handshake, and fetches the page — then maps every result onto the OSI model with full timing breakdowns.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────────┐
│  React+Vite │────▶│  Express API │────▶│  Network Diagnostics │
│  (5180)     │     │  (3100)      │     │                      │
│             │◀────│              │◀────│  • DNS (dns module)  │
│  Beautiful  │     │  Proxied via │     │  • Traceroute (sys)  │
│  dark-theme │     │  vite.config │     │  • TLS handshake     │
│  dashboard  │     │              │     │  • HTTP timing       │
└─────────────┘     └──────────────┘     └──────────────────────┘
```

## Features

| Layer | What's Captured |
|-------|----------------|
| **L7 — Application** | HTTP version, status code, all response headers, body size |
| **L6 — Presentation** | TLS protocol, cipher suite, encryption details |
| **L5 — Session** | TLS handshake timing, connection reuse |
| **L4 — Transport** | TCP connect time, destination port |
| **L3 — Network** | Resolved IP, traceroute path with per-hop RTT |
| **L2 — Data Link** | First-hop router identity |
| **L1 — Physical** | Connection medium |

**Additional analysis:**
- **DNS records** — A, AAAA, CNAME, MX, NS, TXT with query latency
- **Certificate chain** — Leaf → intermediate → root with fingerprints, validity, SANs
- **Waterfall timeline** — Sequential breakdown of DNS → TCP → TLS → TTFB → Download
- **Security audit** — HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Insights engine** — Auto-generated findings (fast/slow DNS, old TLS, missing security headers)

## Quick Start

```bash
# Install all dependencies
npm install
npm install --prefix server
npm install --prefix client

# Start both server and client
npm run dev:server   # Express on :3100
npm run dev:client   # Vite on :5180 (proxies /api → :3100)
```

Open **http://localhost:5180** and enter any URL.

## API

```http
GET /api/analyze?url=example.com
```

Returns JSON with keys: `target`, `dns`, `route`, `tls`, `http`, `insights`, `osiMapping`.

## Networking Concepts Demonstrated

- **DNS resolution chain** — How domain names become IP addresses (A/AAAA/CNAME delegation)
- **Traceroute mechanics** — TTL-based path discovery showing every intermediate router
- **TCP three-way handshake** — Measured via socket connect timing (`SYN → SYN-ACK → ACK`)
- **TLS 1.2 vs 1.3** — Protocol negotiation, cipher suite selection, certificate chain validation
- **HTTP waterfall** — Why TTFB matters, how sequential stages add up to total load time
- **Security headers** — Defense-in-depth at the application layer (HSTS, CSP, XFO)
- **OSI model alignment** — Real traffic mapped to the 7-layer conceptual framework

## Tech Stack

- **Frontend:** React 18 + Vite 5, pure CSS with custom properties
- **Backend:** Express.js, Node.js built-in `dns`, `tls`, `http`/`https` modules
- **System:** macOS `traceroute` (ICMP Echo probes, 20-hop max, 2s per-hop timeout)
