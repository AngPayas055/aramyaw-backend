import mongoose from "mongoose";
import Team from "../models/Team.js";
import Division from "../models/Division.js";
import Player from "../models/Player.js";
import PlayerPayment from "../models/PlayerPayment.js";
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
export function ageAt(birthDate, cutoff) {
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
        const accountIds = players.flatMap((player) => player.userAccount ? [player.userAccount] : []);
        const payments = await PlayerPayment.find({
            player: { $in: accountIds },
            season: team.season,
            division: team.division,
        })
            .sort({ active: -1, createdAt: -1, _id: -1 })
            .select("player status")
            .lean();
        const latestPaymentByAccount = new Map();
        for (const payment of payments) {
            const accountId = String(payment.player);
            if (!latestPaymentByAccount.has(accountId)) {
                latestPaymentByAccount.set(accountId, payment);
            }
        }
        res.json({
            players: players.map((player) => ({
                ...player.toObject(),
                registrationPaymentStatus: player.userAccount
                    ? latestPaymentByAccount.get(String(player.userAccount))?.status ?? "unpaid"
                    : null,
            })),
        });
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
        if (player.verificationStatus === "verified" &&
            values.birthDate !== player.birthDate) {
            res.status(403).json({
                message: "Only an admin can change a verified player's birth date.",
            });
            return;
        }
        const identityChanged = player.firstName !== values.firstName ||
            player.lastName !== values.lastName ||
            player.birthDate !== values.birthDate;
        if (player.verificationStatus === "verified" && identityChanged) {
            res.status(403).json({
                message: "Only admins can edit a verified player's first name, last name, and birthdate.",
            });
            return;
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
        const firstName = body.firstName === undefined
            ? player.firstName
            : typeof body.firstName === "string" ? body.firstName.trim() : "";
        const lastName = body.lastName === undefined
            ? player.lastName
            : typeof body.lastName === "string" ? body.lastName.trim() : "";
        if (!firstName || !lastName || firstName.length > 80 || lastName.length > 80) {
            res.status(400).json({ message: "Enter a valid first name and last name." });
            return;
        }
        player.firstName = firstName;
        player.lastName = lastName;
        const birthDate = body.birthDate;
        if (birthDate !== undefined && birthDate !== player.birthDate) {
            const division = await Division.findById(team.division);
            if (!division) {
                res.status(404).json({ message: "Division not found." });
                return;
            }
            const parsed = parsePlayer({
                firstName: player.firstName,
                lastName: player.lastName,
                birthDate,
                jerseyNumber: player.jerseyNumber,
            }, division);
            if (!parsed.values) {
                res.status(400).json({
                    message: parsed.error ?? "Enter a valid birth date.",
                });
                return;
            }
            player.birthDate = parsed.values.birthDate;
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
export async function listSeasonPlayersForAdmin(req, res) {
    try {
        const { seasonId } = req.params;
        const { divisionId, playingStatus, search, page: rawPage } = req.query;
        const page = rawPage === undefined ? 1 : Number(rawPage);
        const pageSize = 10;
        if (!mongoose.isObjectIdOrHexString(seasonId) ||
            (divisionId !== undefined && !mongoose.isObjectIdOrHexString(divisionId)) ||
            (playingStatus !== undefined &&
                playingStatus !== "allowed" &&
                playingStatus !== "suspended" &&
                playingStatus !== "banned") ||
            (search !== undefined && (typeof search !== "string" || search.length > 100)) ||
            !Number.isSafeInteger(page) ||
            page < 1 ||
            page > Math.floor(Number.MAX_SAFE_INTEGER / pageSize)) {
            res.status(400).json({ message: "Invalid player filters or page." });
            return;
        }
        const teams = await Team.find({ season: seasonId })
            .select("name status division")
            .populate("division", "name")
            .lean();
        const teamsById = new Map(teams.map((team) => [String(team._id), team]));
        const divisions = new Map();
        for (const team of teams) {
            if (team.division) {
                const value = String(team.division._id);
                divisions.set(value, { value, label: team.division.name });
            }
        }
        const eligibleTeams = teams.filter((team) => !divisionId || String(team.division?._id) === divisionId);
        const query = typeof search === "string" ? search.trim() : "";
        const pattern = query
            ? new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
            : null;
        const filters = {
            team: { $in: eligibleTeams.map((team) => team._id) },
            ...(playingStatus === "allowed"
                ? { playingStatus: { $in: ["allowed", null] } }
                : playingStatus === "suspended" || playingStatus === "banned"
                    ? { playingStatus }
                    : {}),
            ...(pattern
                ? {
                    $or: [
                        {
                            team: {
                                $in: eligibleTeams
                                    .filter((team) => pattern.test(team.name) || pattern.test(team.division?.name ?? ""))
                                    .map((team) => team._id),
                            },
                        },
                        {
                            $expr: {
                                $or: [
                                    {
                                        $regexMatch: {
                                            input: { $concat: ["$firstName", " ", "$lastName"] },
                                            regex: pattern,
                                        },
                                    },
                                    {
                                        $regexMatch: {
                                            input: { $ifNull: [{ $toString: "$jerseyNumber" }, ""] },
                                            regex: pattern,
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                }
                : {}),
        };
        const [rows, total] = await Promise.all([
            Player.find(filters)
                .sort({ lastName: 1, firstName: 1, _id: 1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Player.countDocuments(filters),
        ]);
        res.json({
            total,
            divisions: [...divisions.values()],
            players: rows.flatMap((player) => {
                const team = teamsById.get(String(player.team));
                if (!team)
                    return [];
                return [{
                        ...player,
                        teamId: String(team._id),
                        teamName: team.name,
                        teamStatus: team.status,
                        divisionId: team.division ? String(team.division._id) : "",
                        divisionName: team.division?.name ?? "Unavailable",
                    }];
            }),
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to load players." });
    }
}
