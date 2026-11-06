const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Listing = require('../models/list.js');
const User = require('../models/user.js');
const Review = require('../models/reviews.js');
const Booking = require('../models/booking.js');

async function runTestSuite() {
  console.log("==================================================");
  console.log("         WANDERLUST PROJECT TEST SUITE            ");
  console.log("==================================================");

  const dbUrl = process.env.ATLAS_URI || 'mongodb://127.0.0.1:27017/wunderlust';
  let passed = 0;
  let total = 12;

  // Test 1: MongoDB Connection
  try {
    await mongoose.connect(dbUrl);
    console.log("[PASS] 1. MongoDB Database Connection");
    passed++;
  } catch (err) {
    console.error("[FAIL] 1. MongoDB Connection:", err.message);
  }

  // Test 2: Database Records Integrity
  try {
    const listingCount = await Listing.countDocuments();
    const userCount = await User.countDocuments();
    if (listingCount > 0 && userCount > 0) {
      console.log(`[PASS] 2. Database Records Present (${listingCount} listings, ${userCount} users)`);
      passed++;
    } else {
      console.error(`[FAIL] 2. Database empty. Run 'npm run seed' first.`);
    }
  } catch (err) {
    console.error("[FAIL] 2. Records Check:", err.message);
  }

  // Test 3: Demo User Authentication Mechanism
  try {
    const demoUser = await User.findOne({ username: 'demo' });
    if (demoUser) {
      const auth = await demoUser.authenticate('Demo@12345');
      if (auth.user) {
        console.log("[PASS] 3. Passport-Local Authentication Verified (demo user)");
        passed++;
      } else {
        console.error("[FAIL] 3. Authentication failed for demo credentials");
      }
    } else {
      console.error("[FAIL] 3. Demo user does not exist");
    }
  } catch (err) {
    console.error("[FAIL] 3. Auth Check:", err.message);
  }

  // Test 4: GeoJSON & Coordinates Format
  try {
    const sample = await Listing.findOne({ "geometry.type": "Point" });
    if (sample && Array.isArray(sample.geometry.coordinates) && sample.geometry.coordinates.length === 2) {
      console.log(`[PASS] 4. GeoJSON Geometry Valid (${sample.location}: [${sample.geometry.coordinates.join(', ')}])`);
      passed++;
    } else {
      console.error("[FAIL] 4. Invalid GeoJSON geometry");
    }
  } catch (err) {
    console.error("[FAIL] 4. GeoJSON Check:", err.message);
  }

  // Test 5: HTTP Endpoints (Port 8080)
  try {
    const port = process.env.PORT || 8080;
    const res = await fetch(`http://localhost:${port}/listings`);
    if (res.status === 200) {
      console.log(`[PASS] 5. Web Server HTTP GET /listings (Status: ${res.status})`);
      passed++;
    } else {
      console.error(`[FAIL] 5. Web Server returned status ${res.status}`);
    }
  } catch (err) {
    console.warn(`[SKIP] 5. Web Server not currently running on port 8080 (${err.message})`);
    total--;
  }

  // Test 6: Search & Filter Query Execution
  try {
    const searchResults = await Listing.find({
      $or: [
        { title: { $regex: 'Goa', $options: 'i' } },
        { location: { $regex: 'Goa', $options: 'i' } }
      ]
    });
    if (searchResults.length > 0) {
      console.log(`[PASS] 6. Search Regex Query Functional (Found ${searchResults.length} Goa matches)`);
      passed++;
    } else {
      console.error("[FAIL] 6. Search query returned 0 matches");
    }
  } catch (err) {
    console.error("[FAIL] 6. Search Query:", err.message);
  }

  // Test 7: User Schema Wishlist Schema Definition
  try {
    const wishlistPath = User.schema.path('wishlist');
    if (wishlistPath && wishlistPath.instance === 'Array' && wishlistPath.embeddedSchemaType?.options?.ref === 'Listing') {
      console.log("[PASS] 7. User Schema Wishlist Reference Valid (Ref: 'Listing')");
      passed++;
    } else {
      console.error("[FAIL] 7. User schema wishlist field missing or invalid");
    }
  } catch (err) {
    console.error("[FAIL] 7. Wishlist Schema Check:", err.message);
  }

  // Test 8: Wishlist Persistence ($addToSet / $pull)
  try {
    const testListing = await Listing.findOne();
    const demoUser = await User.findOne({ username: 'demo' });
    if (testListing && demoUser) {
      // Test $addToSet
      await User.findByIdAndUpdate(demoUser._id, { $addToSet: { wishlist: testListing._id } });
      const addedUser = await User.findById(demoUser._id);
      const isSaved = addedUser.wishlist.some(id => id.toString() === testListing._id.toString());

      // Test duplicate prevention
      await User.findByIdAndUpdate(demoUser._id, { $addToSet: { wishlist: testListing._id } });
      const dupUser = await User.findById(demoUser._id);
      const occurrences = dupUser.wishlist.filter(id => id.toString() === testListing._id.toString()).length;

      // Test $pull
      await User.findByIdAndUpdate(demoUser._id, { $pull: { wishlist: testListing._id } });
      const removedUser = await User.findById(demoUser._id);
      const isRemoved = !removedUser.wishlist.some(id => id.toString() === testListing._id.toString());

      if (isSaved && occurrences === 1 && isRemoved) {
        console.log("[PASS] 8. Wishlist Database Persistence ($addToSet, duplicate prevention, $pull)");
        passed++;
      } else {
        console.error("[FAIL] 8. Persistence operations failed:", { isSaved, occurrences, isRemoved });
      }
    } else {
      console.error("[FAIL] 8. Missing test records");
    }
  } catch (err) {
    console.error("[FAIL] 8. Wishlist Persistence Check:", err.message);
  }

  // Test 9: Wishlist Protected Route & HTTP 401/302 Redirection
  try {
    const port = process.env.PORT || 8080;
    const guestAjaxRes = await fetch(`http://localhost:${port}/wishlist/507f1f77bcf86cd799439011`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });
    const guestPageRes = await fetch(`http://localhost:${port}/wishlist`, {
      redirect: 'manual'
    });

    if (guestAjaxRes.status === 401 && guestPageRes.status === 302) {
      console.log("[PASS] 9. Wishlist Security & Route Protection (AJAX 401 / Browser 302)");
      passed++;
    } else {
      console.error(`[FAIL] 9. Expected 401 & 302, got AJAX ${guestAjaxRes.status} & Browser ${guestPageRes.status}`);
    }
  } catch (err) {
    console.warn(`[SKIP] 9. Web server route test (${err.message})`);
    total--;
  }

  // Test 10: Booking Model Schema & References Check
  try {
    const bookingPaths = Booking.schema.paths;
    const hasListingRef = bookingPaths.listing && bookingPaths.listing.options.ref === 'Listing';
    const hasUserRef = bookingPaths.user && bookingPaths.user.options.ref === 'User';
    const hasStatusEnum = bookingPaths.status && Array.isArray(bookingPaths.status.enumValues);

    if (hasListingRef && hasUserRef && hasStatusEnum) {
      console.log("[PASS] 10. Booking Schema References & Enums Valid (Listing, User, Status)");
      passed++;
    } else {
      console.error("[FAIL] 10. Booking schema missing expected paths or refs");
    }
  } catch (err) {
    console.error("[FAIL] 10. Booking Schema Check:", err.message);
  }

  // Test 11: Booking Availability Query Engine (Overlap Detection)
  try {
    const testListing = await Listing.findOne();
    const demoUser = await User.findOne({ username: 'demo' });

    if (testListing && demoUser) {
      // Create a test booking
      const t1 = new Date('2028-06-01');
      const t2 = new Date('2028-06-05');
      const sampleBooking = await Booking.create({
        listing: testListing._id,
        user: demoUser._id,
        checkIn: t1,
        checkOut: t2,
        nights: 4,
        guests: 2,
        basePrice: testListing.price * 4,
        totalPrice: testListing.price * 4 + 1000,
        status: "Confirmed",
        paymentStatus: "Unpaid"
      });

      // Overlap condition test: 2028-06-03 to 2028-06-07 (Overlaps!)
      const overlapFound = await Booking.findOne({
        listing: testListing._id,
        status: { $in: ["Confirmed", "Pending"] },
        checkIn: { $lt: new Date('2028-06-07') },
        checkOut: { $gt: new Date('2028-06-03') }
      });

      // Non-overlap test: 2028-06-06 to 2028-06-10 (No overlap!)
      const nonOverlapFound = await Booking.findOne({
        listing: testListing._id,
        status: { $in: ["Confirmed", "Pending"] },
        checkIn: { $lt: new Date('2028-06-10') },
        checkOut: { $gt: new Date('2028-06-06') }
      });

      // Clean up test booking
      await Booking.findByIdAndDelete(sampleBooking._id);

      if (overlapFound && !nonOverlapFound) {
        console.log("[PASS] 11. Availability Overlap Engine Functional (Conflict detected correctly)");
        passed++;
      } else {
        console.error("[FAIL] 11. Overlap query logic failure:", { overlapFound: !!overlapFound, nonOverlapFound: !!nonOverlapFound });
      }
    } else {
      console.error("[FAIL] 11. Missing records for availability test");
    }
  } catch (err) {
    console.error("[FAIL] 11. Availability Check:", err.message);
  }

  // Test 12: Booking Protected Routes (Unauthenticated Guest Rejected)
  try {
    const port = process.env.PORT || 8080;
    const guestBookingRes = await fetch(`http://localhost:${port}/bookings`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkIn: '2028-01-01', checkOut: '2028-01-05' })
    });
    const guestTripsRes = await fetch(`http://localhost:${port}/bookings`, {
      redirect: 'manual'
    });

    if (guestBookingRes.status === 401 && guestTripsRes.status === 302) {
      console.log("[PASS] 12. Booking Security & Route Protection (AJAX 401 / Trips 302)");
      passed++;
    } else {
      console.error(`[FAIL] 12. Expected 401 & 302, got ${guestBookingRes.status} & ${guestTripsRes.status}`);
    }
  } catch (err) {
    console.warn(`[SKIP] 12. Booking route test (${err.message})`);
    total--;
  }

  console.log("--------------------------------------------------");
  console.log(`TEST SUMMARY: ${passed} / ${total} tests passed.`);
  console.log("--------------------------------------------------");

  try {
    await mongoose.disconnect();
  } catch (e) {}

  if (passed === total) {
    console.log("All critical systems operational!");
    process.exitCode = 0;
  } else {
    process.exitCode = 1;
  }
}

runTestSuite().catch(err => {
  console.error("Test Suite execution failure:", err);
  process.exitCode = 1;
});

