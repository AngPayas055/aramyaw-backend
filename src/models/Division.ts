import mongoose, { Schema } from "mongoose";
import type { Document, Model, Types } from "mongoose";

export type TournamentFormat =
  | "single_round_robin"
  | "double_round_robin"
  | "single_elimination"
  | "round_robin_playoffs";

export interface IDivision extends Document {
  season: Types.ObjectId;
  name: string;
  description: string;
  minAge?: number;
  maxAge?: number;
  ageCutoffDate?: Date;
  maxTeams: number;
  minPlayers: number;
  maxPlayers: number;
  registrationFeeCentavos: number;
  tournamentFormat: TournamentFormat;
  playoffTeams?: number;
  registrationEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const divisionSchema = new Schema<IDivision>(
  {
    season: {
      type: Schema.Types.ObjectId,
      ref: "Season",
      required: true,
      index: true,
    },

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

    // Omit age limits for an unrestricted division.
    minAge: {
      type: Number,
      min: 0,
    },

    maxAge: {
      type: Number,
      min: 0,
    },

    // Calculate player eligibility using age on this date.
    ageCutoffDate: {
      type: Date,
    },

    maxTeams: {
      type: Number,
      required: true,
      min: 2,
    },

    minPlayers: {
      type: Number,
      required: true,
      min: 5,
      default: 5,
    },

    maxPlayers: {
      type: Number,
      required: true,
      min: 5,
      default: 15,
    },

    // PHP amounts in centavos: ₱1,500 = 150000.
    registrationFeeCentavos: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    tournamentFormat: {
      type: String,
      enum: [
        "single_round_robin",
        "double_round_robin",
        "single_elimination",
        "round_robin_playoffs",
      ],
      required: true,
      default: "single_round_robin",
    },

    playoffTeams: {
      type: Number,
      min: 2,
      required: function (this: IDivision): boolean {
        return this.tournamentFormat === "round_robin_playoffs";
      },
    },

    registrationEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate names within a season, ignoring capitalization.
divisionSchema.index(
  { season: 1, name: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
  },
);

const Division: Model<IDivision> =
  mongoose.models.Division ||
  mongoose.model<IDivision>("Division", divisionSchema);

export default Division;