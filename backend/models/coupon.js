const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const couponSchema = new Schema({
    code: {
        type: String,
        required: true,
        uppercase: true,
        unique: true,
        trim: true,
        index: true
    },
    discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage"
    },
    discountValue: {
        type: Number,
        required: true,
        min: 1
    },
    minBookingAmount: {
        type: Number,
        default: 0
    },
    maxDiscount: {
        type: Number,
        default: 5000
    },
    expiresAt: {
        type: Date
    },
    usageLimit: {
        type: Number,
        default: 100
    },
    usedCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Coupon", couponSchema);

