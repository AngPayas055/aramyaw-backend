import mongoose, { Schema } from "mongoose";
const playerPaymentSchema = new Schema({
    player: { type: Schema.Types.ObjectId, ref: "User", required: true },
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    season: { type: Schema.Types.ObjectId, ref: "Season", required: true },
    division: { type: Schema.Types.ObjectId, ref: "Division", required: true },
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
    expectedAmountCentavos: {
        type: Number,
        required: true,
        min: 1,
        validate: Number.isSafeInteger,
    },
    paidAt: { type: Date, required: true },
    status: {
        type: String,
        enum: ["pending", "paid", "rejected"],
        default: "pending",
        required: true,
    },
    active: { type: Boolean, default: true, required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    rejectionReason: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });
playerPaymentSchema.index({ player: 1, season: 1, division: 1 }, { unique: true, partialFilterExpression: { active: true } });
playerPaymentSchema.index({ method: 1, referenceNumber: 1 }, { unique: true, partialFilterExpression: { active: true } });
export default mongoose.model("PlayerPayment", playerPaymentSchema);
