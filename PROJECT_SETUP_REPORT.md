# Project Setup & Technical Inspection Report

**Project Name:** Wanderlust (Major Project)  
**Inspected Path:** `C:\alone_project`  
**Operating System:** Windows 11  
**Runtime Environment:** Node.js v24.12.0, npm 11.6.2  
**Database:** MongoDB Community Server (Windows Service: `Running` on port 27017)  
**Inspection Date:** 2026-11-05  

---

## 1. Executive Summary

This repository is a full-stack monolithic Node.js web application modeled after Airbnb (called "Wanderlust"). It provides functionality for browsing rental property listings, creating and editing listings with image uploads, displaying interactive geospatial maps for each listing using Mapbox GL, writing reviews with star ratings, and handling user authentication (signup, login, logout, session persistence).

A complete inspection of the code, dependencies, and execution flow was conducted. The application does not build with frontend bundlers (such as Vite, Webpack, or React); instead, it utilizes server-side rendering (SSR) via Express and EJS with EJS-Mate layouts.

---

## 2. Complete Technology Stack & Architecture

### 2.1 Technology Stack Summary
- **Backend Framework:** Express.js (v5.2.1)
- **Runtime:** Node.js (tested and verified on v24.12.0)
- **Database Engine:** MongoDB (v8.x local instance or MongoDB Atlas cloud cluster)
- **ODM (Object Data Modeling):** Mongoose (v9.2.1)
- **Session Management:** `express-session` with `connect-mongo` (v4.6.0) for MongoDB-backed session persistence
- **Authentication & Security:** `passport` (v0.7.0), `passport-local` (v1.0.0), and `passport-local-mongoose` (v9.0.1) using PBKDF2 hashing
- **Frontend Template Engine:** EJS (v3.1.10) with `ejs-mate` (v4.0.0) layout engine
- **UI & Styling:** Bootstrap 5.3.8, FontAwesome 7.0.1, custom CSS, Starability rating CSS
- **Geocoding & Maps:** `@mapbox/mapbox-sdk` (v0.16.2) for backend forward geocoding; Mapbox GL JS (v2.15.0) for client-side map rendering
- **File Upload & Cloud Storage:** Multer (v2.1.1) paired with Cloudinary (v1.41.3) via `multer-storage-cloudinary` (v4.0.0)
- **Input Validation:** Joi (v18.0.2) schema validation middleware

### 2.2 Application Architecture (MVC Pattern)
The application adheres strictly to the classic Model-View-Controller (MVC) architectural design pattern:

```
c:\alone_project\
├── app.js                   # Application entry point, server configuration, middleware chain
├── cloudconfig.js           # Cloudinary SDK & Multer Cloudinary storage engine setup
├── middleware.js            # Custom route guards (auth, authorization, Joi schema validation)
├── schema.js                # Joi validation schemas (listingSchema, reviewSchema)
├── controllers/             # Business logic controllers
│   ├── listing.js           # Listing operations (geocoding, CRUD, Mapbox client)
│   ├── review.js            # Review CRUD operations
│   └── user.js              # Authentication controllers (register, login, logout)
├── models/                  # Mongoose data models
│   ├── list.js              # Listing schema (Title, image, location, GeoJSON geometry, reviews)
│   ├── reviews.js           # Review schema (Rating, comment, author, createdAt)
│   └── user.js              # User schema (Email, username, passport-local-mongoose plugin)
├── routes/                  # Express RESTful route definitions
│   ├── listing.js           # /listings endpoints
│   ├── review.js            # /listings/:id/reviews endpoints
│   └── user.js              # /signup, /login, /logout endpoints
├── views/                   # Server-side EJS templates
│   ├── err.ejs              # Error display view
│   ├── includes/            # Partials (navbar.ejs, footer.ejs, flash.ejs)
│   ├── layouts/             # Master layout (boilerplate.ejs)
│   ├── listings/            # Listing views (index.ejs, show.ejs, new.ejs, edit.ejs)
│   └── users/               # Auth views (login.ejs, signup.ejs)
├── public/                  # Static assets served at root
│   ├── css/                 # style.css, rating.css
│   └── js/                  # map.js (Mapbox GL client), script.js (Bootstrap form validation)
├── init/                    # Database seeding scripts
│   ├── data.js              # Raw sample listing data
│   └── index.js             # Seeding execution script
├── package.json             # Package configuration & scripts
└── .env.example             # Template for required environment variables
```

---

## 3. Dependency Audit Table

All 23 top-level dependencies defined in `package.json` were audited for their real-world usage in the codebase:

| Dependency | Version in package.json | Installed Version | Purpose in Codebase | Required? | Status / Notes |
|---|---|---|---|---|---|
| `@mapbox/mapbox-sdk` | `^0.16.2` | `0.16.2` | Forward geocoding in `controllers/listing.js` | **YES** | Mandatory for server initialization & geocoding |
| `cloudinary` | `^1.41.3` | `1.41.3` | Cloudinary v2 SDK in `cloudconfig.js` | **YES** | Mandatory for cloud image management |
| `connect` | `^3.7.0` | `3.7.0` | HTTP middleware engine | NO | Redundant (Express 5 includes modern middleware) |
| `connect-flash` | `^0.1.1` | `0.1.1` | Flash notification messages in `app.js` | **YES** | Mandatory for UI notifications |
| `connect-mongo` | `^4.6.0` | `4.6.0` | MongoDB session store in `app.js` | **YES** | Mandatory for session storage in MongoDB |
| `cookie-parser` | `^1.4.7` | `1.4.7` | Cookie parsing middleware | NO | Redundant / not actively invoked in `app.js` |
| `cookies-parser` | `^1.2.0` | `1.2.0` | Misspelled package duplicate | NO | Redundant package install |
| `dotenv` | `^17.3.1` | `17.3.1` | Loads `.env` file variables into `process.env` | **YES** | Mandatory for loading secrets & DB credentials |
| `ejs` | `^3.1.10` | `3.1.10` | View template rendering engine | **YES** | Mandatory for server-side HTML rendering |
| `ejs-mate` | `^4.0.0` | `4.0.0` | Layout, partial, and block support for EJS | **YES** | Mandatory for `views/layouts/boilerplate.ejs` |
| `env` | `^0.0.2` | `0.0.2` | Placeholder package | NO | Redundant package install |
| `express` | `^5.2.1` | `5.2.1` | Core HTTP web framework | **YES** | Mandatory |
| `express-session` | `^1.19.0` | `1.19.0` | Session management middleware | **YES** | Mandatory for user authentication sessions |
| `flash` | `^1.1.0` | `1.1.0` | Alternative flash library | NO | Redundant (project uses `connect-flash`) |
| `joi` | `^18.0.2` | `18.0.2` | Schema validation for listings and reviews | **YES** | Mandatory for request validation |
| `method-override` | `^3.0.0` | `3.0.0` | Supports PUT & DELETE verbs in HTML forms | **YES** | Mandatory for RESTful form submissions |
| `mongoose` | `^9.0.2` | `9.2.1` | MongoDB Object Data Modeling (ODM) | **YES** | Mandatory for database schemas and queries |
| `multer` | `^2.1.1` | `2.1.1` | Multipart form-data parser for image upload | **YES** | Mandatory for processing uploaded images |
| `multer-cloud-storage` | `^4.1.0` | `4.1.0` | Google Cloud storage engine | NO | Redundant (project uses Cloudinary, not GCP) |
| `multer-storage-cloudinary` | `^4.0.0` | `4.0.0` | Storage engine for Multer & Cloudinary | **YES** | Mandatory for uploading listing images |
| `passport` | `^0.7.0` | `0.7.0` | Authentication framework | **YES** | Mandatory for user login/session |
| `passport-local` | `^1.0.0` | `1.0.0` | Username/password local strategy | **YES** | Mandatory for local user authentication |
| `passport-local-mongoose` | `^9.0.1` | `9.0.1` | Mongoose plugin for passport-local | **YES** | Mandatory in `models/user.js` |

---

## 4. Required System Software & External Services

### 4.1 System Software
1. **Node.js (v24.12.0 installed, minimum v18+ required):**
   - Verified present on your Windows 11 machine.
2. **MongoDB Community Server (v8.x installed and running):**
   - Verified running as a Windows Service (`MongoDB`) on port `27017`.
   - Accessible via URI `mongodb://127.0.0.1:27017/wunderlust`.
3. **MongoDB Shell (`mongosh` v2.x installed):**
   - Verified present in npm global path (`C:\Users\spaas\AppData\Roaming\npm\mongosh.ps1`).

### 4.2 External Services

1. **Mapbox (Required for Server Startup & Maps):**
   - **Service:** Mapbox Geocoding & Mapbox GL JS.
   - **Why used:** Converts human-readable listing locations (e.g., "Nellore", "Malibu") into geographic coordinates (`[longitude, latitude]`) during listing creation, and renders an interactive map on the listing detail page (`/listings/:id`).
   - **Account/Tier:** Free account (50,000 map loads & 100,000 geocoding requests/month).
   - **Dashboard:** [https://account.mapbox.com/](https://account.mapbox.com/)
   - **Required Token:** Public Access Token starting with `pk.ey...`.

2. **Cloudinary (Required for Image Uploads):**
   - **Service:** Cloudinary Media Management.
   - **Why used:** Stores listing images uploaded by users in the cloud and provides transformed image URLs.
   - **Account/Tier:** Free tier (25 monthly credits / ~25,000 transformations or 25 GB storage).
   - **Dashboard:** [https://console.cloudinary.com/](https://console.cloudinary.com/)
   - **Required Credentials:** `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET`.

3. **Email & Twilio Services:**
   - **Inspection result:** No email services (Nodemailer, SendGrid) or Twilio SMS services are implemented in this repository. No credentials needed.

