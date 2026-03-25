# Lawi Leads Engine

Plataforma web interna para generación y gestión de leads basada en las 6 estrategias del documento de scraping.

## Setup (5 minutos)

### 1. Clonar e instalar

```bash
cd lawi-leads-engine
npm install
```

### 2. Configurar variables de entorno

Crear archivo `.env.local`:

```
NOTION_TOKEN=ntn_K4786667439b7WggpaT2CWPrVz6XuUbyLWIOaYT4nr35VI
NOTION_PAGE_ID=32611d4ebfaf80c8ac5be11053207117
```

### 3. Subir a GitHub

```bash
git init
git add .
git commit -m "Lawi Leads Engine v1"
git remote add origin https://github.com/verber-lawi/lawi-leads-engine.git
git branch -M main
git push -u origin main
```

### 4. Deploy en Vercel

1. Ir a vercel.com → Import Project → seleccionar `lawi-leads-engine`
2. En **Environment Variables** agregar:
   - `NOTION_TOKEN` = `ntn_K4786667439b7WggpaT2CWPrVz6XuUbyLWIOaYT4nr35VI`
   - `NOTION_PAGE_ID` = `32611d4ebfaf80c8ac5be11053207117`
3. Click Deploy

### 5. Primera ejecución

1. Abrir el sitio
2. Click en **"⚡ Setup Notion"** en el sidebar (crea las 5 bases de datos automáticamente en Notion)
3. Listo — ya puedes importar leads

## Cómo funciona

### Dashboard
Visión general de leads: totales, por pipeline, por persona, por estrategia, por país.

### Importar Leads
Dos modos:
- **Por URL:** Pega la URL de un evento, lista o directorio. El sistema scrapea y extrae leads automáticamente.
- **Manual:** Formulario completo para agregar leads individuales.

### Pipeline
Gestión de leads estilo CRM. Cada lead tiene un estado (Nuevo → Investigado → Contactado → Respondió → Reunión → Propuesta → Convertido/Perdido). Filtros por estado, persona, búsqueda.

### Templates
Biblioteca de mensajes de outreach por buyer persona, con gancho y ejemplo listos para copiar.

## Estructura Notion

El setup crea 5 bases de datos:
- **Leads** — tabla principal
- **Empresas** — empresas asociadas
- **Fontes** — registro de fuentes scrapeadas
- **Interações** — historial de contacto
- **Templates** — templates de outreach

## Estrategias soportadas

| Código | Estrategia | Input |
|--------|-----------|-------|
| A | Benchmark de competencia | URLs de sites de concorrentes |
| B | Job Board Hack | CSV de LinkedIn Jobs / manual |
| C | Scraping de Eventos | URLs de páginas de speakers |
| D | Coworkings / Aceleradoras | URLs de directorios de startups |
| E | VCs / Angels / Hubs | URLs de listas (El Referente, etc.) |
| F | Newsletters / Monitoreo | Cadastro manual por notícias |

## Stack

- Next.js 14 (frontend + API)
- Notion API (banco de datos)
- Vercel (deploy)
