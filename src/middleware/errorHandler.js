import { formatHttpError } from "../utils/apiResponse.js";

/**
 * Global error handler — same success:false envelope as errorResponse().
 */
export function errorHandler(err, req, res, _next) {
  const { statusCode, body } = formatHttpError(err);

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json(body);
}
