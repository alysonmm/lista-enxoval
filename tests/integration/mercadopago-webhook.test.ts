/**
 * Endpoint HTTP do webhook (src/app/api/webhooks/mercadopago/route.ts):
 * cobre só a camada de transporte (assinatura obrigatória, roteamento por
 * tipo de evento) — a lógica de negócio já é testada isoladamente em
 * mercadopago-sync.test.ts, então aqui mockamos syncOrderPaymentFromMercadoPago
 * inteira.
 */
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/checkout/payments", () => ({
  syncOrderPaymentFromMercadoPago: vi.fn().mockResolvedValue(undefined),
}));

const { POST } = await import("@/app/api/webhooks/mercadopago/route");
const { syncOrderPaymentFromMercadoPago } = await import("@/modules/checkout/payments");

const syncMock = vi.mocked(syncOrderPaymentFromMercadoPago);

function buildRequest(opts: {
  dataId?: string;
  signature?: string;
  requestId?: string;
  type?: string;
}) {
  const dataId = opts.dataId ?? "123456";
  const type = opts.type ?? "payment";
  const url = `http://localhost:3000/api/webhooks/mercadopago?data.id=${dataId}&type=${type}`;
  const headers = new Headers({ "content-type": "application/json" });
  if (opts.signature) headers.set("x-signature", opts.signature);
  if (opts.requestId) headers.set("x-request-id", opts.requestId);
  return new NextRequest(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ type, data: { id: dataId } }),
  });
}

function validSignature(secret: string, dataId: string, requestId: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${hash}`;
}

describe("POST /api/webhooks/mercadopago", () => {
  const originalSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
    else process.env.MERCADOPAGO_WEBHOOK_SECRET = originalSecret;
  });

  it("recusa processar (503) quando MERCADOPAGO_WEBHOOK_SECRET não está configurada", async () => {
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
    const response = await POST(buildRequest({ requestId: "req-0" }));
    expect(response.status).toBe(503);
    expect(syncMock).not.toHaveBeenCalled();
  });

  it("rejeita (401) uma assinatura inválida", async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = "segredo-de-teste";
    const request = buildRequest({
      dataId: "123456",
      requestId: "req-1",
      signature: "ts=1,v1=assinatura-forjada",
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(syncMock).not.toHaveBeenCalled();
  });

  it("aceita e processa uma notificação com assinatura válida", async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = "segredo-de-teste";
    const requestId = "req-2";
    const dataId = "123456";
    const signature = validSignature("segredo-de-teste", dataId, requestId);

    const response = await POST(buildRequest({ dataId, requestId, signature }));

    expect(response.status).toBe(200);
    expect(syncMock).toHaveBeenCalledWith(dataId);
  });

  it("ignora notificações que não são do tipo payment, sem checar assinatura", async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = "segredo-de-teste";
    const response = await POST(buildRequest({ type: "merchant_order", requestId: "req-3" }));
    expect(response.status).toBe(200);
    expect(syncMock).not.toHaveBeenCalled();
  });
});
