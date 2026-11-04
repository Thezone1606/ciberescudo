import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { prisma } from "./db";
import { logger } from "./logger";
import { errorHandler, notFound } from "./middleware/errors";
import { adminRouter } from "./modules/admin/admin.routes";
import { attemptsRouter } from "./modules/attempts/attempts.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { challengesRouter } from "./modules/challenges/challenges.routes";
import { metricsRouter } from "./modules/metrics/metrics.routes";
import { pilotRouter } from "./modules/pilot/pilot.routes";
import { openapi } from "./openapi";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (env.TRUST_PROXY) app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(pinoHttp({ logger }));

  app.get("/api/v1/health", (_req, res) => res.json({ status: "ok" }));
  // Salud con base de datos: la usa el healthcheck del contenedor.
  app.get("/api/v1/health/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });
  app.use("/api/v1", authRouter);
  app.use("/api/v1", challengesRouter);
  app.use("/api/v1", attemptsRouter);
  app.use("/api/v1", metricsRouter);
  app.use("/api/v1", pilotRouter);
  app.use("/api/v1", adminRouter);
  if (env.DOCS_ENABLED) app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
