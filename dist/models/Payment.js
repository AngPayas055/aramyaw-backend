import mongoose, { Schema } from "mongoose";
const paymentSchema = new Schema({
    team: {
        type: Schema.Types.ObjectId,
        ref: "Team",
        required: true,
    },
    season: {
        type: Schema.Types.ObjectId,
        ref: "Season",
        required: true,
    },
    submittedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    method: {
        type: String,
        enum: ["gcash", "maya"],
        required: true,
    },
    referenceNumber: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    amountCentavos: {
        type: Number,
        required: true,
        min: 1,
        validate: Number.isSafeInteger,
    },
    expectedAmountCentavos: {
        type: Number,
        required: true,
        min: 1,
        validate: Number.isSafeInteger,
    },
    paidAt: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "paid", "rejected"],
        default: "pending",
        required: true,
    },
    // Pending and paid submissions reserve the team and reference.
    // Rejection releases them, allowing another submission.
    active: {
        type: Boolean,
        default: true,
        required: true,
    },
    reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    reviewedAt: Date,
    rejectionReason: {
        type: String,
        trim: true,
        maxlength: 500,
    },
}, { timestamps: true });
// Prevent concurrent submissions or paying the same team twice.
paymentSchema.index({ team: 1 }, { unique: true, partialFilterExpression: { active: true } });
// Prevent an active reference from being claimed twice.
paymentSchema.index({ method: 1, referenceNumber: 1 }, { unique: true, partialFilterExpression: { active: true } });
paymentSchema.index({ season: 1, status: 1, createdAt: -1 });
paymentSchema.index({ team: 1, createdAt: -1 });
const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
