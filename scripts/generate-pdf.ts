import { join, relative, basename, dirname } from "path";
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync, writeFileSync, readFileSync, rmSync } from "fs";

const WORKSPACE_ROOT = join(import.meta.dir, "..");
const EXPORT_DIR = join(WORKSPACE_ROOT, "pdf-exports");
const SYSTEM_ARTIFACTS_PDF_DIR = process.env.SYSTEM_ARTIFACTS_PDF_DIR || "";

// Predefined page orders for merging (based on Starlight sidebar configurations)
const PAGE_ORDERS: Record<string, string[]> = {
  "internal-docs": [
    "index.html",
    "arquitetura-monorepo/index.html",
    "diretrizes-desenvolvimento/index.html",
    "infraestrutura/index.html",
    "seguranca-rotacao-tokens/index.html",
    "seguranca-auth/index.html",
    "mapeamento-banco-d1/index.html",
    "data-e-api/index.html",
    "engenharia/sse-reatividade/index.html",
    "engenharia/codigos-erro/index.html",
    "engenharia/geracao-pdf/index.html",
    "engenharia/arquitetura-pulso/index.html",
    "engenharia/arquitetura-caso/index.html",
    "engenharia/arquitetura-traco/index.html",
    "engenharia/aderencia-tecnica/index.html",
    "engenharia/roadmap-execucao/index.html",
  ],
  "user-manual": [
    "index.html",
    "primeiros-passos/index.html",
    "agenda-integrada/index.html",
    "prontuario-digital/index.html",
  ]
};

// Clean and recreate output directories to ensure fresh exports
if (existsSync(EXPORT_DIR)) {
  console.log(`Cleaning old exports directory: ${EXPORT_DIR}`);
  rmSync(EXPORT_DIR, { recursive: true, force: true });
}
mkdirSync(EXPORT_DIR, { recursive: true });

if (SYSTEM_ARTIFACTS_PDF_DIR) {
  if (existsSync(SYSTEM_ARTIFACTS_PDF_DIR)) {
    console.log(`Cleaning old artifacts PDF directory: ${SYSTEM_ARTIFACTS_PDF_DIR}`);
    rmSync(SYSTEM_ARTIFACTS_PDF_DIR, { recursive: true, force: true });
  }
  mkdirSync(SYSTEM_ARTIFACTS_PDF_DIR, { recursive: true });
}

// Recursively find all HTML files
function getHtmlFiles(dir: string, baseDir: string = dir): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  const list = readdirSync(dir);
  for (const file of list) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      results.push(...getHtmlFiles(filePath, baseDir));
    } else if (file.endsWith(".html")) {
      results.push(relative(baseDir, filePath));
    }
  }
  return results;
}

// Run a shell command and wait for it to exit
async function runCmd(cmd: string[], cwd: string): Promise<string> {
  console.log(`Running command: ${cmd.join(" ")} in ${cwd}`);
  const proc = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Command failed with exit code ${exitCode}. Error:\n${stderr}`);
  }
  return stdout;
}

// Generate PDFs for a given project
async function generateProjectPdfs(projectName: string, projectDir: string) {
  console.log(`\n=== Starting PDF generation for ${projectName} ===`);
  
  // 1. Build project
  console.log(`Building ${projectName}...`);
  await runCmd(["bun", "run", "build"], projectDir);
  
  const distDir = join(projectDir, "dist");
  if (!existsSync(distDir)) {
    throw new Error(`Build directory does not exist at ${distDir}`);
  }

  // 2. Start Bun static file server dynamically on a free port
  let server;
  let activePort = 8080;
  while (true) {
    try {
      server = Bun.serve({
        port: activePort,
        async fetch(req) {
          const url = new URL(req.url);
          let filePath = join(distDir, url.pathname);
          
          // Handle trailing slash / directory requests
          if (url.pathname.endsWith("/")) {
            filePath = join(filePath, "index.html");
          } else {
            try {
              if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
                filePath = join(filePath, "index.html");
              }
            } catch (e) {}
          }
          
          if (existsSync(filePath)) {
            return new Response(Bun.file(filePath));
          }
          return new Response("Not Found", { status: 404 });
        },
      });
      console.log(`Started temporary static server on port ${activePort}...`);
      break;
    } catch (e: any) {
      if (e.code === "EADDRINUSE" || (e.message && e.message.includes("EADDRINUSE"))) {
        console.log(`Port ${activePort} is in use, trying next port...`);
        activePort++;
      } else {
        throw e;
      }
    }
  }

  try {
    // 3. Find and sort HTML routes
    const htmlFiles = getHtmlFiles(distDir);
    
    // Sort according to sidebar order definition
    const orderList = PAGE_ORDERS[projectName] || [];
    const sortedHtmlFiles = [...htmlFiles].sort((a, b) => {
      const idxA = orderList.indexOf(a);
      const idxB = orderList.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    // Filter out error page (404.html)
    const routesToPrint = sortedHtmlFiles.filter(file => file !== "404.html");
    console.log(`Found ${routesToPrint.length} pages to harvest for ${projectName}.`);

    // Determine subfolder based on export type (internal vs manual)
    const subDirName = projectName === "internal-docs" ? "internal" : "manual";
    
    const projExportDir = join(EXPORT_DIR, subDirName);
    if (!existsSync(projExportDir)) {
      mkdirSync(projExportDir, { recursive: true });
    }
    let projSystemDir = "";
    if (SYSTEM_ARTIFACTS_PDF_DIR) {
      projSystemDir = join(SYSTEM_ARTIFACTS_PDF_DIR, subDirName);
      if (!existsSync(projSystemDir)) {
        mkdirSync(projSystemDir, { recursive: true });
      }
    }

    const chapters: string[] = [];
    const tocItems: { title: string; id: string }[] = [];
    let stylesheetLinks: string[] = [];

    // 4. Harvest HTML content and extract metadata
    for (const file of routesToPrint) {
      const route = file === "index.html" ? "/" : "/" + file.replace(/index\.html$/, "");
      
      const htmlPath = join(distDir, file);
      if (!existsSync(htmlPath)) continue;
      const htmlContent = readFileSync(htmlPath, "utf-8");

      // Extract stylesheets from the first HTML file
      if (stylesheetLinks.length === 0) {
        stylesheetLinks = htmlContent.match(/<link[^>]*rel="stylesheet"[^>]*>/gi) || [];
      }

      // Extract Title
      const titleMatch = htmlContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      let pageTitle = titleMatch?.[1]?.trim() || "Documento";
      if (pageTitle.includes("|")) {
        pageTitle = pageTitle.split("|")[0]?.trim() || pageTitle;
      } else if (pageTitle.includes("—")) {
        pageTitle = pageTitle.split("—")[0]?.trim() || pageTitle;
      }

      // Clarify introduction page title
      if (file === "index.html") {
        pageTitle = "Introdução";
      }

      const chapterId = `chapter-${tocItems.length}`;
      tocItems.push({ title: pageTitle, id: chapterId });

      // Extract Main Content
      const mainMatch = htmlContent.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
      let mainContent = mainMatch ? mainMatch[1] : htmlContent;

      // Wrap in page-break container with chapter ID
      chapters.push(`
        <div id="${chapterId}" class="document-chapter">
          <div class="chapter-content">
            ${mainContent}
          </div>
        </div>
      `);
    }

    // 5. Compile and print the consolidated PDF Book
    if (chapters.length > 0) {
      const bookTitle = projectName === "internal-docs" ? "Aura - Diretrizes de Engenharia (DevSpecs)" : "Aura - Central de Ajuda";
      
      const consolidatedHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${bookTitle}</title>
  ${stylesheetLinks.join("\n")}
  <style>
    /* Complete Border and Shadow Reset for Layout Elements to remove default black outlines */
    *:not(table):not(th):not(td):not(tr):not(pre):not(code):not(hr):not(blockquote):not(.mermaid-container):not(.mermaid):not(svg):not(path):not(ellipse):not(line):not(polygon):not(polyline):not(rect):not(circle):not(g) {
      border: none !important;
      border-top: none !important;
      border-bottom: none !important;
      border-left: none !important;
      border-right: none !important;
      outline: none !important;
      box-shadow: none !important;
    }
    
    /* Revert borders for content-specific elements */
    table, th, td, tr, pre, code, hr, blockquote, .mermaid-container, .mermaid {
      border: 1px solid #e4e4e7 !important;
    }
    
    table {
      border-collapse: collapse !important;
      width: 100% !important;
    }
    
    /* Print Book Overrides - Force Light Theme backgrounds and colors globally */
    :root, :root[data-theme='dark'], html, body {
      color-scheme: light !important;
      background-color: #ffffff !important;
      background: #ffffff !important;
      color: #18181b !important;
      --sl-color-bg: #ffffff !important;
      --sl-color-text: #18181b !important;
      --sl-color-text-invert: #ffffff !important;
      --sl-color-accent: #7c3aed !important;
      --sl-color-accent-high: #6d28d9 !important;
      --sl-color-accent-low: #f5f3ff !important;
      --sl-color-gray-1: #18181b !important;
      --sl-color-gray-2: #27272a !important;
      --sl-color-gray-3: #52525b !important;
      --sl-color-gray-4: #a1a1aa !important;
      --sl-color-gray-5: #d4d4d8 !important;
      --sl-color-gray-6: #f4f4f5 !important;
      --sl-color-hairline: #e4e4e7 !important;
      --sl-color-hairline-light: #f4f4f5 !important;
      --sl-color-bg-sidebar: #ffffff !important;
      --sl-color-bg-nav: #ffffff !important;
      --sl-color-bg-inline-code: #f4f4f5 !important;
      --sl-color-orange-low: #fff7ed !important;
      --sl-color-green-low: #f0fdf4 !important;
      --sl-color-blue-low: #eff6ff !important;
      --sl-color-red-low: #fef2f2 !important;
    }

    /* Force light colors even under dark mode preference when printing */
    @media (prefers-color-scheme: dark) {
      :root, :root[data-theme='dark'], html, body {
        color-scheme: light !important;
        background-color: #ffffff !important;
        background: #ffffff !important;
        color: #18181b !important;
        --sl-color-bg: #ffffff !important;
        --sl-color-text: #18181b !important;
        --sl-color-bg-sidebar: #ffffff !important;
        --sl-color-bg-nav: #ffffff !important;
      }
    }

    body {
      font-size: 11pt !important;
      padding: 0 !important;
      margin: 0 auto !important;
      width: 180mm !important;
      max-width: 180mm !important;
    }
    
    /* Make sure all Starlight container elements are transparent */
    .page, .main-frame, .main-pane, .sl-container, .content-panel, .chapter-content, .document-chapter {
      background-color: transparent !important;
      background: transparent !important;
    }

    /* Print styling for code block backgrounds */
    pre, code, .expressive-code {
      background-color: #f8f8f8 !important;
      background: #f8f8f8 !important;
    }
    
    /* Cover Page */
    .book-cover {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 90vh;
      text-align: center;
      page-break-after: always;
      break-after: page;
      font-family: "Geist Sans", "Inter", sans-serif;
    }
    .book-cover .title-gradient {
      font-size: 2.8rem;
      font-weight: 300;
      letter-spacing: 0.05em;
      margin-bottom: 1.5rem;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .book-cover p {
      font-size: 1.1rem;
      color: #666;
      margin-top: 0;
    }
    .book-cover .meta-info {
      margin-top: 6rem;
      font-size: 0.85rem;
      color: #999;
    }

    /* Table of Contents (Clickable & Dynamic page numbering via target-counter) */
    .book-toc {
      page-break-after: always;
      break-after: page;
      padding: 3rem 1.5rem;
      font-family: "Geist Sans", "Inter", sans-serif;
    }
    .book-toc h2 {
      font-size: 2rem;
      font-weight: 400;
      border-bottom: 2px solid #f4f4f5;
      padding-bottom: 0.75rem;
      margin-bottom: 2rem;
      letter-spacing: 0.02em;
    }
    .book-toc ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .book-toc li {
      position: relative;
      margin-bottom: 1.25rem;
      font-size: 1.05rem;
    }
    /* Dotted leader lines styling */
    .book-toc li::before {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: 4px;
      border-bottom: 1px dotted #e4e4e7;
      z-index: 1;
    }
    .book-toc .toc-link {
      position: relative;
      z-index: 2;
      display: block;
      text-decoration: none;
      color: inherit;
    }
    .book-toc .toc-link-title {
      display: inline;
      background: white;
      padding-right: 6px;
    }
    .book-toc .toc-title {
      font-weight: 500;
      color: #27272a;
    }
    .book-toc .toc-num {
      color: #a1a1aa;
      margin-right: 0.75rem;
      font-weight: 400;
    }
    /* Resolve and render consecutive page numbers dynamically in Chrome printing */
    .book-toc .toc-page-num {
      float: right;
      background: white;
      padding-left: 6px;
      font-weight: 500;
      color: #3f3f46;
      position: relative;
      z-index: 2;
    }

    /* Chapter Wrappers */
    .document-chapter {
      page-break-before: always;
      break-before: page;
      padding-top: 1rem;
    }
    
    /* Ensure main contents fill A4 width */
    main, .main-pane, .content-panel {
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    /* Hide standard UI elements inside printed pages if any leaked in */
    header, .sidebar, .sidebar-pane, aside, .right-sidebar, footer, .pagination, .floating-pdf-btn, .actions, button {
      display: none !important;
    }

    /* Brand Hero Card for Index Pages */
    .brand-hero-card {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      padding: 3rem 2rem !important;
      margin: 2.5rem auto !important;
      background: rgba(9, 9, 11, 0.02) !important;
      border: 1px solid rgba(9, 9, 11, 0.05) !important;
      border-radius: 1.5rem !important;
      max-width: 500px !important;
    }
    
    .brand-hero-card img {
      width: 120px !important;
      height: 120px !important;
      margin-bottom: 0.75rem !important;
    }
    
    .brand-hero-card span {
      font-size: 1.4rem !important;
      font-weight: 300 !important;
      letter-spacing: 0.35em !important;
      color: #7c3aed !important;
    }
    
    .brand-hero-text {
      font-size: 0.75rem !important;
      color: #52525b !important;
      margin-top: 1.5rem !important;
      letter-spacing: 0.18em !important;
      text-transform: uppercase !important;
      text-align: center !important;
      font-weight: 500 !important;
    }
  </style>
  <script>
    window.addEventListener('load', () => {
      // Printable height of A4 at 96 DPI with 20mm margins: 257mm = 971.32px
      const PRINTABLE_HEIGHT = 971.32;
      const chapters = document.querySelectorAll('.document-chapter');
      let currentPage = 3; // Cover is page 1, TOC is page 2, Chapter 1 starts on page 3
      
      chapters.forEach((chapter) => {
        const tocLink = document.querySelector('.book-toc a[href="#' + chapter.id + '"]');
        if (tocLink) {
          const pageSpan = document.createElement('span');
          pageSpan.className = 'toc-page-num';
          pageSpan.textContent = currentPage;
          tocLink.appendChild(pageSpan);
        }
        
        const height = chapter.offsetHeight;
        const pagesUsed = Math.ceil(height / PRINTABLE_HEIGHT) || 1;
        currentPage += pagesUsed;
      });
    });
  </script>
</head>
<body>
  <!-- Book Cover -->
  <div class="book-cover">
    <div class="title-gradient">${bookTitle}</div>
    <p>${projectName === "internal-docs" ? "Especificações Técnicas e Diretrizes de Engenharia" : "Central de Ajuda e Manual do Usuário"}</p>
    <div class="meta-info">
      Documentação Oficial do Aura Base<br>
      Gerado em ${new Date().toLocaleDateString('pt-BR')}<br>
      Canimandra Tecnologia
    </div>
  </div>

  <!-- Table of Contents -->
  <div class="book-toc">
    <h2>Sumário</h2>
    <ul>
      ${tocItems.map((item, index) => `
        <li>
          <a href="#${item.id}" class="toc-link">
            <span class="toc-link-title">
              <span class="toc-title"><span class="toc-num">${(index + 1).toString().padStart(2, "0")}.</span>${item.title}</span>
            </span>
          </a>
        </li>
      `).join("")}
    </ul>
  </div>

  <!-- Chapters -->
  ${chapters.join("\n")}
</body>
</html>
      `;

      // Save consolidated HTML to dist directory
      const consolidatedHtmlPath = join(distDir, "consolidated-book.html");
      writeFileSync(consolidatedHtmlPath, consolidatedHtml);

      // Print the consolidated book HTML using Chrome
      const consolidatedName = `${projectName}-consolidated.pdf`;
      const consolidatedOutputPath = join(projExportDir, consolidatedName);
      console.log(`\nGenerating unified document book for ${projectName}...`);

      const url = `http://localhost:${activePort}/consolidated-book.html`;

      // Print consolidated PDF with dynamic continuous page numbers, headers, and footers
      await runCmd([
        "google-chrome",
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--prefers-color-scheme=light",
        "--print-to-pdf=" + consolidatedOutputPath,
        "--display-header-footer",
        `--header-template=<div style="font-size:7px;font-family:sans-serif;width:100%;text-align:right;padding-right:20px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.05em;">${bookTitle}</div>`,
        `--footer-template=<div style="font-size:8px;font-family:sans-serif;width:100%;text-align:center;color:#71717a;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`,
        "--virtual-time-budget=5000",
        url
      ], WORKSPACE_ROOT);

      console.log(`Consolidated PDF created at: ${consolidatedOutputPath}`);
      
      // Copy to system artifacts folder
      if (projSystemDir) {
        const consolidatedSystemPath = join(projSystemDir, consolidatedName);
        copyFileSync(consolidatedOutputPath, consolidatedSystemPath);
      }
    }

  } finally {
    // 6. Shutdown server
    console.log(`Stopping static server...`);
    server.stop();
  }
}

async function main() {
  try {
    const internalDocsDir = join(WORKSPACE_ROOT, "apps/internal-docs");
    const userManualDir = join(WORKSPACE_ROOT, "apps/user-manual");

    await generateProjectPdfs("internal-docs", internalDocsDir);
    await generateProjectPdfs("user-manual", userManualDir);

    console.log("\n================================================");
    console.log("PDF Generation and Consolidation Complete!");
    console.log(`Local Workspace PDF Directory: ${EXPORT_DIR}`);
    if (SYSTEM_ARTIFACTS_PDF_DIR) {
      console.log(`IDE Artifacts PDF Directory: ${SYSTEM_ARTIFACTS_PDF_DIR}`);
    }
    console.log("================================================");
  } catch (error) {
    console.error("PDF Generation Failed:", error);
    process.exit(1);
  }
}

main();
