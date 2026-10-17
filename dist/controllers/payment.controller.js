import mongoose from "mongoose";
import Payment from "../models/Payment.js";
import Team from "../models/Team.js";
import Division from "../models/Division.js";
const paymentAccounts = [
    {
        method: "gcash",
        accountNumber: "09922445606",
        accountName: "Jakie Muldez",
    },
    {
        method: "maya",
        accountNumber: "09977709400",
        accountName: "Jakie Muldez",
    },
];
function handleError(error, res) {
    if (error instanceof Error &&
        "code" in error &&
        error.code === 11000) {
        res.status(409).json({
            message: "This team already has a pending or verified payment, or the reference number is already in use.",
        });
        return;
    }
    if (error instanceof mongoose.Error.ValidationError ||
        error instanceof mongoose.Error.CastError) {
        res.status(400).json({ message: error.message });
        return;
    }
    console.error("Payment controller error:", error);
    res.status(500).json({ message: "Unable to process payment." });
}
async function getAccessibleTeam(req, res) {
    if (!req.user?.id) {
        res.status(401).json({ message: "Authentication required." });
        return null;
    }
    const { seasonId, teamId } = req.params;
    if (!mongoose.isObjectIdOrHexString(seasonId) ||
        !mongoose.isObjectIdOrHexString(teamId)) {
        res.status(400).json({ message: "Invalid season or team ID." });
        return null;
    }
    const team = await Team.findOne({
        _id: teamId,
        season: seasonId,
        ...(req.user.role === "admin"
            ? {}
            : { manager: req.user.id }),
    });
    if (!team) {
        res.status(404).json({ message: "Team not found." });
        return null;
    }
    return team;
}
export async function getTeamPayments(req, res) {
    try {
        const team = await getAccessibleTeam(req, res);
        if (!team)
            return;
        const [division, payments] = await Promise.all([
            Division.findById(team.division),
            Payment.find({ team: team._id })
                .select("-active")
                .sort({ createdAt: -1 }),
        ]);
        if (!division) {
            res.status(404).json({ message: "Division not found." });
            return;
        }
        // Preserve the fee captured by the first payment attempt.
        const firstPayment = payments[payments.length - 1];
        const amountDueCentavos = firstPayment?.expectedAmountCentavos ??
            division.registrationFeeCentavos;
        const activePayment = payments.find((payment) => payment.status === "pending" || payment.status === "paid");
        res.json({
            amountDueCentavos,
            currency: "PHP",
            paymentStatus: amountDueCentavos === 0
                ? "not_required"
                : activePayment?.status ??
                    (payments.length ? "rejected" : "unpaid"),
            accounts: paymentAccounts,
            payments,
        });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function submitTeamPayment(req, res) {
    try {
        const team = await getAccessibleTeam(req, res);
        if (!team)
            return;
        // Admins review payments; the team's manager submits them.
        if (team.manager.toString() !== req.user.id) {
            res.status(403).json({
                message: "Only the team's manager can submit payment.",
            });
            return;
        }
        if (team.status === "rejected") {
            res.status(409).json({
                message: "Cannot submit payment for a rejected team.",
            });
            return;
        }
        const { method, referenceNumber, amountCentavos, paidAt, } = req.body ?? {};
        if (method !== "gcash" && method !== "maya") {
            res.status(400).json({ message: "Select GCash or Maya." });
            return;
        }
        // Keep references as strings to preserve leading zeroes.
        if (typeof referenceNumber !== "string" ||
            !/^[A-Za-z0-9-]{6,100}$/.test(referenceNumber.trim())) {
            res.status(400).json({
                message: "Enter a valid reference number of 6–100 characters.",
            });
            return;
        }
        if (!Number.isSafeInteger(amountCentavos) ||
            amountCentavos <= 0) {
            res.status(400).json({
                message: "Amount must be a positive integer in centavos.",
            });
            return;
        }
        // Require an ISO timestamp with an explicit timezone.
        if (typeof paidAt !== "string" ||
            !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(paidAt)) {
            res.status(400).json({
                message: "Provide the payment date with a timezone.",
            });
            return;
        }
        const paymentDate = new Date(paidAt);
        if (Number.isNaN(paymentDate.getTime()) ||
            paymentDate.getTime() > Date.now()) {
            res.status(400).json({
                message: "Payment date must be valid and cannot be in the future.",
            });
            return;
        }
        const [division, firstPayment] = await Promise.all([
            Division.findById(team.division),
            Payment.findOne({ team: team._id }).sort({ createdAt: 1 }),
        ]);
        if (!division) {
            res.status(404).json({ message: "Division not found." });
            return;
        }
        const expectedAmountCentavos = firstPayment?.expectedAmountCentavos ??
            division.registrationFeeCentavos;
        if (!Number.isSafeInteger(expectedAmountCentavos) ||
            expectedAmountCentavos <= 0) {
            res.status(409).json({
                message: "This team has no payable registration fee configured.",
            });
            return;
        }
        if (amountCentavos !== expectedAmountCentavos) {
            res.status(400).json({
                message: "Submit the full registration fee.",
                expectedAmountCentavos,
            });
            return;
        }
        const payment = await Payment.create({
            team: team._id,
            season: team.season,
            submittedBy: req.user.id,
            method,
            referenceNumber: referenceNumber.trim().toUpperCase(),
            amountCentavos,
            expectedAmountCentavos,
            paidAt: paymentDate,
            status: "pending",
            active: true,
        });
        res.status(201).json({
            message: "Payment submitted for verification.",
            payment,
        });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function reviewPayment(req, res) {
    try {
        if (!req.user?.id || req.user.role !== "admin") {
            res.status(403).json({ message: "Admin access required." });
            return;
        }
        const { seasonId, teamId, paymentId } = req.params;
        if (!mongoose.isObjectIdOrHexString(seasonId) ||
            !mongoose.isObjectIdOrHexString(teamId) ||
            !mongoose.isObjectIdOrHexString(paymentId)) {
            res.status(400).json({ message: "Invalid payment, team or season ID." });
            return;
        }
        const { status, rejectionReason } = req.body ?? {};
        if (status !== "paid" && status !== "rejected") {
            res.status(400).json({
                message: "Status must be paid or rejected.",
            });
            return;
        }
        if (status === "rejected" &&
            (typeof rejectionReason !== "string" ||
                !rejectionReason.trim() ||
                rejectionReason.trim().length > 500)) {
            res.status(400).json({
                message: "Provide a rejection reason of 1–500 characters.",
            });
            return;
        }
        // Atomic update: only one admin can review a pending submission.
        const payment = await Payment.findOneAndUpdate({
            _id: paymentId,
            team: teamId,
            season: seasonId,
            status: "pending",
            active: true,
        }, {
            $set: {
                status,
                active: status === "paid",
                reviewedBy: req.user.id,
                reviewedAt: new Date(),
                ...(status === "rejected"
                    ? { rejectionReason: rejectionReason.trim() }
                    : {}),
            },
        }, { new: true, runValidators: true });
        if (!payment) {
            res.status(409).json({
                message: "Pending payment not found or already reviewed.",
            });
            return;
        }
        res.json({
            message: status === "paid"
                ? "Payment verified."
                : "Payment rejected. The manager can submit again.",
            payment,
        });
    }
    catch (error) {
        handleError(error, res);
    }
}
