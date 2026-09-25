import { beforeAll, describe, expect, it } from "vitest";

import { generateGiftMessage } from "@/lib/ai";

describe("generateGiftMessage (fallback por template sem ANTHROPIC_API_KEY)", () => {
  beforeAll(() => {
    // Garante o caminho determinístico (template local) independentemente
    // do ambiente onde os testes rodam — sem chamada de rede.
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("gera uma mensagem não vazia mencionando os itens escolhidos e a assinatura", async () => {
    const message = await generateGiftMessage({
      babyName: "Helena",
      listTitle: "Enxoval da Helena",
      itemNames: ["Body manga longa", "Manta de bebê"],
      buyerName: "Tia Ana",
    });

    expect(message.length).toBeGreaterThan(10);
    expect(message).toContain("Body manga longa");
    expect(message).toContain("Manta de bebê");
    expect(message).toContain("Tia Ana");
  });

  it("funciona sem nome do bebê e sem nome de quem presenteia", async () => {
    const message = await generateGiftMessage({
      babyName: null,
      listTitle: "Enxoval",
      itemNames: ["Chupeta"],
      buyerName: null,
    });

    expect(message.length).toBeGreaterThan(10);
    expect(message).toContain("Chupeta");
    expect(message.toLowerCase()).toContain("bebê");
  });
});
