import type { Request, Response, NextFunction } from "express";

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = (
    req as Request & {
      user?: { role?: string };
    }
  ).user;

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