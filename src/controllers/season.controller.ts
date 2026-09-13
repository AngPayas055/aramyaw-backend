import type { Request, Response } from "express";
import mongoose from "mongoose";
import Season from "../models/Season.ts";
import type { SeasonStatus } from "../models/Season.ts";

function isSeasonStatus(value: unknown): value is SeasonStatus {
  return (
    value === "draft" ||
    value === "registration_open" ||
    value === "registration_closed" ||
    value === "ongoing" ||
    value === "completed" ||
    value === "cancelled"
  );
}

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    _id?: string;
  };
};

const editableFields = [
  "name",
  "description",
  "startDate",
  "endDate",
  "registrationOpensAt",
  "registrationClosesAt",
  "status",
] as const;

function pickFields(body: Record<string, unknown>) {
  return Object.fromEntries(
    editableFields
      .filter((field) => body[field] !== undefined)
      .map((field) => [field, body[field]]),
  );
}

function validateDates(season: {
  startDate: Date;
  endDate: Date;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
}) {
  const dates = [
    season.startDate,
    season.endDate,
    season.registrationOpensAt,
    season.registrationClosesAt,
  ];

  if (
    dates.some(
      (date) =>
        !(date instanceof Date) || !Number.isFinite(date.getTime()),
    )
  ) {
    return "Provide valid season and registration dates.";
  }

  if (season.endDate < season.startDate) {
    return "End date must be on or after the start date.";
  }

  if (season.registrationClosesAt <= season.registrationOpensAt) {
    return "Registration closing date must be after the opening date.";
  }

  return null;
}

function handleError(error: unknown, res: Response) {
  if (
    error instanceof mongoose.Error.ValidationError ||
    error instanceof mongoose.Error.CastError
  ) {
    res.status(400).json({ message: error.message });
    return;
  }

  console.error("Season controller error:", error);

  res.status(500).json({
    message: "Something went wrong while processing the season.",
  });
}

export async function createSeason(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    // Adjust this to match the user payload set by your auth middleware.
    const userId = req.user?.id ?? req.user?._id;

    if (!userId || !mongoose.isObjectIdOrHexString(userId)) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const season = new Season({
      ...pickFields(req.body ?? {}),
      status: "draft",
      createdBy: userId,
    });

    await season.validate();

    const dateError = validateDates(season);

    if (dateError) {
      res.status(400).json({ message: dateError });
      return;
    }

    await season.save();

    res.status(201).json({
      message: "Season created successfully.",
      season,
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getSeasons(
  req: Request,
  res: Response,
): Promise<void> {
  try {
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

    const filter: { status?: SeasonStatus } = {};
    const status = req.query.status;

    if (status !== undefined) {
      if (!isSeasonStatus(status)) {
        res.status(400).json({
          message: "Invalid season status.",
        });
        return;
      }

      filter.status = status;
    }

    const [seasons, total] = await Promise.all([
      Season.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Season.countDocuments(filter),
    ]);

    res.status(200).json({
      seasons,
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

export async function getSeasonById(
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

    res.status(200).json({ season });
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateSeason(
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

    const updates = pickFields(req.body ?? {});

    if (!Object.keys(updates).length) {
      res.status(400).json({
        message: "Provide at least one editable season field.",
      });
      return;
    }

    season.set(updates);

    await season.validate();

    const dateError = validateDates(season);

    if (dateError) {
      res.status(400).json({ message: dateError });
      return;
    }

    await season.save();

    res.status(200).json({
      message: "Season updated successfully.",
      season,
    });
  } catch (error) {
    handleError(error, res);
  }
}