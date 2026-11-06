const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../middleware");
const wishlistController = require("../controllers/wishlist");

// GET /wishlist - View saved properties
router.route("/")
    .get(isLoggedIn, wrapAsync(wishlistController.renderWishlist));

// POST /wishlist/:listingId - Add to wishlist
// DELETE /wishlist/:listingId - Remove from wishlist
router.route("/:listingId")
    .post(isLoggedIn, wrapAsync(wishlistController.addToWishlist))
    .delete(isLoggedIn, wrapAsync(wishlistController.removeFromWishlist));

module.exports = router;

