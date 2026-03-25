"use client";
import { useState, useEffect } from "react";

const PERSONAS = ["Expansor Multi-Region","Hueco Operativo","Post-Ronda","Derivado VC/Aceleradora","Heavy-Contracts B2B"];
const ESTRATEGIAS = ["A - Benchmark","B - Job Board","C - Eventos","D - Coworkings","E - VCs/Angels","F - Newsletters"];
const PIPELINES = ["Nuevo","Investigado","Contactado","Respondio","Reunion","Propuesta","Convertido","Perdido"];
const PIPE_COLORS = {Nuevo:"#9e9e9e",Investigado:"#fbc02d",Contactado:"#ff9800",Respondio:"#2196f3",Reunion:"#7c4dff",Propuesta:"#e91e63",Convertido:"#4caf50",Perdido:"#f44336"};
const PAISES = ["Espana","Brasil","Argentina","USA","UK","Mexico","Colombia","Otro"];
const SETORES = ["Fintech","SaaS B2B","Healthtech","Web3/Crypto","Insurtech","Edtech","Ecommerce","Legaltech","VC/Angel","Aceleradora","Otro"];
const ESTAGIOS = ["Pre-Seed","Seed","Series A","Series B+","Growth","Establecida"];
const TIPOS_FONTE = ["Evento","Lista","Noticia","Aceleradora","VC Portfolio","Job Board","Benchmark"];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [importUrl, setImportUrl] = useState("");
  const [importTipo, setImportTipo] = useState("Evento");
  const [importEstrategia, setImportEstrategia] = useState("C - Eventos");
  const [importNome, setImportNome] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [previewLeads, setPreviewLeads] = useState(null);
  const [ml, setMl] = useState({});
  const [pipeF, setPipeF] = useState("");
  const [persF, setPersF] = useState("");
  const [stratF, setStratF] = useState("");
  const [searchQ, setSearchQ] = useState("");

  const loadStats = async () => { try { const r = await fetch("/api/leads?stats=true"); setStats(await r.json()); } catch(e) { console.error(e); } };
  const loadLeads = async () => { setLoading(true); try { const r = await fetch("/api/leads"); const d = await r.json(); if (Array.isArray(d)) setLeads(d); } catch(e) { console.error(e); } setLoading(false); };

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); } }, [msg]);

  const doPreview = async () => {
    if (!importUrl) return;
    setImporting(true); setImportResult(null); setPreviewLeads(null);
    try {
      const r = await fetch("/api/scrape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: importUrl, tipo: importTipo, estrategia: importEstrategia, nome: importNome, dryRun: true }) });
      const data = await r.json();
      if (data.error) { setImportResult({ error: data.error }); } else { setPreviewLeads(data.preview || []); setImportResult({ total: data.total, dryRun: true }); }
    } catch (e) { setImportResult({ error: e.message }); }
    setImporting(false);
  };

  const doImport = async () => {
    if (!importUrl) return;
    setImporting(true);
    try {
      const r = await fetch("/api/scrape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: importUrl, tipo: importTipo, estrategia: importEstrategia, nome: importNome, dryRun: false }) });
      const data = await r.json();
      setImportResult(data); setPreviewLeads(null);
      if (data.ok && data.saved > 0) { setMsg({ type: "ok", text: data.saved + " leads importados al Notion" }); loadStats(); }
    } catch (e) { setImportResult({ error: e.message }); }
    setImporting(false);
  };

  const doManual = async () => {
    if (!ml.nome) return;
    setLoading(true);
    try {
      const r = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ml) });
      const data = await r.json();
      if (data.ok) { setMsg({ type: "ok", text: "Lead creado" }); setMl({}); loadStats(); }
    } catch (e) { setMsg({ type: "err", text: e.message }); }
    setLoading(false);
  };

  const updatePipe = async (id, pipeline) => {
    try { await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updatePipeline", id, pipeline }) }); setLeads(function(prev) { return prev.map(function(l) { return l.id === id ? Object.assign({}, l, { pipeline: pipeline }) : l; }); }); } catch(e) { console.error(e); }
  };

  const fLeads = leads.filter(function(l) {
    if (pipeF && l.pipeline !== pipeF) return false;
    if (persF && l.persona !== persF) return false;
    if (stratF && l.estrategia !== stratF) return false;
    if (searchQ) { var q = searchQ.toLowerCase(); if (l.nome.toLowerCase().indexOf(q) === -1 && l.empresa.toLowerCase().indexOf(q) === -1 && l.cargo.toLowerCase().indexOf(q) === -1) return false; }
    return true;
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ width: 220, background: "#003366", color: "white", padding: "24px 0", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 20px", marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>lawi</div>
          <div style={{ fontSize: 11, color: "#00B8A9", fontWeight: 600 }}>leads engine</div>
        </div>
        <NavBtn label="Dashboard" icon="+" active={page === "dashboard"} onClick={function() { setPage("dashboard"); loadStats(); }} />
        <NavBtn label="Importar Leads" icon=">" active={page === "import"} onClick={function() { setPage("import"); }} />
        <NavBtn label="Pipeline" icon="=" active={page === "pipeline"} onClick={function() { setPage("pipeline"); loadLeads(); }} />
        <NavBtn label="Templates" icon="#" active={page === "templates"} onClick={function() { setPage("templates"); }} />
      </div>

      <div style={{ flex: 1, padding: 32, maxWidth: 1100, overflow: "auto" }}>
        {msg ? <div style={{ position: "fixed", top: 20, right: 20, background: msg.type === "ok" ? "#4caf50" : "#f44336", color: "white", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 100 }}>{msg.text}</div> : null}

        {page === "dashboard" ? <DashboardPage stats={stats} /> : null}
        {page === "import" ? <ImportPage importUrl={importUrl} setImportUrl={setImportUrl} importNome={importNome} setImportNome={setImportNome} importTipo={importTipo} setImportTipo={setImportTipo} importEstrategia={importEstrategia} setImportEstrategia={setImportEstrategia} importing={importing} doPreview={doPreview} doImport={doImport} previewLeads={previewLeads} importResult={importResult} ml={ml} setMl={setMl} doManual={doManual} loading={loading} /> : null}
        {page === "pipeline" ? <PipelinePage fLeads={fLeads} loading={loading} loadLeads={loadLeads} searchQ={searchQ} setSearchQ={setSearchQ} pipeF={pipeF} setPipeF={setPipeF} persF={persF} setPersF={setPersF} stratF={stratF} setStratF={setStratF} updatePipe={updatePipe} /> : null}
        {page === "templates" ? <TemplatesPage /> : null}
      </div>
    </div>
  );
}

function DashboardPage({ stats }) {
  if (!stats) return <div><h1 style={{ fontSize: 22, fontWeight: 700, color: "#003366", marginBottom: 20 }}>Dashboard</h1><p style={{ color: "#888" }}>Cargando...</p></div>;
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#003366", marginBottom: 20 }}>Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Leads" value={stats.total} color="#003366" />
        <StatCard label="Nuevos" value={(stats.byPipeline || {}).Nuevo || 0} color="#9e9e9e" />
        <StatCard label="Contactados" value={(stats.byPipeline || {}).Contactado || 0} color="#ff9800" />
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

function ImportPage({ importUrl, setImportUrl, importNome, setImportNome, importTipo, setImportTipo, importEstrategia, setImportEstrategia, importing, doPreview, doImport, previewLeads, importResult, ml, setMl, doManual, loading }) {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#003366", marginBottom: 20 }}>Importar Leads</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Card title="Importar por URL">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="URL de la fuente *" value={importUrl} onChange={setImportUrl} placeholder="https://..." />
            <Field label="Nombre" value={importNome} onChange={setImportNome} placeholder="Ej: MERGE SP 2026 Speakers" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Select label="Tipo" value={importTipo} onChange={setImportTipo} options={TIPOS_FONTE} />
              <Select label="Estrategia" value={importEstrategia} onChange={setImportEstrategia} options={ESTRATEGIAS} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={doPreview} disabled={importing || !importUrl} style={{ flex: 1, padding: 12, background: importUrl ? "#003366" : "#ddd", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>{importing ? "Buscando..." : "Preview"}</button>
              {previewLeads && previewLeads.length > 0 ? <button onClick={doImport} disabled={importing} style={{ flex: 1, padding: 12, background: "#4caf50", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>{"Importar " + previewLeads.length + " leads"}</button> : null}
            </div>
            {previewLeads && previewLeads.length > 0 ? (
              <div style={{ background: "#f8fffe", border: "2px solid #00B8A9", borderRadius: 10, padding: 12, maxHeight: 400, overflow: "auto" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#00B8A9", marginBottom: 8 }}>{"Preview: " + previewLeads.length + " leads encontrados"}</div>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead><tr style={{ borderBottom: "2px solid #e0e0e0" }}><th style={thSt}>Nombre</th><th style={thSt}>Cargo</th><th style={thSt}>Empresa</th><th style={thSt}>Persona</th></tr></thead>
                  <tbody>{previewLeads.map(function(l, i) { return <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}><td style={tdSt}>{l.nome}</td><td style={Object.assign({}, tdSt, { color: "#666" })}>{l.cargo}</td><td style={tdSt}>{l.empresa}</td><td style={tdSt}>{l.persona || ""}</td></tr>; })}</tbody>
                </table>
              </div>
            ) : null}
            {previewLeads && previewLeads.length === 0 ? <div style={{ background: "#fff3e0", borderRadius: 8, padding: 12, fontSize: 13, color: "#E65100" }}>No se encontraron leads en esta URL.</div> : null}
            {importResult && !importResult.dryRun ? (
              <div style={{ background: importResult.error ? "#ffebee" : "#e8f5e9", borderRadius: 8, padding: 12, fontSize: 13 }}>
                {importResult.error ? <span style={{ color: "#c62828" }}>{"Error: " + importResult.error}</span> : <span style={{ color: "#2E7D32" }}>{importResult.saved + " leads guardados en Notion"}</span>}
              </div>
            ) : null}
          </div>
        </Card>
        <Card title="Agregar manualmente">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Nombre *" value={ml.nome || ""} onChange={function(v) { setMl(function(p) { return Object.assign({}, p, { nome: v }); }); }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Cargo" value={ml.cargo || ""} onChange={function(v) { setMl(function(p) { return Object.assign({}, p, { cargo: v }); }); }} />
              <Field label="Empresa" value={ml.empresa || ""} onChange={function(v) { setMl(function(p) { return Object.assign({}, p, { empresa: v }); }); }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Email" value={ml.email || ""} onChange={function(v) { setMl(function(p) { return Object.assign({}, p, { email: v }); }); }} />
              <Field label="LinkedIn" value={ml.linkedin || ""} onChange={function(v) { setMl(function(p) { return Object.assign({}, p, { linkedin: v }); }); }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <Select label="Pais" value={ml.pais || ""} onChange={function(v) { setMl(function(p) { return Object.assign({}, p, { pais: v }); }); }} options={PAISES} empty="--" />
              <Select label="Setor" value={ml.setor || ""} onChange={function(v) { setMl(function(p) { return Object.assign({}, p, { setor: v }); }); }} options={SETORES} empty="--" />
              <Select label="Estagio" value={ml.estagio || ""} onChange={function(v) { setMl(function(p) { return Object.assign({}, p, { estagio: v }); }); }} options={ESTAGIOS} empty="--" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Select label="Persona" value={ml.persona || ""} onChange={function(v) { setMl(function(p) { return Object.assign({}, p, { persona: v }); }); }} options={PERSONAS} empty="--" />
              <Select label="Estrategia" value={ml.estrategia || ""} onChange={function(v) { setMl(function(p) { return Object.assign({}, p, { estrategia: v }); }); }} options={ESTRATEGIAS} empty="--" />
            </div>
            <Field label="Notas" value={ml.notas || ""} onChange={function(v) { setMl(function(p) { return Object.assign({}, p, { notas: v }); }); }} textarea={true} />
            <button onClick={doManual} disabled={!ml.nome || loading} style={{ padding: 12, background: ml.nome ? "#00B8A9" : "#ddd", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14 }}>Guardar Lead</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PipelinePage({ fLeads, loading, loadLeads, searchQ, setSearchQ, pipeF, setPipeF, persF, setPersF, stratF, setStratF, updatePipe }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#003366" }}>Pipeline</h1>
        <button onClick={loadLeads} style={{ padding: "8px 16px", background: "#003366", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Actualizar</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={searchQ} onChange={function(e) { setSearchQ(e.target.value); }} placeholder="Buscar..." style={inputSt} />
        <select value={pipeF} onChange={function(e) { setPipeF(e.target.value); }} style={selectSt}><option value="">Estado</option>{PIPELINES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select>
        <select value={persF} onChange={function(e) { setPersF(e.target.value); }} style={selectSt}><option value="">Persona</option>{PERSONAS.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select>
        <select value={stratF} onChange={function(e) { setStratF(e.target.value); }} style={selectSt}><option value="">Estrategia</option>{ESTRATEGIAS.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select>
        <span style={{ fontSize: 12, color: "#888", alignSelf: "center" }}>{fLeads.length + " leads"}</span>
      </div>
      {loading ? <p>Cargando...</p> : (
        <div>
          {fLeads.length === 0 ? <p style={{ color: "#aaa" }}>No hay leads. Importa algunos primero.</p> : null}
          {fLeads.map(function(l) {
            return (
              <div key={l.id} style={{ background: "white", borderRadius: 10, padding: "12px 16px", marginBottom: 6, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: "4px solid " + (PIPE_COLORS[l.pipeline] || "#ccc") }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{l.nome}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{l.cargo}{l.cargo && l.empresa ? " - " : ""}{l.empresa}</div>
                  {l.notas ? <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{l.notas.substring(0, 80)}</div> : null}
                </div>
                {l.pais ? <span style={{ background: "#e3f2fd", color: "#1565C0", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{l.pais}</span> : null}
                {l.persona ? <span style={{ background: "#f3e5f5", color: "#7B1FA2", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{l.persona.split(" ")[0]}</span> : null}
                <select value={l.pipeline} onChange={function(e) { updatePipe(l.id, e.target.value); }} style={{ padding: "6px 8px", border: "2px solid " + (PIPE_COLORS[l.pipeline] || "#ccc"), borderRadius: 6, fontSize: 12, fontWeight: 600, color: PIPE_COLORS[l.pipeline] || "#333", background: "white", outline: "none", cursor: "pointer" }}>
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

function TemplatesPage() {
  var templates = [
    { persona: "Expansor Multi-Region", est: "A/C", gancho: "Centralizamos tu operacion legal en Europa, US y LATAM por una fraccion del costo.", body: "Hola [Nombre],\n\nVi que [Empresa] opera en varios mercados. En Lawi ofrecemos un departamento legal centralizado para scaleups multi-region -- sin coordinar 3 o 4 estudios distintos.\n\nTe interesa una call de 15 min?\n\nSaludos" },
    { persona: "Hueco Operativo", est: "B", gancho: "Departamento legal entero por menos que el costo de esa vacante.", body: "Hola [Nombre],\n\nNote que [Empresa] busca un Legal Counsel part-time. En Lawi ofrecemos Legal Department as a Service -- un equipo legal completo por menos presupuesto.\n\nConversamos?\n\nSaludos" },
    { persona: "Post-Ronda", est: "E/F", gancho: "Legal as a Service para escalar seguros tras la ronda.", body: "Hola [Nombre],\n\nFelicitaciones por la ronda de [Empresa]! Sabemos que post-ronda los inversores exigen compliance estricto. En Lawi acompanamos startups en esa fase -- GDPR, ESOPs, pactos de socios -- por mucho menos que un Director Legal.\n\nAgendamos?\n\nSaludos" },
    { persona: "Derivado VC/Aceleradora", est: "E", gancho: "El partner legal que tus startups necesitan pero no pueden pagar.", body: "Hola [Nombre],\n\nEn Lawi trabajamos como departamento legal tercerizado para startups tech. Nos encantaria ser el partner legal de referencia para el portfolio de [Fondo].\n\nPodemos conversar?\n\nSaludos" },
    { persona: "Heavy-Contracts B2B", est: "A", gancho: "Tu CEO pierde 10h/semana revisando NDAs?", body: "Hola [Nombre],\n\nMuchas empresas SaaS B2B como [Empresa] pierden tiempo revisando contratos. En Lawi gestionamos todo el flujo contractual -- NDAs, MSAs, vendor agreements -- para que el equipo se enfoque en vender.\n\nHablamos?\n\nSaludos" },
  ];
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#003366", marginBottom: 20 }}>Templates de Outreach</h1>
      <p style={{ color: "#888", marginBottom: 16, fontSize: 14 }}>Mensajes listos por buyer persona. Clic en Copiar para usar.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {templates.map(function(t, i) {
          return (
            <Card key={i} title={t.persona}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>{"Estrategia: " + t.est}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#E65100", marginBottom: 8 }}>{'"' + t.gancho + '"'}</div>
              <pre style={{ fontSize: 12, color: "#333", lineHeight: 1.6, background: "#f9f9f9", borderRadius: 8, padding: 12, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{t.body}</pre>
              <button onClick={function() { if (navigator.clipboard) navigator.clipboard.writeText(t.body); }} style={{ marginTop: 8, padding: "6px 12px", background: "#003366", color: "white", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Copiar</button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function NavBtn({ label, icon, active, onClick }) {
  return <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", background: active ? "rgba(0,184,169,0.2)" : "transparent", color: active ? "#00B8A9" : "rgba(255,255,255,0.7)", border: "none", width: "100%", textAlign: "left", fontSize: 14, fontWeight: active ? 600 : 400, borderLeft: active ? "3px solid #00B8A9" : "3px solid transparent", cursor: "pointer" }}>{label}</button>;
}

function Card({ title, children }) {
  return <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}><div style={{ fontSize: 14, fontWeight: 700, color: "#003366", marginBottom: 12 }}>{title}</div>{children}</div>;
}

function StatCard({ label, value, color }) {
  return <div style={{ background: "white", borderRadius: 12, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: "3px solid " + color }}><div style={{ fontSize: 26, fontWeight: 800, color: color }}>{value}</div><div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{label}</div></div>;
}

function DataTable({ data }) {
  var entries = Object.entries(data || {});
  if (entries.length === 0) return <p style={{ color: "#aaa", fontSize: 13 }}>Sin datos</p>;
  return <div>{entries.map(function(e) { return <div key={e[0]} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}><span>{e[0]}</span><strong>{e[1]}</strong></div>; })}</div>;
}

function Field({ label, value, onChange, placeholder, textarea }) {
  var st = { width: "100%", padding: "8px 10px", border: "2px solid #e8e8e8", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  if (textarea) { st.resize = "vertical"; st.minHeight = 60; }
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 4 }}>{label}</div>
      {textarea ? <textarea value={value || ""} onChange={function(e) { onChange(e.target.value); }} placeholder={placeholder} style={st} /> : <input value={value || ""} onChange={function(e) { onChange(e.target.value); }} placeholder={placeholder} style={st} />}
    </div>
  );
}

function Select({ label, value, onChange, options, empty }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 4 }}>{label}</div>
      <select value={value || ""} onChange={function(e) { onChange(e.target.value); }} style={{ width: "100%", padding: "8px 10px", border: "2px solid #e8e8e8", borderRadius: 8, fontSize: 13, outline: "none", background: "white" }}>
        {empty ? <option value="">{empty}</option> : null}
        {options.map(function(o) { return <option key={o} value={o}>{o}</option>; })}
      </select>
    </div>
  );
}

var thSt = { textAlign: "left", padding: "4px 6px" };
var tdSt = { padding: "4px 6px" };
var inputSt = { padding: "8px 12px", border: "2px solid #e0e0e0", borderRadius: 8, fontSize: 13, width: 220, outline: "none" };
var selectSt = { padding: "8px 12px", border: "2px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", background: "white" };
