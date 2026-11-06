const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./reviews.js");
const { urlencoded } = require("express");
const listingSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: String,
    image: {
        url: String,
        filename: String
    },
    price: Number,
    location: String,
    country: String,
    reviews: [  //array of review ids
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review"
        }
    ],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    geometry: {
        type: {
            type: String,
            enum: ["Point"],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    category: {
        type: String
    },
    maxGuests: {
        type: Number,
        default: 4
    },
    amenities: {
        type: [String],
        default: ["WiFi", "Kitchen", "Free parking", "Air conditioning", "Pool"]
    },
    blockedDates: [
        {
            type: Date
        }
    ],
    averageRating: {
        type: Number,
        default: 4.8
    },
    reviewsCount: {
        type: Number,
        default: 0
    }
});


listingSchema.post("findOneAndDelete", async (ldeleisting) => {   //middleware to delete associated reviews when a listing is deleted
    if (ldeleisting) {
        await Review.deleteMany({ _id: { $in: ldeleisting.reviews } });
    }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;