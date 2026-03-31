import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    var body = await req.json();
    var apiKey = process.env.APOLLO_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "APOLLO_API_KEY no configurada en Vercel" }, { status: 400 });

    // ---- PERSON enrichment ----
    if (body.person) {
      var p = body.person;
      var result = await enrichPerson(p.nome, p.empresa, p.linkedin, apiKey);
      return NextResponse.json({ ok: true, data: result });
    }

    // ---- Single company enrichment ----
    if (body.domain) {
      var compResult = await enrichCompany(body.domain, apiKey);
      return NextResponse.json({ ok: true, data: compResult });
    }

    // ---- Bulk company enrichment ----
    if (body.companies && Array.isArray(body.companies)) {
      var results = [];
      for (var i = 0; i < body.companies.length; i++) {
        var c = body.companies[i];
        if (!c.dominio) {
          results.push(Object.assign({}, c, { enriched: false, enrichError: "Sin dominio" }));
          continue;
        }
        try {
          var data = await enrichCompany(c.dominio, apiKey);
          results.push(Object.assign({}, c, data, { enriched: true }));
        } catch (e) {
          results.push(Object.assign({}, c, { enriched: false, enrichError: e.message }));
        }
        if (i < body.companies.length - 1) {
          await new Promise(function(r) { setTimeout(r, 300); });
        }
      }
      return NextResponse.json({ ok: true, data: results, enriched: results.filter(function(r) { return r.enriched; }).length });
    }

    return NextResponse.json({ error: "Envie person, domain ou companies[]" }, { status: 400 });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ---- PERSON SEARCH ----
async function enrichPerson(nome, empresa, linkedinUrl, apiKey) {
  // Build search params
  var searchBody = { per_page: 1 };

  // Split name
  if (nome) {
    var parts = nome.trim().split(" ");
    searchBody.first_name = parts[0];
    if (parts.length > 1) searchBody.last_name = parts.slice(1).join(" ");
  }

  // Organization name
  if (empresa) {
    searchBody.organization_name = empresa;
  }

  // LinkedIn URL as extra signal
  if (linkedinUrl) {
    searchBody.linkedin_url = linkedinUrl;
  }

  var res = await fetch("https://api.apollo.io/api/v1/people/match", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify(searchBody)
  });

  if (!res.ok) {
    var errText = "";
    try { errText = await res.text(); } catch(e) {}
    throw new Error("Apollo HTTP " + res.status + ": " + errText.substring(0, 200));
  }

  var data = await res.json();
  var person = data.person || {};

  // Get remaining credits from headers if available
  var credits = null;
  try {
    var creditsHeader = res.headers.get("x-monthly-usage");
    if (creditsHeader) credits = creditsHeader;
  } catch(e) {}

  return {
    email: person.email || "",
    linkedin: person.linkedin_url || linkedinUrl || "",
    cargo: person.title || "",
    pais: person.country || "",
    credits: credits
  };
}

// ---- COMPANY ENRICH ----
async function enrichCompany(domain, apiKey) {
  domain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim();
  if (!domain) throw new Error("Dominio vazio");

  var res = await fetch("https://api.apollo.io/api/v1/organizations/enrich?domain=" + encodeURIComponent(domain), {
    method: "GET",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey }
  });

  if (!res.ok) {
    var errText = "";
    try { errText = await res.text(); } catch(e) {}
    throw new Error("Apollo HTTP " + res.status + ": " + errText.substring(0, 200));
  }

  var data = await res.json();
  var org = data.organization || {};

  return {
    setor: mapIndustry(org.industry || ""),
    industria: org.industry || "",
    tamanho: org.estimated_num_employees || 0,
    tamanoLabel: sizeLabel(org.estimated_num_employees),
    pais: org.country || "",
    cidade: org.city || "",
    descricao: (org.short_description || "").substring(0, 300),
    linkedin: org.linkedin_url || "",
    keywords: (org.keywords || []).slice(0, 8).join(", "),
    funding: org.total_funding ? formatFunding(org.total_funding) : "",
    fundingStage: org.latest_funding_stage || "",
  };
}

function mapIndustry(industry) {
  var i = (industry || "").toLowerCase();
  if (/fintech|financial|banking|payment|insurance/.test(i)) return "Fintech";
  if (/blockchain|crypto|web3|bitcoin|defi/.test(i)) return "Web3/Crypto";
  if (/software|saas|information technology|computer|internet/.test(i)) return "SaaS B2B";
  if (/health|medical|biotech|pharma/.test(i)) return "Healthtech";
  if (/education|e-learning|training/.test(i)) return "Edtech";
  if (/legal|law/.test(i)) return "Legaltech";
  if (/ecommerce|retail|marketplace/.test(i)) return "Ecommerce";
  if (/venture|investment|fund|capital/.test(i)) return "VC/Angel";
  if (industry) return industry;
  return "Otro";
}

function sizeLabel(n) {
  if (!n) return "";
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  if (n <= 200) return "51-200";
  if (n <= 1000) return "201-1000";
  return "1000+";
}

function formatFunding(amount) {
  if (!amount) return "";
  if (amount >= 1000000000) return "$" + (amount / 1000000000).toFixed(1) + "B";
  if (amount >= 1000000) return "$" + (amount / 1000000).toFixed(1) + "M";
  if (amount >= 1000) return "$" + (amount / 1000).toFixed(0) + "K";
  return "$" + amount;
}