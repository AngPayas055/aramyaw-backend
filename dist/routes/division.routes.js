import { Router } from "express";
import { createDivision, getDivisions, getDivisionById, updateDivision, } from "../controllers/division.controller.js";
import { authenticateToken } from "../middleware/jwt.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
const router = Router({ mergeParams: true });
const adminOnly = [authenticateToken, requireAdmin];
// Public GET, protected POST
router
    .route("/")
    .get(getDivisions)
    .post(...adminOnly, createDivision);
// Public GET, protected PATCH
router
    .route("/:divisionId")
    .get(getDivisionById)
    .patch(...adminOnly, updateDivision);
export default router;
