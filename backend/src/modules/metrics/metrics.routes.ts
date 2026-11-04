import { Router } from "express";
import { prisma } from "../../db";
import { requireAuth } from "../../middleware/auth";

export const metricsRouter = Router();

// Ranking colaborativo por departamento. Solo agregados: nunca se lista a personas (privacidad).
// Las cuentas SECOPS no cuentan para no sesgar el promedio.
metricsRouter.get("/metrics/leaderboard", requireAuth, async (_req, res) => {
  const [departments, groups] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.user.groupBy({
      by: ["departmentId"],
      where: { role: { name: { not: "SECOPS" } } },
      _sum: { currentXp: true },
      _count: { _all: true },
    }),
  ]);
  const byDept = new Map(groups.map((g) => [g.departmentId, g]));
  const rows = departments.map((d) => {
    const g = byDept.get(d.id);
    const members = g?._count._all ?? 0;
    const totalXp = g?._sum.currentXp ?? 0;
    return {
      departmentId: d.id,
      department: d.name,
      members,
      totalXp,
      averageXp: members ? Math.round((totalXp / members) * 10) / 10 : 0,
    };
  });
  rows.sort((a, b) => b.averageXp - a.averageXp || b.totalXp - a.totalXp || a.department.localeCompare(b.department));
  res.json(rows.map((r, i) => ({ rank: i + 1, ...r })));
});
