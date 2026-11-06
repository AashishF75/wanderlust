const express = require('express');
const router = express.Router({ mergeParams: true });//mergeParams is used to access the params from the parent route
const wrapAsync = require("../utils/wrapAsync");//async error handling utility import
const ExpressError = require("../utils/Expresserr");
const listing = require("../models/list.js");//mongoose model import
const Review = require("../models/reviews.js");//review model import
const listings = require("../routes/listing.js");//listing routes import
const { validateReview, isLoggedIn, isReviewAuthor } = require("../middleware.js");
const allcontrollreview = require("../controllers/review.js");




// POST Review
router.post("/", isLoggedIn, validateReview, wrapAsync(allcontrollreview.postreview));

// GET Edit Review Form
router.get("/:revId/edit", isLoggedIn, isReviewAuthor, wrapAsync(allcontrollreview.renderEditReview));

// PUT Update Review
router.put("/:revId", isLoggedIn, isReviewAuthor, validateReview, wrapAsync(allcontrollreview.updatereview));

// DELETE Review
router.delete("/:revId", isLoggedIn, isReviewAuthor, wrapAsync(allcontrollreview.deletereview));

module.exports = router;
