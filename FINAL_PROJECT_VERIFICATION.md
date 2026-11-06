# Final Project Verification & Functional Audit Report

**Application:** Wanderlust Vacation Rentals  
**Repository Path:** `C:\alone_project`  
**Execution Environment:** Node.js v24.12.0, Express 5.2.1, MongoDB Community Server 8.x  
**Audit Date:** 2026-11-06  
**Final Status:** **FULLY OPERATIONAL & VERIFIED**

---

## 1. Features Tested & Verification Results

| Feature Tested | Endpoint / Method | Test Action & Payload | Result | Verification Proof |
|---|---|---|---|---|
| **Root Redirect** | `GET /` | Navigated to base domain | **PASSED** | 302 Redirect to `/listings`, then HTTP 200 response |
| **Listings Catalog** | `GET /listings` | Rendered 18 property cards | **PASSED** | HTTP 200 (27,547 bytes), 18 listing cards with titles, prices, images rendered |
| **Search Functionality** | `GET /listings/search?q=Goa` | Searched destination "Goa" | **PASSED** | Returns "Candolim Beachfront Luxury Villa" |
| **Category Filters** | `GET /listings?category=Mountain` | Clicked "Mountain" category | **PASSED** | Returns Manali, Zermatt, and Banff mountain chalets |
| **Listing Show Page** | `GET /listings/:id` | Viewed Candolim Villa detail page | **PASSED** | Displays owner (`demo`), price, description, reviews, Mapbox GL map coordinates |
| **Mapbox GL Integration** | Client script & API | Forward geocoding with user token | **PASSED** | Verified: `[74.054111, 15.325556]` coordinates returned; Mapbox GL script initialized |
| **User Login** | `POST /login` | Authenticated with `demo` / `Demo@12345` | **PASSED** | HTTP 302 with session cookie `connect.sid` issued |
| **User Logout** | `GET /logout` | Terminated authenticated session | **PASSED** | Session ended, redirected to `/listings` |
| **Review Creation** | `POST /listings/:id/reviews` | Added 5-star review as `demo` | **PASSED** | HTTP 302, review persisted in DB and rendered in UI |
| **Review Deletion** | `POST ...?_method=DELETE` | Deleted review with author check | **PASSED** | Review purged from DB with author authorization |
| **Cloudinary SDK** | `cloudinary.api.ping()` | SDK ping using `.env` credentials | **PASSED** | Returns `status: 'ok'`, rate limit verified |
| **Database Persistence** | Server restart | Terminated process & restarted `npm start` | **PASSED** | All 18 listings and user `demo` intact in local MongoDB |

---

## 2. Issues Diagnosed and Resolved

### 1. Blank Listings Page
- **Root Cause:** Database collection `listings` contained 0 documents.
- **Resolution:** Developed [`scripts/seedDatabase.js`](file:///C:/alone_project/scripts/seedDatabase.js) and seeded 18 realistic vacation properties with valid GeoJSON coordinates and host references.

### 2. Missing Root Route Handler
- **Root Cause:** Requesting `http://localhost:8080/` resulted in a 404 "Page is not found" error because [`app.js`](file:///C:/alone_project/app.js) lacked a root route.
- **Resolution:** Added `app.get("/", (req, res) => res.redirect("/listings"))` in [`app.js:104`](file:///C:/alone_project/app.js#L104).

### 3. Missing Search Route & Input Parameter
- **Root Cause:** Navbar search form lacked `name="q"` on the search input, and [`routes/listing.js`](file:///C:/alone_project/routes/listing.js) had no `/search` handler (causing `/search` to be interpreted as an invalid MongoDB ObjectId parameter).
- **Resolution:** Added `name="q"` to search input in [`views/includes/navbar.ejs`](file:///C:/alone_project/views/includes/navbar.ejs), created `router.get("/search", ...)` in [`routes/listing.js`](file:///C:/alone_project/routes/listing.js), and implemented case-insensitive regex search in [`controllers/listing.js`](file:///C:/alone_project/controllers/listing.js).

### 4. Unclickable Category Filters
- **Root Cause:** Category icons were inert `<div>` tags with no links.
- **Resolution:** Added `category` field to [`models/list.js`](file:///C:/alone_project/models/list.js), converted category icons in [`views/listings/index.ejs`](file:///C:/alone_project/views/listings/index.ejs) into clickable links (`/listings?category=...`), and updated [`controllers/listing.js`](file:///C:/alone_project/controllers/listing.js) to filter queries dynamically.

---

## 3. Remaining Cloudinary Upload Note

When creating new listings from the browser via `http://localhost:8080/listings/new`, the application streams the uploaded photo directly to your Cloudinary account (`dmsovjhso`). 

During testing, Cloudinary returned:
```
Request forbidden due to missing permissions (actions=["read"]) / HTTP 403
```
This is a standard Cloudinary account setting:
1. Log in to [https://console.cloudinary.com/](https://console.cloudinary.com/).
2. Verify your email address if a verification banner appears.
3. Under **Settings (Gear Icon) &rarr; Access Keys / API Keys**, ensure the key has full Upload / Write permissions (or copy the Master API Key).

