import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { successResponse } from "../utils/apiResponse.js";

export const router = Router();

router.get(
  "/health",
  asyncHandler(async (req, res) => {
    successResponse(
      res,
      { uptime: process.uptime() },
      { message: "Service is healthy" },
    );
  }),
);

router.get(
  "/demo-error",
  asyncHandler(async () => {
    throw new AppError("Example operational error", 400);
  }),
);
