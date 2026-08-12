import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { X, FileText, Search, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileCode } from 'lucide-react';

// Configure PDF.js worker (CDN)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns true if the filename looks like a PDF */
function isPdfFile(fileName) {
  if (!fileName) return false;
  return fileName.toLowerCase().endsWith('.pdf');
}

/** Returns true if the filename is a plain-text file */
function isTextFile(fileName) {
  if (!fileName) return false;
  const ext = fileName.toLowerCase().split('.').pop();
  return ['txt', 'text', 'md', 'csv', 'log'].includes(ext);
}

/** Decode base64 → UTF-8 string (safe for large files) */
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

/** Extract clean keyword from AI reference string */
function extractSearchKeyword(reference) {
  if (!reference || typeof reference !== 'string') return '';
  const quotedMatch = reference.match(/"([^"]{10,})"/);
  if (quotedMatch) return quotedMatch[1].trim();
  const stripped = reference
    .replace(/^\[?[Ll]\d+\]?(?:\s*[-\u2013]\s*\[?[Ll]\d+\]?)?\s*:?\s*/i, '')
    .replace(/^[Ll]ines?\s+\d+(?:\s*[-\u2013]\s*\d+)?\s*:?\s*/i, '')
    .replace(/^[Ll]\d+\s*:?\s*/i, '')
    .trim();
  return stripped.slice(0, 80).trim();
}

/** Normalise for fuzzy matching */
function normalise(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[\u201c\u201d\u2018\u2019]/g, '"').trim();
}

// ─── Nav button (light theme) ────────────────────────────────────────────────
function navBtnStyle(disabled) {
  return {
    background: disabled ? '#f1f5f9' : '#ffffff',
    border: `1px solid ${disabled ? '#e2e8f0' : '#cbd5e1'}`,
    color: disabled ? '#cbd5e1' : '#475569',
    borderRadius: '6px',
    padding: '5px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.6 : 1,
    boxShadow: disabled ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
  };
}

// ─── Plain-text viewer ────────────────────────────────────────────────────────
function TextViewer({ fileBase64, keyword }) {
  const [text, setText] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (fileBase64) setText(decodeBase64ToText(fileBase64));
  }, [fileBase64]);

  useEffect(() => {
    if (!text || !keyword || !containerRef.current) return;
    const highlights = containerRef.current.querySelectorAll('.txt-highlight');
    if (highlights.length > 0) highlights[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [text, keyword]);

  if (!text) {
    return <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '60px', textAlign: 'center' }}>Loading text…</div>;
  }

  const normKw = normalise(keyword).slice(0, 40);
  const lines = text.split('\n');

  return (
    <div ref={containerRef} style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: '13px', lineHeight: '1.75', color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word', width: '100%', maxWidth: '760px' }}>
      {lines.map((line, i) => {
        const isMatch = normKw && normalise(line).includes(normKw);
        return (
          <div key={i} className={isMatch ? 'txt-highlight' : ''} style={{
            display: 'flex', gap: '14px', padding: '2px 10px',
            borderRadius: isMatch ? '5px' : '0',
            background: isMatch ? 'rgba(251,191,36,0.2)' : (i % 2 === 0 ? '#f8fafc' : '#ffffff'),
            outline: isMatch ? '1.5px solid rgba(245,158,11,0.45)' : 'none',
          }}>
            <span style={{ color: '#b0bec5', userSelect: 'none', minWidth: '36px', textAlign: 'right', flexShrink: 0, fontSize: '11.5px', paddingTop: '1px' }}>
              {i + 1}
            </span>
            <span style={{ color: isMatch ? '#92400e' : '#334155', fontWeight: isMatch ? 600 : 400 }}>
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
  const [scale, setScale] = useState(1.3);
  const [matchPage, setMatchPage] = useState(null);
  const [pdfError, setPdfError] = useState(null);

  const keyword = extractSearchKeyword(reference);
  const normKeyword = normalise(keyword);
  const pageRefs = useRef({});
  const matchFoundRef = useRef(false);

  const fileType = isPdfFile(fileName) ? 'pdf' : isTextFile(fileName) ? 'text' : 'unsupported';
  const pdfDataUri = fileBase64 ? `data:application/pdf;base64,${fileBase64}` : null;

  const onDocumentLoadSuccess = useCallback(({ numPages: n }) => {
    setNumPages(n); matchFoundRef.current = false; setMatchPage(null); setPdfError(null);
  }, []);

  const onDocumentLoadError = useCallback((err) => {
    setPdfError(err?.message || 'Invalid PDF structure.');
  }, []);

  const onPageLoadSuccess = useCallback((pageNum) => {
    if (!normKeyword) return;
    setTimeout(() => {
      const container = pageRefs.current[pageNum];
      if (!container) return;
      const spans = container.querySelectorAll('.react-pdf__Page__textContent span');
      const snippet = normKeyword.slice(0, 30);
      if (!snippet) return;
      let found = false;
      spans.forEach(span => {
        if (normalise(span.textContent).includes(snippet)) {
          span.style.backgroundColor = 'rgba(251,191,36,0.45)';
          span.style.borderRadius = '2px';
          span.style.outline = '2px solid rgba(245,158,11,0.7)';
          found = true;
        }
      });
      if (found && !matchFoundRef.current) {
        matchFoundRef.current = true; setMatchPage(pageNum); setCurrentPage(pageNum);
      }
    }, 200);
  }, [normKeyword]);

  const goToPrev = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNext = () => setCurrentPage(p => Math.min(numPages || 1, p + 1));
  const zoomIn  = () => setScale(s => Math.min(2.5, parseFloat((s + 0.2).toFixed(1))));
  const zoomOut = () => setScale(s => Math.max(0.6, parseFloat((s - 0.2).toFixed(1))));

  if (!fileBase64) return null;

  if (fileType === 'unsupported') {
    return (
      <ModalShell fileName={fileName} keyword={keyword} onClose={onClose} footerText="Preview not available for this file type.">
        <div style={{ color: '#94a3b8', fontSize: '13.5px', textAlign: 'center', marginTop: '60px', lineHeight: 1.8, flex: 1 }}>
          <FileCode size={36} style={{ marginBottom: '12px', opacity: 0.35 }} /><br />
          Preview is not supported for <strong style={{ color: '#334155' }}>{fileName}</strong>.
        </div>
      </ModalShell>
    );
  }

  if (fileType === 'text') {
    return (
      <ModalShell fileName={fileName} keyword={keyword} onClose={onClose}
        footerText={keyword ? `Highlighted lines match: "${keyword.slice(0, 60)}${keyword.length > 60 ? '…' : ''}"` : 'Text file viewer'}
        footerHighlight
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
          <TextViewer fileBase64={fileBase64} keyword={keyword} />
        </div>
      </ModalShell>
    );
  }

  // PDF
  return (
    <ModalShell fileName={fileName} keyword={keyword} onClose={onClose}
      numPages={numPages} currentPage={currentPage}
      goToPrev={goToPrev} goToNext={goToNext}
      scale={scale} zoomIn={zoomIn} zoomOut={zoomOut}
      matchPage={matchPage} onJumpToMatch={() => setCurrentPage(matchPage)}
      footerText={matchPage ? `Match found on page ${matchPage}. Highlighted in yellow.` : numPages ? 'Scanning pages for matching text…' : 'Loading PDF…'}
      footerHighlight={!!matchPage}
    >
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px', gap: '12px', background: '#f1f5f9' }}>
        {pdfError ? (
          <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '60px', textAlign: 'center', lineHeight: 1.7 }}>
            <FileText size={32} style={{ marginBottom: '10px', opacity: 0.4 }} /><br />
            <strong>Could not render PDF.</strong><br />
            <span style={{ color: '#64748b', fontSize: '12px' }}>{pdfError}</span>
          </div>
        ) : (
          <Document file={pdfDataUri} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError}
            loading={<div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '60px' }}>Loading PDF…</div>}
          >
            {numPages && Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
              <div key={pageNum} ref={el => { pageRefs.current[pageNum] = el; }} style={{
                marginBottom: '12px',
                boxShadow: pageNum === matchPage ? '0 0 0 3px rgba(245,158,11,0.45), 0 4px 16px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.08)',
                borderRadius: '6px', overflow: 'hidden',
                border: `2px solid ${pageNum === matchPage ? 'rgba(245,158,11,0.4)' : 'transparent'}`,
                transition: 'border-color 0.3s',
              }}>
                <Page pageNumber={pageNum} scale={scale} renderTextLayer={true} renderAnnotationLayer={false} onLoadSuccess={() => onPageLoadSuccess(pageNum)} />
              </div>
            ))}
          </Document>
        )}
      </div>
    </ModalShell>
  );
}

// ─── Shared modal shell ───────────────────────────────────────────────────────
function ModalShell({ fileName, keyword, onClose, children, numPages, currentPage, goToPrev, goToNext, scale, zoomIn, zoomOut, matchPage, onJumpToMatch, footerText, footerHighlight }) {
  const footerBg = footerHighlight ? '#fffbeb' : '#f8fafc';
  const footerBorder = footerHighlight ? '#fde68a' : '#e2e8f0';
  const footerColor = footerHighlight ? '#b45309' : '#64748b';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(15,23,42,0.5)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 3500,
    }}>
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '18px',
        display: 'flex', flexDirection: 'column',
        width: '90vw', maxWidth: '860px', height: '90vh',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(15,23,42,0.18), 0 4px 16px rgba(15,23,42,0.06)',
        border: '1px solid #e2e8f0',
      }}>

        {/* TOOLBAR — navy gradient to match app header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '13px 18px',
          background: 'linear-gradient(135deg, #0b3b60 0%, #1e4d7a 100%)',
          flexShrink: 0, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }}>
              <FileText size={14} color="#ffffff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {fileName || 'Document'}
              </div>
              {keyword && (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Search size={10} />
                  <span style={{ color: '#fcd34d', fontWeight: 600 }}>"{keyword.slice(0, 55)}{keyword.length > 55 ? '…' : ''}"</span>
                </div>
              )}
            </div>
          </div>

          {numPages != null && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <button onClick={goToPrev} disabled={currentPage <= 1} style={navBtnStyle(currentPage <= 1)}><ChevronLeft size={14} /></button>
                <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: 600, minWidth: '64px', textAlign: 'center' }}>{currentPage} / {numPages}</span>
                <button onClick={goToNext} disabled={currentPage >= numPages} style={navBtnStyle(currentPage >= numPages)}><ChevronRight size={14} /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button onClick={zoomOut} style={navBtnStyle(scale <= 0.6)} title="Zoom out"><ZoomOut size={13} /></button>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', minWidth: '36px', textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
                <button onClick={zoomIn} style={navBtnStyle(scale >= 2.5)} title="Zoom in"><ZoomIn size={13} /></button>
              </div>
              {matchPage && matchPage !== currentPage && (
                <button onClick={onJumpToMatch} style={{ background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.5)', color: '#fcd34d', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Search size={11} /> Jump to match (p.{matchPage})
                </button>
              )}
            </>
          )}

          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', color: '#ffffff', borderRadius: '8px', padding: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* CONTENT AREA */}
        {children}

        {/* FOOTER */}
        <div style={{
          padding: '9px 18px',
          background: footerBg,
          borderTop: `1px solid ${footerBorder}`,
          fontSize: '11.5px',
          color: footerColor,
          display: 'flex', alignItems: 'center', gap: '6px',
          flexShrink: 0, fontWeight: 500,
        }}>
          <Search size={11} />
          {footerText}
        </div>
      </div>
    </div>
  );
}
