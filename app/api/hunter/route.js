import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    var body = await req.json();
    var apiKey = process.env.HUNTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "HUNTER_API_KEY não configurada" }, { status: 400 });
    }

    var nome = (body.nome || "").trim();
    var empresa = (body.empresa || "").trim();
    var dominio = (body.dominio || "").trim();

    if (!nome) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    // Infer domain from company name if not provided
    if (!dominio && empresa) {
      dominio = inferDomain(empresa);
    }

    if (!dominio) {
      return NextResponse.json({ error: "Não foi possível determinar o domínio da empresa" }, { status: 400 });
    }

    // Split first/last name
    var parts = nome.trim().split(" ");
    var firstName = parts[0] || "";
    var lastName = parts.slice(1).join(" ") || "";

    // Call Hunter email-finder
    var params = new URLSearchParams({
      domain: dominio,
      first_name: firstName,
      last_name: lastName,
      api_key: apiKey
    });

    var res = await fetch("https://api.hunter.io/v2/email-finder?" + params.toString());

    if (!res.ok) {
      var errText = await res.text();
      return NextResponse.json({ error: "Hunter error: " + res.status, detail: errText }, { status: 502 });
    }

    var data = await res.json();
    var email = data.data && data.data.email ? data.data.email : null;
    var score = data.data && data.data.score ? data.data.score : 0;
    var sources = data.data && data.data.sources ? data.data.sources.length : 0;

    // Check remaining requests
    var remaining = null;
    try {
      var metaRes = await fetch("https://api.hunter.io/v2/account?api_key=" + apiKey);
      var metaData = await metaRes.json();
      if (metaData.data && metaData.data.requests) {
        remaining = metaData.data.requests.searches.available;
      }
    } catch(e) {}

    return NextResponse.json({
      ok: true,
      email: email,
      score: score,
      sources: sources,
      dominio: dominio,
      remaining: remaining
    });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Infer domain from company name
function inferDomain(empresa) {
  if (!empresa) return "";

  // Known mappings
  var known = {
    "nubank": "nubank.com.br",
    "itau": "itau.com.br",
    "btg pactual": "btgpactual.com",
    "mercado livre": "mercadolivre.com",
    "ifood": "ifood.com.br",
    "stone": "stone.com.br",
    "creditas": "creditas.com",
    "loggi": "loggi.com",
    "loft": "loft.com.br",
    "quicko": "quicko.com",
    "qurable": "qurable.com",
    "complif": "complif.com",
    "fichap": "fichap.com",
    "henry": "soyhenry.com",
    "shorta": "shorta.com",
    "renxo": "renxo.com",
    "rapiboy": "rapiboy.com",
    "oliverpets": "oliverpets.com",
    "deepagro": "deepagro.com",
    "olga": "olga.com",
    "bord": "bord.com",
  };

  var key = empresa.toLowerCase().trim();
  if (known[key]) return known[key];

  // Generic: slug company name + .com
  var slug = empresa
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

  return slug ? slug + ".com" : "";
}
