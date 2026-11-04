import jwt from "jsonwebtoken";
import { env } from "../../config/env";

export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

export type RoleName = "COLABORADOR" | "ANALISTA" | "SECOPS";

export interface AccessPayload {
  sub: string;
  ver: number;
  typ: "access";
}

export interface RefreshPayload {
  sub: string;
  ver: number;
  jti: string;
  typ: "refresh";
}

// El access token ya no lleva el rol: requireAuth lo lee de la BD en cada petición.
export function signAccess(userId: string, tokenVersion: number) {
  const payload: AccessPayload = { sub: userId, ver: tokenVersion, typ: "access" };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL_SECONDS, algorithm: "HS256" });
}

export function signRefresh(userId: string, tokenVersion: number, jti: string) {
  const payload = { sub: userId, ver: tokenVersion, typ: "refresh" };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TTL_SECONDS,
    algorithm: "HS256",
    jwtid: jti,
  });
}

export function verifyAccess(token: string): AccessPayload {
  const p = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] }) as AccessPayload;
  if (p.typ !== "access") throw new Error("tipo de token inválido");
  return p;
}

export function verifyRefresh(token: string): RefreshPayload {
  const p = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as RefreshPayload;
  if (p.typ !== "refresh" || !p.jti) throw new Error("tipo de token inválido");
  return p;
}
