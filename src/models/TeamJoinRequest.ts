import mongoose, { Schema } from "mongoose";
import type { Types } from "mongoose";

interface ITeamJoinRequest {
  team: Types.ObjectId;
  player: Types.ObjectId;
  status: "pending" | "approved" | "declined";
}

const teamJoinRequestSchema = new Schema<ITeamJoinRequest>(
  {
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    player: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "declined"],
      default: "pending",
      required: true,
    },
  },
  { timestamps: true },
);

teamJoinRequestSchema.index(
  { team: 1, player: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);

export default mongoose.model<ITeamJoinRequest>(
  "TeamJoinRequest",
  teamJoinRequestSchema,
);