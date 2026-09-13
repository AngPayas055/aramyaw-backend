import type { Request, Response } from "express";
import mongoose from "mongoose";

import Division from "../models/Division.ts";
import Season from "../models/Season.ts";
import type {
  IDivision,
  TournamentFormat,
} from "../models/Division.ts";

const editableFields = [
  "name",
  "description",
  "minAge",
  "maxAge",
  "ageCutoffDate",
  "maxTeams",
  "minPlayers",
  "maxPlayers",
  "registrationFeeCentavos",
  "tournamentFormat",
  "playoffTeams",
  "registrationEnabled",
] as const;

function pickFields(body: Record<string, unknown>) {
  return Object.fromEntries(
    editableFields
      .filter((field) => body[field] !== undefined)
      .map((field) => [field, body[field]]),
  );
}

function isTournamentFormat(
  value: unknown,
): value is TournamentFormat {
  return (
    value === "single_round_robin" ||
    value === "double_round_robin" ||
    value === "single_elimination" ||
    value === "round_robin_playoffs"
  );
}

function validateDivision(division: IDivision): string | null {
  const integerFields = [
    "minAge",
    "maxAge",
    "maxTeams",
    "minPlayers",
    "maxPlayers",
    "registrationFeeCentavos",
    "playoffTeams",
  ] as const;

  for (const field of integerFields) {
    const value = division[field];

    if (value !== undefined && !Number.isSafeInteger(value)) {
      return `${field} must be a safe whole number.`;
    }
  }

  if (
    division.minAge !== undefined &&
    division.maxAge !== undefined &&
    division.minAge > division.maxAge
  ) {
    return "Maximum age must be on or above the minimum age.";
  }

  if (
    (division.minAge !== undefined ||
      division.maxAge !== undefined) &&
    !division.ageCutoffDate
  ) {
    return "Age cutoff date is required for age-restricted divisions.";
  }

  if (division.maxPlayers < division.minPlayers) {
    return "Maximum players must be on or above the minimum players.";
  }

  if (division.tournamentFormat === "round_robin_playoffs") {
    if (division.playoffTeams === undefined) {
      return "Playoff teams is required for round robin playoffs.";
    }

    if (division.playoffTeams > division.maxTeams) {
      return "Playoff teams cannot exceed maximum teams.";
    }
  }

  return null;
}

function handleError(error: unknown, res: Response): void {
  if (
    error instanceof mongoose.Error.ValidationError ||
    error instanceof mongoose.Error.CastError
  ) {
    res.status(400).json({ message: error.message });
    return;
  }

  if (
    error instanceof Error &&
    "code" in error &&
    error.code === 11000
  ) {
    res.status(409).json({
      message: "A division with this name already exists in this season.",
    });
    return;
  }

  console.error("Division controller error:", error);

  res.status(500).json({
    message: "Something went wrong while processing the division.",
  });
}

export async function createDivision(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { seasonId } = req.params;

    if (!mongoose.isObjectIdOrHexString(seasonId)) {
      res.status(400).json({ message: "Invalid season ID." });
      return;
    }

    const season = await Season.findById(seasonId);

    if (!season) {
      res.status(404).json({ message: "Season not found." });
      return;
    }

    const division = new Division({
      ...pickFields(req.body ?? {}),
      season: season._id,
    });

    await division.validate();

    const validationError = validateDivision(division);

    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    await division.save();

    res.status(201).json({
      message: "Division created successfully.",
      division,
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getDivisions(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { seasonId } = req.params;

    if (!mongoose.isObjectIdOrHexString(seasonId)) {
      res.status(400).json({ message: "Invalid season ID." });
      return;
    }

    const seasonExists = await Season.exists({ _id: seasonId });

    if (!seasonExists) {
      res.status(404).json({ message: "Season not found." });
      return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 20),
    );

    if (!Number.isInteger(page) || !Number.isInteger(limit)) {
      res.status(400).json({
        message: "Page and limit must be integers.",
      });
      return;
    }

    const filter: {
      season: mongoose.Types.ObjectId;
      tournamentFormat?: TournamentFormat;
      registrationEnabled?: boolean;
    } = {
      season: new mongoose.Types.ObjectId(String(seasonId)),
    };

    const { tournamentFormat, registrationEnabled } = req.query;

    if (tournamentFormat !== undefined) {
      if (!isTournamentFormat(tournamentFormat)) {
        res.status(400).json({
          message: "Invalid tournament format.",
        });
        return;
      }

      filter.tournamentFormat = tournamentFormat;
    }

    if (registrationEnabled !== undefined) {
      if (
        registrationEnabled !== "true" &&
        registrationEnabled !== "false"
      ) {
        res.status(400).json({
          message: "Registration enabled must be true or false.",
        });
        return;
      }

      filter.registrationEnabled = registrationEnabled === "true";
    }

    const [divisions, total] = await Promise.all([
      Division.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Division.countDocuments(filter),
    ]);

    res.status(200).json({
      divisions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getDivisionById(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { divisionId } = req.params;

    if (!mongoose.isObjectIdOrHexString(divisionId)) {
      res.status(400).json({ message: "Invalid division ID." });
      return;
    }

    const division = await Division.findById(divisionId);

    if (!division) {
      res.status(404).json({ message: "Division not found." });
      return;
    }

    res.status(200).json({ division });
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateDivision(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { divisionId } = req.params;

    if (!mongoose.isObjectIdOrHexString(divisionId)) {
      res.status(400).json({ message: "Invalid division ID." });
      return;
    }

    const division = await Division.findById(divisionId);

    if (!division) {
      res.status(404).json({ message: "Division not found." });
      return;
    }

    const updates = pickFields(req.body ?? {});

    if (!Object.keys(updates).length) {
      res.status(400).json({
        message: "Provide at least one editable division field.",
      });
      return;
    }

    // Send null to remove an optional field.
    const optionalFields = [
      "minAge",
      "maxAge",
      "ageCutoffDate",
      "playoffTeams",
    ] as const;

    for (const field of optionalFields) {
      if (updates[field] === null) {
        updates[field] = undefined;
      }
    }

    division.set(updates);

    await division.validate();

    const validationError = validateDivision(division);

    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    await division.save();

    res.status(200).json({
      message: "Division updated successfully.",
      division,
    });
  } catch (error) {
    handleError(error, res);
  }
}