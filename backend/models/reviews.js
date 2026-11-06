const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    comment: String,
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    isVerifiedGuest: {
        type: Boolean,
        default: false
    },
    booking: {
        type: Schema.Types.ObjectId,
        ref: "Booking"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    craetedAt: {
        type: Date,
        default: Date.now
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
});

module.exports = mongoose.model("Review", reviewSchema);