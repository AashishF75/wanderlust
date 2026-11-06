# Database Seeding Execution Report

**Execution Date:** 2026-11-06  
**Target Database:** `mongodb://127.0.0.1:27017/wunderlust`  
**Execution Script:** [`scripts/seedDatabase.js`](file:///C:/alone_project/scripts/seedDatabase.js)  
**Safety Protocol:** Idempotent, zero-deletion, non-destructive  

---

## 1. Initial State Before Seeding

Prior to execution, the local MongoDB database had zero application data:
- `listings`: 0 records
- `users`: 0 records
- `reviews`: 0 records
- `sessions`: 7 records (preserved active session storage)

---

## 2. Default Demo User Creation

Because zero users existed, the seeder created the initial verified host account using the official `passport-local-mongoose` registration mechanism:

- **Username:** `demo`
- **Email:** `demo@wanderlust.local`
- **Password:** `Demo@12345`
- **Database `_id`:** `6aeccaa8a6f778d3637a109c`
- **Authentication Hash:** PBKDF2 with salt derivation
- **Account Verification:** Successfully tested login via `POST /login` with HTTP 302 and session cookie issuance.

---

## 3. Sample Listings Inserted (18 Properties)

All 18 listings were generated with valid high-resolution Unsplash travel imagery, realistic Indian Rupee prices, narrative descriptions, category tags, and GeoJSON `[longitude, latitude]` coordinates:

| # | Title | Location | Country | Price (INR) | Category | Coordinates `[lng, lat]` |
|---|---|---|---|---|---|---|
| 1 | Candolim Beachfront Luxury Villa | Candolim, Goa | India | ₹6,500 | Trending | `[73.7667, 15.5167]` |
| 2 | Royal Heritage Courtyard Suite | Banjara Hills, Hyderabad | India | ₹4,200 | City | `[78.4482, 17.4156]` |
| 3 | Pine Wood Alpine Chalet | Old Manali, Himachal Pradesh | India | ₹3,800 | Mountain | `[77.1887, 32.2396]` |
| 4 | Pink City Traditional Haveli | Pink City, Jaipur | India | ₹5,200 | Cottage | `[75.8200, 26.9200]` |
| 5 | Serene Backwater Coconut Grove Cottage | Alleppey, Kerala | India | ₹4,800 | Farms | `[76.3388, 9.4981]` |
| 6 | Marine Drive Sea-Facing Designer Penthouse | Marine Drive, Mumbai | India | ₹9,500 | City | `[72.8258, 18.9438]` |
| 7 | Tropical Bamboo Villa with Private Pool | Ubud, Bali | Indonesia | ₹7,200 | Pool | `[115.2625, -8.5069]` |
| 8 | Downtown Burj Skyline Luxury Residence | Downtown, Dubai | United Arab Emirates | ₹14,500 | City | `[55.2708, 25.2048]` |
| 9 | Charming Montmartre Artist Studio | Montmartre, Paris | France | ₹11,000 | Room | `[2.3376, 48.8867]` |
| 10 | Alpine Matterhorn View Ski Chalet | Zermatt | Switzerland | ₹16,000 | Mountain | `[7.7491, 45.9765]` |
| 11 | Overwater Turquoise Lagoon Villa | North Male Atoll | Maldives | ₹22,000 | Sailboats | `[73.5093, 4.1755]` |
| 12 | Historic Machiya Townhouse with Zen Garden | Kyoto | Japan | ₹8,500 | Trending | `[135.7681, 35.0116]` |
| 13 | Cliffside Sunset Caldera Cave Suite | Oia, Santorini | Greece | ₹13,500 | Trending | `[25.3753, 36.4618]` |
| 14 | SoHo Cast-Iron Industrial Designer Loft | SoHo, New York City | United States | ₹12,500 | City | `[-74.0060, 40.7128]` |
| 15 | Lake Tahoe Mountainfront Timber Lodge | Lake Tahoe, California | United States | ₹6,800 | Camping | `[-120.0324, 39.0968]` |
| 16 | Lemon Grove Cliffside Amalfi Hideaway | Amalfi Coast | Italy | ₹15,000 | Cottage | `[14.6027, 40.6340]` |
| 17 | Canadian Rockies Glacier Chalet | Banff, Alberta | Canada | ₹8,900 | Mountain | `[-115.5708, 51.1784]` |
| 18 | Aurora Glass Dome Eco-Cabin | Reykjavik Countryside | Iceland | ₹10,500 | Arctic | `[-21.9426, 64.1466]` |

---

## 4. Idempotency Verification Results

When `scripts/seedDatabase.js` was executed a second time:
- Existing user `demo` was detected and preserved without modification.
- Duplicate detection identified all 18 existing records.
- Newly inserted records: **0**
- Duplicates skipped: **18**
- Failed records: **0**
- Data corruption: **None**

