# MediRoute — Real-Time Emergency Vehicle Coordination

> When an ambulance isn't available, MediRoute transforms any private vehicle into a visible emergency transport — alerting nearby drivers in real time within a 1 km radius with live Kerala road network routing.

## Quick Start

```bash
# 1. Install all dependencies
npm install

# 2. Start both client and server concurrently
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

## Kerala Road Priority Corridors

MediRoute features real road routing along key Kerala emergency transit corridors originating from the **Thodupuzha Emergency Hub**:

| Priority Corridor | Destination Facility | Distance | Est. Duration | Highway |
|-------------------|----------------------|----------|---------------|---------|
| **Thodupuzha → Ernakulam (Kochi)** | General Hospital / Aster Medcity | ~58.7 km | ~61 mins | SH 8 / SH 41 via Muvattupuzha & Thrippunithura |
| **Thodupuzha → Kottayam** | Govt Medical College Kottayam | ~53.9 km | ~53 mins | SH 8 / MC Road via Pala & Ettumanoor |
| **Thodupuzha → Muvattupuzha** | General Hospital Muvattupuzha | ~20.3 km | ~21 mins | SH 8 (Thodupuzha - Muvattupuzha Hwy) |
| **Thodupuzha → Perumbavoor** | Taluk Hospital Perumbavoor | ~40.2 km | ~41 mins | SH 8 / AM Road |
| **Thodupuzha → Pala** | Mar Sleeva Medicity / Gen Hospital | ~26.1 km | ~29 mins | SH 8 / Pala Main Road |
| **Thodupuzha → Idukki (Painavu)** | Govt Medical College Idukki | ~57.4 km | ~57 mins | SH 33 / Hill Highway |

*Road geometry, distances, and durations are fetched live from OpenStreetMap road network via public OSRM. Responses are cached to prevent redundant requests during vehicle movement.*

## Screens

| Route       | Description |
|-------------|-------------|
| `/`         | Landing page with branding & Kerala mobility network status |
| `/command`  | Emergency Command Centre — Leaflet map with Kerala road routing, hospital pins & emergency controls |
| `/driver`   | Driver Dashboard — high-visibility emergency alert with distance & compass bearing |
| `/monitor`  | Network Monitor — simulation controls & 1 km geofence diagnostic bench |

## Two-Laptop Demo Setup

### Laptop 1 (Server + Command Centre)

```bash
npm run dev
```

Find your LAN IP:
```bash
# Windows
ipconfig
# macOS/Linux
ifconfig | grep "inet "
```

### Laptop 2 (Driver Dashboard)

Configure the Socket.IO URL to point to Laptop 1's LAN IP:
```env
# client/.env
VITE_SERVER_URL=http://<LAPTOP-1-IP>:3001
```

Then open `http://<LAPTOP-1-IP>:5173/driver` directly from Laptop 2's browser or run `npm run dev:client` locally on Laptop 2 with the configured `VITE_SERVER_URL`.

> **Windows Firewall Note**: Allow Node.js through the firewall on Laptop 1 if connections are blocked over Wi-Fi.

## Deterministic Simulation (300m, 800m, 1300m)

1. Open `/monitor` in a browser.
2. Click **Start Demo Simulation** — spawns 4 test vehicles around Thodupuzha Hub:
   - **Ambulance 🚑**: Hub origin (9.8959°N, 76.7184°E)
   - **Vehicle A**: ~306m away (**Eligible** — receives alert)
   - **Vehicle B**: ~808m away (**Eligible** — receives alert)
   - **Vehicle C**: ~1310m away (**Out of range** — receives no alert)
3. Click **Trigger Emergency**:
   - Vehicle A & B receive targeted `alert:incoming` events.
   - Vehicle C receives nothing.
4. Click arrow controls on Vehicle B to move it further away (> 1 km):
   - Server automatically issues `alert:expired` with reason `out_of_range`.
5. Click arrow controls on Vehicle C to move it closer (< 1 km):
   - Server automatically issues `alert:incoming` to Vehicle C.
6. Click **Complete** or **Cancel** to terminate session and clear all driver alerts.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Leaflet & React-Leaflet, Lucide Icons, Socket.IO Client
- **Routing**: OpenStreetMap road network via OSRM driving API with client-side caching
- **Backend**: Node.js, Express, Socket.IO, TypeScript, Server-authoritative Haversine 1000m geofence
- **Design**: Midnight Petrol automotive theme
