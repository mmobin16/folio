import { ensureDatabase } from "../src/lib/db";

ensureDatabase()
  .then(() => {
    console.log("Folio database is ready. Demo accounts use the password ajaia-demo.");
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
