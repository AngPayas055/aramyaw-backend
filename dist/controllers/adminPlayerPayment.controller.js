import mongoose from "mongoose";
import PlayerPayment from "../models/PlayerPayment.js";
export async function listPendingPlayerPayments(req, res) {
    const status = req.query.status ?? "pending";
    if (status !== "pending" && status !== "paid" && status !== "rejected") {
        res.status(400).json({ message: "Invalid payment status." });
        return;
    }
    const payments = await PlayerPayment.find(status === "pending" ? { status, active: true } : { status })
        .select("player team season division method referenceNumber expectedAmountCentavos paidAt status createdAt reviewedAt rejectionReason")
        .populate("player", "firstName lastName")
        .populate("team", "name")
        .populate("season", "name")
        .populate("division", "name")
        .sort(status === "pending"
        ? { createdAt: 1, _id: 1 }
        : { reviewedAt: -1, _id: -1 })
        .lean();
    res.set("Cache-Control", "no-store").json({ payments });
}
export async function reviewPlayerPayment(req, res) {
    const { paymentId } = req.params;
    const adminId = req.user?.id;
    const { status, rejectionReason } = req.body ?? {};
    if (!adminId) {
        res.status(401).json({ message: "Authentication required." });
        return;
    }
    if (!mongoose.isObjectIdOrHexString(paymentId)) {
        res.status(400).json({ message: "Invalid payment ID." });
        return;
    }
    if (status !== "paid" && status !== "rejected") {
        res.status(400).json({ message: "Choose paid or rejected." });
        return;
    }
    const reason = typeof rejectionReason === "string" ? rejectionReason.trim() : "";
    if (status === "rejected" && (!reason || reason.length > 500)) {
        res.status(400).json({
            message: "Enter a rejection reason of 1 to 500 characters.",
        });
        return;
    }
    const payment = await PlayerPayment.findOneAndUpdate({ _id: paymentId, status: "pending", active: true }, {
        $set: {
            status,
            active: status === "paid",
            reviewedBy: adminId,
            reviewedAt: new Date(),
            ...(status === "rejected" ? { rejectionReason: reason } : {}),
        },
    }, {
        returnDocument: "after",
        includeResultMetadata: false,
        runValidators: true,
    }).select("status expectedAmountCentavos reviewedAt rejectionReason");
    if (!payment) {
        res.status(409).json({
            message: "This payment is no longer pending or could not be found.",
        });
        return;
    }
    res.json({ payment });
}
