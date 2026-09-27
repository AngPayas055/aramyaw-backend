import mongoose, { Schema } from "mongoose";
import type { Document, Model, Types } from "mongoose";

export interface IPlayer extends Document {
  team: Types.ObjectId;
  firstName: string;
  lastName: string;
  birthDate: string;
  jerseyNumber?: number;
  createdAt: Date;
}

const playerSchema = new Schema<IPlayer>(
  {
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
  },
  { timestamps: true },
);

const Player: Model<IPlayer> =
  mongoose.models.Player || mongoose.model<IPlayer>("Player", playerSchema);

export default Player;