import mongoose from "mongoose";
import Team from "../models/Team.js";
import Division from "../models/Division.js";
import Player from "../models/Player.js";
async function ownedTeam(req, res) {
    const { seasonId, teamId } = req.params;
    if (!mongoose.isObjectIdOrHexString(seasonId) ||
        !mongoose.isObjectIdOrHexString(teamId)) {
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
function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const date = new Date(`${value}T00:00:00Z`);
    return (!Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value &&
        date <= new Date());
}
function ageAt(birthDate, cutoff) {
    const [year, month, day] = birthDate.split("-").map(Number);
    let age = cutoff.getUTCFullYear() - year;
    if (cutoff.getUTCMonth() + 1 < month ||
        (cutoff.getUTCMonth() + 1 === month && cutoff.getUTCDate() < day)) {
        age--;
    }
    return age;
}
function parsePlayer(body, division) {
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    if (!firstName ||
        !lastName ||
        firstName.length > 80 ||
        lastName.length > 80 ||
        !validDate(body.birthDate)) {
        return { error: "Enter a valid name and birth date." };
    }
    const age = ageAt(body.birthDate, division.ageCutoffDate || new Date());
    if ((division.minAge != null && age < division.minAge) ||
        (division.maxAge != null && age > division.maxAge)) {
        return {
            error: `Player must be within the division age range (${division.minAge ?? 0}–${division.maxAge ?? "above"}) on the cutoff date.`,
        };
    }
    const jerseyNumber = body.jerseyNumber === "" || body.jerseyNumber == null
        ? undefined
        : Number(body.jerseyNumber);
    if (jerseyNumber != null &&
        (!Number.isInteger(jerseyNumber) ||
            jerseyNumber < 0 ||
            jerseyNumber > 99)) {
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
export async function listPlayers(req, res) {
    try {
        const team = await ownedTeam(req, res);
        if (!team)
            return;
        const players = await Player.find({ team: team._id }).sort({
            createdAt: 1,
        });
        res.json({ players });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to load players." });
    }
}
export async function createPlayer(req, res) {
    try {
        const team = await ownedTeam(req, res);
        if (!team)
            return;
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to add player." });
    }
}
export async function updatePlayer(req, res) {
    try {
        const team = await ownedTeam(req, res);
        if (!team)
            return;
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
        if (player.playingStatus === "suspended" ||
            player.playingStatus === "banned") {
            res.status(403).json({
                message: "This player is restricted. Contact an administrator to make changes.",
            });
            return;
        }
        const division = await Division.findById(team.division);
        if (!division) {
            res.status(404).json({ message: "Division not found." });
            return;
        }
        const parsed = parsePlayer(req.body ?? {}, division);
        const values = parsed.values;
        if (!values) {
            res.status(400).json({
                message: parsed.error ?? "Invalid player information.",
            });
            return;
        }
        const identityChanged = player.firstName !== values.firstName ||
            player.lastName !== values.lastName ||
            player.birthDate !== values.birthDate;
        Object.assign(player, values);
        if (identityChanged) {
            player.verificationStatus = "unverified";
            player.verifiedBy = undefined;
            player.verifiedAt = undefined;
        }
        await player.save();
        res.json({ player });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update player." });
    }
}
export async function deletePlayer(req, res) {
    try {
        const team = await ownedTeam(req, res);
        if (!team)
            return;
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
        if (player.playingStatus === "suspended" ||
            player.playingStatus === "banned") {
            res.status(403).json({
                message: "Restricted players cannot be removed. Contact an administrator.",
            });
            return;
        }
        await player.deleteOne();
        res.json({ message: "Player removed." });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to remove player." });
    }
}
export async function listTeamPlayersForAdmin(req, res) {
    try {
        const { seasonId, teamId } = req.params;
        if (!mongoose.isObjectIdOrHexString(seasonId) ||
            !mongoose.isObjectIdOrHexString(teamId)) {
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to load players." });
    }
}
export async function updatePlayerStatus(req, res) {
    try {
        const { seasonId, teamId, playerId } = req.params;
        const adminId = req.user?.id;
        if (!adminId || !mongoose.isObjectIdOrHexString(adminId)) {
            res.status(401).json({ message: "Please sign in again." });
            return;
        }
        if (!mongoose.isObjectIdOrHexString(seasonId) ||
            !mongoose.isObjectIdOrHexString(teamId) ||
            !mongoose.isObjectIdOrHexString(playerId)) {
            res.status(400).json({ message: "Invalid team or player ID." });
            return;
        }
        const body = req.body ?? {};
        const verificationStatus = body.verificationStatus;
        const playingStatus = body.playingStatus;
        if (verificationStatus !== "unverified" &&
            verificationStatus !== "verified") {
            res.status(400).json({
                message: "Choose a valid verification status.",
            });
            return;
        }
        if (playingStatus !== "allowed" &&
            playingStatus !== "suspended" &&
            playingStatus !== "banned") {
            res.status(400).json({
                message: "Choose a valid playing status.",
            });
            return;
        }
        const reason = typeof body.statusReason === "string"
            ? body.statusReason.trim()
            : "";
        if (reason.length > 500 ||
            (playingStatus !== "allowed" && !reason)) {
            res.status(400).json({
                message: "Suspended or banned players need a reason of up to 500 characters.",
            });
            return;
        }
        let suspensionUntil;
        if (playingStatus === "suspended" &&
            body.suspensionUntil != null &&
            body.suspensionUntil !== "") {
            const value = body.suspensionUntil;
            if (typeof value !== "string" ||
                !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                res.status(400).json({
                    message: "Enter a valid suspension end date.",
                });
                return;
            }
            const date = new Date(`${value}T00:00:00Z`);
            if (Number.isNaN(date.getTime()) ||
                date.toISOString().slice(0, 10) !== value) {
                res.status(400).json({
                    message: "Enter a valid suspension end date.",
                });
                return;
            }
            suspensionUntil = value;
        }
        const team = await Team.findOne({
            _id: teamId,
            season: seasonId,
        });
        if (!team) {
            res.status(404).json({ message: "Team not found." });
            return;
        }
        const player = await Player.findOne({
            _id: playerId,
            team: team._id,
        });
        if (!player) {
            res.status(404).json({ message: "Player not found." });
            return;
        }
        const now = new Date();
        const reviewer = new mongoose.Types.ObjectId(adminId);
        if (verificationStatus === "verified" &&
            player.verificationStatus !== "verified") {
            player.verifiedBy = reviewer;
            player.verifiedAt = now;
        }
        else if (verificationStatus === "unverified") {
            player.verifiedBy = undefined;
            player.verifiedAt = undefined;
        }
        player.verificationStatus = verificationStatus;
        player.playingStatus = playingStatus;
        player.statusReason =
            playingStatus === "allowed" ? undefined : reason;
        player.suspensionUntil = suspensionUntil;
        player.statusUpdatedBy = reviewer;
        player.statusUpdatedAt = now;
        await player.save();
        res.json({
            message: "Player status updated.",
            player,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update player status.",
        });
    }
}
