const Listing = require("../models/list");
const Review = require("../models/reviews");
const Booking = require("../models/booking");
const Notification = require("../models/notification");

// Helper to recalculate listing rating stats
async function updateListingRatingStats(listingId) {
    const listingDoc = await Listing.findById(listingId).populate("reviews");
    if (!listingDoc) return;

    if (listingDoc.reviews && listingDoc.reviews.length > 0) {
        const sum = listingDoc.reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
        listingDoc.averageRating = Number((sum / listingDoc.reviews.length).toFixed(1));
        listingDoc.reviewsCount = listingDoc.reviews.length;
    } else {
        listingDoc.averageRating = 0;
        listingDoc.reviewsCount = 0;
    }
    await listingDoc.save();
}

// POST /listings/:id/reviews
module.exports.postreview = async (req, res) => {
    const { id } = req.params;
    const foundlisting = await Listing.findById(id);

    if (!foundlisting) {
        req.flash("error", "Listing not found.");
        return res.redirect("/listings");
    }

    // Check if user has a confirmed booking for verified guest status
    const verifiedBooking = await Booking.findOne({
        listing: id,
        user: req.user._id,
        status: "Confirmed"
    });

    // Check if only verified guests requirement is strictly enforced
    if (!verifiedBooking && req.user.role !== "admin") {
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(403).json({
                success: false,
                message: "Only verified guests who have booked this stay can leave a review."
            });
        }
        req.flash("error", "Only verified guests who have completed or confirmed a booking for this stay can post a review.");
        return res.redirect(`/listings/${id}`);
    }

    const ratingVal = Math.min(5, Math.max(1, parseInt(req.body.review.rating, 10) || 5));
    const newReview = new Review({
        comment: req.body.review.comment,
        rating: ratingVal,
        author: req.user._id,
        isVerifiedGuest: !!verifiedBooking,
        booking: verifiedBooking ? verifiedBooking._id : null
    });

    foundlisting.reviews.push(newReview);
    await newReview.save();
    await foundlisting.save();

    // Recalculate listing rating stats
    await updateListingRatingStats(id);

    // Notify listing host
    if (foundlisting.owner && !foundlisting.owner.equals(req.user._id)) {
        await Notification.create({
            user: foundlisting.owner,
            sender: req.user._id,
            title: "New Review Received",
            message: `${req.user.username} left a ${ratingVal}-star review on "${foundlisting.title}".`,
            type: "review_posted",
            link: `/listings/${id}`
        }).catch(() => {});
    }

    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.status(201).json({
            success: true,
            message: "Review posted successfully!",
            review: newReview
        });
    }

    req.flash("success", "Your verified review has been posted!");
    res.redirect(`/listings/${id}`);
};

// GET /listings/:id/reviews/:revId/edit
module.exports.renderEditReview = async (req, res) => {
    const { id, revId } = req.params;
    const review = await Review.findById(revId);
    const listingDoc = await Listing.findById(id);

    if (!review || !listingDoc) {
        req.flash("error", "Review or listing not found.");
        return res.redirect(`/listings/${id}`);
    }

    res.render("reviews/edit.ejs", { listing: listingDoc, review });
};

// PUT /listings/:id/reviews/:revId
module.exports.updatereview = async (req, res) => {
    const { id, revId } = req.params;
    const ratingVal = Math.min(5, Math.max(1, parseInt(req.body.review.rating, 10) || 5));

    await Review.findByIdAndUpdate(revId, {
        comment: req.body.review.comment,
        rating: ratingVal
    });

    await updateListingRatingStats(id);

    req.flash("success", "Review updated successfully!");
    res.redirect(`/listings/${id}`);
};

// DELETE /listings/:id/reviews/:revId
module.exports.deletereview = async (req, res) => {
    const { id, revId } = req.params;

    await Listing.findByIdAndUpdate(id, {
        $pull: { reviews: revId }
    });

    await Review.findByIdAndDelete(revId);
    await updateListingRatingStats(id);

    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.json({ success: true, message: "Review deleted successfully." });
    }

    req.flash("success", "Review removed!");
    res.redirect(`/listings/${id}`);
};
