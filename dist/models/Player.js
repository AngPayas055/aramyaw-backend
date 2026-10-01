import mongoose, { Schema } from "mongoose";
const playerSchema = new Schema({
    team: {
        type: Schema.Types.ObjectId,
        ref: "Team",
        required: true,
        index: true,
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
    },
    birthDate: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/,
    },
    jerseyNumber: {
        type: Number,
        min: 0,
        max: 99,
    },
    verificationStatus: {
        type: String,
        enum: ["unverified", "verified"],
        default: "unverified",
        required: true,
    },
    playingStatus: {
        type: String,
        enum: ["allowed", "suspended", "banned"],
        default: "allowed",
        required: true,
    },
    statusReason: {
        type: String,
        trim: true,
        maxlength: 500,
    },
    suspensionUntil: {
        type: String,
        match: /^\d{4}-\d{2}-\d{2}$/,
    },
    verifiedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    verifiedAt: Date,
    statusUpdatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    statusUpdatedAt: Date,
}, { timestamps: true });
const Player = mongoose.models.Player || mongoose.model("Player", playerSchema);
export default Player;
