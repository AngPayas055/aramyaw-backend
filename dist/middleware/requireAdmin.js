export function requireAdmin(req, res, next) {
    const user = req.user;
    if (!user) {
        res.status(401).json({ message: "Authentication required." });
        return;
    }
    if (user.role !== "admin") {
        res.status(403).json({ message: "Admin access required." });
        return;
    }
    next();
}
