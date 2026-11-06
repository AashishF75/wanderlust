# Database Architecture Specification: Wanderlust Application

**Engine:** MongoDB Community Edition (v8.x)  
**Object Data Modeling (ODM):** Mongoose (v9.2.1)  
**Database Name:** `wunderlust`  
**Connection Mode:** Local Dedicated MongoDB Instance (`mongodb://127.0.0.1:27017/wunderlust`)  
**Design Pattern:** Document-oriented NoSQL with bidirectional and child-referencing relationships  

---

## 1. Entity-Relationship Overview

The Wanderlust database uses three primary application models (`User`, `Listing`, `Review`) and one infrastructure collection (`sessions`):

```
       +-------------------------+
       |          User           |
       |-------------------------|
       | _id: ObjectId           |
       | email: String           |
       | username: String        |
       | hash: String (PBKDF2)   |
       | salt: String            |
       +------------+------------+
                    | 1
                    | owns / authored
       +------------+------------+-------------------------+
       |                                                   |
       | 1:N (Owner)                                       | 1:N (Author)
       v                                                   v
+-----------------------------+                     +-----------------------------+
|           Listing           |                     |           Review            |
|-----------------------------|                     |-----------------------------|
| _id: ObjectId               |                     | _id: ObjectId               |
| title: String (Required)    |                     | comment: String             |
| description: String         |                     | rating: Number (1-5)        |
| image: { url, filename }    |                     | craetedAt: Date             |
| price: Number               |                     | author: ObjectId -> User    |
| location: String            |                     +--------------+--------------+
| country: String             |                                    ^
| category: String (Filter)   |                                    | 1:N
| geometry: Point [lng, lat]  |                                    |
| owner: ObjectId -> User     |                                    |
| reviews: [ ObjectId ] ------+------------------------------------+
+-----------------------------+
```

---

## 2. Collections & Schema Specifications

### 2.1 Collection: `listings` (Model: `Listing`)
- **Schema File:** [`models/list.js`](file:///C:/alone_project/models/list.js)
- **Controller:** [`controllers/listing.js`](file:///C:/alone_project/controllers/listing.js)

| Field | BSON Data Type | Schema Constraint | Description |
|---|---|---|---|
| `_id` | `ObjectId` | Primary Key | Auto-generated unique identifier. |
| `title` | `String` | `required: true` | Human-readable title of the rental property. |
| `description`| `String` | Optional | Narrative description of amenities, location, and features. |
| `image.url` | `String` | Optional | Public CDN URL (Unsplash or Cloudinary secure delivery URL). |
| `image.filename` | `String` | Optional | Cloud asset identifier or metadata key. |
| `price` | `Number` | Min: 0 | Nightly rental rate in Indian Rupees (INR). |
| `location` | `String` | Optional | Locality, neighborhood, or city name (e.g., "Candolim, Goa"). |
| `country` | `String` | Optional | Sovereign nation name (e.g., "India", "France"). |
| `category` | `String` | Optional | Vacation rental category (`Trending`, `City`, `Mountain`, etc.). |
| `geometry.type` | `String` | `required: true`, Enum: `["Point"]` | GeoJSON geometry type indicator. |
| `geometry.coordinates` | `Array<Number>` | `required: true` | GeoJSON coordinates in `[longitude, latitude]` order. |
| `owner` | `ObjectId` | Ref: `User` | Foreign key referencing the property host in `users`. |
| `reviews` | `Array<ObjectId>` | Ref: `Review` | Array of child review document IDs. |

#### Cascade Deletion Middleware
Defined in [`models/list.js:47-51`](file:///C:/alone_project/models/list.js#L47-L51):
```javascript
listingSchema.post("findOneAndDelete", async (ldeleisting) => {
    if (ldeleisting) {
        await Review.deleteMany({ _id: { $in: ldeleisting.reviews } });
    }
});
```
When a property is deleted, all orphan reviews associated with that property are automatically purged from the `reviews` collection.

---

### 2.2 Collection: `users` (Model: `User`)
- **Schema File:** [`models/user.js`](file:///C:/alone_project/models/user.js)
- **Controller:** [`controllers/user.js`](file:///C:/alone_project/controllers/user.js)

| Field | BSON Data Type | Schema Constraint | Description |
|---|---|---|---|
| `_id` | `ObjectId` | Primary Key | Auto-generated user ID. |
| `email` | `String` | `required: true` | User email address. |
| `username` | `String` | Unique, Managed by plugin | Unique login handle. |
| `hash` | `String` | Managed by plugin | Cryptographic PBKDF2 hash of the password. |
| `salt` | `String` | Managed by plugin | Salt string used during cryptographic key derivation. |

#### Authentication Plugin
Configured via `passport-local-mongoose` in [`models/user.js:12`](file:///C:/alone_project/models/user.js#L12):
- Implements `User.register(user, password)`
- Implements `User.authenticate()`
- Implements `User.serializeUser()` and `User.deserializeUser()`

---

### 2.3 Collection: `reviews` (Model: `Review`)
- **Schema File:** [`models/reviews.js`](file:///C:/alone_project/models/reviews.js)
- **Controller:** [`controllers/review.js`](file:///C:/alone_project/controllers/review.js)

| Field | BSON Data Type | Schema Constraint | Description |
|---|---|---|---|
| `_id` | `ObjectId` | Primary Key | Unique review record ID. |
| `comment` | `String` | Optional | Free-form review commentary. |
| `rating` | `Number` | Min: 1, Max: 5 | Integer rating between 1 and 5 stars. |
| `craetedAt` | `Date` | Default: `Date.now()` | Creation timestamp. |
| `author` | `ObjectId` | Ref: `User` | Foreign key referencing the reviewer in `users`. |

---

### 2.4 Collection: `sessions`
- **Managed by:** `connect-mongo` (v4.6.0) and `express-session` (v1.19.0) in [`app.js:43-66`](file:///C:/alone_project/app.js#L43-L66)
- **Purpose:** Stores authenticated user session tokens across server restarts. Sessions automatically expire after 3 days.

---

## 3. GeoJSON & Mapbox Implementation Requirements

1. **Coordinate Order:** Must be `[longitude, latitude]` according to standard GeoJSON RFC 7946 (e.g., Goa is `[73.7667, 15.5167]`, not `[15.5167, 73.7667]`).
2. **Frontend Consumption:** In [`views/listings/show.ejs:5`](file:///C:/alone_project/views/listings/show.ejs#L5):
   ```javascript
   const coordinates = JSON.parse(`<%- JSON.stringify(listings.geometry.coordinates) %>`);
   ```
   Mapbox GL JS consumes this array directly via `new mapboxgl.Marker().setLngLat(coordinates)`.

