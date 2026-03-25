import { addBulkLeads, addFonte } from "../../../lib/notion";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { url, tipo, estrategia, nome, dryRun } = await req.json();
    if (!url) return NextResponse.json({ error: "URL requerida" }, { status: 400 });

    // Fetch the page
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "es,en;q=0.9,pt;q=0.8",
      },
    });
    if (!res.ok) return NextResponse.json({ error: `HTTP ${res.status} al acceder la URL` }, { status: 400 });
    const html = await res.text();

    // Detect source type and extract
    let leads = [];
    const domain = new URL(url).hostname.replace("www.", "");

    if (domain.includes("mmerge.io") || domain.includes("smartsummit")) {
      leads = extractEventSpeakers(html);
    } else if (domain.includes("elreferente.es") || domain.includes("mentorday.es")) {
      leads = extractAngelList(html);
    } else {
      // Generic extraction - try all patterns
      leads = [...extractEventSpeakers(html), ...extractAngelList(html), ...extractGenericProfiles(html)];
    }

    // Deduplicate
    const seen = new Set();
    leads = leads.filter(l => {
      const key = l.nome.toLowerCase().trim();
      if (seen.has(key) || key.length < 3) return false;
      seen.add(key);
      return true;
    });

    // Enrich with source info
    const enriched = leads.map(l => ({
      ...l,
      fuente: nome || domain,
      estrategia: estrategia || guessEstrategia(tipo),
    }));

    // Dry run = preview only
    if (dryRun) {
      return NextResponse.json({ ok: true, total: enriched.length, saved: 0, preview: enriched.slice(0, 20), dryRun: true });
    }

    // Save to Notion
    if (enriched.length > 0) {
      const results = await addBulkLeads(enriched);
      const savedCount = results.filter(r => r.ok).length;

      await addFonte({
        nome: nome || domain,
        tipo: tipo || "Lista",
        url,
        estrategia: estrategia || guessEstrategia(tipo),
        leadsCount: savedCount,
      });

      return NextResponse.json({
        ok: true,
        total: enriched.length,
        saved: savedCount,
        errors: results.filter(r => !r.ok).length,
        preview: enriched.slice(0, 10),
        errorDetails: results.filter(r => !r.ok).slice(0, 5),
      });
    }

    return NextResponse.json({ ok: true, total: 0, preview: [], message: "No se encontraron leads en esta URL. Prueba con otra página." });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ============ EXTRACTORS ============

function extractEventSpeakers(html) {
  const leads = [];

  // Pattern: MERGE style — name in h2/h3 followed by role "em"/"at"/"en" company
  // Example: "## Monica Long\nPresidente *em* **Ripple**"
  const mergePattern = /##?\s*([\w\s\u00C0-\u024F\-\.]+)\n+([^*\n]+?)\s*\*?(?:em|at|en)\*?\s*\*{0,2}([^\n*]+)/g;
  let m;
  while ((m = mergePattern.exec(html)) !== null) {
    const nome = clean(m[1]);
    const cargo = clean(m[2]);
    const empresa = clean(m[3]);
    if (nome.length > 2 && nome.length < 60 && !isJunk(nome)) {
      leads.push({ nome, cargo, empresa, persona: guessSpeakerPersona(cargo, empresa) });
    }
  }

  // Pattern: HTML speaker cards — <h2>Name</h2>..role..company
  const htmlCardPattern = /<h[23][^>]*>\s*([\w\s\u00C0-\u024F\-\.]+)\s*<\/h[23]>[\s\S]{0,400}?(?:em|at|en|@)\s*(?:<[^>]*>)*\s*(?:<strong>|<b>)?\s*([\w\s\u00C0-\u024F\-\.&|]+)/gi;
  while ((m = htmlCardPattern.exec(html)) !== null) {
    const nome = clean(m[1]);
    const empresa = clean(m[2]);
    if (nome.length > 2 && nome.length < 60 && !isJunk(nome) && !leads.find(l => l.nome === nome)) {
      leads.push({ nome, cargo: "", empresa });
    }
  }

  // Pattern: Smart Summit style — image alt + name + role + company in sequential divs
  const ssPattern = /(?:alt="([^"]+)"[^>]*>[\s\S]{0,200})?<(?:h[2-4]|div|p)[^>]*class="[^"]*(?:name|speaker|title)[^"]*"[^>]*>\s*([\w\s\u00C0-\u024F\-\.]+)\s*<\/(?:h[2-4]|div|p)>[\s\S]{0,300}?(?:CEO|CTO|COO|CFO|Founder|Co-[Ff]ounder|Head|Director|Partner|VP|President|Managing|Lead|Manager|Presidente|Diretor)[^<]{0,100}/gi;
  while ((m = ssPattern.exec(html)) !== null) {
    const nome = clean(m[2] || m[1]);
    if (nome && nome.length > 2 && nome.length < 60 && !isJunk(nome) && !leads.find(l => l.nome === nome)) {
      const context = html.substring(m.index, m.index + 400);
      const roleMatch = context.match(/(CEO|CTO|COO|CFO|Founder|Co-[Ff]ounder|Head[^<]{0,40}|Director[^<]{0,40}|Partner|VP[^<]{0,40}|President[a-e]*|Managing[^<]{0,40}|Lead[^<]{0,30})/i);
      leads.push({ nome, cargo: roleMatch ? clean(roleMatch[1]) : "", empresa: "" });
    }
  }

  return leads;
}

function extractAngelList(html) {
  const leads = [];

  // Pattern: Bold name followed by description — typical of El Referente articles
  // <strong>Name</strong> followed by text about fundador/inversor/business angel
  const boldNamePattern = /(?:<strong>|<b>|<h[2-4][^>]*>)\s*([\w\s\u00C0-\u024F\-\.]+?)\s*(?:<\/strong>|<\/b>|<\/h[2-4]>)/gi;
  let m;
  while ((m = boldNamePattern.exec(html)) !== null) {
    const nome = clean(m[1]);
    if (nome.length < 4 || nome.length > 50 || isJunk(nome)) continue;

    // Look at context after the name (next 600 chars)
    const context = html.substring(m.index, m.index + 800).toLowerCase();

    // Must contain angel/investor/founder keywords
    if (!/(fundador|inversor|business angel|emprendedor|cofundador|co-fundador|angel|investor|venture|portfolio)/i.test(context)) continue;

    // Extract sector if mentioned
    const setor = guessSectorFromText(context);

    // Extract invested companies
    const investedMatch = context.match(/(?:invert|invest|participad|portfolio|apuesta)[^.]*?(?:en\s+)?([\w\s,]+(?:,[\w\s]+){2,})/i);
    const startups = investedMatch ? investedMatch[1].split(",").map(s => s.trim()).filter(s => s.length > 2) : [];

    if (!leads.find(l => l.nome === nome)) {
      leads.push({
        nome,
        cargo: "Business Angel / Inversor",
        empresa: "",
        setor: setor || "VC/Angel",
        persona: "Derivado VC/Aceleradora",
        notas: startups.length > 0 ? `Startups: ${startups.slice(0, 8).join(", ")}` : "",
      });
    }
  }

  return leads;
}

function extractGenericProfiles(html) {
  const leads = [];

  // Pattern: Name + C-level title anywhere on page
  const cLevelPattern = /(?:<[^>]*>)\s*([\w\s\u00C0-\u024F\-\.]{3,40})\s*(?:<[^>]*>)[\s\S]{0,200}?((?:CEO|CTO|COO|CFO|Founder|Co-[Ff]ounder|Head of|Director|VP of|Partner at|Managing Director|General Manager)[^<]{0,60})/gi;
  let m;
  while ((m = cLevelPattern.exec(html)) !== null) {
    const nome = clean(m[1]);
    const cargo = clean(m[2]);
    if (nome.length > 3 && nome.length < 45 && !isJunk(nome) && !leads.find(l => l.nome === nome)) {
      leads.push({ nome, cargo, empresa: "" });
    }
  }

  return leads;
}

// ============ HELPERS ============

function clean(s) {
  return (s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").replace(/[*_#]/g, "").trim();
}

function isJunk(name) {
  const junk = /^(home|about|contact|menu|search|login|sign|cookie|privacy|terms|loading|undefined|null|image|photo|logo|icon|button|click|read more|ver más|saiba mais|learn more|more info)/i;
  if (junk.test(name)) return true;
  if (/^\d+$/.test(name)) return true;
  if (name.split(" ").length > 6) return true;
  if (name.length < 3) return true;
  return false;
}

function guessSpeakerPersona(cargo, empresa) {
  const c = (cargo + " " + empresa).toLowerCase();
  if (/founder|co-founder|cofundador|ceo|fundador/.test(c)) return "Post-Ronda";
  if (/head.*latam|country manager|regional|director.*latin|gm.*brazil/.test(c)) return "Expansor Multi-Región";
  if (/angel|investor|vc|venture|capital|fund/.test(c)) return "Derivado VC/Aceleradora";
  return "";
}

function guessSectorFromText(text) {
  const t = text.toLowerCase();
  if (/fintech|insurtech|banking|pagos|payment/.test(t)) return "Fintech";
  if (/health|salud|médic|biotech|pharma/.test(t)) return "Healthtech";
  if (/saas|b2b|software/.test(t)) return "SaaS B2B";
  if (/crypto|blockchain|web3|bitcoin|token|defi/.test(t)) return "Web3/Crypto";
  if (/ecommerce|retail|marketplace/.test(t)) return "Ecommerce";
  if (/edtech|educación|formación/.test(t)) return "Edtech";
  if (/legal|abogad|jurídic/.test(t)) return "Legaltech";
  return "Otro";
}

function guessEstrategia(tipo) {
  const map = { "Evento": "C - Eventos", "Benchmark": "A - Benchmark", "Job Board": "B - Job Board", "Aceleradora": "D - Coworkings", "VC Portfolio": "E - VCs/Angels", "Lista": "E - VCs/Angels", "Notícia": "F - Newsletters" };
  return map[tipo] || "C - Eventos";
}
