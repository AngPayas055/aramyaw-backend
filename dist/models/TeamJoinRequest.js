import mongoose, { Schema } from "mongoose";
const teamJoinRequestSchema = new Schema({
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    player: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
        type: String,
        enum: ["pending", "approved", "declined"],
        default: "pending",
        required: true,
    },
}, { timestamps: true });
teamJoinRequestSchema.index({ team: 1, player: 1 }, { unique: true, partialFilterExpression: { status: "pending" } });
export default mongoose.model("TeamJoinRequest", teamJoinRequestSchema);
