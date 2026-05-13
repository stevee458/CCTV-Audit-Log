import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { attachUser } from "./middlewares/auth";
import { withIdempotency, pruneIdempotencyKeys } from "./middlewares/idempotency";
import { seedReferenceData } from "./lib/seed";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", attachUser, withIdempotency, router);

seedReferenceData().catch((err) => {
  logger.error({ err }, "Failed to seed reference data");
});

// Prune stale idempotency keys on startup then every 24 hours
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
pruneIdempotencyKeys()
  .then((n) => { if (n > 0) logger.info({ deleted: n }, "Pruned idempotency keys"); })
  .catch(() => {});
setInterval(() => {
  pruneIdempotencyKeys()
    .then((n) => { if (n > 0) logger.info({ deleted: n }, "Pruned idempotency keys"); })
    .catch(() => {});
}, PRUNE_INTERVAL_MS).unref();

export default app;
