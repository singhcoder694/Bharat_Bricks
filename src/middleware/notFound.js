import { AppError } from "../utils/AppError.js";

export function notFound(req, _res, next) {
  next(new AppError(`Not found: ${req.method} ${req.originalUrl}`, 404));
}
