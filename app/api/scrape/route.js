import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { url, tipo, estrategia, nome, dryRun } = await req.json();
    if (!url) return NextResponse.json({ error: "URL requerida" }, { status: 400 });

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "es,en;q=0.9,pt;q=0.8",
      },
    });
    if (!res.ok) return NextResponse.json({ error: "HTTP " + res.status }, { status: 400 });
    const html = await res.text();

    var companies = extractCompanies(html);

    // Deduplicate by name
    var seen = {};
    companies = companies.filter(function(c) {
      var key = c.nome.toLowerCase().trim();
      if (seen[key] || key.length < 2) return false;
      seen[key] = true;
      return true;
    });

    // Add source info
    var domain = "";
    try { domain = new URL(url).hostname.replace("www.", ""); } catch(e) {}
    companies = companies.map(function(c) {
      return Object.assign({}, c, {
        fuente: nome || domain,
        estrategia: estrategia || "C - Eventos",
        tipo: tipo || "Evento"
      });
    });

    return NextResponse.json({
      ok: true,
      total: companies.length,
      preview: companies,
      dryRun: dryRun || false
    });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function extractCompanies(html) {
  var companies = [];

  // Pattern 1: Markdown-style links with ## headers (MERGE, event pages)
  // [![Name](img)](url) or ## Name followed by link
  var headerPattern = /##\s*([^\n#]+)/g;
  var m;
  while ((m = headerPattern.exec(html)) !== null) {
    var name = clean(m[1]);
    if (isJunk(name)) continue;

    // Look for URL near this match (within 500 chars before)
    var contextBefore = html.substring(Math.max(0, m.index - 500), m.index);
    var contextAfter = html.substring(m.index, m.index + 500);
    var context = contextBefore + contextAfter;

    // Find link
    var linkMatch = context.match(/\]\((https?:\/\/[^\s\)]+)\)/);
    var hrefMatch = context.match(/href="(https?:\/\/[^\s"]+)"/);
    var siteUrl = "";
    if (linkMatch) siteUrl = linkMatch[1];
    else if (hrefMatch) siteUrl = hrefMatch[1];

    // Extract domain from URL
    var siteDomain = "";
    if (siteUrl) {
      try { siteDomain = new URL(siteUrl).hostname.replace("www.", ""); } catch(e) {}
    }

    // Skip if it looks like an image URL or internal nav
    if (siteUrl && siteUrl.match(/\.(png|jpg|svg|webp|gif)$/i)) siteUrl = "";
    if (siteDomain && siteDomain.match(/mmerge\.io|merge\.io/)) continue;

    // Detect sponsor tier from surrounding context
    var tierContext = html.substring(Math.max(0, m.index - 2000), m.index).toLowerCase();
    var tier = "";
    if (tierContext.lastIndexOf("platinum") > tierContext.lastIndexOf("gold") &&
        tierContext.lastIndexOf("platinum") > tierContext.lastIndexOf("silver")) tier = "Platinum";
    else if (tierContext.lastIndexOf("gold") > tierContext.lastIndexOf("silver") &&
             tierContext.lastIndexOf("gold") > tierContext.lastIndexOf("bronze")) tier = "Gold";
    else if (tierContext.lastIndexOf("silver") > tierContext.lastIndexOf("bronze")) tier = "Silver";
    else if (tierContext.lastIndexOf("bronze") > tierContext.lastIndexOf("startup")) tier = "Bronze";
    else if (tierContext.lastIndexOf("startup") > tierContext.lastIndexOf("ecosystem")) tier = "Startup/VC";
    else if (tierContext.lastIndexOf("ecosystem") > tierContext.lastIndexOf("education")) tier = "Ecosystem";
    else if (tierContext.lastIndexOf("education") > -1) tier = "Educational";
    else if (tierContext.lastIndexOf("media") > -1 || tierContext.lastIndexOf("pr ") > -1) tier = "Media";

    if (name.length >= 2 && name.length < 80) {
      companies.push({
        nome: name,
        website: siteUrl,
        dominio: siteDomain,
        tier: tier,
        notas: tier ? "Tier: " + tier : ""
      });
    }
  }

  // Pattern 2: Bold names in articles (El Referente style)
  if (companies.length === 0) {
    var boldPattern = /(?:<strong>|<b>|<h[2-4][^>]*>)\s*([\w\s\u00C0-\u024F\-\.&]+?)\s*(?:<\/strong>|<\/b>|<\/h[2-4]>)/gi;
    while ((m = boldPattern.exec(html)) !== null) {
      var bName = clean(m[1]);
      if (isJunk(bName) || bName.length < 3 || bName.length > 60) continue;
      var bContext = html.substring(m.index, m.index + 600);
      var bLink = bContext.match(/href="(https?:\/\/[^\s"]+)"/);
      var bDomain = "";
      var bUrl = "";
      if (bLink) {
        bUrl = bLink[1];
        try { bDomain = new URL(bUrl).hostname.replace("www.", ""); } catch(e) {}
      }
      companies.push({ nome: bName, website: bUrl, dominio: bDomain, tier: "", notas: "" });
    }
  }

  // Pattern 3: Link lists - <a href="url">Name</a>
  if (companies.length === 0) {
    var linkPattern = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>\s*([^<]{2,60})\s*<\/a>/gi;
    while ((m = linkPattern.exec(html)) !== null) {
      var lUrl = m[1];
      var lName = clean(m[2]);
      if (isJunk(lName)) continue;
      var lDomain = "";
      try { lDomain = new URL(lUrl).hostname.replace("www.", ""); } catch(e) {}
      if (lDomain && !lDomain.match(/google|facebook|twitter|linkedin|instagram|youtube|github/)) {
        companies.push({ nome: lName, website: lUrl, dominio: lDomain, tier: "", notas: "" });
      }
    }
  }

  return companies;
}

function clean(s) {
  return (s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").replace(/[*_#\[\]]/g, "").trim();
}

function isJunk(name) {
  var junkWords = /^(home|about|contact|menu|search|login|sign|cookie|privacy|terms|loading|undefined|null|image|photo|logo|icon|button|click|read more|ver m|saiba mais|learn more|more info|voltar|next|prev|anterior|seguinte|ingressos|tickets|agenda|speakers|palestrantes|patrocinadores|sponsors|parceiros|partners|newsletter|subscribe|baixe|download|solicite|contato|faqs|submit|enviar|registr|comprar|buy|shop|explore|discover|see all|view all|show more|ver todos)$/i;
  if (junkWords.test(name.trim())) return true;
  if (/^\d+$/.test(name)) return true;
  if (name.length < 2) return true;
  if (name.split(" ").length > 8) return true;
  return false;
}
