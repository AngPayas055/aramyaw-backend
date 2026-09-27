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
}, { timestamps: true });
const Player = mongoose.models.Player || mongoose.model("Player", playerSchema);
export default Player;
