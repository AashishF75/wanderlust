# Environment Configuration & Secret Setup Guide

This guide details all environment variables used by the Wanderlust application, where to obtain the necessary API credentials, and how to configure them securely on Windows 11.

---

## 1. Quick Setup

1. In your project root (`C:\alone_project`), copy the provided template to create `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Open `.env` in VS Code or your preferred text editor:
   ```powershell
   code .env
   ```
3. Enter your actual credentials in `.env` following the instructions below.
4. Verify that `.env` is listed in your `.gitignore` file (it is already included). Never commit `.env` to Git.

---

## 2. Detailed Variable Reference

### 2.1 `ATLAS_URI` (Mandatory)
- **Files referencing:** `app.js` (lines 2, 32, 40, 44)
- **Purpose:** MongoDB connection string used by Mongoose (`mongoose.connect`) and session storage (`connect-mongo`).
- **Options:**
  - **Local MongoDB (Recommended for local dev):**
    ```env
    ATLAS_URI=mongodb://127.0.0.1:27017/wunderlust
    ```
    *Note:* A local MongoDB server is already installed and running on your Windows 11 machine!
  - **MongoDB Atlas (Cloud Cluster):**
    If you prefer to use a cloud database:
    1. Sign up at [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
    2. Create a free M0 cluster.
    3. Under **Database Access**, create a user with read/write privileges.
    4. Under **Network Access**, add `0.0.0.0/0` (or your current IP address).
    5. Click **Connect** > **Drivers** > copy the connection string:
       ```env
       ATLAS_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/wunderlust?retryWrites=true&w=majority
       ```

---

### 2.2 `MAP_TOKEN` (Mandatory for Server Startup & Maps)
- **Files referencing:** `controllers/listing.js` (lines 3, 103), `app.js` (line 82)
- **Purpose:** Mapbox public access token used by `@mapbox/mapbox-sdk` to geocode listing addresses into `[longitude, latitude]` coordinates and by Mapbox GL JS on the frontend to display interactive maps.
- **Root Cause of Startup Failure:**
  In `controllers/listing.js`:
  ```javascript
  const mxbGeocoading = require('@mapbox/mapbox-sdk/services/geocoding');
  const mapToken = process.env.MAP_TOKEN;
  const geocodingClient = mxbGeocoading({ accessToken: mapToken });
  ```
  Because this code executes when `controllers/listing.js` is imported at startup, `@mapbox/mapbox-sdk` throws `Error: Cannot create a client without an access token` if `MAP_TOKEN` is missing or empty.
- **How to obtain:**
  1. Go to [https://account.mapbox.com/auth/signup/](https://account.mapbox.com/auth/signup/) and create a free account.
  2. Navigate to your Account Dashboard: [https://account.mapbox.com/](https://account.mapbox.com/).
  3. Under **Default public token**, copy the token (starts with `pk.eyJ...`).
  4. Paste into `.env`:
     ```env
     MAP_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNseHh4eHh4eTAwMDAyYnB4eHh4eHh4In0.example
     ```

---

### 2.3 Cloudinary Credentials (Mandatory for Image Uploads)
- **Files referencing:** `cloudconfig.js` (lines 5, 6, 7)
- **Variables:**
  - `CLOUD_NAME`
  - `CLOUD_API_KEY`
  - `CLOUD_API_SECRET`
- **Purpose:** Authenticates with Cloudinary to allow `multer-storage-cloudinary` to upload listing images directly into your Cloudinary media library under the `wanderlust_hasi` folder.
- **How to obtain:**
  1. Register for a free Cloudinary account at [https://cloudinary.com/users/register_free](https://cloudinary.com/users/register_free).
  2. Log in and open the **Cloudinary Console**: [https://console.cloudinary.com/](https://console.cloudinary.com/).
  3. On the **Dashboard**, locate your **Product Environment Credentials**:
     - **Cloud Name** -> copy into `CLOUD_NAME`
     - **API Key** -> copy into `CLOUD_API_KEY`
     - **API Secret** (click the eye icon to reveal) -> copy into `CLOUD_API_SECRET`
  4. Configure in `.env`:
     ```env
     CLOUD_NAME=your_actual_cloud_name
     CLOUD_API_KEY=your_actual_api_key
     CLOUD_API_SECRET=your_actual_api_secret
     ```

---

### 2.4 `PORT` (Optional)
- **Files referencing:** `app.js` (line 142)
- **Purpose:** Web server listening port. Defaults to `8080` if omitted.
- **Configuration:**
  ```env
  PORT=8080
  ```

---

## 3. Security Recommendations

1. **Git Protection:**
   The `.gitignore` file already contains:
   ```
   .env
   node_modules/
   ```
   Always verify with `git status` that `.env` is never staged for commit.
2. **Session Secret:**
   Currently, the session secret in `app.js` (line 53) is hardcoded as `"mysecrethasini"`. In production environments, replace hardcoded strings with a secure, randomly generated environment variable (e.g. `SESSION_SECRET`).
3. **Restricted Mapbox Tokens:**
   In your Mapbox dashboard, you can restrict token usage to specific URLs (such as `localhost:8080` and your production domain) to prevent unauthorized use.

