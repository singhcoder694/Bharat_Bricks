import { AppError } from "./AppError.js";

export function buildSuccessBody(data, options = {}) {
  const {
    message = "OK",
    meta = undefined,
  } = typeof options === "string" ? { message: options } : options;

  return {
    success: true,
    message,
    ...(data !== undefined && data !== null ? { data } : {}),
    ...(meta !== undefined ? { meta } : {}),
  };
}

export function buildClientErrorBody(message, { code, errors } = {}) {
  return {
    success: false,
    message,
    ...(code !== undefined ? { code } : {}),
    ...(errors !== undefined ? { errors } : {}),
  };
}

export function successResponse(res, data = null, options = {}) {
  const parsed = typeof options === "string" ? { message: options } : options;
  const { statusCode = 200, ...bodyOptions } = parsed;
  const json = buildSuccessBody(data, bodyOptions);
  return res.status(statusCode).json(json);
}

export function errorResponse(res, message, statusCode = 400, extra = {}) {
  const json = buildClientErrorBody(message, extra);
  return res.status(statusCode).json(json);
}

/**
 * Maps thrown errors to HTTP status and a JSON body matching client errors.
 */
export function formatHttpError(err) {
  const isDev = process.env.NODE_ENV !== "production";
  const isOperational = err instanceof AppError && err.isOperational;
  const statusCode = isOperational ? err.statusCode : 500;
  const message = isOperational
    ? err.message
    : "Something went wrong. Please try again later.";

  const body = {
    success: false,
    message,
    ...(isDev && !isOperational && err.message
      ? { details: err.message }
      : {}),
    ...(isDev && err.stack ? { stack: err.stack } : {}),
  };

  return { statusCode, body };
}
