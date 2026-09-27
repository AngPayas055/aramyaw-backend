import mongoose from "mongoose";
import Team from "../models/Team.js";
import Season from "../models/Season.js";
import Division from "../models/Division.js";
function handleError(error, res) {
    if (error instanceof mongoose.Error.ValidationError ||
        error instanceof mongoose.Error.CastError) {
        res.status(400).json({ message: error.message });
        return;
    }
    if (error instanceof Error &&
        "code" in error &&
        error.code === 11000) {
        res.status(409).json({
            message: "A team with this name is already registered in this division.",
        });
        return;
    }
    console.error("Team controller error:", error);
    res.status(500).json({ message: "Something went wrong with the team registration." });
}
export async function createTeam(req, res) {
    try {
        const { seasonId } = req.params;
        const managerId = req.user?.id;
        if (!managerId) {
            res.status(401).json({ message: "Authentication required." });
            return;
        }
        if (!mongoose.isObjectIdOrHexString(seasonId)) {
            res.status(400).json({ message: "Invalid season ID." });
            return;
        }
        const { divisionId, teamName, barangay, coachFirstName, coachLastName, coachEmail, coachContactNumber, assistantCoach, notes, acceptedTerms, } = req.body ?? {};
        if (!mongoose.isObjectIdOrHexString(divisionId)) {
            res.status(400).json({ message: "Select a valid division." });
            return;
        }
        if (acceptedTerms !== true) {
            res.status(400).json({ message: "Please confirm the registration information." });
            return;
        }
        const season = await Season.findById(seasonId);
        if (!season) {
            res.status(404).json({ message: "Season not found." });
            return;
        }
        const now = new Date();
        if (season.status !== "registration_open" ||
            now < season.registrationOpensAt ||
            now > season.registrationClosesAt) {
            res.status(409).json({ message: "Registration is closed for this season." });
            return;
        }
        const division = await Division.findOne({
            _id: divisionId,
            season: season._id,
        });
        if (!division) {
            res.status(404).json({ message: "Division not found in this season." });
            return;
        }
        if (!division.registrationEnabled) {
            res.status(409).json({ message: "Registration is closed for this division." });
            return;
        }
        const team = new Team({
            season: season._id,
            division: division._id,
            manager: managerId,
            name: teamName,
            barangay,
            coach: {
                firstName: coachFirstName,
                lastName: coachLastName,
                email: coachEmail,
                contactNumber: coachContactNumber,
            },
            assistantCoach,
            notes,
            status: "pending",
        });
        await team.save();
        res.status(201).json({
            message: "Team registration submitted for review.",
            team,
        });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function getMyTeams(req, res) {
    try {
        const managerId = req.user?.id;
        if (!managerId) {
            res.status(401).json({ message: "Authentication required." });
            return;
        }
        const teams = await Team.find({
            manager: managerId,
            season: req.params.seasonId,
        })
            .populate("season", "name status")
            .populate("division", "name description minAge maxAge ageCutoffDate minPlayers maxPlayers registrationFeeCentavos")
            .sort({ createdAt: -1 });
        res.status(200).json({ teams });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function getSeasonTeams(req, res) {
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
        const teams = await Team.find({ season: seasonId })
            .populate("division", "name")
            .populate("manager", "firstName lastName email contactNumber")
            .sort({ createdAt: -1 });
        res.status(200).json({ teams });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function reviewTeam(req, res) {
    try {
        const { seasonId, teamId } = req.params;
        const reviewerId = req.user?.id;
        const { status, rejectionReason } = req.body ?? {};
        if (!mongoose.isObjectIdOrHexString(seasonId) ||
            !mongoose.isObjectIdOrHexString(teamId)) {
            res.status(400).json({ message: "Invalid season or team ID." });
            return;
        }
        if (status !== "approved" && status !== "rejected") {
            res.status(400).json({
                message: "Status must be approved or rejected.",
            });
            return;
        }
        if (status === "rejected" &&
            (typeof rejectionReason !== "string" || !rejectionReason.trim())) {
            res.status(400).json({
                message: "Provide a reason for rejection.",
            });
            return;
        }
        const team = await Team.findOne({
            _id: teamId,
            season: seasonId,
        });
        if (!team) {
            res.status(404).json({ message: "Team registration not found." });
            return;
        }
        if (team.status !== "pending") {
            res.status(409).json({
                message: "This registration has already been reviewed.",
            });
            return;
        }
        team.status = status;
        team.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
        team.reviewedAt = new Date();
        team.rejectionReason =
            status === "rejected" ? rejectionReason.trim() : undefined;
        await team.save();
        res.status(200).json({
            message: `Team registration ${status}.`,
            team,
        });
    }
    catch (error) {
        handleError(error, res);
    }
}
