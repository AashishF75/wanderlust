const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/user');
const Listing = require('../models/list');
const Booking = require('../models/booking');

async function testBookingSystem() {
    console.log("==================================================");
    console.log("      WANDERLUST BOOKING SYSTEM TEST SUITE        ");
    console.log("==================================================");

    const baseUrl = "http://localhost:8080";
    let passed = 0;
    let total = 13;

    await mongoose.connect(process.env.ATLAS_URI || 'mongodb://127.0.0.1:27017/wunderlust');

    // 1. Setup / identify test listing & test users
    const sampleListing = await Listing.findOne();
    if (!sampleListing) throw new Error("No listings found in database to test with.");
    const listingId = sampleListing._id.toString();

    // Ensure demo user exists
    let demoUser = await User.findOne({ username: 'demo' });
    if (!demoUser) throw new Error("Demo user not found");

    // Ensure secondary user (User B) exists
    let userB = await User.findOne({ username: 'guest_user_b' });
    if (!userB) {
        userB = new User({ email: 'guestb@test.com', username: 'guest_user_b' });
        await User.register(userB, 'Password@123');
    }

    // Create a third user (intruder User C) for access control testing
    let userC = await User.findOne({ username: 'intruder_user_c' });
    if (!userC) {
        userC = new User({ email: 'intruder@test.com', username: 'intruder_user_c' });
        await User.register(userC, 'Password@123');
    }
    const loginResC = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: 'intruder_user_c', password: 'Password@123' }),
        redirect: 'manual'
    });
    const cookieUserC = loginResC.headers.get('set-cookie').split(';')[0];

    // Authenticate Demo User (User A)
    const loginResA = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: 'demo', password: 'Demo@12345' }),
        redirect: 'manual'
    });
    const cookieUserA = loginResA.headers.get('set-cookie').split(';')[0];

    // Authenticate User B
    const loginResB = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: 'guest_user_b', password: 'Password@123' }),
        redirect: 'manual'
    });
    const cookieUserB = loginResB.headers.get('set-cookie').split(';')[0];

    // Clean up any old test bookings for this listing to start fresh
    await Booking.deleteMany({ listing: listingId });

    // -----------------------------------------------------------------
    // TEST 1: Guest cannot create bookings (401 Unauthorized)
    // -----------------------------------------------------------------
    try {
        const guestRes = await fetch(`${baseUrl}/bookings`, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                listingId,
                checkIn: '2027-01-10',
                checkOut: '2027-01-15',
                guests: 2
            })
        });
        const data = await guestRes.json();
        if (guestRes.status === 401 && data.success === false) {
            console.log("[PASS] 1. Guest cannot create bookings (HTTP 401 JSON)");
            passed++;
        } else {
            console.error("[FAIL] 1. Guest was not blocked with 401:", guestRes.status, data);
        }
    } catch (e) {
        console.error("[FAIL] 1. Test threw error:", e.message);
    }

    // -----------------------------------------------------------------
    // TEST 2: Authenticated guest can create a valid booking
    // -----------------------------------------------------------------
    let createdBookingId = null;
    try {
        const createRes = await fetch(`${baseUrl}/bookings`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cookie': cookieUserA
            },
            body: JSON.stringify({
                listingId,
                checkIn: '2027-02-01',
                checkOut: '2027-02-05',
                guests: 2
            })
        });
        const createData = await createRes.json();
        if (createRes.status === 201 && createData.success === true && createData.bookingId) {
            createdBookingId = createData.bookingId;
            const b = await Booking.findById(createdBookingId);
            if (b && b.status === "Confirmed" && b.nights === 4) {
                console.log("[PASS] 2. Authenticated guest created valid booking (4 nights, Confirmed)");
                passed++;
            } else {
                console.error("[FAIL] 2. Booking record invalid:", b);
            }
        } else {
            console.error("[FAIL] 2. Create booking request failed:", createRes.status, createData);
        }
    } catch (e) {
        console.error("[FAIL] 2. Test threw error:", e.message);
    }

    // -----------------------------------------------------------------
    // TEST 3: Past check-in dates are rejected (400 Bad Request)
    // -----------------------------------------------------------------
    try {
        const pastRes = await fetch(`${baseUrl}/bookings`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cookie': cookieUserA
            },
            body: JSON.stringify({
                listingId,
                checkIn: '2023-01-01',
                checkOut: '2023-01-05',
                guests: 2
            })
        });
        const pastData = await pastRes.json();
        if (pastRes.status === 400 && pastData.success === false) {
            console.log("[PASS] 3. Past check-in dates rejected (HTTP 400)");
            passed++;
        } else {
            console.error("[FAIL] 3. Past date not rejected:", pastRes.status, pastData);
        }
    } catch (e) {
        console.error("[FAIL] 3. Test threw error:", e.message);
    }

    // -----------------------------------------------------------------
    // TEST 4: Invalid date ranges are rejected (checkOut <= checkIn)
    // -----------------------------------------------------------------
    try {
        const invalidRangeRes = await fetch(`${baseUrl}/bookings`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cookie': cookieUserA
            },
            body: JSON.stringify({
                listingId,
                checkIn: '2027-03-10',
                checkOut: '2027-03-08', // checkout before checkin
                guests: 2
            })
        });
        const invalidRangeData = await invalidRangeRes.json();
        if (invalidRangeRes.status === 400 && invalidRangeData.success === false) {
            console.log("[PASS] 4. Invalid date ranges rejected (HTTP 400)");
            passed++;
        } else {
            console.error("[FAIL] 4. Invalid date range not rejected:", invalidRangeRes.status, invalidRangeData);
        }
    } catch (e) {
        console.error("[FAIL] 4. Test threw error:", e.message);
    }

    // -----------------------------------------------------------------
    // TEST 5: Guest capacity is enforced (exceeding maxGuests)
    // -----------------------------------------------------------------
    try {
        const capacityRes = await fetch(`${baseUrl}/bookings`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cookie': cookieUserA
            },
            body: JSON.stringify({
                listingId,
                checkIn: '2027-04-01',
                checkOut: '2027-04-05',
                guests: 99 // exceeds capacity
            })
        });
        const capData = await capacityRes.json();
        if (capacityRes.status === 400 && capData.success === false) {
            console.log("[PASS] 5. Guest capacity enforced (HTTP 400 on 99 guests)");
            passed++;
        } else {
            console.error("[FAIL] 5. Exceeded capacity not rejected:", capacityRes.status, capData);
        }
    } catch (e) {
        console.error("[FAIL] 5. Test threw error:", e.message);
    }

    // -----------------------------------------------------------------
    // TEST 6: Overlapping confirmed bookings are rejected (409 Conflict)
    // Existing booking: 2027-02-01 to 2027-02-05
    // Requested: 2027-02-03 to 2027-02-07 (Overlaps!)
    // -----------------------------------------------------------------
    try {
        const overlapRes = await fetch(`${baseUrl}/bookings`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cookie': cookieUserB
            },
            body: JSON.stringify({
                listingId,
                checkIn: '2027-02-03',
                checkOut: '2027-02-07',
                guests: 2
            })
        });
        const overlapData = await overlapRes.json();
        if (overlapRes.status === 409 && overlapData.success === false) {
            console.log("[PASS] 6. Overlapping confirmed booking rejected (HTTP 409 Conflict)");
            passed++;
        } else {
            console.error("[FAIL] 6. Overlapping booking not blocked:", overlapRes.status, overlapData);
        }
    } catch (e) {
        console.error("[FAIL] 6. Test threw error:", e.message);
    }

    // -----------------------------------------------------------------
    // TEST 7: Non-overlapping bookings are allowed (different dates)
    // Requested: 2027-02-06 to 2027-02-10 (No overlap!)
    // -----------------------------------------------------------------
    let secondBookingId = null;
    try {
        const nonOverlapRes = await fetch(`${baseUrl}/bookings`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cookie': cookieUserB
            },
            body: JSON.stringify({
                listingId,
                checkIn: '2027-02-06',
                checkOut: '2027-02-10',
                guests: 2
            })
        });
        const nonOverlapData = await nonOverlapRes.json();
        if (nonOverlapRes.status === 201 && nonOverlapData.success === true) {
            secondBookingId = nonOverlapData.bookingId;
            console.log("[PASS] 7. Non-overlapping booking allowed (HTTP 201 Created)");
            passed++;
        } else {
            console.error("[FAIL] 7. Non-overlapping booking failed:", nonOverlapRes.status, nonOverlapData);
        }
    } catch (e) {
        console.error("[FAIL] 7. Test threw error:", e.message);
    }

    // -----------------------------------------------------------------
    // TEST 8: Cancelled bookings no longer block availability
    // Cancel the first booking (2027-02-01 to 2027-02-05)
    // Then re-book 2027-02-01 to 2027-02-05
    // -----------------------------------------------------------------
    try {
        const cancelRes = await fetch(`${baseUrl}/bookings/${createdBookingId}/cancel`, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/json',
                'Cookie': cookieUserA
            }
        });
        const cancelData = await cancelRes.json();

        // Re-book the same dates
        const rebookRes = await fetch(`${baseUrl}/bookings`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cookie': cookieUserB
            },
            body: JSON.stringify({
                listingId,
                checkIn: '2027-02-01',
                checkOut: '2027-02-05',
                guests: 1
            })
        });
        const rebookData = await rebookRes.json();

        if (cancelRes.status === 200 && rebookRes.status === 201 && rebookData.success === true) {
            console.log("[PASS] 8. Cancelled booking freed dates; re-booking succeeded (HTTP 201)");
            passed++;
        } else {
            console.error("[FAIL] 8. Re-booking freed dates failed:", cancelRes.status, rebookRes.status, rebookData);
        }
    } catch (e) {
        console.error("[FAIL] 8. Test threw error:", e.message);
    }

    // -----------------------------------------------------------------
    // TEST 9: Guests cannot access another user's booking (403 Forbidden)
    // User C (who is neither the guest nor the host) attempts to view secondBookingId
    // -----------------------------------------------------------------
    try {
        const unauthRes = await fetch(`${baseUrl}/bookings/${secondBookingId}`, {
            headers: {
                'Accept': 'application/json',
                'Cookie': cookieUserC
            }
        });
        const unauthData = await unauthRes.json().catch(() => ({}));
        if (unauthRes.status === 403) {
            console.log("[PASS] 9. Unauthorized booking access blocked (HTTP 403 Forbidden)");
            passed++;
        } else {
            console.error("[FAIL] 9. User C accessed User B's booking:", unauthRes.status, unauthData);
        }
    } catch (e) {
        console.error("[FAIL] 9. Test threw error:", e.message);
    }

    // -----------------------------------------------------------------
    // TEST 10: Hosts cannot manage another host's listings (403 Forbidden)
    // A user who is NOT the host of the listing attempts to confirm/manage the booking
    // -----------------------------------------------------------------
    try {
        const isOwnerA = sampleListing.owner.equals(demoUser._id);
        const nonOwnerCookie = isOwnerA ? cookieUserC : cookieUserA;
        const testRes = await fetch(`${baseUrl}/bookings/${secondBookingId}/confirm`, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/json',
                'Cookie': nonOwnerCookie
            }
        });
        if (testRes.status === 403) {
            console.log("[PASS] 10. Non-owner host management action rejected (HTTP 403)");
            passed++;
        } else {
            console.error("[FAIL] 10. Non-owner action not rejected with 403:", testRes.status);
        }
    } catch (e) {
        console.error("[FAIL] 10. Test threw error:", e.message);
    }

    // -----------------------------------------------------------------
    // TEST 11: Price is calculated on the server (client price tampering ignored)
    // -----------------------------------------------------------------
    try {
        const tamperRes = await fetch(`${baseUrl}/bookings`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cookie': cookieUserA
            },
            body: JSON.stringify({
                listingId,
                checkIn: '2027-05-10',
                checkOut: '2027-05-13', // 3 nights
                guests: 2,
                totalPrice: 1 // Malicious client claims total price is 1 rupee!
            })
        });
        const tamperData = await tamperRes.json();
        const tamperedDoc = await Booking.findById(tamperData.bookingId);

        // Server calculation for 3 nights:
        // basePrice = price * 3
        // cleaningFee = price * 0.10
        // serviceFee = basePrice * 0.05
        // tax = (base + cleaning + service) * 0.18
        // total = base + cleaning + service + tax
        const expectedBase = sampleListing.price * 3;
        const expectedCleaning = Math.round(sampleListing.price * 0.10);
        const expectedService = Math.round(expectedBase * 0.05);
        const expectedTax = Math.round((expectedBase + expectedCleaning + expectedService) * 0.18);
        const expectedTotal = expectedBase + expectedCleaning + expectedService + expectedTax;

        if (tamperedDoc && tamperedDoc.totalPrice === expectedTotal && tamperedDoc.totalPrice !== 1) {
            console.log(`[PASS] 11. Server-side price calculation enforced (Calculated: ₹${expectedTotal}, Tampered ₹1 ignored)`);
            passed++;
        } else {
            console.error("[FAIL] 11. Price tampering succeeded or calculation mismatch:", tamperedDoc?.totalPrice);
        }
    } catch (e) {
        console.error("[FAIL] 11. Test threw error:", e.message);
    }

    // -----------------------------------------------------------------
    // TEST 12: Existing wishlist, search, listings remain operational
    // -----------------------------------------------------------------
    try {
        const homeRes = await fetch(`${baseUrl}/listings`);
        const searchRes = await fetch(`${baseUrl}/listings/search?q=Goa`);
        const wishlistRes = await fetch(`${baseUrl}/wishlist`, { headers: { 'Cookie': cookieUserA } });
        const tripsRes = await fetch(`${baseUrl}/bookings`, { headers: { 'Cookie': cookieUserA } });

        if (homeRes.status === 200 && searchRes.status === 200 && wishlistRes.status === 200 && tripsRes.status === 200) {
            console.log("[PASS] 12. Existing routes operational (Home, Search, Wishlist, Trips all 200 OK)");
            passed++;
        } else {
            console.error("[FAIL] 12. Regressions found:", homeRes.status, searchRes.status, wishlistRes.status, tripsRes.status);
        }
    } catch (e) {
        console.error("[FAIL] 12. Test threw error:", e.message);
    }

    // -----------------------------------------------------------------
    // TEST 13: Concurrent booking attempts cannot both reserve the same dates
    // -----------------------------------------------------------------
    try {
        const concurrentCheckIn = '2027-06-15';
        const concurrentCheckOut = '2027-06-20';

        const [attempt1, attempt2] = await Promise.all([
            fetch(`${baseUrl}/bookings`, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Cookie': cookieUserA },
                body: JSON.stringify({ listingId, checkIn: concurrentCheckIn, checkOut: concurrentCheckOut, guests: 2 })
            }),
            fetch(`${baseUrl}/bookings`, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Cookie': cookieUserB },
                body: JSON.stringify({ listingId, checkIn: concurrentCheckIn, checkOut: concurrentCheckOut, guests: 2 })
            })
        ]);

        const statuses = [attempt1.status, attempt2.status].sort();
        // One must succeed (201) and one must be rejected (409)
        const isOneCreatedOneConflict = (statuses[0] === 201 && statuses[1] === 409);

        // Verify count of bookings in DB for these dates
        const bookedCount = await Booking.countDocuments({
            listing: listingId,
            status: "Confirmed",
            checkIn: new Date(concurrentCheckIn),
            checkOut: new Date(concurrentCheckOut)
        });

        if (isOneCreatedOneConflict && bookedCount === 1) {
            console.log("[PASS] 13. Concurrency safety verified (Exactly 1 succeeded with 201, 1 rejected with 409)");
            passed++;
        } else {
            console.error("[FAIL] 13. Concurrency failed:", { statuses, bookedCount });
        }
    } catch (e) {
        console.error("[FAIL] 13. Test threw error:", e.message);
    }

    // Clean up test records
    await User.findByIdAndDelete(userB._id);
    if (userC) await User.findByIdAndDelete(userC._id);

    console.log("--------------------------------------------------");
    console.log(`BOOKING TEST SUMMARY: ${passed} / ${total} tests passed.`);
    console.log("--------------------------------------------------");

    await mongoose.disconnect();
    if (passed === total) {
        process.exitCode = 0;
    } else {
        process.exitCode = 1;
    }
}

testBookingSystem().catch(err => {
    console.error("Test runner failure:", err);
    process.exitCode = 1;
});
