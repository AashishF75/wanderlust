const Listing = require('./models/list');
const Review = require('./models/reviews');


const ExpressError = require("./utils/Expresserr");
const { listingSchema, reviewSchema } = require("./schema.js");//joi schema import

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        // Return 401 JSON for AJAX / API requests
        if (req.xhr || (req.headers.accept && req.headers.accept.includes("application/json")) || (req.headers["content-type"] && req.headers["content-type"].includes("application/json"))) {
            return res.status(401).json({
                success: false,
                message: "You must be logged in to perform this action.",
                redirectUrl: "/login"
            });
        }
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in first!");
        return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
};

module.exports.isowner = async (req, res, next) => {
    let { id } = req.params;

    const foundListing = await Listing.findById(id);

    if (!foundListing.owner.equals(req.user._id)) {
        req.flash("error", "You are not woner!!");
        return res.redirect(`/listings/${id}`);
    }

    next();
};

module.exports.validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        let errmsg = error.details.map(el => el.message).join(",");
        throw new ExpressError(errmsg, 400);
    } else {
        next();
    }
}

module.exports.validateReview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);
    if (error) {
        let errmsg = error.details.map(el => el.message).join(",");
        throw new ExpressError(errmsg, 400);
    } else {
        next();
    }
}



module.exports.isReviewAuthor = async (req, res, next) => {
    let { id, revId } = req.params;   // ✅ correct param

    const review = await Review.findById(revId);

    if (!review) {
        req.flash("error", "Review not found!");
        return res.redirect(`/listings/${id}`);
    }

    if (!review.author.equals(req.user._id)) {   // ✅ correct user check
        req.flash("error", "You are not the author of this review!");
        return res.redirect(`/listings/${id}`);
    }

    next();
};

module.exports.isAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in as an administrator.");
        return res.redirect("/login");
    }
    if (req.user.role !== "admin") {
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(403).json({ success: false, message: "Admin privileges required." });
        }
        req.flash("error", "Access denied: Administrator privileges required.");
        return res.redirect("/listings");
    }
    next();
};

module.exports.isVerifiedGuestForReview = async (req, res, next) => {
    const { id } = req.params;
    const Booking = require("./models/booking");

    // Check if user has a confirmed booking for this listing
    const booking = await Booking.findOne({
        listing: id,
        user: req.user._id,
        status: "Confirmed"
    });

    if (!booking) {
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(403).json({
                success: false,
                message: "Only verified guests who have booked this stay can leave a review."
            });
        }
        req.flash("error", "Only verified guests who have booked this stay can leave a review.");
        return res.redirect(`/listings/${id}`);
    }

    req.verifiedBooking = booking;
    next();
};