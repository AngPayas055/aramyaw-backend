import type { Request, Response } from "express";
import mongoose from "mongoose";

import Team from "../models/Team.ts";
import Division from "../models/Division.ts";
import Player from "../models/Player.ts";

type AuthRequest = Request & {
  user?: { id?: string };
};

async function ownedTeam(req: AuthRequest, res: Response) {
  const { seasonId, teamId } = req.params;

  if (
    !mongoose.isObjectIdOrHexString(seasonId) ||
    !mongoose.isObjectIdOrHexString(teamId)
  ) {
    res.status(400).json({ message: "Invalid team ID." });
    return null;
  }

  const team = await Team.findOne({
    _id: teamId,
    season: seasonId,
    manager: req.user?.id,
  });

  if (!team) {
    res.status(404).json({ message: "Team not found." });
  }

  return team;
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date <= new Date()
  );
}

function ageAt(birthDate: string, cutoff: Date): number {
  const [year, month, day] = birthDate.split("-").map(Number);

  let age = cutoff.getUTCFullYear() - year;

  if (
    cutoff.getUTCMonth() + 1 < month ||
    (cutoff.getUTCMonth() + 1 === month && cutoff.getUTCDate() < day)
  ) {
    age--;
  }

  return age;
}

function parsePlayer(
  body: Record<string, unknown>,
  division: {
    minAge?: number;
    maxAge?: number;
    ageCutoffDate?: Date;
  },
) {
  const firstName =
    typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName =
    typeof body.lastName === "string" ? body.lastName.trim() : "";

  if (
    !firstName ||
    !lastName ||
    firstName.length > 80 ||
    lastName.length > 80 ||
    !validDate(body.birthDate)
  ) {
    return { error: "Enter a valid name and birth date." };
  }

  const age = ageAt(
    body.birthDate,
    division.ageCutoffDate || new Date(),
  );
  if (
    (division.minAge != null && age < division.minAge) ||
    (division.maxAge != null && age > division.maxAge)
  ) {
    return {
      error: `Player must be within the division age range (${division.minAge ?? 0}–${division.maxAge ?? "above"}) on the cutoff date.`,
    };
  }

  const jerseyNumber =
    body.jerseyNumber === "" || body.jerseyNumber == null
      ? undefined
      : Number(body.jerseyNumber);

  if (
    jerseyNumber != null &&
    (!Number.isInteger(jerseyNumber) ||
      jerseyNumber < 0 ||
      jerseyNumber > 99)
  ) {
    return { error: "Jersey number must be between 0 and 99." };
  }

  return {
    values: {
      firstName,
      lastName,
      birthDate: body.birthDate,
      jerseyNumber,
    },
  };
}

export async function listPlayers(req: AuthRequest, res: Response) {
  try {
    const team = await ownedTeam(req, res);
    if (!team) return;

    const players = await Player.find({ team: team._id }).sort({
      createdAt: 1,
    });

    res.json({ players });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load players." });
  }
}

export async function createPlayer(req: AuthRequest, res: Response) {
  try {
    const team = await ownedTeam(req, res);
    if (!team) return;

    const division = await Division.findById(team.division);

    if (!division) {
      res.status(404).json({ message: "Division not found." });
      return;
    }

    const parsed = parsePlayer(req.body ?? {}, division);

    if (parsed.error) {
      res.status(400).json({ message: parsed.error });
      return;
    }

    const playerCount = await Player.countDocuments({ team: team._id });

    if (playerCount >= division.maxPlayers) {
      res.status(409).json({
        message: "This team has reached the division player limit.",
      });
      return;
    }

    const player = await Player.create({
      team: team._id,
      ...parsed.values,
    });

    res.status(201).json({ player });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add player." });
  }
}

export async function updatePlayer(req: AuthRequest, res: Response) {
  try {
    const team = await ownedTeam(req, res);
    if (!team) return;

    if (!mongoose.isObjectIdOrHexString(req.params.playerId)) {
      res.status(400).json({ message: "Invalid player ID." });
      return;
    }

    const player = await Player.findOne({
      _id: req.params.playerId,
      team: team._id,
    });

    if (!player) {
      res.status(404).json({ message: "Player not found." });
      return;
    }

    const division = await Division.findById(team.division);

    if (!division) {
      res.status(404).json({ message: "Division not found." });
      return;
    }

    const parsed = parsePlayer(req.body ?? {}, division);

    if (parsed.error) {
      res.status(400).json({ message: parsed.error });
      return;
    }

    Object.assign(player, parsed.values);
    await player.save();

    res.json({ player });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update player." });
  }
}

export async function deletePlayer(req: AuthRequest, res: Response) {
  try {
    const team = await ownedTeam(req, res);
    if (!team) return;

    if (!mongoose.isObjectIdOrHexString(req.params.playerId)) {
      res.status(400).json({ message: "Invalid player ID." });
      return;
    }

    const player = await Player.findOneAndDelete({
      _id: req.params.playerId,
      team: team._id,
    });

    if (!player) {
      res.status(404).json({ message: "Player not found." });
      return;
    }

    res.json({ message: "Player removed." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to remove player." });
  }
}

export async function listTeamPlayersForAdmin(
  req: Request,
  res: Response,
) {
  try {
    const { seasonId, teamId } = req.params;

    if (
      !mongoose.isObjectIdOrHexString(seasonId) ||
      !mongoose.isObjectIdOrHexString(teamId)
    ) {
      res.status(400).json({ message: "Invalid team ID." });
      return;
    }

    const team = await Team.findOne({
      _id: teamId,
      season: seasonId,
    });

    if (!team) {
      res.status(404).json({ message: "Team not found." });
      return;
    }

    const players = await Player.find({ team: team._id }).sort({
      createdAt: 1,
    });

    res.json({ players });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load players." });
  }
}