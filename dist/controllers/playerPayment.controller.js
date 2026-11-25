import mongoose from "mongoose";
import Division from "../models/Division.js";
import Payment from "../models/Payment.js";
import Player from "../models/Player.js";
import PlayerPayment from "../models/PlayerPayment.js";
import Team from "../models/Team.js";
export async function submitPlayerPayment(req, res) {
    if (req.user?.role !== "player") {
        res.status(403).json({ message: "Player access required." });
        return;
    }
    const { teamId } = req.params;
    const { method, referenceNumber, paidAt } = req.body ?? {};
    if (!mongoose.isObjectIdOrHexString(teamId)) {
        res.status(400).json({ message: "Invalid team ID." });
        return;
    }
    if (method !== "gcash" && method !== "maya") {
        res.status(400).json({ message: "Select GCash or Maya." });
        return;
    }
    if (typeof referenceNumber !== "string" ||
        !/^[A-Za-z0-9-]{6,100}$/.test(referenceNumber.trim())) {
        res.status(400).json({ message: "Enter a valid payment reference number." });
        return;
    }
    if (typeof paidAt !== "string" ||
        !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(paidAt)) {
        res.status(400).json({ message: "Enter a payment date and time with a timezone." });
        return;
    }
    const paymentDate = new Date(paidAt);
    if (Number.isNaN(paymentDate.getTime()) || paymentDate.getTime() > Date.now()) {
        res.status(400).json({ message: "Enter a valid payment date that is not in the future." });
        return;
    }
    const [team, membership] = await Promise.all([
        Team.findOne({ _id: teamId, status: "approved" }).select("season division"),
        Player.exists({ team: teamId, userAccount: req.user.id }),
    ]);
    if (!team || !membership) {
        res.status(404).json({ message: "Approved player registration not found." });
        return;
    }
    const division = await Division.findOne({
        _id: team.division,
        season: team.season,
    }).select("playerRegistrationFeeCentavos");
    const fee = division?.playerRegistrationFeeCentavos;
    if (fee == null || !Number.isSafeInteger(fee) || fee < 0) {
        res.status(409).json({ message: "The division fee has not been configured." });
        return;
    }
    if (fee === 0) {
        res.status(409).json({ message: "This division is free." });
        return;
    }
    const reference = referenceNumber.trim().toUpperCase();
    const existingTeamPayment = await Payment.exists({
        method,
        referenceNumber: reference,
        active: true,
    });
    if (existingTeamPayment) {
        res.status(409).json({ message: "This payment reference is already in use." });
        return;
    }
    try {
        await PlayerPayment.init();
        const payment = await PlayerPayment.create({
            player: req.user.id,
            team: team._id,
            season: team.season,
            division: team.division,
            method,
            referenceNumber: reference,
            expectedAmountCentavos: fee,
            paidAt: paymentDate,
        });
        res.status(201).json({ payment });
    }
    catch (error) {
        if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
            res.status(409).json({
                message: "You already have a payment for this division, or the reference is in use.",
            });
            return;
        }
        throw error;
    }
}
export async function getMyPlayerPayment(req, res) {
    if (req.user?.role !== "player") {
        res.status(403).json({ message: "Player access required." });
        return;
    }
    const { teamId } = req.params;
    if (!mongoose.isObjectIdOrHexString(teamId)) {
        res.status(400).json({ message: "Invalid team ID." });
        return;
    }
    const [team, membership] = await Promise.all([
        Team.findById(teamId).select("season division"),
        Player.exists({ team: teamId, userAccount: req.user.id }),
    ]);
    if (!team || !membership) {
        res.status(404).json({ message: "Player registration not found." });
        return;
    }
    const payment = await PlayerPayment.findOne({
        player: req.user.id,
        season: team.season,
        division: team.division,
    })
        .sort({ active: -1, createdAt: -1 })
        .select("status expectedAmountCentavos")
        .lean();
    res.set("Cache-Control", "no-store").json({ payment });
}
