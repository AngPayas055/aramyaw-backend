import { Router } from "express";

import {
  createDivision,
  getDivisions,
  getDivisionById,
  updateDivision,
} from "../controllers/division.controller.ts";

import { authenticateToken } from "../middleware/jwt.ts";
import { requireAdmin } from "../middleware/requireAdmin.ts";

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