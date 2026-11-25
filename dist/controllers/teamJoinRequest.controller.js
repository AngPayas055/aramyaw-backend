import mongoose from "mongoose";
import Player from "../models/Player.js";
import Division from "../models/Division.js";
import Team from "../models/Team.js";
import TeamJoinRequest from "../models/TeamJoinRequest.js";
import User, {} from "../models/User.js";
import { ageAt } from "./player.controller.js";
export async function createTeamJoinRequest(req, res) {
    if (req.user?.role !== "player") {
        res.status(403).json({ message: "Player access required." });
        return;
    }
    const { seasonId, teamId } = req.params;
    if (!mongoose.isObjectIdOrHexString(seasonId) ||
        !mongoose.isObjectIdOrHexString(teamId)) {
        res.status(400).json({ message: "Invalid season or team ID." });
        return;
    }
    const [team, player] = await Promise.all([
        Team.findOne({ _id: teamId, season: seasonId }).select("division"),
        User.findOne({ _id: req.user.id, role: "player" }).select("+birthDate"),
    ]);
    if (!team) {
        res.status(404).json({ message: "Team not found in this season." });
        return;
    }
    if (!player?.birthDate) {
        res.status(400).json({
            message: "Save your birthdate before requesting to join a team.",
        });
        return;
    }
    const division = await Division.findOne({
        _id: team.division,
        season: seasonId,
    }).select("minAge maxAge ageCutoffDate");
    if (!division) {
        res.status(404).json({ message: "Team division not found." });
        return;
    }
    const age = ageAt(player.birthDate, division.ageCutoffDate ?? new Date());
    if ((division.minAge != null && age < division.minAge) ||
        (division.maxAge != null && age > division.maxAge)) {
        res.status(400).json({
            message: "You do not meet this division's age requirements.",
        });
        return;
    }
    const existingPlayer = await Player.exists({
        team: team._id,
        userAccount: req.user.id,
    });
    if (existingPlayer) {
        res.status(409).json({ message: "You are already on this team." });
        return;
    }
    try {
        await TeamJoinRequest.init();
        const joinRequest = await TeamJoinRequest.create({
            team: team._id,
            player: req.user.id,
        });
        res.status(201).json({ joinRequest });
    }
    catch (error) {
        if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
            res.status(409).json({
                message: "You already have a pending request for this team.",
            });
            return;
        }
        throw error;
    }
}
export async function listPendingTeamJoinRequests(req, res) {
    if (req.user?.role !== "user") {
        res.status(403).json({ message: "Manager access required." });
        return;
    }
    const { seasonId, teamId } = req.params;
    if (!mongoose.isObjectIdOrHexString(seasonId) ||
        !mongoose.isObjectIdOrHexString(teamId)) {
        res.status(400).json({ message: "Invalid season or team ID." });
        return;
    }
    const team = await Team.findOne({
        _id: teamId,
        season: seasonId,
        manager: req.user.id,
    }).select("_id");
    if (!team) {
        res.status(404).json({ message: "Team not found." });
        return;
    }
    const joinRequests = await TeamJoinRequest.find({
        team: team._id,
        status: "pending",
    })
        .select("player status createdAt")
        .populate("player", "firstName lastName")
        .sort({ createdAt: -1 });
    res.set("Cache-Control", "no-store").json({ joinRequests });
}
export async function reviewTeamJoinRequest(req, res) {
    if (req.user?.role !== "user") {
        res.status(403).json({ message: "Manager access required." });
        return;
    }
    const managerId = req.user.id;
    const { seasonId, teamId, requestId } = req.params;
    const status = req.body?.status;
    if (!mongoose.isObjectIdOrHexString(seasonId) ||
        !mongoose.isObjectIdOrHexString(teamId) ||
        !mongoose.isObjectIdOrHexString(requestId)) {
        res.status(400).json({ message: "Invalid season, team, or request ID." });
        return;
    }
    if (status !== "approved" && status !== "declined") {
        res.status(400).json({ message: "Choose approved or declined." });
        return;
    }
    const result = await mongoose.connection.transaction(async (session) => {
        // Serialize reviews for this team so approvals check available roster spots
        // against the latest roster.
        const team = await Team.findOneAndUpdate({ _id: teamId, season: seasonId, manager: managerId }, { $currentDate: { updatedAt: true } }, { session, timestamps: false, includeResultMetadata: false }).select("division");
        if (!team) {
            return { code: 404, body: { message: "Team not found." } };
        }
        const joinRequest = await TeamJoinRequest.findOne({
            _id: requestId,
            team: team._id,
        }).session(session);
        if (!joinRequest) {
            return { code: 404, body: { message: "Join request not found." } };
        }
        if (joinRequest.status === status) {
            return { code: 200, body: { joinRequest } };
        }
        if (joinRequest.status !== "pending") {
            return {
                code: 409,
                body: { message: "This request has already been reviewed." },
            };
        }
        if (status === "approved") {
            const account = await User.findOne({
                _id: joinRequest.player,
                role: "player",
            })
                .select("firstName lastName +birthDate")
                .session(session);
            if (!account?.birthDate) {
                return {
                    code: 409,
                    body: { message: "The player needs a saved birthdate before approval." },
                };
            }
            const division = await Division.findOne({
                _id: team.division,
                season: seasonId,
            })
                .select("minAge maxAge ageCutoffDate maxPlayers")
                .session(session);
            if (!division) {
                return { code: 404, body: { message: "Team division not found." } };
            }
            const age = ageAt(account.birthDate, division.ageCutoffDate ?? new Date());
            if ((division.minAge != null && age < division.minAge) ||
                (division.maxAge != null && age > division.maxAge)) {
                return {
                    code: 409,
                    body: { message: "The player does not meet the division's age requirements." },
                };
            }
            const existingPlayer = await Player.exists({
                team: team._id,
                userAccount: account._id,
            }).session(session);
            if (existingPlayer) {
                return {
                    code: 409,
                    body: { message: "This player is already on the team." },
                };
            }
            const playerCount = await Player.countDocuments({
                team: team._id,
            }).session(session);
            if (playerCount >= division.maxPlayers) {
                return {
                    code: 409,
                    body: { message: "This team has reached the division player limit." },
                };
            }
            const rosterPlayer = new Player({
                team: team._id,
                userAccount: account._id,
                firstName: account.firstName,
                lastName: account.lastName,
                birthDate: account.birthDate,
            });
            await rosterPlayer.save({ session });
        }
        joinRequest.status = status;
        await joinRequest.save({ session });
        return { code: 200, body: { joinRequest } };
    });
    res.status(result.code).json(result.body);
}
