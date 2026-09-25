import "server-only";

/**
 * Modelo leve e barato — a tarefa é gerar um texto curto (2-4 frases), não
 * exige um modelo de ponta. Sem ANTHROPIC_API_KEY configurada (ou se a
 * chamada falhar), cai para um template local: o botão nunca fica quebrado.
 */
const MODEL = "claude-haiku-4-5-20251001";
const API_URL = "https://api.anthropic.com/v1/messages";

export type GiftMessageContext = {
  babyName: string | null;
  listTitle: string;
  itemNames: string[];
  buyerName: string | null;
};

function joinItems(itemNames: string[]): string {
  if (itemNames.length === 0) return "o presente escolhido";
  if (itemNames.length === 1) return itemNames[0]!;
  return `${itemNames.slice(0, -1).join(", ")} e ${itemNames[itemNames.length - 1]}`;
}

// Pequenas funções para lidar com as contrações de preposição do português
// (de+o=do, em+o=no) sem misturar artigo indefinido com nome próprio.
function ofBaby(babyName: string | null): string {
  return babyName ? `de ${babyName}` : "do bebê";
}
function forBaby(babyName: string | null): string {
  return babyName ? `para ${babyName}` : "para o bebê";
}
function thinkingOfBaby(babyName: string | null): string {
  return babyName ? `em ${babyName}` : "no bebê";
}

function buildTemplateMessage(ctx: GiftMessageContext): string {
  const items = joinItems(ctx.itemNames);
  const signature = ctx.buyerName ? ` Com carinho, ${ctx.buyerName}.` : " Com muito carinho!";

  const templates = [
    `Com muito carinho, escolhemos ${items} pensando ${thinkingOfBaby(ctx.babyName)}! Que essa fase seja repleta de amor e alegria para a família.${signature}`,
    `É uma alegria enorme fazer parte da chegada ${ofBaby(ctx.babyName)}! Escolhemos ${items} com todo carinho, esperando que seja muito especial.${signature}`,
    `Parabéns pela chegada ${ofBaby(ctx.babyName)}! Preparamos ${items} com muito carinho ${forBaby(ctx.babyName)}. Desejamos toda felicidade do mundo para a família!${signature}`,
  ];

  return templates[Math.floor(Math.random() * templates.length)]!;
}

function buildPrompt(ctx: GiftMessageContext): string {
  const items = joinItems(ctx.itemNames);
  return `Escreva uma mensagem carinhosa e calorosa, em português do Brasil, de quem está presenteando um bebê para os pais dele — para acompanhar os presentes que essa pessoa acabou de comprar de uma lista de enxoval.

Contexto:
- Lista: "${ctx.listTitle}"
- Nome do bebê: ${ctx.babyName ?? "(ainda não revelado — trate como 'o bebê')"}
- Presente(s) comprado(s) agora, que a mensagem é sobre: ${items}
- Assinatura: ${ctx.buyerName ?? "(sem assinatura, não invente um nome)"}

Regras (a primeira é a mais importante — mensagens genéricas que não citam o presente são inaceitáveis):
1. Cite explicitamente, pelo nome, o(s) presente(s) comprado(s) listados acima (${items}) — é sobre isso que a mensagem é.
2. 2 a 4 frases curtas, tom afetuoso e sincero, sem exageros piegas ou clichês em excesso.
3. Pode citar o nome do bebê também, quando fizer sentido.
4. No máximo 1 emoji (opcional).
5. Se houver assinatura, termine com ela naturalmente. Se não houver, não invente uma.
6. Responda APENAS com o texto final da mensagem — sem aspas, sem markdown, sem explicações.`;
}

export async function generateGiftMessage(ctx: GiftMessageContext): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return buildTemplateMessage(ctx);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        messages: [{ role: "user", content: buildPrompt(ctx) }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return buildTemplateMessage(ctx);

    const json = (await response.json()) as { content?: { text?: string }[] };
    const text = json.content?.[0]?.text?.trim();
    return text || buildTemplateMessage(ctx);
  } catch {
    return buildTemplateMessage(ctx);
  }
}
