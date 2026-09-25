import { describe, expect, it } from "vitest";

import { mapPaymentMethod, mapPaymentStatus } from "@/lib/mercadopago";

describe("mapPaymentMethod", () => {
  it("mapeia pix pelo payment_method_id", () => {
    expect(mapPaymentMethod({ payment_method_id: "pix", payment_type_id: "bank_transfer" })).toBe("PIX");
  });

  it("mapeia bank_transfer sem payment_method_id pix também como PIX (único bank_transfer no Brasil)", () => {
    expect(mapPaymentMethod({ payment_type_id: "bank_transfer" })).toBe("PIX");
  });

  it("mapeia credit_card e debit_card", () => {
    expect(mapPaymentMethod({ payment_type_id: "credit_card" })).toBe("CREDIT_CARD");
    expect(mapPaymentMethod({ payment_type_id: "debit_card" })).toBe("DEBIT_CARD");
  });

  it("cai para OTHER em tipos desconhecidos", () => {
    expect(mapPaymentMethod({ payment_type_id: "ticket" })).toBe("OTHER");
    expect(mapPaymentMethod({})).toBe("OTHER");
  });
});

describe("mapPaymentStatus", () => {
  it("mapeia approved", () => {
    expect(mapPaymentStatus("approved")).toBe("APPROVED");
  });

  it("mapeia rejected e cancelled", () => {
    expect(mapPaymentStatus("rejected")).toBe("REJECTED");
    expect(mapPaymentStatus("cancelled")).toBe("CANCELLED");
  });

  it("mapeia refunded e charged_back como REFUNDED", () => {
    expect(mapPaymentStatus("refunded")).toBe("REFUNDED");
    expect(mapPaymentStatus("charged_back")).toBe("REFUNDED");
  });

  it("mapeia in_process, authorized e in_mediation como PROCESSING", () => {
    expect(mapPaymentStatus("in_process")).toBe("PROCESSING");
    expect(mapPaymentStatus("authorized")).toBe("PROCESSING");
    expect(mapPaymentStatus("in_mediation")).toBe("PROCESSING");
  });

  it("cai para PENDING em pending, indefinido ou desconhecido", () => {
    expect(mapPaymentStatus("pending")).toBe("PENDING");
    expect(mapPaymentStatus(undefined)).toBe("PENDING");
    expect(mapPaymentStatus("algo_novo_que_a_api_inventou")).toBe("PENDING");
  });
});
