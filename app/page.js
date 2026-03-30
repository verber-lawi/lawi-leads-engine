"use client";
import { useState, useEffect } from "react";

var ESTRATEGIAS = ["A - Benchmark","B - Job Board","C - Eventos","D - Coworkings","E - VCs/Angels","F - Newsletters"];
var PIPELINES = ["Nuevo","Investigado","Contactado","Respondio","Reunion","Propuesta","Convertido","Perdido"];
var PIPE_COLORS = {Nuevo:"#9e9e9e",Investigado:"#fbc02d",Contactado:"#ff9800",Respondio:"#2196f3",Reunion:"#7c4dff",Propuesta:"#e91e63",Convertido:"#4caf50",Perdido:"#f44336"};
var TIPOS_FONTE = ["Evento","Lista","Noticia","Aceleradora","VC Portfolio","Job Board","Benchmark"];
var PERSONAS = ["Expansor Multi-Region","Hueco Operativo","Post-Ronda","Derivado VC/Aceleradora","Heavy-Contracts B2B"];

export default function App() {
  var s = useState("dashboard"); var page = s[0]; var setPage = s[1];
  var s2 = useState(null); var stats = s2[0]; var setStats = s2[1];
  var s3 = useState(null); var msg = s3[0]; var setMsg = s3[1];

  var loadStats = function() { fetch("/api/leads?stats=true").then(function(r) { return r.json(); }).then(setStats).catch(function() {}); };
  useEffect(function() { loadStats(); }, []);
  useEffect(function() { if (msg) { var t = setTimeout(function() { setMsg(null); }, 4000); return function() { clearTimeout(t); }; } }, [msg]);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ width: 220, background: "#003366", color: "white", padding: "24px 0", flexShrink: 0 }}>
        <div style={{ padding: "0 20px", marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>lawi</div>
          <div style={{ fontSize: 11, color: "#00B8A9", fontWeight: 600 }}>leads engine</div>
        </div>
        <NavBtn label="Dashboard" active={page === "dashboard"} onClick={function() { setPage("dashboard"); loadStats(); }} />
        <NavBtn label="Importar Empresas" active={page === "import"} onClick={function() { setPage("import"); }} />
        <NavBtn label="Empresas" active={page === "empresas"} onClick={function() { setPage("empresas"); }} />
        <NavBtn label="Pipeline Leads" active={page === "pipeline"} onClick={function() { setPage("pipeline"); }} />
        <NavBtn label="Templates" active={page === "templates"} onClick={function() { setPage("templates"); }} />
      </div>
      <div style={{ flex: 1, padding: 32, maxWidth: 1200, overflow: "auto" }}>
        {msg ? <div style={{ position: "fixed", top: 20, right: 20, background: msg.type === "ok" ? "#4caf50" : "#f44336", color: "white", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 100 }}>{msg.text}</div> : null}
        {page === "dashboard" ? <DashboardPage stats={stats} /> : null}
        {page === "import" ? <ImportPage setMsg={setMsg} loadStats={loadStats} /> : null}
        {page === "empresas" ? <EmpresasPage setMsg={setMsg} /> : null}
        {page === "pipeline" ? <PipelinePage /> : null}
        {page === "templates" ? <TemplatesPage /> : null}
      </div>
    </div>
  );
}

// ============ DASHBOARD ============
function DashboardPage(props) {
  var stats = props.stats;
  if (!stats) return <div><h1 style={h1St}>Dashboard</h1><p style={{ color: "#888" }}>Cargando...</p></div>;
  return (
    <div>
      <h1 style={h1St}>Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard label="Leads" value={stats.total} color="#003366" />
        <StatCard label="Empresas" value={stats.empresas || 0} color="#00B8A9" />
        <StatCard label="Nuevos" value={(stats.byPipeline || {}).Nuevo || 0} color="#9e9e9e" />
        <StatCard label="Reuniones" value={(stats.byPipeline || {}).Reunion || 0} color="#7c4dff" />
        <StatCard label="Convertidos" value={(stats.byPipeline || {}).Convertido || 0} color="#4caf50" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Card title="Por Estrategia"><DataTable data={stats.byEstrategia} /></Card>
        <Card title="Por Persona"><DataTable data={stats.byPersona} /></Card>
        <Card title="Por Pais"><DataTable data={stats.byPais} /></Card>
      </div>
    </div>
  );
}

// ============ IMPORT EMPRESAS ============
var EXAMPLE_TEXT = `// Exemplo — cole qualquer formato, um ou vários de uma vez:

Nubank
nubank.com.br
Fintech · Brasil · Series G

---

João Silva
CEO @ Itaú BBA
joao.silva@itau.com.br
linkedin.com/in/joaosilva

---

Empresa: Creditas
Site: creditas.com
Setor: Fintech
País: Brasil
Contato: Sergio Furio, Founder & CEO

---

BTG Pactual · btgpactual.com · Investment Bank · Brazil`;

function ImportPage(props) {
  // Shared
  var st = useState("url"); var activeTab = st[0]; var setActiveTab = st[1];
  var s3 = useState("Evento"); var importTipo = s3[0]; var setImportTipo = s3[1];
  var s4 = useState("C - Eventos"); var importEst = s4[0]; var setImportEst = s4[1];
  var s8 = useState(null); var result = s8[0]; var setResult = s8[1];

  // URL tab
  var s1 = useState(""); var importUrl = s1[0]; var setImportUrl = s1[1];
  var s2 = useState(""); var importNome = s2[0]; var setImportNome = s2[1];
  var s5 = useState(false); var loading = s5[0]; var setLoading = s5[1];
  var s6 = useState(null); var preview = s6[0]; var setPreview = s6[1];

  // Text tab
  var st1 = useState(""); var pasteText = st1[0]; var setPasteText = st1[1];
  var st2 = useState(""); var pasteNome = st2[0]; var setPasteNome = st2[1];
  var st3 = useState(false); var parsing = st3[0]; var setParsing = st3[1];
  var st4 = useState(null); var parsedData = st4[0]; var setParsedData = st4[1];

  // ---- URL tab actions ----
  var doPreview = function() {
    if (!importUrl) return;
    setLoading(true); setPreview(null); setResult(null);
    fetch("/api/scrape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: importUrl, tipo: importTipo, estrategia: importEst, nome: importNome, dryRun: true }) })
      .then(function(r) { return r.json(); })
      .then(function(data) { if (data.error) { setResult({ error: data.error }); } else { setPreview(data.preview || []); } })
      .catch(function(e) { setResult({ error: e.message }); })
      .finally(function() { setLoading(false); });
  };

  var doImportUrl = function() {
    if (!preview || preview.length === 0) return;
    setLoading(true);
    fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "importEmpresas", empresas: preview, fonte: { nome: importNome || importUrl, tipo: importTipo, url: importUrl, estrategia: importEst } }) })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.ok) { setResult(data); props.setMsg({ type: "ok", text: data.saved + " empresas salvas no Notion" }); props.loadStats(); }
      })
      .catch(function(e) { setResult({ error: e.message }); })
      .finally(function() { setLoading(false); });
  };

  // ---- Text tab actions ----
  var doParse = function() {
    if (!pasteText.trim()) return;
    setParsing(true); setParsedData(null); setResult(null);
    fetch("/api/parse-text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: pasteText, estrategia: importEst, fonte: pasteNome }) })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) { setResult({ error: data.error }); }
        else { setParsedData(data); }
      })
      .catch(function(e) { setResult({ error: e.message }); })
      .finally(function() { setParsing(false); });
  };

  var doImportParsed = function() {
    if (!parsedData) return;
    setLoading(true);
    var promises = [];
    if (parsedData.empresas && parsedData.empresas.length > 0) {
      promises.push(
        fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "importEmpresas", empresas: parsedData.empresas, fonte: { nome: pasteNome || "Texto manual", tipo: importTipo, estrategia: importEst } }) })
          .then(function(r) { return r.json(); })
      );
    }
    if (parsedData.leads && parsedData.leads.length > 0) {
      promises.push(
        fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "importLeads", leads: parsedData.leads }) })
          .then(function(r) { return r.json(); })
      );
    }
    Promise.all(promises)
      .then(function(results) {
        var totalSaved = results.reduce(function(acc, r) { return acc + (r.saved || 0); }, 0);
        props.setMsg({ type: "ok", text: totalSaved + " registros salvos no Notion" });
        props.loadStats();
        setPasteText(""); setParsedData(null);
      })
      .catch(function(e) { setResult({ error: e.message }); })
      .finally(function() { setLoading(false); });
  };

  var tabStyle = function(active) {
    return { padding: "8px 20px", border: "none", borderBottom: active ? "2px solid #003366" : "2px solid transparent", background: "none", fontWeight: active ? 700 : 400, color: active ? "#003366" : "#888", fontSize: 14, cursor: "pointer" };
  };

  return (
    <div>
      <h1 style={h1St}>Importar Empresas</h1>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e0e0e0", marginBottom: 20 }}>
        <button style={tabStyle(activeTab === "url")} onClick={function() { setActiveTab("url"); setResult(null); }}>🔗 Scrape por URL</button>
        <button style={tabStyle(activeTab === "text")} onClick={function() { setActiveTab("text"); setResult(null); }}>✍️ Colar Texto</button>
      </div>

      {/* Shared filters */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Select label="Tipo" value={importTipo} onChange={setImportTipo} options={TIPOS_FONTE} />
        <Select label="Estrategia" value={importEst} onChange={setImportEst} options={ESTRATEGIAS} />
      </div>

      {/* ===== TAB: URL ===== */}
      {activeTab === "url" ? (
        <Card title="Scrape por URL">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="URL da fonte *" value={importUrl} onChange={setImportUrl} placeholder="https://www.mmerge.io/pt/.../sponsors_partners" />
            <Field label="Nome da fonte" value={importNome} onChange={setImportNome} placeholder="Ex: MERGE SP 2026 Sponsors" />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={doPreview} disabled={loading || !importUrl} style={btnStyle(importUrl ? "#003366" : "#ddd")}>{loading ? "Buscando..." : "1. Preview"}</button>
            <button onClick={doImportUrl} disabled={loading || !preview || preview.length === 0} style={btnStyle(preview && preview.length > 0 ? "#4caf50" : "#ddd")}>{loading ? "Salvando..." : "2. Salvar no Notion"}</button>
          </div>

          {preview && preview.length > 0 ? <PreviewTable rows={preview} /> : null}
          {preview && preview.length === 0 ? <div style={{ background: "#fff3e0", borderRadius: 8, padding: 12, fontSize: 13, color: "#E65100" }}>Nenhuma empresa encontrada nesta URL.</div> : null}
          {result && result.error ? <div style={{ background: "#ffebee", borderRadius: 8, padding: 12, fontSize: 13, color: "#c62828", marginTop: 12 }}>{"Erro: " + result.error}</div> : null}
          {result && result.saved ? <div style={{ background: "#e8f5e9", borderRadius: 8, padding: 12, fontSize: 13, color: "#2E7D32", marginTop: 12 }}>{result.saved + " empresas salvas no Notion"}</div> : null}
        </Card>
      ) : null}

      {/* ===== TAB: TEXTO ===== */}
      {activeTab === "text" ? (
        <Card title="Colar Texto Livre">
          <Field label="Nome da fonte" value={pasteNome} onChange={setPasteNome} placeholder="Ex: LinkedIn, Email recebido, PDF do evento..." />
          <div style={{ marginTop: 16, marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 4 }}>Texto com dados de empresas e/ou pessoas *</div>
            <textarea
              value={pasteText}
              onChange={function(e) { setPasteText(e.target.value); }}
              placeholder={EXAMPLE_TEXT}
              rows={14}
              style={{ width: "100%", padding: "12px 14px", border: "2px solid #e8e8e8", borderRadius: 10, fontSize: 12, fontFamily: "'Courier New', monospace", lineHeight: 1.7, outline: "none", resize: "vertical", boxSizing: "border-box", color: "#333", background: "#fafafa" }}
            />
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Cole qualquer formato — nome, email, LinkedIn, texto de bio, múltiplas entradas separadas por linha em branco ou "---"</div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 16 }}>
            <button onClick={doParse} disabled={parsing || !pasteText.trim()} style={btnStyle(pasteText.trim() ? "#003366" : "#ddd")}>{parsing ? "Analisando..." : "1. Analisar com IA"}</button>
            <button onClick={doImportParsed} disabled={loading || !parsedData} style={btnStyle(parsedData ? "#4caf50" : "#ddd")}>{loading ? "Salvando..." : "2. Salvar no Notion"}</button>
          </div>

          {/* Parsed preview */}
          {parsedData ? (
            <div>
              {parsedData.empresas && parsedData.empresas.length > 0 ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#003366", marginBottom: 8 }}>{"🏢 " + parsedData.empresas.length + " empresa(s) identificada(s)"}</div>
                  <PreviewTable rows={parsedData.empresas} />
                </div>
              ) : null}

              {parsedData.leads && parsedData.leads.length > 0 ? (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#003366", marginBottom: 8 }}>{"👤 " + parsedData.leads.length + " pessoa(s) identificada(s)"}</div>
                  <div style={{ border: "2px solid #00B8A9", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ maxHeight: 300, overflow: "auto" }}>
                      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                        <thead><tr style={{ background: "#f5f5f5", position: "sticky", top: 0 }}>
                          <th style={thSt}>Nome</th>
                          <th style={thSt}>Cargo</th>
                          <th style={thSt}>Empresa</th>
                          <th style={thSt}>Email</th>
                          <th style={thSt}>LinkedIn</th>
                        </tr></thead>
                        <tbody>{parsedData.leads.map(function(l, i) {
                          return <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td style={Object.assign({}, tdSt, { fontWeight: 600 })}>{l.nome}</td>
                            <td style={tdSt}>{l.cargo || <span style={{ color: "#ccc" }}>--</span>}</td>
                            <td style={tdSt}>{l.empresa || <span style={{ color: "#ccc" }}>--</span>}</td>
                            <td style={tdSt}>{l.email || <span style={{ color: "#ccc" }}>--</span>}</td>
                            <td style={tdSt}>{l.linkedin ? <a href={l.linkedin} target="_blank" rel="noreferrer" style={{ color: "#1565C0", textDecoration: "none" }}>LinkedIn</a> : <span style={{ color: "#ccc" }}>--</span>}</td>
                          </tr>;
                        })}</tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}

              {(!parsedData.empresas || parsedData.empresas.length === 0) && (!parsedData.leads || parsedData.leads.length === 0) ? (
                <div style={{ background: "#fff3e0", borderRadius: 8, padding: 12, fontSize: 13, color: "#E65100" }}>Nenhum dado identificado. Tente reformatar o texto.</div>
              ) : null}
            </div>
          ) : null}

          {result && result.error ? <div style={{ background: "#ffebee", borderRadius: 8, padding: 12, fontSize: 13, color: "#c62828", marginTop: 12 }}>{"Erro: " + result.error}</div> : null}
        </Card>
      ) : null}
    </div>
  );
}

function PreviewTable(props) {
  var rows = props.rows || [];
  return (
    <div style={{ border: "2px solid #00B8A9", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ background: "#00B8A9", color: "white", padding: "8px 16px", fontSize: 13, fontWeight: 600 }}>{rows.length + " empresas encontradas"}</div>
      <div style={{ maxHeight: 500, overflow: "auto" }}>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f5f5f5", position: "sticky", top: 0 }}>
            <th style={thSt}>Empresa</th>
            <th style={thSt}>Dominio</th>
            <th style={thSt}>Setor</th>
            <th style={thSt}>Pais</th>
            <th style={thSt}>Tamanho</th>
            <th style={thSt}>Funding</th>
          </tr></thead>
          <tbody>{rows.map(function(c, i) {
            return <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={Object.assign({}, tdSt, { fontWeight: 600 })}>{c.nome}</td>
              <td style={tdSt}>{c.dominio ? <a href={"https://" + c.dominio} target="_blank" rel="noreferrer" style={{ color: "#1565C0", textDecoration: "none" }}>{c.dominio}</a> : <span style={{ color: "#ccc" }}>--</span>}</td>
              <td style={tdSt}>{c.setor ? <span style={{ background: "#e8f5e9", color: "#2E7D32", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>{c.setor}</span> : <span style={{ color: "#ccc" }}>--</span>}</td>
              <td style={tdSt}>{c.pais || <span style={{ color: "#ccc" }}>--</span>}</td>
              <td style={tdSt}>{c.tamanoLabel || <span style={{ color: "#ccc" }}>--</span>}</td>
              <td style={tdSt}>{c.funding || <span style={{ color: "#ccc" }}>--</span>}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

// ============ EMPRESAS LIST ============
function EmpresasPage(props) {
  var s1 = useState([]); var empresas = s1[0]; var setEmpresas = s1[1];
  var s2 = useState(true); var loading = s2[0]; var setLoading = s2[1];
  var s3 = useState(""); var searchQ = s3[0]; var setSearchQ = s3[1];
  var s4 = useState(""); var setorF = s4[0]; var setSetorF = s4[1];

  var load = function() { setLoading(true); fetch("/api/leads?type=empresas").then(function(r) { return r.json(); }).then(function(d) { if (Array.isArray(d)) setEmpresas(d); }).catch(function() {}).finally(function() { setLoading(false); }); };
  useEffect(function() { load(); }, []);

  var setores = {};
  for (var i = 0; i < empresas.length; i++) { if (empresas[i].setor) setores[empresas[i].setor] = true; }
  var setorList = Object.keys(setores).sort();

  var filtered = empresas.filter(function(e) {
    if (setorF && e.setor !== setorF) return false;
    if (searchQ) { var q = searchQ.toLowerCase(); return e.nome.toLowerCase().indexOf(q) >= 0 || (e.dominio || "").toLowerCase().indexOf(q) >= 0 || (e.industria || "").toLowerCase().indexOf(q) >= 0; }
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#003366" }}>Empresas</h1>
        <button onClick={load} style={{ padding: "8px 16px", background: "#003366", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Atualizar</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={searchQ} onChange={function(e) { setSearchQ(e.target.value); }} placeholder="Buscar..." style={inputSt} />
        <select value={setorF} onChange={function(e) { setSetorF(e.target.value); }} style={selectSt}><option value="">Todos os setores</option>{setorList.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>
        <span style={{ fontSize: 12, color: "#888", alignSelf: "center" }}>{filtered.length + " empresas"}</span>
      </div>
      {loading ? <p>Cargando...</p> : (
        <div>
          {filtered.length === 0 ? <p style={{ color: "#aaa" }}>Nenhuma empresa encontrada. Importe algumas primeiro.</p> : null}
          {filtered.map(function(e) {
            return (
              <div key={e.id} style={{ background: "white", borderRadius: 10, padding: "12px 16px", marginBottom: 6, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: "4px solid #00B8A9" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{e.nome}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {e.dominio ? <a href={"https://" + e.dominio} target="_blank" rel="noreferrer" style={{ color: "#1565C0", textDecoration: "none" }}>{e.dominio}</a> : null}
                    {e.descricao ? <span style={{ marginLeft: 8, color: "#999" }}>{e.descricao.substring(0, 100)}</span> : null}
                  </div>
                </div>
                {e.setor ? <span style={{ background: "#e8f5e9", color: "#2E7D32", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{e.setor}</span> : null}
                {e.pais ? <span style={{ background: "#e3f2fd", color: "#1565C0", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{e.pais}</span> : null}
                {e.tamanoLabel ? <span style={{ background: "#fff3e0", color: "#E65100", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{e.tamanoLabel}</span> : null}
                {e.funding ? <span style={{ background: "#f3e5f5", color: "#7B1FA2", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{e.funding}</span> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ PIPELINE LEADS ============
function PipelinePage() {
  var s1 = useState([]); var leads = s1[0]; var setLeads = s1[1];
  var s2 = useState(true); var loading = s2[0]; var setLoading = s2[1];
  var s3 = useState(""); var searchQ = s3[0]; var setSearchQ = s3[1];
  var s4 = useState(""); var pipeF = s4[0]; var setPipeF = s4[1];

  var load = function() { setLoading(true); fetch("/api/leads").then(function(r) { return r.json(); }).then(function(d) { if (Array.isArray(d)) setLeads(d); }).catch(function() {}).finally(function() { setLoading(false); }); };
  useEffect(function() { load(); }, []);

  var updatePipe = function(id, pipeline) {
    fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updatePipeline", id: id, pipeline: pipeline }) }).catch(function() {});
    setLeads(function(prev) { return prev.map(function(l) { return l.id === id ? Object.assign({}, l, { pipeline: pipeline }) : l; }); });
  };

  var filtered = leads.filter(function(l) {
    if (pipeF && l.pipeline !== pipeF) return false;
    if (searchQ) { var q = searchQ.toLowerCase(); return l.nome.toLowerCase().indexOf(q) >= 0 || l.empresa.toLowerCase().indexOf(q) >= 0; }
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#003366" }}>Pipeline Leads</h1>
        <button onClick={load} style={{ padding: "8px 16px", background: "#003366", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Atualizar</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={searchQ} onChange={function(e) { setSearchQ(e.target.value); }} placeholder="Buscar..." style={inputSt} />
        <select value={pipeF} onChange={function(e) { setPipeF(e.target.value); }} style={selectSt}><option value="">Todos</option>{PIPELINES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select>
        <span style={{ fontSize: 12, color: "#888", alignSelf: "center" }}>{filtered.length + " leads"}</span>
      </div>
      {loading ? <p>Cargando...</p> : (
        <div>
          {filtered.length === 0 ? <p style={{ color: "#aaa" }}>No hay leads.</p> : null}
          {filtered.map(function(l) {
            return (
              <div key={l.id} style={{ background: "white", borderRadius: 10, padding: "12px 16px", marginBottom: 6, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: "4px solid " + (PIPE_COLORS[l.pipeline] || "#ccc") }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{l.nome}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{l.cargo}{l.cargo && l.empresa ? " - " : ""}{l.empresa}</div>
                </div>
                <select value={l.pipeline} onChange={function(e) { updatePipe(l.id, e.target.value); }} style={{ padding: "6px 8px", border: "2px solid " + (PIPE_COLORS[l.pipeline] || "#ccc"), borderRadius: 6, fontSize: 12, fontWeight: 600, color: PIPE_COLORS[l.pipeline] || "#333", background: "white" }}>
                  {PIPELINES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ TEMPLATES ============
function TemplatesPage() {
  var templates = [
    { persona: "Expansor Multi-Region", est: "A/C", gancho: "Centralizamos tu operacion legal en Europa, US y LATAM.", body: "Hola [Nombre],\n\nVi que [Empresa] opera en varios mercados. En Lawi ofrecemos un departamento legal centralizado para scaleups multi-region -- sin coordinar 3 o 4 estudios distintos.\n\nTe interesa una call de 15 min?\n\nSaludos" },
    { persona: "Hueco Operativo", est: "B", gancho: "Legal Department as a Service por menos que esa vacante.", body: "Hola [Nombre],\n\nNote que [Empresa] busca un Legal Counsel part-time. En Lawi ofrecemos LDFS -- un equipo legal completo por menos presupuesto.\n\nConversamos?\n\nSaludos" },
    { persona: "Post-Ronda", est: "E/F", gancho: "Legal as a Service para escalar seguros tras la ronda.", body: "Hola [Nombre],\n\nFelicitaciones por la ronda de [Empresa]! En Lawi acompanamos startups post-ronda -- GDPR, ESOPs, pactos de socios -- por menos que un Director Legal.\n\nAgendamos?\n\nSaludos" },
    { persona: "Derivado VC/Aceleradora", est: "E", gancho: "El partner legal que tus startups necesitan.", body: "Hola [Nombre],\n\nEn Lawi trabajamos como departamento legal tercerizado para startups tech. Nos encantaria ser el partner legal de referencia para el portfolio de [Fondo].\n\nPodemos conversar?\n\nSaludos" },
    { persona: "Heavy-Contracts B2B", est: "A", gancho: "Tu CEO pierde 10h/semana revisando NDAs?", body: "Hola [Nombre],\n\nMuchas empresas SaaS B2B como [Empresa] pierden tiempo revisando contratos. En Lawi gestionamos todo -- NDAs, MSAs, vendor agreements.\n\nHablamos?\n\nSaludos" },
  ];
  return (
    <div>
      <h1 style={h1St}>Templates de Outreach</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {templates.map(function(t, i) {
          return (
            <Card key={i} title={t.persona}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>{"Estrategia: " + t.est}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#E65100", marginBottom: 8 }}>{t.gancho}</div>
              <pre style={{ fontSize: 12, color: "#333", lineHeight: 1.6, background: "#f9f9f9", borderRadius: 8, padding: 12, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{t.body}</pre>
              <button onClick={function() { if (navigator.clipboard) navigator.clipboard.writeText(t.body); }} style={{ marginTop: 8, padding: "6px 12px", background: "#003366", color: "white", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Copiar</button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============ COMPONENTS ============
function NavBtn(props) {
  return <button onClick={props.onClick} style={{ display: "block", width: "100%", padding: "10px 20px", background: props.active ? "rgba(0,184,169,0.2)" : "transparent", color: props.active ? "#00B8A9" : "rgba(255,255,255,0.7)", border: "none", textAlign: "left", fontSize: 14, fontWeight: props.active ? 600 : 400, borderLeft: props.active ? "3px solid #00B8A9" : "3px solid transparent", cursor: "pointer" }}>{props.label}</button>;
}

function Card(props) {
  return <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 }}><div style={{ fontSize: 14, fontWeight: 700, color: "#003366", marginBottom: 12 }}>{props.title}</div>{props.children}</div>;
}

function StatCard(props) {
  return <div style={{ background: "white", borderRadius: 12, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: "3px solid " + props.color }}><div style={{ fontSize: 26, fontWeight: 800, color: props.color }}>{props.value}</div><div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{props.label}</div></div>;
}

function DataTable(props) {
  var entries = Object.entries(props.data || {});
  if (entries.length === 0) return <p style={{ color: "#aaa", fontSize: 13 }}>Sin datos</p>;
  return <div>{entries.map(function(e) { return <div key={e[0]} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}><span>{e[0]}</span><strong>{e[1]}</strong></div>; })}</div>;
}

function Field(props) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 4 }}>{props.label}</div>
      <input value={props.value || ""} onChange={function(e) { props.onChange(e.target.value); }} placeholder={props.placeholder} style={{ width: "100%", padding: "8px 10px", border: "2px solid #e8e8e8", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}

function Select(props) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 4 }}>{props.label}</div>
      <select value={props.value || ""} onChange={function(e) { props.onChange(e.target.value); }} style={{ width: "100%", padding: "8px 10px", border: "2px solid #e8e8e8", borderRadius: 8, fontSize: 13, outline: "none", background: "white" }}>
        {props.empty ? <option value="">{props.empty}</option> : null}
        {props.options.map(function(o) { return <option key={o} value={o}>{o}</option>; })}
      </select>
    </div>
  );
}

function btnStyle(bg) { return { padding: "10px 16px", background: bg, color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }; }

var h1St = { fontSize: 22, fontWeight: 700, color: "#003366", marginBottom: 20 };
var thSt = { textAlign: "left", padding: "8px 10px", fontSize: 12, fontWeight: 600 };
var tdSt = { padding: "6px 10px" };
var inputSt = { padding: "8px 12px", border: "2px solid #e0e0e0", borderRadius: 8, fontSize: 13, width: 220, outline: "none" };
var selectSt = { padding: "8px 12px", border: "2px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", background: "white" };
