import mongoose from "mongoose";
import Payment from "../models/Payment.js";
import "../models/Team.js";
import "../models/Division.js";
import "../models/Season.js";
export async function getAdminPayments(req, res) {
    try {
        const { seasonId, status } = req.query;
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 20);
        if (!Number.isSafeInteger(page) || page < 1 || page > 100000 ||
            !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
            res.status(400).json({ message: "Invalid pagination." });
            return;
        }
        if (seasonId !== undefined && !mongoose.isObjectIdOrHexString(seasonId)) {
            res.status(400).json({ message: "Invalid season ID." });
            return;
        }
        if (status !== undefined && status !== "pending" && status !== "paid" && status !== "rejected") {
            res.status(400).json({ message: "Invalid payment status." });
            return;
        }
        const scope = seasonId
            ? { season: new mongoose.Types.ObjectId(seasonId) }
            : {};
        const filter = { ...scope };
        if (status === "pending" || status === "paid" || status === "rejected")
            filter.status = status;
        const [payments, total, groups] = await Promise.all([
            Payment.find(filter)
                .select("-active")
                .populate({ path: "team", select: "name status division", populate: { path: "division", select: "name" } })
                .populate("season", "name")
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Payment.countDocuments(filter),
            Payment.aggregate([
                { $match: scope },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
        ]);
        const counts = { pending: 0, paid: 0, rejected: 0 };
        for (const group of groups) {
            if (group._id === "pending" || group._id === "paid" || group._id === "rejected") {
                counts[group._id] = group.count;
            }
        }
        res.json({ payments, total, page, limit, counts });
    }
    catch (error) {
        console.error("Admin payments error:", error);
        res.status(500).json({ message: "Unable to load payments." });
    }
}
