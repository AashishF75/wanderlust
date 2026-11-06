const Listing = require("../models/list");
const Booking = require("../models/booking");
const mxbGeocoading = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mxbGeocoading({ accessToken: mapToken });

// 1. GET /listings - Explore / Homepage listings with categories & recently viewed
module.exports.index = async (req, res) => {
    let { category, sort } = req.query;
    let filter = {};
    if (category) {
        filter.category = category;
    }

    let queryObj = Listing.find(filter);

    // Sorting
    if (sort === "price_asc") {
        queryObj = queryObj.sort({ price: 1 });
    } else if (sort === "price_desc") {
        queryObj = queryObj.sort({ price: -1 });
    } else if (sort === "rating_desc") {
        queryObj = queryObj.sort({ averageRating: -1 });
    } else {
        queryObj = queryObj.sort({ _id: -1 });
    }

    const alllistings = await queryObj;

    // Recently viewed properties (Feature 8)
    let recentlyViewedListings = [];
    if (req.session.recentlyViewed && req.session.recentlyViewed.length > 0) {
        recentlyViewedListings = await Listing.find({ _id: { $in: req.session.recentlyViewed } });
    }

    res.render("listings/index.ejs", {
        alllistings,
        category: category || null,
        recentlyViewedListings,
        currentSort: sort || "default"
    });
};

// 2. GET /listings/search - Advanced multi-parameter search & filters (Feature 2)
module.exports.searchListing = async (req, res) => {
    let { q, category, minPrice, maxPrice, guests, amenity, sort } = req.query;
    let filter = {};

    // Destination text query
    if (q && q.trim()) {
        const query = q.trim();
        filter.$or = [
            { title: { $regex: query, $options: "i" } },
            { location: { $regex: query, $options: "i" } },
            { country: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ];
    }

    // Category filter
    if (category) {
        filter.category = category;
    }

    // Price range filters
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Guest capacity
    if (guests) {
        filter.maxGuests = { $gte: Number(guests) };
    }

    // Amenities filtering
    if (amenity) {
        filter.amenities = { $in: [amenity] };
    }

    let queryObj = Listing.find(filter);

    // Sorting
    if (sort === "price_asc") {
        queryObj = queryObj.sort({ price: 1 });
    } else if (sort === "price_desc") {
        queryObj = queryObj.sort({ price: -1 });
    } else if (sort === "rating_desc") {
        queryObj = queryObj.sort({ averageRating: -1 });
    } else {
        queryObj = queryObj.sort({ _id: -1 });
    }

    const alllistings = await queryObj;

    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.json({
            success: true,
            count: alllistings.length,
            listings: alllistings
        });
    }

    res.render("listings/index.ejs", {
        alllistings,
        category: category || null,
        searchQuery: q || "",
        recentlyViewedListings: [],
        currentSort: sort || "default"
    });
};

// 3. GET /listings/map - Interactive Map View (Feature 3)
module.exports.renderMapExplore = async (req, res) => {
    const alllistings = await Listing.find({
        "geometry.coordinates": { $exists: true, $ne: [] }
    });

    res.render("listings/map.ejs", {
        alllistings,
        MAP_TOKEN: process.env.MAP_TOKEN || ""
    });
};

// 4. GET /listings/new - Create form
module.exports.rendernewform = (req, res) => {
    res.render("listings/new.ejs");
};

// 5. POST /listings - Create new listing
module.exports.createlisting = async (req, res) => {
    let response = await geocodingClient.forwardGeocode({
        query: req.body.listing.location,
        limit: 1
    }).send();

    let url = req.file ? req.file.path : "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80";
    let filename = req.file ? req.file.filename : "default-listing-image";

    const newlisting = new Listing(req.body.listing);
    newlisting.owner = req.user._id;
    newlisting.image = { url, filename };

    if (response.body.features && response.body.features.length > 0) {
        newlisting.geometry = response.body.features[0].geometry;
    } else {
        newlisting.geometry = { type: "Point", coordinates: [73.7667, 15.5167] }; // Default coordinates
    }

    // Default amenities if none provided
    if (!newlisting.amenities || newlisting.amenities.length === 0) {
        newlisting.amenities = ["WiFi", "Kitchen", "Free parking", "Air conditioning", "Pool"];
    }

    let savedListing = await newlisting.save();
    req.flash("success", "New listing created!");
    res.redirect("/listings");
};

// 6. GET /listings/:id/edit - Edit form
module.exports.editlisting = async (req, res) => {
    let { id } = req.params;
    const listings = await Listing.findById(id);
    if (!listings) {
        req.flash("error", "Listing you requested does not exist!");
        return res.redirect("/listings");
    }
    let originalImageurl = listings.image.url;
    if (originalImageurl.includes("/upload")) {
        originalImageurl = originalImageurl.replace("/upload", "/upload/w_200");
    }

    res.render("listings/edit.ejs", { listings, originalImageurl });
};

// 7. PUT /listings/:id - Update listing
module.exports.updatereview = async (req, res) => {
    // legacy alias
    return module.exports.updatelisting(req, res);
};

module.exports.updatelisting = async (req, res) => {
    let { id } = req.params;
    const updatedata = await Listing.findByIdAndUpdate(id, req.body.listing, { runValidators: true, new: true });

    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        updatedata.image = { url, filename };
        await updatedata.save();
    }

    req.flash("success", "Listing updated!");
    res.redirect(`/listings/${id}`);
};

// 8. DELETE /listings/:id - Delete listing
module.exports.deletelisting = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing deleted!");
    res.redirect("/listings");
};

// 9. GET /listings/:id - Show details (Feature 1, 8, 10)
module.exports.showlisting = async (req, res) => {
    let { id } = req.params;

    const listings = await Listing.findById(id)
        .populate("owner")
        .populate({
            path: "reviews",
            populate: {
                path: "author"
            }
        });

    if (!listings) {
        req.flash("error", "Listing you requested does not exist!");
        return res.redirect("/listings");
    }

    // Track recently viewed listing in session (Feature 8)
    if (!req.session.recentlyViewed) {
        req.session.recentlyViewed = [];
    }
    req.session.recentlyViewed = req.session.recentlyViewed.filter(lid => lid !== id);
    req.session.recentlyViewed.unshift(id);
    if (req.session.recentlyViewed.length > 6) {
        req.session.recentlyViewed.pop();
    }

    // Check if authenticated user has a verified booking for this listing (Feature 1)
    let hasUserBooked = false;
    if (req.user) {
        const verified = await Booking.findOne({
            listing: id,
            user: req.user._id,
            status: "Confirmed"
        });
        if (verified || req.user.role === "admin") {
            hasUserBooked = true;
        }
    }

    res.render("listings/show.ejs", {
        listings,
        hasUserBooked,
        MAP_TOKEN: process.env.MAP_TOKEN
    });
};
