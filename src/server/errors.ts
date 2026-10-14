export class DocumentError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DocumentError";
    this.status = status;
  }
}
