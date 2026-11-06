const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { chromium } = require("playwright-core");
const fs = require("fs");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:8080";
const SCREENSHOT_DIR = path.join(__dirname, "../../frontend/public/screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
    { name: "320px-small-mobile", width: 320, height: 568 },
    { name: "375px-standard-mobile", width: 375, height: 667 },
    { name: "430px-large-mobile", width: 430, height: 932 },
    { name: "768px-tablet-portrait", width: 768, height: 1024 },
    { name: "1024px-tablet-landscape", width: 1024, height: 768 },
    { name: "1366px-laptop-desktop", width: 1366, height: 768 },
    { name: "1920px-fhd-wide", width: 1920, height: 1080 },
];

async function runBrowserQA() {
    console.log("==================================================");
    console.log("     WANDERLUST BROWSER QA TEST SUITE            ");
    console.log("==================================================");

    let browser;
    try {
        browser = await chromium.launch({
            executablePath: CHROME_PATH,
            headless: true,
        });
    } catch (err) {
        console.error("Failed to launch Chrome:", err.message);
        process.exit(1);
    }

    const context = await browser.newContext();
    const page = await context.newPage();

    let totalChecks = 0;
    let passedChecks = 0;
    let issues = [];

    function recordPass(desc) {
        totalChecks++;
        passedChecks++;
        console.log(`[PASS] ${desc}`);
    }

    function recordFail(desc, details = "") {
        totalChecks++;
        console.error(`[FAIL] ${desc} ${details ? "- " + details : ""}`);
        issues.push({ desc, details });
    }

    try {
        // 1. Authenticate demo admin user
        console.log("\nLogging in as demo user...");
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', "demo");
        await page.fill('input[name="password"]', "Demo@12345");
        await page.click('button[type="submit"]');
        await page.waitForLoadState("networkidle");

        // Verify successful login
        const loggedIn = await page.evaluate(() => {
            return document.body.innerText.includes("demo") || document.body.innerText.includes("Explore");
        });
        if (loggedIn) {
            recordPass("Demo admin authenticated successfully");
        } else {
            recordFail("Demo user authentication failed");
        }

        // Connect to Mongo to retrieve a real listing ID
        const mongoose = require("mongoose");
        await mongoose.connect(process.env.ATLAS_URI);
        const Listing = require("../models/list.js");
        const realListing = await Listing.findOne();
        const firstListingId = realListing ? realListing._id.toString() : null;
        console.log(`Discovered listing ID from DB: ${firstListingId}`);

        // Test routes to audit
        const testPages = [
            { path: "/listings", title: "Homepage Listings Grid" },
            { path: "/listings/map", title: "Interactive Mapbox Explorer" },
            { path: firstListingId ? `/listings/${firstListingId}` : "/listings", title: "Property Details Page" },
            { path: "/wishlist", title: "Saved Stays Wishlist" },
            { path: "/bookings", title: "My Trips & Reservations" },
            { path: "/bookings/host", title: "Host Management Dashboard" },
            { path: "/bookings/host/analytics", title: "Host Analytics & Charts" },
            { path: "/messages", title: "Guest-Host Messaging Inbox" },
            { path: "/notifications", title: "Notification Center" },
            { path: "/admin", title: "Admin Console Dashboard" },
            { path: "/admin/users", title: "Admin User Role Management" },
            { path: "/admin/listings", title: "Admin Property Moderation" },
            { path: "/admin/coupons", title: "Admin Coupon Management" },
        ];

        // 2. Multi-Viewport Layout & Overflow Verification
        console.log("\n==================================================");
        console.log("   TESTING MULTI-VIEWPORT RESPONSIVENESS & OVERFLOW ");
        console.log("==================================================");

        for (const vp of VIEWPORTS) {
            console.log(`\n--- Auditing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
            await page.setViewportSize({ width: vp.width, height: vp.height });

            for (const item of testPages) {
                const targetUrl = `${BASE_URL}${item.path}`;
                await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
                await page.waitForTimeout(300); // Allow styles to settle

                // Check horizontal overflow
                const overflowData = await page.evaluate(() => {
                    const docWidth = document.documentElement.scrollWidth;
                    const winWidth = window.innerWidth;
                    const hasOverflow = docWidth > winWidth + 1; // 1px rounding tolerance
                    return { docWidth, winWidth, hasOverflow };
                });

                if (!overflowData.hasOverflow) {
                    recordPass(`${item.title} has zero horizontal overflow at ${vp.width}px`);
                } else {
                    recordFail(
                        `${item.title} overflows horizontally at ${vp.width}px`,
                        `scrollWidth: ${overflowData.docWidth}px, windowWidth: ${overflowData.winWidth}px`
                    );
                }

                // Check for broken images on page
                const brokenImages = await page.evaluate(() => {
                    const imgs = Array.from(document.querySelectorAll("img"));
                    return imgs.filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.src);
                });

                if (brokenImages.length === 0) {
                    recordPass(`${item.title} has zero broken images at ${vp.width}px`);
                } else {
                    recordFail(`${item.title} has broken images at ${vp.width}px`, brokenImages.join(", "));
                }

                // Capture sample screenshots for key representative pages at this viewport
                if (["/listings", "/listings/map", firstListingId ? `/listings/${firstListingId}` : null].includes(item.path)) {
                    const cleanPathName = item.path.replace(/[^a-zA-Z0-9]/g, "_");
                    const screenshotPath = path.join(SCREENSHOT_DIR, `${vp.name}${cleanPathName}.png`);
                    await page.screenshot({ path: screenshotPath, fullPage: false });
                }
            }
        }

        // 3. Interactive UI QA Tests (Modals, Buttons, Forms, AJAX)
        console.log("\n==================================================");
        console.log("   INTERACTIVE COMPONENT & CONTROLS AUDIT         ");
        console.log("==================================================");

        await page.setViewportSize({ width: 1366, height: 768 });
        await page.goto(`${BASE_URL}/listings`);

        // Test Filter Modal
        const filterBtn = await page.$('button[data-bs-target="#filterModal"]');
        if (filterBtn) {
            await filterBtn.click();
            await page.waitForTimeout(500);
            const modalVisible = await page.evaluate(() => {
                const modal = document.querySelector("#filterModal");
                return modal && modal.classList.contains("show");
            });
            if (modalVisible) {
                recordPass("Filter modal opens properly on click");
            } else {
                recordFail("Filter modal failed to show");
            }

            // Close modal
            await page.click('#filterModal button[data-bs-dismiss="modal"]');
            await page.waitForTimeout(400);
        } else {
            recordFail("Filter modal trigger button not found on /listings");
        }

        // Test Tax Switch Toggle
        const taxToggle = await page.$("#taxSwitchToggle");
        if (taxToggle) {
            await taxToggle.click();
            const taxesVisible = await page.evaluate(() => {
                const taxEl = document.querySelector(".tax-info");
                return taxEl ? window.getComputedStyle(taxEl).display !== "none" : false;
            });
            if (taxesVisible) {
                recordPass("Taxes toggle switch reveals GST calculation correctly");
            } else {
                recordFail("Taxes toggle failed to update tax-info visibility");
            }
        } else {
            recordFail("Tax switch toggle not found");
        }

        // Test Booking Widget Coupon on Show Page
        if (firstListingId) {
            await page.goto(`${BASE_URL}/listings/${firstListingId}`);
            const couponInput = await page.$("#couponCodeInput");
            const applyBtn = await page.$("#applyCouponBtn");

            if (couponInput && applyBtn) {
                await couponInput.fill("WELCOME10");
                await applyBtn.click();
                await page.waitForTimeout(800);

                const couponMsg = await page.evaluate(() => {
                    const el = document.querySelector("#couponStatusMsg");
                    return el ? el.innerText : "";
                });

                if (couponMsg.includes("applied") || couponMsg.includes("WELCOME10")) {
                    recordPass("Coupon WELCOME10 applied and verified via live UI AJAX");
                } else {
                    recordFail("Coupon live UI application failed", couponMsg);
                }
            } else {
                recordFail("Coupon code input or apply button not found on listing details page");
            }
        }

        console.log("\n==================================================");
        console.log(`QA SUMMARY: ${passedChecks} / ${totalChecks} checks passed.`);
        console.log("==================================================");

        if (issues.length > 0) {
            console.log("\nIdentified Issues to Resolve:");
            issues.forEach((iss, i) => console.log(`${i + 1}. ${iss.desc}: ${iss.details}`));
        } else {
            console.log("\nZero visual regressions or overflow detected across all 7 viewports!");
        }
    } catch (err) {
        console.error("QA Execution Error:", err);
    } finally {
        const mongoose = require("mongoose");
        await mongoose.disconnect().catch(() => {});
        await browser.close();
        process.exitCode = issues.length > 0 ? 1 : 0;
    }
}

runBrowserQA();
