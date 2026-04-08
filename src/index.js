import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { router } from "./routes/index.js";
import { asyncHandler } from "./middleware/asyncHandler.js";
import { successResponse } from "./utils/apiResponse.js";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : true,
    credentials: true,
  }),
);
app.use(
  morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", {
    skip: (req) => req.url === "/favicon.ico",
  }),
);

app.get(
  "/",
  asyncHandler(async (req, res) => {
    successResponse(res, { message: "Welcome to Tritiya AI API" });
  }),
);

app.use("/api", router);

//No routes after this will be executed....
app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
