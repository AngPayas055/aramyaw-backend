import mongoose, { Schema } from "mongoose";
const seasonSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
        default: "",
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    registrationOpensAt: {
        type: Date,
        required: true,
    },
    registrationClosesAt: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: [
            "draft",
            "registration_open",
            "registration_closed",
            "ongoing",
            "completed",
            "cancelled",
        ],
        default: "draft",
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
});
const Season = mongoose.models.Season ||
    mongoose.model("Season", seasonSchema);
export default Season;
