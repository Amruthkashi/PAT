import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { X, FileText, Search, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileCode, CheckCircle2, Sparkles } from 'lucide-react';

// Configure PDF.js worker (CDN)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function isPdfFile(fileName) {
  if (!fileName) return false;
  return fileName.toLowerCase().endsWith('.pdf');
}

function isTextFile(fileName) {
  if (!fileName) return false;
  const ext = fileName.toLowerCase().split('.').pop();
  return ['txt', 'text', 'md', 'csv', 'log'].includes(ext);
}

function decodeBase64ToText(b64) {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    try { return atob(b64); } catch (_) { return ''; }
  }
}

/**
 * Extracts ALL search keywords/phrases from an AI reference string.
 * Captures all quoted excerpts ("...") or sentence blocks without artificial slicing.
 */
function extractSearchKeywords(reference) {
  if (!reference || typeof reference !== 'string') return [];

  const results = [];

  // 1. Extract ALL quoted strings: "..." or “...”
  const quoteRegex = /["“]([^"”]{8,})["”]/g;
  let match;
  while ((match = quoteRegex.exec(reference)) !== null) {
    const q = match[1].trim();
    if (q.length >= 6) {
      results.push(q);
    }
  }

  if (results.length > 0) {
    return results;
  }

  // 2. Fallback: strip line numbers like [L14]-[L16]: or Lines 4-7:
  const stripped = reference
    .replace(/^\[?[Ll]\d+\]?(?:\s*[-\u2013]\s*\[?[Ll]\d+\]?)?\s*:?\s*/i, '')
    .replace(/^[Ll]ines?\s+\d+(?:\s*[-\u2013]\s*\d+)?\s*:?\s*/i, '')
    .replace(/^[Ll]\d+\s*:?\s*/i, '')
    .trim();

  if (!stripped) return [];

  // Split by sentence boundaries (.!? followed by whitespace)
  const sentences = stripped
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length >= 6);

  return sentences.length > 0 ? sentences : [stripped];
}

/** Normalise string for fuzzy matching */
function normalise(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\u201c\u201d\u2018\u2019"']/g, '')
    .trim();
}

/**
 * Breaks keywords into overlapping search snippets (including 3-4 word n-grams)
 * so every text span across multi-span sentences gets matched and highlighted.
 */
function getSnippetsFromKeywords(keywords) {
  if (!keywords || !keywords.length) return [];
  const snippets = new Set();

  keywords.forEach(kw => {
    const norm = normalise(kw);
    if (!norm) return;

    if (norm.length <= 40) {
      snippets.add(norm);
    } else {
      snippets.add(norm.slice(0, 35));
    }

    const words = norm.split(' ').filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      const chunk3 = words.slice(i, i + 3).join(' ');
      if (chunk3.length >= 8) {
        snippets.add(chunk3);
      }
      const chunk4 = words.slice(i, i + 4).join(' ');
      if (chunk4.length >= 10) {
        snippets.add(chunk4);
      }
    }
  });

  return Array.from(snippets);
}

/** Nav button style matching main app pills */
function navBtnStyle(disabled) {
  return {
    background: disabled ? '#f1f5f9' : '#ffffff',
    border: `1px solid ${disabled ? '#e2e8f0' : '#cbd5e1'}`,
    color: disabled ? '#cbd5e1' : '#334155',
    borderRadius: '6px',
    padding: '4px 8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
    boxShadow: disabled ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
    transition: 'all 0.15s ease',
  };
}

// ─── Plain-text viewer ────────────────────────────────────────────────────────
function TextViewer({ fileBase64, keywords }) {
  const [text, setText] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (fileBase64) setText(decodeBase64ToText(fileBase64));
  }, [fileBase64]);

  useEffect(() => {
    if (!text || !keywords.length || !containerRef.current) return;
    const highlights = containerRef.current.querySelectorAll('.txt-highlight');
    if (highlights.length > 0) {
      highlights[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [text, keywords]);

  if (!text) {
    return <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '60px', textAlign: 'center' }}>Loading text…</div>;
  }

  const normSnippets = getSnippetsFromKeywords(keywords);
  const lines = text.split('\n');

  return (
    <div
      ref={containerRef}
      style={{
        fontFamily: '"JetBrains Mono", "Cascadia Code", "Courier New", monospace',
        fontSize: '13px',
        lineHeight: '1.8',
        color: '#1e293b',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        width: '100%',
        maxWidth: '780px',
      }}
    >
      {lines.map((line, i) => {
        const normLine = normalise(line);
        const isMatch = normSnippets.some(snip => snip && (normLine.includes(snip) || (normLine.length >= 8 && snip.includes(normLine))));

        return (
          <div
            key={i}
            className={isMatch ? 'txt-highlight' : ''}
            style={{
              display: 'flex',
              gap: '14px',
              padding: '3px 12px',
              borderRadius: isMatch ? '6px' : '0',
              background: isMatch ? '#fef08a' : (i % 2 === 0 ? '#f8fafc' : '#ffffff'),
              borderLeft: isMatch ? '4px solid #f59e0b' : '4px solid transparent',
              boxShadow: isMatch ? '0 1px 4px rgba(245,158,11,0.15)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ color: '#94a3b8', userSelect: 'none', minWidth: '36px', textAlign: 'right', flexShrink: 0, fontSize: '11.5px', paddingTop: '1px' }}>
              {i + 1}
            </span>
            <span style={{ color: isMatch ? '#713f12' : '#334155', fontWeight: isMatch ? 700 : 400 }}>
              {line || '\u00a0'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PdfHighlightViewer({ fileBase64, fileName, reference, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.25);
  const [matchPage, setMatchPage] = useState(null);
  const [pdfError, setPdfError] = useState(null);

  const keywords = extractSearchKeywords(reference);
  const pageRefs = useRef({});
  const matchFoundRef = useRef(false);

  const fileType = isPdfFile(fileName) ? 'pdf' : isTextFile(fileName) ? 'text' : 'unsupported';
  const pdfDataUri = fileBase64 ? `data:application/pdf;base64,${fileBase64}` : null;

  const onDocumentLoadSuccess = useCallback(({ numPages: n }) => {
    setNumPages(n);
    matchFoundRef.current = false;
    setMatchPage(null);
    setPdfError(null);
  }, []);

  const onDocumentLoadError = useCallback((err) => {
    setPdfError(err?.message || 'Invalid PDF structure.');
  }, []);

  /** Multi-sentence highlight scanner using n-grams */
  const onPageLoadSuccess = useCallback((pageNum) => {
    if (!keywords.length) return;
    const normSnippets = getSnippetsFromKeywords(keywords);
    if (!normSnippets.length) return;

    setTimeout(() => {
      const container = pageRefs.current[pageNum];
      if (!container) return;
      const spans = container.querySelectorAll('.react-pdf__Page__textContent span');
      let foundOnPage = false;

      spans.forEach(span => {
        const spanText = normalise(span.textContent);
        if (!spanText) return;

        const isMatch = normSnippets.some(snip =>
          spanText.includes(snip) || (spanText.length >= 8 && snip.includes(spanText))
        );

        if (isMatch) {
          span.style.backgroundColor = 'rgba(254, 240, 138, 0.9)'; // bright yellow highlighter
          span.style.color = '#713f12';
          span.style.borderRadius = '3px';
          span.style.borderBottom = '2px solid #f59e0b';
          span.style.boxShadow = '0 1px 4px rgba(245,158,11,0.2)';
          foundOnPage = true;
        }
      });

      if (foundOnPage && !matchFoundRef.current) {
        matchFoundRef.current = true;
        setMatchPage(pageNum);
        setCurrentPage(pageNum);
      }
    }, 200);
  }, [keywords]);

  const goToPrev = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNext = () => setCurrentPage(p => Math.min(numPages || 1, p + 1));
  const zoomIn  = () => setScale(s => Math.min(2.5, parseFloat((s + 0.15).toFixed(2))));
  const zoomOut = () => setScale(s => Math.max(0.6, parseFloat((s - 0.15).toFixed(2))));

  if (!fileBase64) return null;

  if (fileType === 'unsupported') {
    return (
      <ModalShell fileName={fileName} keywords={keywords} onClose={onClose} footerText="Preview not available for this file type.">
        <div style={{ color: '#94a3b8', fontSize: '13.5px', textAlign: 'center', marginTop: '60px', lineHeight: 1.8, flex: 1 }}>
          <FileCode size={36} style={{ marginBottom: '12px', opacity: 0.35 }} /><br />
          Preview is not supported for <strong style={{ color: '#334155' }}>{fileName}</strong>.
        </div>
      </ModalShell>
    );
  }

  if (fileType === 'text') {
    return (
      <ModalShell
        fileName={fileName}
        keywords={keywords}
        onClose={onClose}
        footerText={keywords.length ? `Highlighted ${keywords.length} reference excerpt(s) in document` : 'Text file viewer'}
        footerHighlight={keywords.length > 0}
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#f1f5fb', display: 'flex', justifyContent: 'center' }}>
          <TextViewer fileBase64={fileBase64} keywords={keywords} />
        </div>
      </ModalShell>
    );
  }

  // PDF
  return (
    <ModalShell
      fileName={fileName}
      keywords={keywords}
      onClose={onClose}
      numPages={numPages}
      currentPage={currentPage}
      goToPrev={goToPrev}
      goToNext={goToNext}
      scale={scale}
      zoomIn={zoomIn}
      zoomOut={zoomOut}
      matchPage={matchPage}
      onJumpToMatch={() => setCurrentPage(matchPage)}
      footerText={matchPage ? `Matching reference excerpt(s) highlighted on Page ${matchPage}` : numPages ? 'Scanning pages for matching text…' : 'Loading PDF…'}
      footerHighlight={!!matchPage}
    >
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', gap: '16px', background: '#f1f5fb' }}>
        {pdfError ? (
          <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '60px', textAlign: 'center', lineHeight: 1.7 }}>
            <FileText size={32} style={{ marginBottom: '10px', opacity: 0.4 }} /><br />
            <strong>Could not render PDF.</strong><br />
            <span style={{ color: '#64748b', fontSize: '12px' }}>{pdfError}</span>
          </div>
        ) : (
          <Document file={pdfDataUri} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError}
            loading={<div style={{ color: '#64748b', fontSize: '13px', marginTop: '60px' }}>Loading PDF…</div>}
          >
            {numPages && Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
              <div
                key={pageNum}
                ref={el => { pageRefs.current[pageNum] = el; }}
                style={{
                  marginBottom: '16px',
                  boxShadow: pageNum === matchPage
                    ? '0 0 0 3px #3b82f6, 0 12px 36px -4px rgba(15,23,42,0.15)'
                    : '0 8px 24px -4px rgba(15,23,42,0.08)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: `2px solid ${pageNum === matchPage ? '#2563eb' : '#e2e8f0'}`,
                  transition: 'all 0.3s ease',
                  background: '#ffffff',
                }}
              >
                <Page
                  pageNumber={pageNum}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={false}
                  onLoadSuccess={() => onPageLoadSuccess(pageNum)}
                />
              </div>
            ))}
          </Document>
        )}
      </div>
    </ModalShell>
  );
}

// ─── Shared modal shell (Matching Main App UI) ───────────────────────────────
function ModalShell({
  fileName, keywords = [], onClose, children,
  numPages, currentPage, goToPrev, goToNext, scale, zoomIn, zoomOut,
  matchPage, onJumpToMatch,
  footerText, footerHighlight
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 3500,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        display: 'flex', flexDirection: 'column',
        width: '100%', maxWidth: '920px', height: '90vh',
        overflow: 'hidden',
        boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)',
        border: '1px solid #e2e8f0',
      }}>

        {/* ── MODAL HEADER ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0, gap: '16px', flexWrap: 'wrap',
        }}>
          {/* File Title & Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div style={{
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: '10px', padding: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <FileText size={18} color="#2563eb" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {fileName || 'Document Viewer'}
              </div>
              {keywords.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', fontWeight: 600, color: '#166534',
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    padding: '2px 8px', borderRadius: '12px'
                  }}>
                    <Sparkles size={11} color="#16a34a" />
                    Highlighting {keywords.length} reference excerpt{keywords.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Toolbar Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {/* Page navigation */}
            {numPages != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '3px 6px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <button onClick={goToPrev} disabled={currentPage <= 1} style={navBtnStyle(currentPage <= 1)} title="Previous page">
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: '12px', color: '#0f172a', fontWeight: 700, minWidth: '55px', textAlign: 'center' }}>
                  {currentPage} / {numPages}
                </span>
                <button onClick={goToNext} disabled={currentPage >= numPages} style={navBtnStyle(currentPage >= numPages)} title="Next page">
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Zoom controls */}
            {numPages != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '3px 6px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <button onClick={zoomOut} style={navBtnStyle(scale <= 0.6)} title="Zoom out"><ZoomOut size={13} /></button>
                <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: 700, minWidth: '42px', textAlign: 'center' }}>
                  {Math.round(scale * 100)}%
                </span>
                <button onClick={zoomIn} style={navBtnStyle(scale >= 2.5)} title="Zoom in"><ZoomIn size={13} /></button>
              </div>
            )}

            {/* Jump to match button */}
            {matchPage && matchPage !== currentPage && (
              <button
                onClick={onJumpToMatch}
                style={{
                  background: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  padding: '6px 12px', borderRadius: '8px',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Search size={12} />
                Jump to match (p.{matchPage})
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              title="Close viewer"
              style={{
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                color: '#475569',
                borderRadius: '50%',
                width: '32px', height: '32px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── CONTENT AREA ── */}
        {children}

        {/* ── MODAL FOOTER ── */}
        <div style={{
          padding: '10px 20px',
          background: footerHighlight ? '#f0fdf4' : '#ffffff',
          borderTop: `1px solid ${footerHighlight ? '#bbf7d0' : '#e2e8f0'}`,
          fontSize: '12px',
          color: footerHighlight ? '#166534' : '#64748b',
          display: 'flex', alignItems: 'center', gap: '8px',
          flexShrink: 0, fontWeight: 600,
        }}>
          <CheckCircle2 size={15} color={footerHighlight ? '#16a34a' : '#94a3b8'} />
          {footerText}
        </div>

      </div>
    </div>
  );
}
