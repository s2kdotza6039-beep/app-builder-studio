"use client";

import { useEffect, useRef } from "react";

interface CodeViewerProps {
  code: string;
  language: string;
  filePath?: string;
}

// Language detection from file extension
function detectLanguage(filePath: string, language: string): string {
  if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) return "jsx";
  if (filePath.endsWith(".ts")) return "typescript";
  if (filePath.endsWith(".js")) return "javascript";
  if (filePath.endsWith(".json")) return "json";
  if (filePath.endsWith(".md")) return "markdown";
  if (filePath.endsWith(".css")) return "css";
  if (filePath.endsWith(".html")) return "html";
  return language || "typescript";
}

// Simple but effective syntax highlighter
// Covers: keywords, strings, comments, JSX tags, numbers, functions
function highlight(code: string, lang: string): string {
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (lang === "json") {
    return escaped
      .replace(/(".*?")\s*:/g, '<span class="ch-key">$1</span>:')
      .replace(/:\s*(".*?")/g, ': <span class="ch-string">$1</span>')
      .replace(/:\s*(\d+\.?\d*)/g, ': <span class="ch-number">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="ch-keyword">$1</span>');
  }

  if (lang === "markdown") {
    return escaped
      .replace(/^(#{1,6}\s.+)$/gm, '<span class="ch-heading">$1</span>')
      .replace(/(`[^`]+`)/g, '<span class="ch-string">$1</span>')
      .replace(/(\*\*[^*]+\*\*)/g, '<strong>$1</strong>')
      .replace(/^(\s*[-*]\s)/gm, '<span class="ch-keyword">$1</span>');
  }

  // TSX / TypeScript / JavaScript
  return escaped
    // Single line comments
    .replace(/(\/\/[^\n]*)/g, '<span class="ch-comment">$1</span>')
    // Multi-line comments
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="ch-comment">$1</span>')
    // Template literals
    .replace(/(`[^`]*`)/g, '<span class="ch-template">$1</span>')
    // Double quote strings
    .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="ch-string">$1</span>')
    // Single quote strings
    .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="ch-string">$1</span>')
    // JSX/HTML tags - opening
    .replace(/&lt;(\/?[A-Z][A-Za-z0-9]*)/g, '&lt;<span class="ch-component">$1</span>')
    .replace(/&lt;(\/?[a-z][a-z0-9-]*)/g, '&lt;<span class="ch-tag">$1</span>')
    // Keywords
    .replace(
      /\b(import|export|default|from|const|let|var|function|return|if|else|for|while|class|extends|new|typeof|instanceof|async|await|try|catch|throw|interface|type|enum|implements|readonly|public|private|protected|static|abstract|override)\b/g,
      '<span class="ch-keyword">$1</span>'
    )
    // React/Next specific
    .replace(
      /\b(useState|useEffect|useRef|useCallback|useMemo|useContext|useRouter|useParams|getServerSession|redirect|notFound)\b/g,
      '<span class="ch-function">$1</span>'
    )
    // Numbers
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="ch-number">$1</span>')
    // className attribute
    .replace(/\b(className|href|onClick|onChange|onSubmit|type|src|alt|key|id|style|ref)\b/g,
      '<span class="ch-attr">$1</span>'
    );
}

export default function CodeViewer({ code, language, filePath = "" }: CodeViewerProps) {
  const lang = detectLanguage(filePath, language);
  const highlighted = highlight(code, lang);
  const lines = highlighted.split("\n");

  return (
    <>
      <style>{`
        .ch-keyword  { color: #c084fc; }
        .ch-string   { color: #86efac; }
        .ch-template { color: #6ee7b7; }
        .ch-comment  { color: #6b7280; font-style: italic; }
        .ch-number   { color: #fb923c; }
        .ch-function { color: #67e8f9; }
        .ch-tag      { color: #f87171; }
        .ch-component{ color: #60a5fa; }
        .ch-attr     { color: #fbbf24; }
        .ch-key      { color: #60a5fa; }
        .ch-heading  { color: #c084fc; font-weight: bold; }
      `}</style>

      <div className="h-full overflow-auto bg-stone-950 font-mono text-sm leading-6">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-stone-900/50 transition-colors">
                {/* Line Number */}
                <td
                  className="select-none pr-4 pl-4 text-right text-stone-600 w-12 shrink-0 border-r border-stone-800 sticky left-0 bg-stone-950"
                  style={{ minWidth: "3rem" }}
                >
                  {i + 1}
                </td>
                {/* Code Line */}
                <td className="pl-4 pr-6 whitespace-pre text-stone-300">
                  <span dangerouslySetInnerHTML={{ __html: line || " " }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}