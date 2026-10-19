import { describe, expect, it } from "vitest";
import { CARD_MATERIAL_INKS } from "./card-materials";
import { BREAKDOWN_LABEL, CARD_TIERS } from "./celebration";
import {
  chainLevelLabel,
  challengesSummary,
  groupBadgeChains,
  modeTierName,
  multiplierTier,
  nearestLabel,
  prizeCodeGroups,
  prizeDateLabel,
  rewardRuleLines,
  shieldLabel,
  sortChainGroups,
  sortPrizes,
  streakMilestoneLabel,
  streakSummary,
  strikeAndPenaltyRuleLines,
  weekCountdownLabel,
} from "./rewards";

describe("materiales de carta", () => {
  it("la web hereda el marco y el brillo del móvil", () => {
    for (const rarity of ["COMUN", "RARA", "EPICA", "LEGENDARIA"] as const) {
      expect(CARD_TIERS[rarity].frame).toEqual(
        CARD_MATERIAL_INKS[rarity].frame.slice(0, 3),
      );
      expect(CARD_TIERS[rarity].glow).toBe(CARD_MATERIAL_INKS[rarity].glow);
    }
  });
  it("el desglose nombra los retos", () => {
    expect(BREAKDOWN_LABEL.challenges).toMatch(/retos/);
  });
});

describe("multiplierTier", () => {
  it("nombra cada escalón y tolera el redondeo", () => {
    expect(multiplierTier(1)).toBe("Arrancando");
    expect(multiplierTier(1.2)).toBe("En marcha");
    expect(multiplierTier(1.3999999)).toBe("Encendido");
    expect(multiplierTier(1.6)).toBe("En llamas");
    expect(multiplierTier(1.8)).toBe("Imparable");
    expect(multiplierTier(2)).toBe("Leyenda");
  });
});

describe("escalón y escudo del modo", () => {
  it("el nombre del servidor manda", () => {
    expect(
      modeTierName({ multiplicador: 1.4, nivelMultiplicador: "Encendido" }),
    ).toBe("Encendido");
    expect(modeTierName({ multiplicador: 1.6 })).toBe("En llamas");
  });
  it("escudo solo si hay", () => {
    expect(shieldLabel(1)).toBe("Escudo listo");
    expect(shieldLabel(0)).toBeNull();
    expect(shieldLabel(undefined)).toBeNull();
  });
});

describe("weekCountdownLabel", () => {
  const now = new Date("2026-10-16T12:00:00Z");
  it("cuenta días hacia arriba", () => {
    expect(weekCountdownLabel("2026-10-19T00:00:00Z", now)).toBe(
      "Quedan 3 días",
    );
    expect(weekCountdownLabel("2026-10-17T12:00:00Z", now)).toBe("Queda 1 día");
  });
  it("pasa a horas en el último día", () => {
    expect(weekCountdownLabel("2026-10-16T17:10:00Z", now)).toBe("Quedan 6 h");
    expect(weekCountdownLabel("2026-10-16T12:59:00Z", now)).toBe(
      "Termina en menos de 1 h",
    );
  });
  it("semana cerrada o fecha rota", () => {
    expect(weekCountdownLabel("2026-10-16T11:00:00Z", now)).toBe(
      "Semana cerrada",
    );
    expect(weekCountdownLabel("no", now)).toBe("");
  });
});

describe("textos de racha y retos", () => {
  it("racha con y sin comodines", () => {
    expect(streakSummary({ current: 12, freezes: 1 })).toBe(
      "12 días · 1 comodín",
    );
    expect(streakSummary({ current: 1, freezes: 2 })).toBe(
      "1 día · 2 comodines",
    );
    expect(streakSummary({ current: 0, freezes: 0 })).toBe("Sin racha todavía");
  });
  it("próximo hito", () => {
    expect(streakMilestoneLabel({ current: 12, nextMilestone: 14 })).toBe(
      "Faltan 2 días para el hito de 14",
    );
    expect(streakMilestoneLabel({ current: 13, nextMilestone: 14 })).toBe(
      "Falta 1 día para el hito de 14",
    );
    expect(
      streakMilestoneLabel({ current: 400, nextMilestone: null }),
    ).toBeNull();
  });
  it("resumen de retos", () => {
    expect(
      challengesSummary({
        completedCount: 2,
        items: [1, 2, 3],
        perfect: false,
      }),
    ).toBe("2 de 3 retos");
    expect(
      challengesSummary({ completedCount: 3, items: [1, 2, 3], perfect: true }),
    ).toBe("Semana redonda");
  });
  it("lo más cerca", () => {
    expect(
      nearestLabel({ name: "Medio centenar", progress: 0.96, threshold: 50 }),
    ).toBe("Te faltan 2 para Medio centenar");
    expect(
      nearestLabel({
        name: "Medio centenar",
        progress: 0.96,
        threshold: 50,
        criterion: "SESSION_COUNT",
      }),
    ).toBe("Te faltan 2 sesiones para Medio centenar");
    expect(
      nearestLabel({
        name: "Un mes sin faltar",
        progress: 0.75,
        threshold: 4,
        criterion: "WEEKLY_STREAK",
      }),
    ).toBe("Te falta 1 semana para Un mes sin faltar");
    expect(
      nearestLabel({
        name: "Sesión brutal",
        progress: 0.896,
        threshold: 10000,
        criterion: "SINGLE_SESSION_VOLUME_KG",
      }),
    ).toBe("Te faltan 1040 kg para Sesión brutal");
    expect(
      nearestLabel({
        name: "Diez kilómetros",
        progress: 0.25,
        threshold: 10,
        criterion: "CARDIO_TOTAL_KM",
      }),
    ).toBe("Te faltan 7,5 km para Diez kilómetros");
    expect(nearestLabel({ name: "X", progress: 0.5, threshold: null })).toBe(
      "Llevas el 50 % de X",
    );
  });
});

describe("premios", () => {
  it("código en dos grupos", () => {
    expect(prizeCodeGroups("k7m2qx")).toBe("K7M 2QX");
    expect(prizeCodeGroups("ABCD")).toBe("ABCD");
  });
  it("fechas por estado", () => {
    expect(
      prizeDateLabel({
        status: "DISPONIBLE",
        expiresAt: null,
        redeemedAt: null,
      }),
    ).toBe("Sin caducidad");
    expect(
      prizeDateLabel({
        status: "DISPONIBLE",
        expiresAt: "2026-10-12T12:00:00Z",
        redeemedAt: null,
      }),
    ).toMatch(/^Caduca el 12/);
    expect(
      prizeDateLabel({
        status: "CADUCADO",
        expiresAt: "2026-10-12T12:00:00Z",
        redeemedAt: null,
      }),
    ).toMatch(/^Caducó el 12/);
    expect(
      prizeDateLabel({
        status: "CANJEADO",
        expiresAt: null,
        redeemedAt: "2026-10-03T12:00:00Z",
      }),
    ).toMatch(/^Canjeado el 3/);
  });
  it("disponibles primero, recientes antes", () => {
    const sorted = sortPrizes([
      { id: "a", status: "CANJEADO" as const, awardedAt: "2026-10-10" },
      { id: "b", status: "DISPONIBLE" as const, awardedAt: "2026-10-01" },
      { id: "c", status: "DISPONIBLE" as const, awardedAt: "2026-10-05" },
    ]);
    expect(sorted.map((prize) => prize.id)).toEqual(["c", "b", "a"]);
  });
});

describe("cadenas de insignias", () => {
  const badge = (
    code: string,
    earned: boolean,
    chain?: string,
    chainStep?: number,
  ) => ({
    code,
    name: code,
    earned,
    progress: earned ? null : 0.5,
    chain,
    chainStep,
    chainLength: chain ? 3 : undefined,
  });

  it("agrupa por criterio en el orden del catálogo y ordena los pasos", () => {
    const groups = groupBadgeChains([
      badge("R30", false, "STREAK", 2),
      badge("PRIMERA", true),
      badge("R7", true, "STREAK", 1),
      badge("R90", false, "STREAK", 3),
    ]);
    expect(groups.map((group) => group.key)).toEqual(["STREAK", "PRIMERA"]);
    const streak = groups[0]!;
    expect(streak.steps.map((step) => step.code)).toEqual(["R7", "R30", "R90"]);
    expect(streak.earnedCount).toBe(1);
    expect(streak.current.code).toBe("R7");
    expect(streak.next?.code).toBe("R30");
    expect(streak.complete).toBe(false);
    expect(chainLevelLabel(streak)).toBe("Nivel 1 de 3");
    expect(chainLevelLabel(groups[1]!)).toBeNull();
    expect(groups[1]!.complete).toBe(true);
  });

  it("sin `chain` cada insignia es su cadena (servidor anterior)", () => {
    const groups = groupBadgeChains([badge("A", false), badge("B", true)]);
    expect(groups).toHaveLength(2);
    expect(sortChainGroups(groups).map((group) => group.key)).toEqual([
      "B",
      "A",
    ]);
  });
});

describe("reglas nuevas", () => {
  it("vacío con un servidor anterior", () => {
    expect(rewardRuleLines({})).toEqual([]);
  });
  it("retos, semana redonda y comodines", () => {
    const lines = rewardRuleLines({
      challengePoints: { FACIL: 60, MEDIO: 100, DIFICIL: 160 },
      perfectWeekBonus: 150,
      freezeEveryDays: 7,
      maxFreezes: 2,
    });
    expect(lines.map((line) => line.rate)).toEqual([
      "+60 / +100 / +160 pts",
      "+150 pts",
      "1 comodín (máx. 2)",
    ]);
  });

  it("reglas de strikes, penalizaciones y progreso", () => {
    expect(strikeAndPenaltyRuleLines({})).toEqual([]);
    const lines = strikeAndPenaltyRuleLines({
      perPersonalRecord: 25,
      monthlyStrikes: 3,
      penaltyMissedSession: 50,
      strikeCost: 150,
    });
    expect(lines).toEqual([
      { key: "progress", label: "Récord personal (PR) y progreso", rate: "+25 pts" },
      { key: "strikes", label: "Strikes mensuales para tu racha", rate: "3 strikes/mes" },
      { key: "penalties", label: "Falta sin reponer en la semana", rate: "-50 pts" },
      { key: "strikeCost", label: "Intercambiar puntos por strike", rate: "150 pts / strike" },
    ]);
  });
});

