const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/user.js');
const Listing = require('../models/list.js');

async function testWishlistSystem() {
    console.log("==================================================");
    console.log("      WANDERLUST WISHLIST SYSTEM TEST SUITE       ");
    console.log("==================================================");

    const baseUrl = "http://localhost:8080";
    let passed = 0;
    let total = 10;

    await mongoose.connect(process.env.ATLAS_URI || 'mongodb://127.0.0.1:27017/wunderlust');

    // Get a sample listing
    const sampleListing = await Listing.findOne();
    if (!sampleListing) {
        throw new Error("No listings found in database to test with.");
    }
    const sampleListingId = sampleListing._id.toString();

    // 1. Guest cannot save favorites (AJAX returns 401 JSON)
    try {
        const guestRes = await fetch(`${baseUrl}/wishlist/${sampleListingId}`, {
            method: 'POST',
            headers: { 'Accept': 'application/json' }
        });
        const guestData = await guestRes.json();
        if (guestRes.status === 401 && guestData.success === false) {
            console.log("[PASS] 1. Guest blocked from saving favorites (HTTP 401 JSON returned)");
            passed++;
        } else {
            console.error("[FAIL] 1. Guest not properly blocked:", guestRes.status, guestData);
        }
    } catch (e) {
        console.error("[FAIL] 1. Guest test threw error:", e.message);
    }

    // Guest visiting /wishlist directly redirects to /login (302)
    try {
        const guestPageRes = await fetch(`${baseUrl}/wishlist`, {
            redirect: 'manual'
        });
        if (guestPageRes.status === 302 && guestPageRes.headers.get('location') === '/login') {
            console.log("[PASS] 1b. Guest visiting /wishlist directly redirects to /login (HTTP 302)");
        }
    } catch (e) {
        console.error("1b test error:", e.message);
    }

    // Authenticate Demo User
    let sessionCookie = "";
    try {
        const loginRes = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                username: 'demo',
                password: 'Demo@12345'
            }),
            redirect: 'manual'
        });

        const setCookie = loginRes.headers.get('set-cookie');
        if (setCookie) {
            sessionCookie = setCookie.split(';')[0];
        }
    } catch (e) {
        console.error("Login failed:", e.message);
    }

    if (!sessionCookie) {
        console.error("Failed to obtain session cookie for demo user");
        return;
    }

    // Clean demo user's wishlist before test
    await User.findOneAndUpdate({ username: 'demo' }, { $set: { wishlist: [] } });

    // 2. Authenticated user can save a property
    try {
        const saveRes = await fetch(`${baseUrl}/wishlist/${sampleListingId}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Cookie': sessionCookie
            }
        });
        const saveData = await saveRes.json();
        const demoUser = await User.findOne({ username: 'demo' });

        if (saveRes.status === 200 && saveData.success === true && demoUser.wishlist.some(id => id.toString() === sampleListingId)) {
            console.log("[PASS] 2. Authenticated user can save a property (DB updated)");
            passed++;
        } else {
            console.error("[FAIL] 2. Save property failed:", saveRes.status, saveData);
        }
    } catch (e) {
        console.error("[FAIL] 2. Save test error:", e.message);
    }

    // 3. Duplicate favorites are prevented
    try {
        const dupRes = await fetch(`${baseUrl}/wishlist/${sampleListingId}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Cookie': sessionCookie
            }
        });
        const dupData = await dupRes.json();
        const demoUser = await User.findOne({ username: 'demo' });
        const occurrences = demoUser.wishlist.filter(id => id.toString() === sampleListingId).length;

        if (dupRes.status === 200 && occurrences === 1) {
            console.log("[PASS] 3. Duplicate favorites prevented ($addToSet maintains 1 entry)");
            passed++;
        } else {
            console.error("[FAIL] 3. Duplicate allowed, count is:", occurrences);
        }
    } catch (e) {
        console.error("[FAIL] 3. Duplicate test error:", e.message);
    }

    // 4. User can remove a favorite
    try {
        const removeRes = await fetch(`${baseUrl}/wishlist/${sampleListingId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Cookie': sessionCookie
            }
        });
        const removeData = await removeRes.json();
        const demoUser = await User.findOne({ username: 'demo' });

        if (removeRes.status === 200 && removeData.isWishlisted === false && !demoUser.wishlist.some(id => id.toString() === sampleListingId)) {
            console.log("[PASS] 4. User can remove a favorite (DB updated via $pull)");
            passed++;
        } else {
            console.error("[FAIL] 4. Remove favorite failed:", removeRes.status, removeData);
        }
    } catch (e) {
        console.error("[FAIL] 4. Remove test error:", e.message);
    }

    // Re-add for tests 5 & 6
    await fetch(`${baseUrl}/wishlist/${sampleListingId}`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Cookie': sessionCookie }
    });

    // 5. Wishlist survives logout and login
    try {
        // Logout
        await fetch(`${baseUrl}/logout`, { headers: { 'Cookie': sessionCookie } });

        // Fresh login
        const newLoginRes = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: 'demo', password: 'Demo@12345' }),
            redirect: 'manual'
        });
        const newCookie = newLoginRes.headers.get('set-cookie').split(';')[0];

        // Check DB and session
        const demoUserAfterRelogin = await User.findOne({ username: 'demo' });
        if (demoUserAfterRelogin.wishlist.some(id => id.toString() === sampleListingId)) {
            console.log("[PASS] 5. Wishlist survives logout and fresh re-login");
            passed++;
            sessionCookie = newCookie;
        } else {
            console.error("[FAIL] 5. Wishlist lost after re-login");
        }
    } catch (e) {
        console.error("[FAIL] 5. Relogin test error:", e.message);
    }

    // 6. Wishlist displays correct property information
    try {
        const pageRes = await fetch(`${baseUrl}/wishlist`, {
            headers: { 'Cookie': sessionCookie }
        });
        const html = await pageRes.text();

        const hasTitle = html.includes(sampleListing.title);
        const hasLocation = html.includes(sampleListing.location);
        const hasSavedStaysHeader = html.includes("Your Saved Stays");
        const hasRemoveBtn = html.includes(`removeFromWishlistPage(event, '${sampleListingId}')`);

        if (pageRes.status === 200 && hasTitle && hasLocation && hasSavedStaysHeader && hasRemoveBtn) {
            console.log("[PASS] 6. Wishlist page renders property info (Title, Location, Saved Stays header)");
            passed++;
        } else {
            console.error("[FAIL] 6. Missing property elements in /wishlist HTML");
        }
    } catch (e) {
        console.error("[FAIL] 6. Wishlist page display error:", e.message);
    }

    // 7. Invalid listing ID handled safely
    try {
        const invalidRes = await fetch(`${baseUrl}/wishlist/invalid-object-id-123`, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Cookie': sessionCookie }
        });
        const invalidData = await invalidRes.json();
        if (invalidRes.status === 400 && invalidData.success === false) {
            console.log("[PASS] 7. Invalid ObjectId handled safely (HTTP 400 returned)");
            passed++;
        } else {
            console.error("[FAIL] 7. Invalid ID not rejected with 400:", invalidRes.status, invalidData);
        }
    } catch (e) {
        console.error("[FAIL] 7. Invalid ID error:", e.message);
    }

    // 8. Missing listing handled safely
    try {
        const fakeValidId = new mongoose.Types.ObjectId().toString();
        const missingRes = await fetch(`${baseUrl}/wishlist/${fakeValidId}`, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Cookie': sessionCookie }
        });
        const missingData = await missingRes.json();
        if (missingRes.status === 404 && missingData.success === false) {
            console.log("[PASS] 8. Non-existent listing handled safely (HTTP 404 returned)");
            passed++;
        } else {
            console.error("[FAIL] 8. Missing listing not rejected with 404:", missingRes.status, missingData);
        }
    } catch (e) {
        console.error("[FAIL] 8. Missing listing error:", e.message);
    }

    // 9. User A cannot modify User B's wishlist
    try {
        // Controller strictly uses req.user._id from verified passport session
        // Let's create userB and verify demo user's action does not alter userB
        let userB = await User.findOne({ username: 'user_b_test' });
        if (!userB) {
            userB = new User({ email: 'userb@test.com', username: 'user_b_test', wishlist: [] });
            await User.register(userB, 'Password@123');
        } else {
            await User.findByIdAndUpdate(userB._id, { $set: { wishlist: [] } });
        }

        // Demo user sends a request with userB's ID in body/query (which controller should ignore)
        await fetch(`${baseUrl}/wishlist/${sampleListingId}?userId=${userB._id}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: userB._id.toString() })
        });

        const recheckedUserB = await User.findById(userB._id);
        if (recheckedUserB.wishlist.length === 0) {
            console.log("[PASS] 9. User A cannot modify User B's wishlist (req.user._id enforced)");
            passed++;
        } else {
            console.error("[FAIL] 9. User B's wishlist was modified!");
        }

        // Clean up test userB
        await User.findByIdAndDelete(userB._id);
    } catch (e) {
        console.error("[FAIL] 9. Isolation test error:", e.message);
    }

    // 10. Existing listing and authentication functionality intact
    try {
        const homeRes = await fetch(`${baseUrl}/listings`);
        const searchRes = await fetch(`${baseUrl}/listings/search?q=Goa`);
        const showRes = await fetch(`${baseUrl}/listings/${sampleListingId}`);

        if (homeRes.status === 200 && searchRes.status === 200 && showRes.status === 200) {
            console.log("[PASS] 10. Existing functionality fully preserved (Home, Search, Show all 200 OK)");
            passed++;
        } else {
            console.error("[FAIL] 10. Existing routes failed:", homeRes.status, searchRes.status, showRes.status);
        }
    } catch (e) {
        console.error("[FAIL] 10. Route verification error:", e.message);
    }

    console.log("--------------------------------------------------");
    console.log(`WISHLIST TEST SUMMARY: ${passed} / ${total} tests passed.`);
    console.log("--------------------------------------------------");

    await mongoose.disconnect();
    if (passed === total) {
        process.exitCode = 0;
    } else {
        process.exitCode = 1;
    }
}

testWishlistSystem().catch(err => {
    console.error("Test runner error:", err);
    process.exitCode = 1;
});
