import mongoose, { Schema } from "mongoose";
import type { Document, Model, Types } from "mongoose";

export type TeamStatus = "pending" | "approved" | "rejected";

export interface ITeam extends Document {
  season: Types.ObjectId;
  division: Types.ObjectId;
  manager: Types.ObjectId;
  name: string;
  barangay: string;
  coach: {
    firstName: string;
    lastName: string;
    email: string;
    contactNumber: string;
  };
  assistantCoach?: string;
  notes?: string;
  status: TeamStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>(
  {
    season: {
      type: Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },

    division: {
      type: Schema.Types.ObjectId,
      ref: "Division",
      required: true,
    },

    // The signed-in user who submitted and manages this registration.
    manager: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    barangay: {
      type: String,
      required: true,
      trim: true,
    },

    coach: {
      firstName: {
        type: String,
        required: true,
        trim: true,
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
      contactNumber: {
        type: String,
        required: true,
        trim: true,
      },
    },

    assistantCoach: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
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
    },
  },
  {
    timestamps: true,
  },
);

// A manager can find all their registrations efficiently.
teamSchema.index({ manager: 1, createdAt: -1 });

// Prevent the same team name from being registered twice in a division,
// including names that differ only by capitalization.
teamSchema.index(
  { season: 1, division: 1, name: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
  },
);

const Team: Model<ITeam> =
  mongoose.models.Team || mongoose.model<ITeam>("Team", teamSchema);

export default Team;