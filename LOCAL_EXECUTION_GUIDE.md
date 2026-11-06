# Local Execution Guide (Windows 11 & PowerShell)

This step-by-step guide walks you through setting up the database, configuring your environment, running the application, and testing all endpoints on your Windows 11 machine.

---

## 1. System Requirements Verification

Open a PowerShell terminal and verify installed software:

```powershell
# 1. Check Node.js version (Required >= 18, verified: v24.12.0)
node -v

# 2. Check npm version (verified: 11.6.2)
npm -v

# 3. Check MongoDB service status (Verified: Running)
Get-Service -Name MongoDB
```

*Note:* If the MongoDB service is ever stopped, start it via PowerShell as Administrator:
```powershell
Start-Service -Name MongoDB
```

---

## 2. Environment Configuration

1. In the project directory (`C:\alone_project`), copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit `.env` and set your credentials:
   ```env
   ATLAS_URI=mongodb://127.0.0.1:27017/wunderlust
   MAP_TOKEN=your_mapbox_public_token_here
   CLOUD_NAME=your_cloudinary_cloud_name
   CLOUD_API_KEY=your_cloudinary_api_key
   CLOUD_API_SECRET=your_cloudinary_api_secret
   PORT=8080
   ```

---

## 3. Database Initialization & Seeding Analysis

The repository contains seed data in `init/data.js` and an initialization script in `init/index.js`.

### Diagnostic Note on `init/index.js`
When running `node init/index.js` out-of-the-box, Mongoose throws:
```
ValidationError: Listing validation failed: geometry.type: Path 'geometry.type' is required.
```

**Why this occurs:**
1. The `Listing` schema in `models/list.js` defines GeoJSON `geometry` (`type: "Point"`, `coordinates: [Number]`) as `required: true`.
2. The initial sample data in `init/data.js` was created before geocoding was added and does not contain `geometry` objects.
3. The sample data hardcodes `owner: "6998cdb42946a7e4f38cb338"`, which is an ObjectId of a user that does not exist in your local database.

### How to Seed Sample Data Safely
You can initialize the database with proper geometry and an existing user owner using either of two methods:

#### Method A: Direct User Registration & Creation via Web UI (Recommended)
1. Start the server (`npm start`).
2. Navigate to `http://localhost:8080/signup` and register a new user account.
3. Log in and create a new listing at `http://localhost:8080/listings/new`.
4. The application automatically geocodes the location using Mapbox and attaches the logged-in user as the owner.

#### Method B: One-Time Custom Seed Script
If you want to populate all 12 sample listings from `init/data.js` with default coordinates:
```powershell
node -e "
const mongoose = require('mongoose');
const initdata = require('./init/data.js');
const Listing = require('./models/list.js');
const User = require('./models/user.js');

async function seed() {
  await mongoose.connect('mongodb://127.0.0.1:27017/wunderlust');
  console.log('Connected to MongoDB');
  
  // Find or create a default owner
  let user = await User.findOne({ username: 'admin' });
  if (!user) {
    const newUser = new User({ email: 'admin@wanderlust.com', username: 'admin' });
    user = await User.register(newUser, 'Admin@12345');
    console.log('Created default admin user (username: admin, password: Admin@12345)');
  }
  
  await Listing.deleteMany({});
  
  const sampleData = initdata.data.map(item => ({
    ...item,
    owner: user._id,
    geometry: {
      type: 'Point',
      coordinates: [-74.006, 40.7128] // Default Coordinates [lng, lat]
    }
  }));
  
  await Listing.insertMany(sampleData);
  console.log('Successfully seeded', sampleData.length, 'sample listings!');
  process.exit(0);
}
seed().catch(err => { console.error(err); process.exit(1); });
"
```

---

## 4. Starting the Application

With `.env` populated, start the application:

```powershell
# Standard startup:
npm start

# Or development mode with auto-reload:
npm run dev
```

Expected terminal output:
```
[dotenv@17.3.1] injecting env (4) from .env
ENV: mongodb://127.0.0.1:27017/wunderlust
server is working
The mongoose dB connected
```

---

## 5. Navigating the Application

Open your browser to:

- **Listings Directory (Home):** [http://localhost:8080/listings](http://localhost:8080/listings)
- **User Registration:** [http://localhost:8080/signup](http://localhost:8080/signup)
- **User Login:** [http://localhost:8080/login](http://localhost:8080/login)
- **Create New Listing:** [http://localhost:8080/listings/new](http://localhost:8080/listings/new) (Requires login)
- **Root URL Note:** Visiting `http://localhost:8080/` displays `Page is not found` because the application defines `/listings` as its primary landing view. The navbar brand icon navigates directly to `/listings`.

---

## 6. Troubleshooting Common Issues

### Issue 1: `Error: Cannot create a client without an access token`
- **Location:** `controllers/listing.js:4`
- **Cause:** `MAP_TOKEN` is missing or empty in your `.env` file.
- **Solution:** Add a valid Mapbox public token (`pk.ey...`) to `.env`.

### Issue 2: `Assertion failed: You must provide either mongoUrl|clientPromise|client in options`
- **Location:** `app.js:43` (`MongoStore.create`)
- **Cause:** `ATLAS_URI` is undefined in `.env`.
- **Solution:** Ensure `ATLAS_URI=mongodb://127.0.0.1:27017/wunderlust` is defined in `.env`.

### Issue 3: `Error: connect ECONNREFUSED 127.0.0.1:27017`
- **Cause:** The local MongoDB service is stopped.
- **Solution:** Run `Start-Service -Name MongoDB` in PowerShell.

### Issue 4: `Must supply cloud_name` or `Must supply api_key` on Upload
- **Location:** `cloudconfig.js`
- **Cause:** Cloudinary credentials missing in `.env`.
- **Solution:** Provide valid `CLOUD_NAME`, `CLOUD_API_KEY`, and `CLOUD_API_SECRET` in `.env`.

