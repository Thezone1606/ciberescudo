import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./logger";

createApp().listen(env.PORT, () => {
  logger.info(`API escuchando en http://localhost:${env.PORT} (docs en /docs)`);
});
