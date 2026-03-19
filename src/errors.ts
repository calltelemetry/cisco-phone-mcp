/**
 * Typed error classes for Cisco IP phone operations.
 *
 * Each error carries a machine-readable `code`, a human `message`,
 * an optional HTTP `statusCode`, and the `phoneHost` that was targeted.
 */

export type PhoneErrorCode =
  | "PHONE_UNREACHABLE"
  | "PHONE_AUTH"
  | "PHONE_NOT_SUPPORTED"
  | "PHONE_TIMEOUT"
  | "PHONE_COMMAND";

export class PhoneError extends Error {
  readonly code: PhoneErrorCode;
  readonly statusCode?: number;
  readonly phoneHost: string;

  constructor(code: PhoneErrorCode, message: string, phoneHost: string, statusCode?: number) {
    super(message);
    this.name = "PhoneError";
    this.code = code;
    this.phoneHost = phoneHost;
    this.statusCode = statusCode;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      phoneHost: this.phoneHost,
      ...(this.statusCode != null ? { statusCode: this.statusCode } : {}),
    };
  }
}

/** Phone did not respond — network unreachable, DNS failure, connection refused. */
export class PhoneUnreachableError extends PhoneError {
  constructor(phoneHost: string, message?: string) {
    super("PHONE_UNREACHABLE", message || `Phone unreachable: ${phoneHost}`, phoneHost);
    this.name = "PhoneUnreachableError";
  }
}

/** HTTP 401/403 — bad credentials or auth required. */
export class PhoneAuthError extends PhoneError {
  constructor(phoneHost: string, statusCode: number, message?: string) {
    super(
      "PHONE_AUTH",
      message || `Authentication failed (HTTP ${statusCode}): ${phoneHost}`,
      phoneHost,
      statusCode,
    );
    this.name = "PhoneAuthError";
  }
}

/** HTTP 404 or endpoint missing — phone model does not expose the requested feature. */
export class PhoneNotSupportedError extends PhoneError {
  constructor(phoneHost: string, endpoint: string, statusCode?: number, message?: string) {
    super(
      "PHONE_NOT_SUPPORTED",
      message || `Endpoint not supported on ${phoneHost}: ${endpoint}`,
      phoneHost,
      statusCode ?? 404,
    );
    this.name = "PhoneNotSupportedError";
  }
}

/** Request timed out. */
export class PhoneTimeoutError extends PhoneError {
  constructor(phoneHost: string, timeoutMs: number, message?: string) {
    super(
      "PHONE_TIMEOUT",
      message || `Request to ${phoneHost} timed out after ${timeoutMs}ms`,
      phoneHost,
    );
    this.name = "PhoneTimeoutError";
  }
}

/** Phone returned an error in the CiscoIPPhoneExecute response or an unexpected status. */
export class PhoneCommandError extends PhoneError {
  constructor(phoneHost: string, statusCode: number, message?: string) {
    super(
      "PHONE_COMMAND",
      message || `Phone command failed (HTTP ${statusCode}): ${phoneHost}`,
      phoneHost,
      statusCode,
    );
    this.name = "PhoneCommandError";
  }
}
