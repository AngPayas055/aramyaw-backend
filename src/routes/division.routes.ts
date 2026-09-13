import { Router } from "express";
import {
  createDivision,
  getDivisions,
  getDivisionById,
  updateDivision,
} from "../controllers/division.controller.ts";

const router = Router({ mergeParams: true });

// Authentication and admin authorization run in season.routes.ts.

router.route("/")
  .get(getDivisions)
  .post(createDivision);

router.route("/:divisionId")
  .get(getDivisionById)
  .patch(updateDivision);

export default router;