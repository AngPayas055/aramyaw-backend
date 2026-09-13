import mongoose, { Schema } from "mongoose";
import type { Document, Model, Types } from "mongoose";

export type SeasonStatus =
  | "draft"
  | "registration_open"
  | "registration_closed"
  | "ongoing"
  | "completed"
  | "cancelled";

export interface ISeason extends Document {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  status: SeasonStatus;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const seasonSchema = new Schema<ISeason>(
  {
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
  },
  {
    timestamps: true,
  },
);

const Season: Model<ISeason> =
  mongoose.models.Season ||
  mongoose.model<ISeason>("Season", seasonSchema);

export default Season;