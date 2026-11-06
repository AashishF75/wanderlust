# Database Setup & Configuration Guide: Independent Local Operation

This guide explains how to manage, inspect, back up, and seed your local MongoDB database for the Wanderlust project without relying on any external friend or cloud infrastructure.

---

## 1. Local Database Environment

- **Database Engine:** MongoDB Community Server (Windows Service: `MongoDB`)
- **Default Port:** `27017`
- **Database Name:** `wunderlust`
- **Connection URI:** `mongodb://127.0.0.1:27017/wunderlust`

### Verifying MongoDB Service Status
Open PowerShell and run:
```powershell
Get-Service -Name MongoDB
```
If the service is stopped, start it:
```powershell
Start-Service -Name MongoDB
```

---

## 2. Environment Configuration (`.env`)

Your local connection string is configured in [`C:\alone_project\.env`](file:///C:/alone_project/.env):

```env
ATLAS_URI=mongodb://127.0.0.1:27017/wunderlust
PORT=8080
MAP_TOKEN=your_mapbox_public_token
CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret
```

---

## 3. Safe, Idempotent Seeding with `scripts/seedDatabase.js`

To populate or refresh sample data safely without dropping the database or overwriting users:

```powershell
node scripts/seedDatabase.js
```

### Safety Features of the Seeder:
1. **Never Drops Collections:** Does not execute `deleteMany()` or `drop()`.
2. **Account Preservation:** Checks if the demo account (`demo`) exists before creating it.
3. **Duplicate Detection:** Queries for `title` and `location` before inserting any property. Existing properties are skipped.
4. **Valid GeoJSON:** Every inserted property contains valid `Point` coordinates.
5. **Valid Host Ownership:** Every property is linked to the verified user `demo`.

---

## 4. Querying and Managing the Database with `mongosh`

You have the official MongoDB Shell installed globally. To interact with your database:

```powershell
# 1. Connect to local wunderlust database
mongosh "mongodb://127.0.0.1:27017/wunderlust"

# 2. View collection counts
show collections
db.listings.countDocuments()
db.users.countDocuments()
db.reviews.countDocuments()

# 3. View a sample listing with its owner and coordinates
db.listings.findOne({}, { title: 1, location: 1, price: 1, geometry: 1, owner: 1 })

# 4. Exit mongosh
exit
```

---

## 5. Backing Up Your Database

To create a local backup of your database:
```powershell
# Using mongodump (if installed with MongoDB Database Tools):
mongodump --uri="mongodb://127.0.0.1:27017/wunderlust" --out="C:\alone_project\backup"
```

