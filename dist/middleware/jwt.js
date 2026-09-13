import jwt from 'jsonwebtoken';
import User from "../models/User.js";
export const extractToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        req.token = token;
    }
    next();
};
export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null)
        return res.sendStatus(401);
    const resp = await verifyJWT(token);
    if (!resp.success) {
        res.status(403).send({ error: "Session Expired" });
        return;
    }
    else {
        req.user = resp.user;
        next();
    }
};
const verifyJWT = async (token) => {
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT_SECRET is not configured.");
        }
        const decoded = jwt.verify(token, secret);
        if (typeof decoded === "string" ||
            typeof decoded.userId !== "string") {
            console.error("JWT verification failed: Missing userId.");
            return { success: false };
        }
        const user = await User.findById(decoded.userId);
        if (!user) {
            console.error("JWT verification failed: User not found.");
            return { success: false };
        }
        return {
            success: true,
            user: {
                id: user._id.toString(),
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                contactNumber: user.contactNumber,
            },
        };
    }
    catch (error) {
        console.error("JWT verification failed:", error instanceof Error ? error.message : "Unknown error");
        return { success: false };
    }
};
