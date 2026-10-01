import type { Request, Response } from "express";

import Season, { type SeasonStatus } from "../models/Season.ts";
import Team from "../models/Team.ts";
import Player from "../models/Player.ts";

const activeStatuses: SeasonStatus[] = [
  "registration_open",
  "registration_closed",
  "ongoing",
];

export async function getAdminDashboard(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const [
      activeSeasonsCount,
      registeredTeams,
      players,
      pendingRegistrations,
      recentTeams,
      activeSeasons,
    ] = await Promise.all([
      Season.countDocuments({
        status: { $in: activeStatuses },
      }),
      Team.countDocuments({ status: "approved" }),
      Player.countDocuments(),
      Team.countDocuments({ status: "pending" }),
      Team.find()
        .sort({ createdAt: -1, _id: -1 })
        .limit(8)
        .populate("season", "name status")
        .populate("division", "name")
        .populate(
          "manager",
          "firstName lastName email contactNumber",
        )
        .lean(),
      Season.find({
        status: { $in: activeStatuses },
      })
        .sort({ startDate: 1, _id: 1 })
        .limit(5)
        .lean(),
    ]);

    res.json({
      stats: {
        activeSeasons: activeSeasonsCount,
        registeredTeams,
        players,
        pendingRegistrations,
      },
      recentTeams,
      activeSeasons,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({
      message: "Failed to load the admin dashboard.",
    });
  }
}