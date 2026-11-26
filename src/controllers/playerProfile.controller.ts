import type { Request, Response } from "express";
import User, { type IUser, type UserRole } from "../models/User.ts";
import Player from "../models/Player.ts";

type ProfileRequest = Request & {
  user?: { id: string; role: UserRole };
};

const manilaDateFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function isValidBirthDate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value <= manilaDateFormat.format(new Date())
  );
}

export async function playerProfile(
  req: ProfileRequest,
  res: Response,
): Promise<void> {
  if (req.user?.role !== "player") {
    res.status(403).json({ message: "Player access required." });
    return;
  }

  const filter = { _id: req.user.id, role: "player" as const };
    const fields = "firstName lastName +birthDate";
    let player: IUser | null;

    const verifiedPlayer = await Player.findOne({
      userAccount: req.user.id,
      verificationStatus: "verified",
    })
      .sort({ verifiedAt: -1, _id: -1 })
      .select("firstName lastName birthDate")
      .lean();

    if (req.method === "PATCH") {
      if (verifiedPlayer) {
        res.status(403).json({
          message: "Only admins can edit a verified player's first name, last name, and birthdate.",
        });
        return;
      }
      const birthDate = req.body?.birthDate;

      if (!isValidBirthDate(birthDate)) {
        res.status(400).json({
          message: "Enter a valid birthdate in YYYY-MM-DD format that is today or earlier.",
        });
        return;
      }

      player = await User.findOneAndUpdate(
        filter,
        { $set: { birthDate } },
        { returnDocument: "after", includeResultMetadata: false },
      ).select(fields);
    } else {
      player = await User.findOne(filter).select(fields);
    }

  if (!player) {
    res.status(404).json({ message: "Player profile not found." });
    return;
  }

  res.set("Cache-Control", "no-store").json({
    profile: {
      firstName: verifiedPlayer?.firstName ?? player.firstName,
      lastName: verifiedPlayer?.lastName ?? player.lastName,
      birthDate: verifiedPlayer?.birthDate ?? player.birthDate ?? null,
      identityLocked: Boolean(verifiedPlayer),
    },
  });
}