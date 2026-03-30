import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    var body = await req.json();
    var text = (body.text || "").trim();
    var estrategia = body.estrategia || "";
    var fonte = body.fonte || "";

    if (!text) {
      return NextResponse.json({ error: "Texto vazio" }, { status: 400 });
    }

    var apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 500 });
    }

    var systemPrompt = `Você é um assistente especializado em extrair dados estruturados de textos sobre empresas e pessoas para um CRM de prospecção B2B.

Analise o texto fornecido e extraia TODAS as empresas e pessoas mencionadas.

Retorne APENAS um JSON válido, sem texto antes ou depois, sem markdown, sem explicações. O formato deve ser:

{
  "empresas": [
    {
      "nome": "Nome da Empresa",
      "dominio": "dominio.com",
      "website": "https://dominio.com",
      "setor": "Fintech|SaaS B2B|Healthtech|Web3/Crypto|Edtech|Legaltech|Ecommerce|VC/Angel|Aceleradora|Otro",
      "pais": "Brasil|Espana|Argentina|USA|UK|Mexico|Colombia|Chile|Otro",
      "descricao": "breve descrição se disponível",
      "notas": "informações adicionais relevantes"
    }
  ],
  "leads": [
    {
      "nome": "Nome Completo da Pessoa",
      "cargo": "Cargo/Título",
      "empresa": "Nome da empresa onde trabalha",
      "email": "email@dominio.com ou vazio",
      "linkedin": "https://linkedin.com/in/... ou vazio",
      "notas": "informações adicionais"
    }
  ]
}

Regras:
- Se só tiver empresa sem pessoa, retorne leads: []
- Se só tiver pessoa sem empresa clara, retorne empresas: []  
- Infira o domínio quando possível (ex: "Nubank" → "nubank.com.br")
- Infira o setor quando possível pelo contexto
- Limpe nomes (sem caracteres especiais desnecessários)
- Se o mesmo bloco de texto tiver múltiplas entradas separadas por linha em branco ou "---", extraia cada uma
- Nunca invente dados que não estão no texto`;

    var userPrompt = `Extraia empresas e pessoas deste texto:\n\n${text}`;

    var response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    if (!response.ok) {
      var errText = await response.text();
      return NextResponse.json({ error: "Claude API error: " + response.status, detail: errText }, { status: 502 });
    }

    var data = await response.json();
    var raw = (data.content && data.content[0] && data.content[0].text) || "";

    // Clean potential markdown fences
    raw = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return NextResponse.json({ error: "Falha ao parsear resposta do Claude", raw: raw }, { status: 500 });
    }

    var empresas = (parsed.empresas || []).map(function(e) {
      return Object.assign({}, e, {
        fuente: fonte || "Texto manual",
        estrategia: estrategia || "F - Newsletters"
      });
    });

    var leads = (parsed.leads || []).map(function(l) {
      return Object.assign({}, l, {
        fuente: fonte || "Texto manual",
        estrategia: estrategia || "F - Newsletters"
      });
    });

    return NextResponse.json({
      ok: true,
      empresas: empresas,
      leads: leads,
      total: empresas.length + leads.length
    });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
