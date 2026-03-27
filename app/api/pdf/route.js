import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const tipo = formData.get("tipo") || "Lista";
    const estrategia = formData.get("estrategia") || "A - Benchmark";
    const nome = formData.get("nome") || "";

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Converte o PDF para base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Envia para Claude API com o PDF como documento
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              {
                type: "text",
                text: `Analise este documento e extraia TODAS as empresas, organizações ou negócios mencionados.

Para cada empresa encontrada, retorne um objeto JSON com os seguintes campos:
- nome: nome da empresa (obrigatório)
- dominio: domínio do site (ex: empresa.com) — se disponível, senão null
- setor: setor/indústria da empresa — se disponível, senão null
- pais: país da empresa — se disponível, senão null
- descricao: breve descrição da empresa — se disponível, senão null
- notas: qualquer informação relevante adicional (ex: tier de patrocínio, cargo de contato) — se disponível, senão null

Retorne APENAS um array JSON válido, sem texto antes ou depois, sem markdown, sem explicações.
Exemplo de formato esperado:
[{"nome":"Empresa X","dominio":"empresax.com","setor":"Tecnologia","pais":"Brasil","descricao":null,"notas":null}]

Se não encontrar nenhuma empresa, retorne um array vazio: []`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json(
        { error: "Erro na Claude API: " + (err.error?.message || response.status) },
        { status: 500 }
      );
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || "[]";

    // Parse do JSON retornado pelo Claude
    let companies = [];
    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      companies = JSON.parse(clean);
    } catch (e) {
      return NextResponse.json({ error: "Erro ao interpretar resposta do Claude: " + rawText.substring(0, 200) }, { status: 500 });
    }

    // Normaliza e adiciona metadados da fonte
    const fonteNome = nome || file.name || "PDF Import";
    companies = companies
      .filter((c) => c.nome && c.nome.length >= 2)
      .map((c) => ({
        nome: c.nome,
        dominio: c.dominio || "",
        setor: c.setor || "",
        pais: c.pais || "",
        descricao: c.descricao || "",
        notas: c.notas || "",
        fuente: fonteNome,
        estrategia: estrategia,
        tipo: tipo,
      }));

    // Deduplica por nome
    const seen = {};
    companies = companies.filter((c) => {
      const key = c.nome.toLowerCase().trim();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });

    return NextResponse.json({
      ok: true,
      total: companies.length,
      preview: companies,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
