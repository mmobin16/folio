export class DocumentError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DocumentError";
    this.status = status;
  }
}

/** Account and profile failures. Document rules keep using DocumentError. */
export class AccountError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AccountError";
    this.status = status;
  }
}
