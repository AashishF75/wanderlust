const mongoose = require("mongoose");
const User = require("../models/user");
const Listing = require("../models/list");

// GET /wishlist - Render user's saved listings page
module.exports.renderWishlist = async (req, res) => {
    const user = await User.findById(req.user._id).populate({
        path: "wishlist",
        populate: {
            path: "reviews"
        }
    });

    if (!user) {
        req.flash("error", "User not found.");
        return res.redirect("/listings");
    }

    // Filter out any deleted/stale listings that may still be in the array
    const validWishlist = (user.wishlist || []).filter(listing => listing != null);

    // If stale items were filtered, clean up the array in the background
    if (user.wishlist && validWishlist.length !== user.wishlist.length) {
        await User.findByIdAndUpdate(req.user._id, {
            $set: { wishlist: validWishlist.map(l => l._id) }
        });
    }

    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.json({
            success: true,
            count: validWishlist.length,
            wishlist: validWishlist
        });
    }

    res.render("wishlist/index.ejs", {
        wishlistListings: validWishlist,
        pageTitle: "Your Saved Stays"
    });
};

// POST /wishlist/:listingId - Save a listing to user's wishlist
module.exports.addToWishlist = async (req, res) => {
    const { listingId } = req.params;

    // 1. Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(400).json({
                success: false,
                message: "Invalid listing ID format."
            });
        }
        req.flash("error", "Invalid listing ID format.");
        return res.redirect("/listings");
    }

    // 2. Verify listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(404).json({
                success: false,
                message: "Listing not found."
            });
        }
        req.flash("error", "Listing not found.");
        return res.redirect("/listings");
    }

    // 3. Atomically add to wishlist (prevent duplicates with $addToSet)
    await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { wishlist: listing._id }
    });

    // Sync session user
    if (req.user) {
        if (!req.user.wishlist) req.user.wishlist = [];
        if (!req.user.wishlist.some(id => id.toString() === listing._id.toString())) {
            req.user.wishlist.push(listing._id);
        }
    }

    // 4. Return response
    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.status(200).json({
            success: true,
            isWishlisted: true,
            message: "Property saved to your wishlist!",
            listingId: listing._id
        });
    }

    req.flash("success", "Saved to your wishlist!");
    res.redirect(req.get("referer") || "/wishlist");
};

// DELETE /wishlist/:listingId - Remove a listing from user's wishlist
module.exports.removeFromWishlist = async (req, res) => {
    const { listingId } = req.params;

    // 1. Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(400).json({
                success: false,
                message: "Invalid listing ID format."
            });
        }
        req.flash("error", "Invalid listing ID format.");
        return res.redirect("/wishlist");
    }

    // 2. Atomically pull from user's wishlist
    await User.findByIdAndUpdate(req.user._id, {
        $pull: { wishlist: listingId }
    });

    // Sync session user
    if (req.user && req.user.wishlist) {
        req.user.wishlist = req.user.wishlist.filter(id => id.toString() !== listingId.toString());
    }

    // 3. Return response
    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.status(200).json({
            success: true,
            isWishlisted: false,
            message: "Property removed from wishlist.",
            listingId: listingId
        });
    }

    req.flash("success", "Removed from wishlist!");
    res.redirect(req.get("referer") || "/wishlist");
};

