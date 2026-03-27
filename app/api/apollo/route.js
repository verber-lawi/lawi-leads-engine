import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    var body = await req.json();

    // Single domain
    if (body.domain) {
      var result = await enrichFromSite(body.domain);
      return NextResponse.json({ ok: true, data: result });
    }

    // Bulk
    if (body.companies && Array.isArray(body.companies)) {
      var results = [];
      for (var i = 0; i < body.companies.length; i++) {
        var c = body.companies[i];
        if (!c.dominio) {
          results.push(Object.assign({}, c, { enriched: false }));
          continue;
        }
        try {
          var data = await enrichFromSite(c.dominio);
          var merged = Object.assign({}, c);
          // Only overwrite fields that are empty in the original
          if (!merged.descricao && data.descricao) merged.descricao = data.descricao;
          if (!merged.linkedin && data.linkedin) merged.linkedin = data.linkedin;
          if (!merged.pais && data.pais) merged.pais = data.pais;
          if (!merged.twitter && data.twitter) merged.twitter = data.twitter;
          if (!merged.setor && data.setor) merged.setor = data.setor;
          // Always bring keywords if found
          if (data.keywords) merged.keywords = data.keywords;
          merged.enriched = data.found;
          results.push(merged);
        } catch (e) {
          results.push(Object.assign({}, c, { enriched: false }));
        }
        // Polite delay to avoid getting blocked
        if (i < body.companies.length - 1) {
          await new Promise(function(r) { setTimeout(r, 150); });
        }
      }
      var enrichedCount = results.filter(function(r) { return r.enriched; }).length;
      return NextResponse.json({ ok: true, data: results, enriched: enrichedCount });
    }

    return NextResponse.json({ error: "Envie domain ou companies[]" }, { status: 400 });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function enrichFromSite(domain) {
  domain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim();
  if (!domain) return { found: false };

  var html = "";
  try {
    var res = await fetch("https://" + domain, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { found: false };
    // Only read first 100KB — enough for <head> and above-fold content
    var reader = res.body.getReader();
    var chunks = [];
    var totalBytes = 0;
    var limit = 100 * 1024;
    while (true) {
      var read = await reader.read();
      if (read.done) break;
      chunks.push(read.value);
      totalBytes += read.value.length;
      if (totalBytes >= limit) { reader.cancel(); break; }
    }
    html = new TextDecoder().decode(Buffer.concat(chunks.map(function(c) { return Buffer.from(c); })));
  } catch (e) {
    return { found: false };
  }

  var data = { found: true, domain: domain };

  // --- Description ---
  // Priority: og:description > meta description > twitter:description > first <p> with substance
  data.descricao = (
    getMeta(html, "og:description") ||
    getMeta(html, "description") ||
    getMeta(html, "twitter:description") ||
    getFirstParagraph(html) ||
    ""
  ).substring(0, 300).trim();

  // --- Company name ---
  data.nomeFromSite = (
    getMeta(html, "og:site_name") ||
    getMeta(html, "og:title") ||
    getTitle(html) ||
    ""
  ).substring(0, 100).trim();

  // --- LinkedIn ---
  var linkedinMatch = html.match(/https?:\/\/(www\.)?linkedin\.com\/company\/([a-zA-Z0-9\-_]+)/);
  data.linkedin = linkedinMatch ? "https://linkedin.com/company/" + linkedinMatch[2] : "";

  // --- Twitter / X ---
  var twitterMatch = html.match(/https?:\/\/(www\.)?(twitter|x)\.com\/([a-zA-Z0-9_]+)/);
  if (twitterMatch && !["intent", "share", "home", "search"].includes(twitterMatch[3])) {
    data.twitter = "https://twitter.com/" + twitterMatch[3];
  } else {
    data.twitter = getMeta(html, "twitter:site") || "";
  }

  // --- Country ---
  // Heuristics: look for country names in footer, contact, about sections
  data.pais = detectCountry(html);

  // --- Sector / keywords from meta keywords ---
  var metaKeywords = getMeta(html, "keywords") || "";
  data.keywords = metaKeywords.substring(0, 200);
  data.setor = metaKeywords ? guessSector(metaKeywords + " " + data.descricao) : "";

  return data;
}

// ============ PARSERS ============

function getMeta(html, name) {
  // og: properties use property=, others use name=
  var patterns = [
    new RegExp('<meta[^>]+property=["\']' + escapeReg(name) + '["\'][^>]+content=["\']([^"\']+)["\']', "i"),
    new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']' + escapeReg(name) + '["\']', "i"),
    new RegExp('<meta[^>]+name=["\']' + escapeReg(name) + '["\'][^>]+content=["\']([^"\']+)["\']', "i"),
    new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']' + escapeReg(name) + '["\']', "i"),
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = html.match(patterns[i]);
    if (m && m[1] && m[1].trim().length > 0) return decodeHtmlEntities(m[1].trim());
  }
  return "";
}

function getTitle(html) {
  var m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decodeHtmlEntities(m[1].trim()) : "";
}

function getFirstParagraph(html) {
  // Find first <p> with at least 60 chars of real text, outside nav/header/footer
  var bodyMatch = html.match(/<body[^>]*>([\s\S]*)/i);
  var body = bodyMatch ? bodyMatch[1] : html;
  var pPattern = /<p[^>]*>([\s\S]{60,500}?)<\/p>/gi;
  var m;
  while ((m = pPattern.exec(body)) !== null) {
    var text = m[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (text.length >= 60 && !/cookie|privacy|terms|copyright/i.test(text)) {
      return text.substring(0, 300);
    }
  }
  return "";
}

function detectCountry(html) {
  // Common patterns: hreflang, address blocks, footer text, phone prefixes
  var hreflangMatch = html.match(/hreflang=["\']([a-z]{2})-([A-Z]{2})["\']/) ||
                      html.match(/hreflang=["\']([a-z]{2})["\'][^>]*href/);
  if (hreflangMatch) {
    var code = (hreflangMatch[2] || hreflangMatch[1] || "").toLowerCase();
    var map = {
      br: "Brazil", us: "United States", uk: "United Kingdom", gb: "United Kingdom",
      es: "Spain", ar: "Argentina", mx: "Mexico", co: "Colombia", cl: "Chile",
      pt: "Portugal", de: "Germany", fr: "France", it: "Italy", nl: "Netherlands",
      sg: "Singapore", au: "Australia", ca: "Canada", in: "India", il: "Israel",
    };
    if (map[code] && code !== "en" && code !== "x") return map[code];
  }

  // Phone prefix
  if (/\+55[\s\-\(]/.test(html)) return "Brazil";
  if (/\+34[\s\-\(]/.test(html)) return "Spain";
  if (/\+54[\s\-\(]/.test(html)) return "Argentina";
  if (/\+52[\s\-\(]/.test(html)) return "Mexico";
  if (/\+44[\s\-\(]/.test(html)) return "United Kingdom";
  if (/\+1[\s\-\(]/.test(html) && /\b(LLC|Inc\.|Corp\.|Delaware|California|New York)\b/.test(html)) return "United States";

  // Explicit country mentions near "headquarter", "based in", "founded in"
  var hqMatch = html.match(/(?:headquartered|based|located|founded)\s+in\s+([\w\s]{3,30}?)(?:\.|,|<)/i);
  if (hqMatch) return hqMatch[1].trim();

  return "";
}

function guessSector(text) {
  var t = (text || "").toLowerCase();
  if (/fintech|financial|banking|payment|insurance|insurtech/.test(t)) return "Fintech";
  if (/blockchain|crypto|web3|bitcoin|defi|digital asset|nft/.test(t)) return "Web3/Crypto";
  if (/saas|software|b2b|cloud|api|developer|devtools/.test(t)) return "SaaS B2B";
  if (/health|medical|biotech|pharma|medtech/.test(t)) return "Healthtech";
  if (/education|e-learning|training|edtech/.test(t)) return "Edtech";
  if (/legal|law|compliance|regulatory/.test(t)) return "Legaltech";
  if (/ecommerce|retail|marketplace|shopping/.test(t)) return "Ecommerce";
  if (/venture|investment|fund|capital|portfolio/.test(t)) return "VC/Angel";
  if (/media|news|content|publish/.test(t)) return "Media";
  if (/logistics|supply chain|freight|shipping/.test(t)) return "Logistics";
  if (/ai|machine learning|artificial intelligence|llm/.test(t)) return "AI/ML";
  return "";
}

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(s) {
  return (s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, function(_, code) { return String.fromCharCode(parseInt(code)); });
}
