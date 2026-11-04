-- Un diagnóstico (BASELINE o POSTTEST) se contesta una sola vez por persona y reto.
-- Es un índice único parcial: la práctica (PRACTICE) puede repetirse sin límite.
CREATE UNIQUE INDEX "attempts_diagnostic_once"
  ON "attempts" ("user_id", "challenge_id", "phase")
  WHERE "phase" <> 'PRACTICE';
