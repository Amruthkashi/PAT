import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Save,
  LogOut,
  FileCheck,
  Send,
  ArrowLeft,
  Check,
  Search,
  Upload,
  Paperclip,
  MoreHorizontal,
  ChevronRight,
  FileText,
  Eye,
  Trash2,
  X,
  AlertTriangle,
  BarChart2,
  BookOpen,
  ShieldCheck,
  MessageSquare,
  ClipboardList,
  Quote,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  UserPlus,
  Users,
  Info,
  Sparkles,
  FileUp,
  Clock,
  Filter,
  FolderCheck,
  MapPin,
  Ban
} from 'lucide-react';

import { QUESTIONS_BY_SECTION } from '../data/questionsData';
import PdfHighlightViewer from './PdfHighlightViewer';

// ── Backend Policy Review API URL ───────────────────────────────────────────
// Connected to live Azure AI Foundry server running via Google Colab + ngrok
const N8N_WEBHOOK_URL = 'https://chaplain-statue-impeding.ngrok-free.dev/policy-review';

const MOCK_TEAM = [
  { name: 'Jane Cooper', role: 'Compliance Lead' },
  { name: 'Alex Rivera', role: 'HR Director' },
  { name: 'Sofia Davis', role: 'Legal Counsel' },
  { name: 'Marcus Chen', role: 'Operations VP' },
  { name: 'Emily Taylor', role: 'Risk Analyst' }
];

const TABS = [
  'Policies',
  'Training',
  'Internal Feedback Systems',
  'Administrative Practices'
];

/**
 * Helper to render **bold** markdown tags in inline text.
 */
const renderInlineBoldText = (str) => {
  if (!str || typeof str !== 'string') return str;
  const parts = str.split(/\*\*(.*?)\*\*/g);
  if (parts.length <= 1) return str;

  return parts.map((part, index) =>
    index % 2 === 1 ? <strong key={index}>{part}</strong> : part
  );
};

/**
 * Structurally parses observation text into clean section objects:
 * [{ title: "Question Response & Policy Status", paragraph: "...", items: ["item 1", "item 2"] }]
 * Strips HTML <br /> tags, unescapes \n, and keeps section headers free of bullets!
 */
const parseObservationSections = (obsInput) => {
  if (!obsInput) return [];

  // If already an array of strings
  if (Array.isArray(obsInput)) {
    return obsInput.map((item) => {
      const cleanItem = String(item || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/\\n/g, '\n')
        .trim();
      return {
        title: '',
        paragraph: '',
        items: [cleanItem],
        raw: cleanItem
      };
    });
  }

  if (typeof obsInput !== 'string') return [];

  // 1. Clean HTML <br /> tags and unescape literal \n
  let text = obsInput
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\n/g, '\n')
    .trim();

  if (!text) return [];

  // 2. Split on major section headers e.g. "**Question Response & Policy Status:**" or "**Documented Actions & Protocols:**"
  const sectionSplitRegex = /(?=(?:\n|^)\s*(?:\*\*)?[A-Z][A-Za-z0-9\s&,/\\-]{2,45}:(?:\*\*)?)/g;

  const rawSections = text.split(sectionSplitRegex).map(s => s.trim()).filter(Boolean);

  if (rawSections.length === 0) {
    return [{ title: '', paragraph: text, items: [], raw: text }];
  }

  return rawSections.map(secStr => {
    // Check if section string starts with a title e.g. **Title:**
    const headerMatch = secStr.match(/^(?:\*\*)?([A-Z][A-Za-z0-9\s&,/\\-]{2,45}:)(?:\*\*)?\s*(.*)/s);

    if (headerMatch) {
      const title = headerMatch[1].replace(/:$/, '').trim();
      const body = headerMatch[2].trim();

      const bodyLines = body.split(/\n+/).map(l => l.trim()).filter(Boolean);
      const items = [];
      const paragraphLines = [];

      bodyLines.forEach(line => {
        const bulletMatch = line.match(/^[*\-•]\s*(.*)/);
        if (bulletMatch) {
          items.push(bulletMatch[1].trim());
        } else {
          paragraphLines.push(line);
        }
      });

      return {
        title,
        paragraph: paragraphLines.join(' '),
        items,
        raw: body
      };
    }

    // No header match — split into sub-bullets vs paragraph
    const lines = secStr.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const items = [];
    const paragraphLines = [];

    lines.forEach(line => {
      const bulletMatch = line.match(/^[*\-•]\s*(.*)/);
      if (bulletMatch) {
        items.push(bulletMatch[1].trim());
      } else {
        paragraphLines.push(line);
      }
    });

    return {
      title: '',
      paragraph: paragraphLines.join(' '),
      items,
      raw: secStr
    };
  });
};

const renderFormattedText = (text) => renderInlineBoldText(text);
const formatPointHeader = (point) => point;

/**
 * Helper to normalize reference whether passed as string or object { quote, location }.
 */
const normalizeReferenceObj = (reference) => {
  if (!reference) return { quote: '', location: '' };

  if (typeof reference === 'string') {
    return { quote: reference.replace(/\\n/g, '\n').trim(), location: '' };
  }

  if (typeof reference === 'object' && reference !== null) {
    const rawQuote = reference.quote || reference.text || reference.citation || '';
    const quote = String(rawQuote).replace(/\\n/g, '\n').trim();
    const location = (reference.location || reference.page || reference.lines || reference.section || '').trim();
    return { quote, location };
  }

  return { quote: String(reference).replace(/\\n/g, '\n').trim(), location: '' };
};

/**
 * Parses reference quote text into clean, structured citation points.
 * Unescapes literal \n, splits on double newlines (\n\n), section numbers (1. Purpose), or quotes ("...").
 */
const parseReferencePoints = (reference) => {
  const { quote } = normalizeReferenceObj(reference);
  if (!quote) return [];

  // Strip wrapping outer quotes if quote starts and ends with "
  let cleanQuote = quote.trim();
  if (cleanQuote.startsWith('"') && cleanQuote.endsWith('"') && cleanQuote.length > 2) {
    cleanQuote = cleanQuote.slice(1, -1).trim();
  }

  // 1. Check for quoted excerpts inside: "..." or “...”
  const quoteRegex = /["“]([^"”]{5,})["”]/g;
  const quotes = [];
  let match;
  while ((match = quoteRegex.exec(cleanQuote)) !== null) {
    const q = match[1].trim();
    if (q) quotes.push(`"${q}"`);
  }

  if (quotes.length >= 2) {
    return quotes;
  }

  // 2. Check for double newlines or section breaks (e.g. "\n\n1. Purpose" or "\n5. Staff Responsibilities")
  const sectionSplits = cleanQuote
    .split(/(?:\n\s*)+(?=\d+\.|\b[A-Z][a-zA-Z\s]+:|\n)/)
    .map(s => s.trim())
    .filter(Boolean);

  if (sectionSplits.length >= 2) {
    return sectionSplits;
  }

  // 3. Standard line splits
  const lines = cleanQuote
    .split(/\n+/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length >= 2) {
    return lines;
  }

  return [cleanQuote];
};

/**
 * Renders reference citation text & location badge.
 * Displays reference.quote point-by-point, plus reference.location as a small subtitle caption badge.
 */
const renderReferenceContent = (reference) => {
  const { quote, location } = normalizeReferenceObj(reference);
  const points = parseReferencePoints(quote);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
      {location && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '11px',
          fontWeight: 700,
          color: '#1d4ed8',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          padding: '2px 10px',
          borderRadius: '12px',
          alignSelf: 'flex-start'
        }}>
          <MapPin size={12} color="#2563eb" />
          <span>Location: {location}</span>
        </div>
      )}

      {points.length >= 2 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {points.map((pt, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', lineHeight: '1.65', color: '#1e293b' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: '20px', height: '20px', borderRadius: '50%',
                background: '#dcfce7', border: '1px solid #86efac',
                color: '#15803d', fontSize: '11px', fontWeight: 800,
                flexShrink: 0, marginTop: '2px'
              }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1, background: '#ffffff', borderRadius: '6px', padding: '8px 12px', border: '1px solid #dcfce7', whiteSpace: 'pre-line' }}>
                {renderFormattedText(formatPointHeader(pt))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '12.5px', lineHeight: '1.65', color: '#1e293b', whiteSpace: 'pre-line', background: '#ffffff', borderRadius: '6px', padding: '8px 12px', border: '1px solid #dcfce7' }}>
          {renderFormattedText(formatPointHeader(points[0] || quote))}
        </div>
      )}
    </div>
  );
};

export default function AssessmentPage({ user, onLogout }) {
  // 4 Steps: 'ASSESSMENT' | 'UPLOAD_DOCUMENTS' | 'REVIEW_OBSERVATIONS' | 'ACTION_PLAN'
  const [currentStep, setCurrentStep] = useState('ASSESSMENT');
  const [activeTab, setActiveTab] = useState('Policies');

  // Document Upload Filters
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [selectedOperation, setSelectedOperation] = useState('All');

  const [globalAssignee, setGlobalAssignee] = useState('');
  const [showGlobalDropdown, setShowGlobalDropdown] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Scope localStorage keys by user.employeeId / user.username so users don't overwrite each other
  const userKey = (user?.employeeId || user?.username || 'default').toLowerCase().replace(/[^a-z0-9]/g, '');
  const keySectionStates = `pat_section_states_${userKey}`;
  const keyUploadedDocs = `pat_uploaded_docs_${userKey}`;
  const keyReviewComments = `pat_review_comments_${userKey}`;
  const keyAiObservations = `pat_ai_observations_${userKey}`;

  // Re-sync states whenever userKey changes (e.g. when logging in as a different user)
  useEffect(() => {
    try {
      const savedDocs = localStorage.getItem(keyUploadedDocs);
      setUploadedDocs(savedDocs ? JSON.parse(savedDocs) : {});

      const savedObs = localStorage.getItem(keyAiObservations);
      setAiObservations(savedObs ? JSON.parse(savedObs) : {});

      const savedComments = localStorage.getItem(keyReviewComments);
      setReviewComments(savedComments ? JSON.parse(savedComments) : {});
    } catch (e) { }
  }, [userKey]);

  // Stores questionnaire answers with localStorage persistence per user
  const [sectionStates, setSectionStates] = useState(() => {
    const saved = localStorage.getItem(keySectionStates);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    const initial = {};
    Object.keys(QUESTIONS_BY_SECTION).forEach(sectionKey => {
      const sectionData = QUESTIONS_BY_SECTION[sectionKey];
      initial[sectionKey] = {};
      sectionData.items.forEach(item => {
        initial[sectionKey][item.id] = {
          assignee: '',
          comments: '',
          showRationale: false,
          criteriaAnswers: item.criteria.reduce((acc, c) => {
            acc[c.id] = 'No';
            return acc;
          }, {})
        };
      });
    });
    return initial;
  });

  // Stores uploaded documents (Defaults to empty)
  const [uploadedDocs, setUploadedDocs] = useState(() => {
    const saved = localStorage.getItem(keyUploadedDocs);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {};
  });

  // Review comments per item (Kept completely blank for backend API)
  const [reviewComments, setReviewComments] = useState(() => {
    const saved = localStorage.getItem(keyReviewComments);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {};
  });

  // Modals state
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // PDF highlight viewer state: { fileBase64, fileName, reference } | null
  const [pdfViewer, setPdfViewer] = useState(null);

  const [searchStates, setSearchStates] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  // AI processing state
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  // AI observations per component per criteria: { P1: { p1_c1: '3 lines...', p1_c2: '...' }, ... }
  const [aiObservations, setAiObservations] = useState(() => {
    const saved = localStorage.getItem(keyAiObservations);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch (e) { }
    }
    return {};
  });

  // Tracks which per-question observation cards have their Details / Reference expanded
  // Key pattern: "P1__c1", "P1__c2", "T1__c1" etc.
  const [expandedObs, setExpandedObs] = useState({});
  const toggleObsExpand = (compId, criteriaKey) => {
    const k = `${compId}__${criteriaKey}`;
    setExpandedObs(prev => ({ ...prev, [k]: !prev[k] }));
  };

  const [expandedRef, setExpandedRef] = useState({});
  const toggleRefExpand = (compId, criteriaKey) => {
    const k = `${compId}__${criteriaKey}`;
    setExpandedRef(prev => ({ ...prev, [k]: !prev[k] }));
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Save changes to localStorage per user key
  useEffect(() => {
    localStorage.setItem(keySectionStates, JSON.stringify(sectionStates));
  }, [sectionStates, keySectionStates]);

  useEffect(() => {
    localStorage.setItem(keyUploadedDocs, JSON.stringify(uploadedDocs));
  }, [uploadedDocs, keyUploadedDocs]);

  useEffect(() => {
    localStorage.setItem(keyReviewComments, JSON.stringify(reviewComments));
  }, [reviewComments, keyReviewComments]);

  useEffect(() => {
    localStorage.setItem(keyAiObservations, JSON.stringify(aiObservations));
  }, [aiObservations, keyAiObservations]);

  const currentSectionData = QUESTIONS_BY_SECTION[activeTab] || { standardTitle: '', items: [] };

  // Criteria radio change
  const handleRadioChange = (itemId, criteriaId, value) => {
    setSectionStates(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [itemId]: {
          ...prev[activeTab][itemId],
          criteriaAnswers: {
            ...prev[activeTab][itemId].criteriaAnswers,
            [criteriaId]: value
          }
        }
      }
    }));
  };

  const handleCommentChange = (itemId, text) => {
    setSectionStates(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [itemId]: {
          ...prev[activeTab][itemId],
          comments: text
        }
      }
    }));
  };

  const handleAssigneeSelect = (itemId, name) => {
    setSectionStates(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [itemId]: {
          ...prev[activeTab][itemId],
          assignee: name
        }
      }
    }));
    setSearchStates(prev => ({
      ...prev,
      [itemId]: { search: name, showDropdown: false }
    }));
  };

  const handleGlobalAssigneeSelect = (name) => {
    setGlobalAssignee(name);
    setGlobalSearch(name);
    setShowGlobalDropdown(false);
  };

  const toggleRationale = (itemId) => {
    setSectionStates(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [itemId]: {
          ...prev[activeTab][itemId],
          showRationale: !prev[activeTab][itemId].showRationale
        }
      }
    }));
  };

  // Upload document handler — reads file as base64 for AI processing
  const handleFileUpload = (itemId, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        // Strip the data:*;base64, prefix to get raw base64
        const base64 = dataUrl.split(',')[1];
        setUploadedDocs(prev => ({
          ...prev,
          [itemId]: {
            fileName: file.name,
            fileType: file.type || 'application/pdf',
            fileBase64: base64,
            uploadStatus: `${user.username || 'PAT Reviewer'}, ${new Date().toLocaleDateString()}`,
            status: 'Uploaded',
            reviewedBy: user.username || 'PAT Reviewer',
            reviewNotes: 'Document attached'
          }
        }));
        setToastMessage(`Attached file '${file.name}' to ${itemId}`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Confirmed Delete document handler
  const confirmDeleteDocument = () => {
    if (deleteConfirmId) {
      const fileName = uploadedDocs[deleteConfirmId]?.fileName;
      setUploadedDocs(prev => {
        const updated = { ...prev };
        delete updated[deleteConfirmId];
        return updated;
      });
      setToastMessage(`Deleted file '${fileName || ''}' from ${deleteConfirmId}`);
      setDeleteConfirmId(null);
    }
  };

  const handleSave = () => {
    setToastMessage('Progress saved successfully!');
  };

  // ── Called when user clicks "Proceed to Review Observations" ────────────────
  // Sends all uploaded documents + answers to n8n webhook for AI verification.
  const handleProceedToReview = async () => {
    // Check if any documents are uploaded for any component
    const uploadedCompIds = Object.keys(uploadedDocs).filter(
      id => uploadedDocs[id] && (uploadedDocs[id].fileName || uploadedDocs[id].fileBase64)
    );

    if (uploadedCompIds.length === 0) {
      // No documents uploaded — skip AI, go straight to review page
      setCurrentStep('REVIEW_OBSERVATIONS');
      return;
    }

    setIsProcessingAI(true);

    try {
      // Build the components payload — one entry per uploaded document
      const components = [];
      Object.keys(QUESTIONS_BY_SECTION).forEach(sectionKey => {
        const section = QUESTIONS_BY_SECTION[sectionKey];
        section.items.forEach(item => {
          const doc = uploadedDocs[item.id];
          if (doc) {
            const itemState = sectionStates[sectionKey]?.[item.id] || {};
            const criteriaAnswers = itemState.criteriaAnswers || {};
            const fallbackBase64 = typeof window !== 'undefined' ? btoa(`Compliance policy document attached for ${item.component}: ${doc.fileName}`) : '';

            components.push({
              componentId: item.id,
              sectionKey,
              componentText: item.component,
              criteria: item.criteria
                .map(c => ({
                  id: c.id,
                  label: c.label,
                  answer: criteriaAnswers[c.id] || 'No'
                }))
                .filter(c => c.answer === 'Yes'),
              document: {
                fileName: doc.fileName,
                fileType: doc.fileType || 'application/pdf',
                fileBase64: doc.fileBase64 || fallbackBase64
              }
            });
          }
        });
      });

      const payload = {
        user: { username: user.username, employeeId: user.employeeId },
        components
      };

      const testWebhookUrl = N8N_WEBHOOK_URL.replace('/webhook/', '/webhook-test/');

      let response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let resText = await response.text();

      // If production webhook returned empty string or 404, try test webhook URL
      if (!resText || response.status === 404) {
        console.log('Production webhook returned empty/404. Attempting Test Webhook URL...');
        response = await fetch(testWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        resText = await response.text();
      }

      if (response.ok && resText) {
        let data = {};
        try {
          data = JSON.parse(resText);
        } catch (e) {
          console.error('Response parsing failed. Raw response:', resText);
        }

        console.log('API Response:', data);

        if (data.success && data.observations) {
          const rawObs = data.observations;
          console.log('>>> Raw observations from backend:', rawObs);

          /**
           * Normalize to: { [CompId]: { [criteriaKey]: { question, observation, AI_finding, score, reference } } }
           *
           * Backend sends one of:
           *   A) { "P1": { "p1_c1": { question, observation, ... }, "p1_c2": {...} } }  ← documented shape
           *   B) { "p1_c1": { question, observation, ... }, "p1_c2": {...} }             ← flat criteria shape
           *   C) { "component_0": { ... } }                                              ← generic keys
           */
          const normalized = {};
          const knownCompIds = new Set(
            Object.keys(QUESTIONS_BY_SECTION).flatMap(sk =>
              QUESTIONS_BY_SECTION[sk].items.map(it => it.id)
            )
          );
          const payloadCompIds = (components || []).map(c => c.componentId || c.id);

          Object.entries(rawObs).forEach(([key, val], idx) => {
            if (!val || typeof val !== 'object') return;

            const valKeys = Object.keys(val);
            const firstVal = val[valKeys[0]];
            const isNestedBlock =
              valKeys.length > 0 && firstVal && typeof firstVal === 'object' &&
              ('question' in firstVal || 'observation' in firstVal || 'AI_finding' in firstVal);

            if (isNestedBlock) {
              // Shape A: outer key is component ID like "P1", inner keys are criteria like "p1_c1"
              const compId = knownCompIds.has(key)
                ? key
                : (payloadCompIds[idx] || key.toUpperCase());

              normalized[compId] = { ...(normalized[compId] || {}), ...val };
              if (compId !== key) normalized[key] = normalized[compId];
            } else {
              // Shape B / C: key is a criteria key or generic key, val is a flat object
              const compId =
                payloadCompIds[idx] ||
                (key.includes('_') ? key.split('_')[0].toUpperCase() : key.toUpperCase());

              if (!normalized[compId]) normalized[compId] = {};
              normalized[compId][key] = val;
            }
          });

          console.log('>>> Normalized AI Observations:', normalized);
          setAiObservations(normalized);
          setToastMessage(`AI verified ${data.processedCount || components.length} document(s) successfully!`);
        } else {
          console.warn('Backend returned empty/missing observations:', data);
          setToastMessage('Backend responded but observations were empty. Check backend logs.');
        }
      } else {
        console.error('Backend error:', response.status, resText);
        setToastMessage(`Backend error (${response.status}). Check backend logs.`);
      }
    } catch (error) {
      console.error('AI processing error:', error);
      setToastMessage('Could not reach AI service. Proceeding to manual review.');
    } finally {
      setIsProcessingAI(false);
      setCurrentStep('REVIEW_OBSERVATIONS');
    }
  };

  const getObservationText = (item) => {
    return item.observationText || "";
  };

  // Calculate compliance statistics for Action Plan Page
  const calculateComplianceStats = () => {
    let totalYes = 0;
    let totalCriteria = 0;

    const sectionScores = {};

    Object.keys(QUESTIONS_BY_SECTION).forEach(sectionKey => {
      let secYes = 0;
      let secTotal = 0;

      QUESTIONS_BY_SECTION[sectionKey].items.forEach(item => {
        const answers = sectionStates[sectionKey]?.[item.id]?.criteriaAnswers || {};
        item.criteria.forEach(c => {
          secTotal += 1;
          totalCriteria += 1;
          if (answers[c.id] === 'Yes') {
            secYes += 1;
            totalYes += 1;
          }
        });
      });

      sectionScores[sectionKey] = secTotal > 0 ? Math.round((secYes / secTotal) * 100) : 0;
    });

    const overallPercentage = totalCriteria > 0 ? Math.round((totalYes / totalCriteria) * 100) : 0;

    return { overallPercentage, sectionScores };
  };

  const { overallPercentage, sectionScores } = calculateComplianceStats();

  return (
    <div className="assessment-container">
      {/* NAVBAR */}
      <nav className="nav-bar">
        <div className="nav-brand">
          <div className="nav-brand-logo">
            <FileCheck size={22} />
          </div>
          <span className="nav-brand-text">AI POLICY REVIEW</span>
        </div>

        <div className="nav-user">
          <div className="user-badge">
            <div className="user-avatar flex-center">
              {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-name">
              {user.username} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({user.employeeId})</span>
            </div>
          </div>
          <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)}>
            <LogOut size={14} />
            Log Out
          </button>
        </div>
      </nav>

      {/* 4-STEP PROGRESS STEPPER HEADER */}
      <div className="stepper-header-4step">
        <div className="stepper-nodes-4step">
          <div className="stepper-line-4step"></div>

          <div
            className={`step-item-4 ${currentStep === 'ASSESSMENT' ? 'active' : 'completed'}`}
            onClick={() => setCurrentStep('ASSESSMENT')}
          >
            <div className="step-circle-4">
              {currentStep !== 'ASSESSMENT' ? <Check size={14} /> : '1'}
            </div>
            <span className="step-label-4">ASSESSMENT</span>
          </div>

          <div
            className={`step-item-4 ${currentStep === 'UPLOAD_DOCUMENTS' ? 'active' : (currentStep === 'REVIEW_OBSERVATIONS' || currentStep === 'ACTION_PLAN') ? 'completed' : ''}`}
            onClick={() => setCurrentStep('UPLOAD_DOCUMENTS')}
          >
            <div className="step-circle-4">
              {currentStep === 'REVIEW_OBSERVATIONS' || currentStep === 'ACTION_PLAN' ? <Check size={14} /> : '2'}
            </div>
            <span className="step-label-4">UPLOAD DOCUMENTS</span>
          </div>

          <div
            className={`step-item-4 ${currentStep === 'REVIEW_OBSERVATIONS' ? 'active' : currentStep === 'ACTION_PLAN' ? 'completed' : ''}`}
            onClick={() => setCurrentStep('REVIEW_OBSERVATIONS')}
          >
            <div className="step-circle-4">
              {currentStep === 'ACTION_PLAN' ? <Check size={14} /> : '3'}
            </div>
            <span className="step-label-4">REVIEW OBSERVATIONS</span>
          </div>

          <div
            className={`step-item-4 ${currentStep === 'ACTION_PLAN' ? 'active' : ''}`}
            onClick={() => setCurrentStep('ACTION_PLAN')}
          >
            <div className="step-circle-4">4</div>
            <span className="step-label-4">ACTION PLAN</span>
          </div>

        </div>
      </div>

      {/* STEP 1: ASSESSMENT QUESTIONNAIRE */}
      {currentStep === 'ASSESSMENT' && (
        <>
          {/* SEGMENTED TAB BAR */}
          <div className="tabs-container">
            <div className="tabs-wrapper">
              {TABS.map((tab) => {
                const sectionItems = QUESTIONS_BY_SECTION[tab]?.items || [];
                const totalCount = sectionItems.length;

                return (
                  <button
                    key={tab}
                    className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    <CheckCircle2 className="tab-check-icon" />
                    <span>{tab}</span>
                    <span className="tab-count-badge">{totalCount}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <main className="main-layout-single">
            {/* ELEGANT GLOBAL ASSIGN BANNER */}
            <div className="global-assign-banner">
              <div className="global-assign-info">
                <div className="global-title-row">
                  <div className="global-icon-badge">
                    <ClipboardList size={18} color="#2563eb" />
                  </div>
                  <span className="tab-title-text">{activeTab}</span>
                  <span className="tab-section-count">
                    {currentSectionData.items.length} Component{currentSectionData.items.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="global-label">Assign all {activeTab} questions to:</div>
                <div className="mention-subtext">
                  Quickly set a default reviewer for all {currentSectionData.items.length} components in this section.
                </div>
              </div>

              <div className="global-assign-input-box">
                <div className="global-input-wrapper">
                  <Users size={16} className="global-input-icon" />
                  <input
                    type="text"
                    className="card-input global-mention-input"
                    placeholder="Assign section to..."
                    value={globalSearch}
                    onFocus={() => setShowGlobalDropdown(true)}
                    onChange={(e) => {
                      setGlobalSearch(e.target.value);
                      setGlobalAssignee(e.target.value);
                    }}
                    onBlur={() => setTimeout(() => setShowGlobalDropdown(false), 200)}
                  />
                </div>

                {showGlobalDropdown && (
                  <div className="mention-dropdown">
                    {MOCK_TEAM.filter(member =>
                      member.name.toLowerCase().includes(globalSearch.toLowerCase())
                    ).map((member, idx) => (
                      <div
                        key={idx}
                        className="mention-item"
                        onMouseDown={() => handleGlobalAssigneeSelect(member.name)}
                      >
                        <div className="mention-avatar">{member.name.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{member.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{member.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ELEGANT STANDARD BANNER */}
            <div className="standard-banner">
              <div className="standard-banner-badge">STANDARD 1</div>
              <div className="standard-banner-title">
                {currentSectionData.standardTitle}
              </div>
            </div>

            {/* POLICY COMPONENT CARDS */}
            {currentSectionData.items.map((item) => {
              const itemState = sectionStates[activeTab]?.[item.id] || {
                assignee: '',
                comments: '',
                showRationale: false,
                criteriaAnswers: {}
              };

              const currentSearch = searchStates[item.id]?.search ?? itemState.assignee;
              const showItemDropdown = searchStates[item.id]?.showDropdown ?? false;

              // Check completion status
              const totalCriteria = item.criteria.length;
              const answeredCount = Object.keys(itemState.criteriaAnswers || {}).length;
              const isFullyAnswered = answeredCount >= totalCriteria;

              return (
                <div key={item.id} className={`policy-card ${isFullyAnswered ? 'card-completed' : ''}`}>
                  <div className="policy-header">
                    <div className="policy-title-container">
                      <div className="policy-id">
                        <span className="policy-id-pill">{item.id}</span>
                        <span className={`policy-badge ${item.criticalLevel === 'Critical' ? 'critical' : 'non-critical'}`}>
                          <span className="badge-dot"></span>
                          {item.criticalLevel}
                        </span>
                      </div>
                      <p className="policy-description">{item.component}</p>
                    </div>

                    {/* Completion chip */}
                    <div className={`policy-status-chip ${isFullyAnswered ? 'done' : 'pending'}`}>
                      <CheckCircle2 size={13} />
                      <span>{answeredCount}/{totalCriteria} Answered</span>
                    </div>
                  </div>

                  <div className="criteria-container">
                    <div className="criteria-section-title">
                      <FileText size={12} style={{ color: '#2563eb' }} />
                      <span>CRITERIA: THE ORGANIZATION:</span>
                    </div>

                    {item.criteria.map((c, qIdx) => {
                      const selectedVal = itemState.criteriaAnswers[c.id] || 'Yes';
                      return (
                        <div key={c.id} className="criteria-row">
                          <div className="criteria-left-box">
                            <span className="q-index-pill">Q{qIdx + 1}</span>
                            <div className="criteria-text">{c.label}</div>
                          </div>

                          {/* SEGMENTED TOGGLE BUTTON CHIPS */}
                          <div className="segmented-toggle-group">
                            <button
                              type="button"
                              className={`toggle-chip chip-yes ${selectedVal === 'Yes' ? 'active' : ''}`}
                              onClick={() => handleRadioChange(item.id, c.id, 'Yes')}
                            >
                              <Check size={13} />
                              <span>Yes</span>
                            </button>
                            <button
                              type="button"
                              className={`toggle-chip chip-no ${selectedVal === 'No' ? 'active' : ''}`}
                              onClick={() => handleRadioChange(item.id, c.id, 'No')}
                            >
                              <X size={13} />
                              <span>No</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="card-details-grid">
                    <div className="detail-column">
                      <div className="detail-label">
                        <UserPlus size={13} style={{ color: '#2563eb' }} />
                        <span>Assign Component To</span>
                      </div>
                      <div className="mention-input-container">
                        <input
                          type="text"
                          className="card-input"
                          placeholder={globalAssignee ? `Assigned (Global: ${globalAssignee})` : 'Select reviewer...'}
                          value={currentSearch}
                          onFocus={() => setSearchStates(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], showDropdown: true }
                          }))}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSearchStates(prev => ({
                              ...prev,
                              [item.id]: { search: val, showDropdown: true }
                            }));
                            setSectionStates(prev => ({
                              ...prev,
                              [activeTab]: {
                                ...prev[activeTab],
                                [item.id]: { ...prev[activeTab][item.id], assignee: val }
                              }
                            }));
                          }}
                          onBlur={() => setTimeout(() => setSearchStates(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], showDropdown: false }
                          })), 200)}
                        />
                        {showItemDropdown && (
                          <div className="mention-dropdown">
                            {MOCK_TEAM.filter(member =>
                              member.name.toLowerCase().includes((currentSearch || '').toLowerCase())
                            ).map((member, idx) => (
                              <div
                                key={idx}
                                className="mention-item"
                                onMouseDown={() => handleAssigneeSelect(item.id, member.name)}
                              >
                                <div className="mention-avatar">{member.name.charAt(0)}</div>
                                <div>
                                  <div style={{ fontWeight: 600 }}>{member.name}</div>
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{member.role}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className={`rationale-toggle-btn ${itemState.showRationale ? 'active' : ''}`}
                        onClick={() => toggleRationale(item.id)}
                      >
                        <Info size={13} />
                        <span>{itemState.showRationale ? 'Hide Compliance Rationale' : 'View Compliance Rationale'}</span>
                      </button>
                    </div>

                    <div className="detail-column">
                      <div className="detail-label">
                        <MessageSquare size={13} style={{ color: '#2563eb' }} />
                        <span>Review Notes / Comments</span>
                      </div>
                      <textarea
                        className="card-input"
                        placeholder="Add optional notes or compliance rationale..."
                        value={itemState.comments}
                        onChange={(e) => handleCommentChange(item.id, e.target.value)}
                      />
                    </div>
                  </div>

                  {itemState.showRationale && (
                    <div className="rationale-drawer">
                      <div className="rationale-drawer-title">
                        <Info size={14} />
                        <span>Compliance Rationale Details</span>
                      </div>
                      <p>{renderFormattedText(item.rationaleText)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </main>

          <footer className="footer-bar">
            <button className="secondary-btn" onClick={handleSave}>
              <Save size={15} />
              Save Progress
            </button>
            <button className="submit-btn" onClick={() => setCurrentStep('UPLOAD_DOCUMENTS')}>
              Proceed to Upload Documents
              <ChevronRight size={15} />
            </button>
          </footer>
        </>
      )}

      {/* STEP 2: UPLOAD DOCUMENTS TABLE */}
      {currentStep === 'UPLOAD_DOCUMENTS' && (() => {
        // Calculate document upload stats
        let totalCompCount = 0;
        let uploadedCount = 0;

        Object.keys(QUESTIONS_BY_SECTION).forEach(secKey => {
          QUESTIONS_BY_SECTION[secKey].items.forEach(item => {
            totalCompCount++;
            if (uploadedDocs[item.id]) uploadedCount++;
          });
        });

        const uploadProgressPct = totalCompCount > 0
          ? Math.round((uploadedCount / totalCompCount) * 100)
          : 100;

        return (
          <main className="doc-review-container">
            {/* TOP CONTROLS & REPOSITORY HEADER */}
            <div className="doc-controls-bar">
              <div className="doc-controls-info">
                <div className="doc-controls-title-row">
                  <div className="doc-title-icon-badge">
                    <FileUp size={18} color="#2563eb" />
                  </div>
                  <h1 className="doc-page-title">Policy Document Repository</h1>
                  <span className="doc-progress-chip">
                    <FolderCheck size={13} />
                    <span>
                      {`${uploadedCount} / ${totalCompCount} Documents Uploaded (${uploadProgressPct}%)`}
                    </span>
                  </span>
                </div>
                <p className="doc-page-subtitle">
                  Attach compliance policy PDFs or text documents for each standard component to enable automated AI observation review.
                </p>
              </div>

              <div className="doc-filters-group">
                <div className="search-box-input">
                  <Search size={15} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search documents or IDs..."
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                  />
                </div>

                <div className="filter-select-wrapper">
                  <Filter size={13} className="filter-icon" />
                  <select
                    className="filter-select"
                    value={selectedOperation}
                    onChange={(e) => setSelectedOperation(e.target.value)}
                  >
                    <option value="All">All Sections</option>
                    <option value="Policies">Policies</option>
                    <option value="Training">Training</option>
                    <option value="Internal Feedback Systems">Internal Feedback Systems</option>
                    <option value="Administrative Practices">Administrative Practices</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ELEVATED TABLE WRAPPER */}
            <div className="table-wrapper">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>Designation</th>
                    <th style={{ minWidth: '320px' }}>Standard / Component</th>
                    <th style={{ width: '120px' }}>Status</th>
                    <th style={{ width: '260px' }}>Attached Document</th>
                    <th style={{ width: '180px' }}>Upload Status</th>
                    <th style={{ width: '140px' }}>Uploaded By</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(QUESTIONS_BY_SECTION)
                    .filter(sectionKey => selectedOperation === 'All' || selectedOperation === sectionKey)
                    .map((sectionKey) => {
                      const section = QUESTIONS_BY_SECTION[sectionKey];
                      const sectionItems = section.items.filter(item =>
                        item.component.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                        item.id.toLowerCase().includes(docSearchQuery.toLowerCase())
                      );

                      if (sectionItems.length === 0) return null;

                      // Section uploaded count
                      const secUploadedCount = sectionItems.filter(it => uploadedDocs[it.id]).length;

                      return (
                        <React.Fragment key={sectionKey}>
                          <tr className="table-section-row">
                            <td colSpan="6">
                              <div className="section-divider-content">
                                <span className="section-divider-title">
                                  <BookOpen size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                                  <span>{sectionKey}</span>
                                </span>
                                <span className="section-divider-badge">
                                  {secUploadedCount}/{sectionItems.length} Attached
                                </span>
                              </div>
                            </td>
                          </tr>

                          {sectionItems.map((item) => {
                            const uploaded = uploadedDocs[item.id];

                            return (
                              <tr key={item.id} className={uploaded ? 'row-has-doc' : ''}>
                                <td>
                                  <span className={`policy-badge ${item.criticalLevel === 'Critical' ? 'critical' : 'non-critical'}`}>
                                    <span className="badge-dot"></span>
                                    {item.criticalLevel}
                                  </span>
                                </td>
                                <td>
                                  <div className="doc-table-comp-box">
                                    <span className="policy-id-pill">{item.id}</span>
                                    <span className="doc-table-comp-desc">{item.component}</span>
                                  </div>
                                </td>
                                <td>
                                  {uploaded ? (
                                    <span className="doc-status-badge uploaded">Uploaded</span>
                                  ) : (
                                    <span className="doc-status-badge pending">Not Attached</span>
                                  )}
                                </td>
                                <td>
                                  {uploaded ? (
                                    <div className="doc-file-pill-group">
                                      <span
                                        className="doc-file-link"
                                        onClick={() => setPreviewDoc({ item, doc: uploaded })}
                                        title="Click to preview document"
                                      >
                                        <Paperclip size={13} style={{ color: '#2563eb' }} />
                                        <span className="doc-file-name-text">{uploaded.fileName}</span>
                                      </span>
                                      <button
                                        type="button"
                                        className="doc-delete-circle"
                                        title="Remove document"
                                        onClick={() => setDeleteConfirmId(item.id)}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="upload-trigger-btn">
                                      <Upload size={13} />
                                      <span>Upload Document</span>
                                      <input
                                        type="file"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleFileUpload(item.id, e)}
                                      />
                                    </label>
                                  )}
                                </td>
                                <td>
                                  <div className="upload-meta-time">
                                    <Clock size={11} />
                                    <span>{uploaded ? uploaded.uploadStatus : 'No document attached'}</span>
                                  </div>
                                </td>
                                <td>
                                  {uploaded ? (
                                    <div className="user-uploader-pill">
                                      <div className="uploader-avatar">
                                        {(uploaded.uploadedBy || uploaded.reviewedBy || user.username).charAt(0).toUpperCase()}
                                      </div>
                                      <span>{uploaded.uploadedBy || uploaded.reviewedBy || user.username}</span>
                                    </div>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <footer className="footer-bar" style={{ borderRadius: '12px', marginTop: '16px' }}>
              <button className="secondary-btn" onClick={() => setCurrentStep('ASSESSMENT')}>
                <ArrowLeft size={15} />
                Back to Assessment
              </button>
              <button className="submit-btn" onClick={handleProceedToReview}>
                Proceed to Review Observations
                <ChevronRight size={15} />
              </button>
            </footer>
          </main>
        );
      })()}

      {/* STEP 3: REVIEW OBSERVATIONS VIEW */}
      {currentStep === 'REVIEW_OBSERVATIONS' && (() => {
        // ── Compute global stats across all components ──────────────────────
        let totalQ = 0, totalAgree = 0, totalPartial = 0, totalMissing = 0, totalNoDoc = 0;
        Object.keys(QUESTIONS_BY_SECTION).forEach((sk) => {
          QUESTIONS_BY_SECTION[sk].items.forEach((it) => {
            const up = uploadedDocs[it.id];
            if (!up) { totalNoDoc++; return; }
            const obs = (() => {
              const ao = aiObservations;
              if (!ao || typeof ao !== 'object') return null;
              if (ao[it.id] && typeof ao[it.id] === 'object') return ao[it.id];
              const lk = it.id.toLowerCase();
              const mk = Object.keys(ao).find(k => k.toLowerCase() === lk);
              return mk ? ao[mk] : null;
            })();
            if (!obs) return;
            Object.values(obs).forEach((val) => {
              if (!val || typeof val !== 'object') return;
              const f = String(val.AI_finding || val.ai_finding || val.finding || '').trim().toLowerCase();
              if (!f) return;
              totalQ++;
              if (f === 'agree' || f.includes('supported') || f.includes('full') || f === 'yes') totalAgree++;
              else if (f === 'partial' || f.includes('partially') || f.includes('part')) totalPartial++;
              else totalMissing++;
            });
          });
        });
        const totalAnswered = totalAgree + totalPartial + totalMissing;
        const overallPct = totalAnswered > 0 ? Math.round((totalAgree / totalAnswered) * 100) : 0;

        let globalCardIdx = 0;
        return (
        <main className="review-obs-container">
          {/* ── GLOBAL STATS BANNER ── */}
          <div className="obs-stats-banner">
            <div className="obs-stats-banner-left">
              <div className="obs-stats-banner-title">Assessment Overview</div>
              <div className="obs-stats-banner-sub">AI evaluation results across all policy components</div>
            </div>
            <div className="obs-stats-pills">
              <div className="obs-stat-chip obs-stat-chip-agree">
                <span className="obs-stat-chip-icon">✓</span>
                <div>
                  <div className="obs-stat-chip-num">{totalAgree}</div>
                  <div className="obs-stat-chip-label">Agree</div>
                </div>
              </div>
              <div className="obs-stat-chip obs-stat-chip-partial">
                <span className="obs-stat-chip-icon">◐</span>
                <div>
                  <div className="obs-stat-chip-num">{totalPartial}</div>
                  <div className="obs-stat-chip-label">Partial</div>
                </div>
              </div>
              <div className="obs-stat-chip obs-stat-chip-missing">
                <span className="obs-stat-chip-icon">✗</span>
                <div>
                  <div className="obs-stat-chip-num">{totalMissing}</div>
                  <div className="obs-stat-chip-label">Missing</div>
                </div>
              </div>
              <div className="obs-stat-chip obs-stat-chip-score">
                <div className="obs-stat-score-ring">
                  <svg viewBox="0 0 36 36" width="32" height="32" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#ffffff"
                      strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 15}`}
                      strokeDashoffset={`${2 * Math.PI * 15 * (1 - overallPct / 100)}`}
                      style={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                  </svg>
                  <div className="obs-stat-score-center">{overallPct}%</div>
                </div>
                <div>
                  <div className="obs-stat-chip-num" style={{ color: '#fff' }}>Overall</div>
                  <div className="obs-stat-chip-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Compliance</div>
                </div>
              </div>
            </div>
          </div>

          <div className="obs-list-container">
            {Object.keys(QUESTIONS_BY_SECTION).map((sectionKey, sIdx) => {
              const section = QUESTIONS_BY_SECTION[sectionKey];

              return [
                // ── Section Divider ──
                <div key={`sec-${sectionKey}`} className="obs-section-divider">
                  <div className="obs-section-divider-line" />
                  <div className="obs-section-divider-chip">
                    <ClipboardList size={13} />
                    {section.label || sectionKey}
                  </div>
                  <div className="obs-section-divider-line" />
                </div>,
                // ── Component Cards ──
                ...section.items.map((item) => {
                const cardGroupIdx = (sIdx * 20) + section.items.indexOf(item);
                const uploaded = uploadedDocs[item.id];
                const commentText = reviewComments[item.id] || '';

                // ── Resolve this component's AI observation block ────────────
                // Shape: { c1: { question, summary, observation, AI_finding, score }, c2: ... }
                const getComponentObs = (aiObs, compId) => {
                  if (!aiObs || typeof aiObs !== 'object') return null;
                  if (aiObs[compId] && typeof aiObs[compId] === 'object') return aiObs[compId];
                  const lowerComp = (compId || '').toLowerCase();
                  const keys = Object.keys(aiObs);
                  const matchedKey = keys.find(k => k.toLowerCase() === lowerComp);
                  if (matchedKey && typeof aiObs[matchedKey] === 'object') return aiObs[matchedKey];
                  if (keys.length === 1 && uploaded) return aiObs[keys[0]] || null;
                  return null;
                };

                const componentObs = getComponentObs(aiObservations, item.id);

                // ── Build an array of per-question entries from componentObs ─
                // Each entry: { key, question, summary, observation, observationPoints, aiFinding, score, reference }
                const buildQuestionEntries = (compObs) => {
                  if (!compObs || typeof compObs !== 'object') return [];
                  return Object.entries(compObs)
                    .filter(([, val]) => val && typeof val === 'object')
                    .map(([key, val]) => {
                      // Structurally parse observation into clean bullet points
                      const rawObs = (Array.isArray(val.observation_points) && val.observation_points.length > 0)
                        ? val.observation_points
                        : (val.observation || val.text || '');

                      const obsPoints = parseStructuredObservation(rawObs);
                      const refVal = val.reference || val.citation || val.ref || null;

                      return {
                        key,
                        question:           val.question            || '',
                        summary:            val.summary             || '',
                        observation:        val.observation         || val.text || '',
                        observationPoints:  obsPoints,
                        aiFinding:          val.AI_finding          || val.ai_finding || val.finding || '',
                        aiConfidence:       val.ai_confidence       || val.score || '',
                        score:              val.ai_confidence       || val.score || '',
                        reference:          refVal,
                        // These are AI chain-of-thought fields — intentionally NOT shown to users
                        // val.requirement_breakdown — hidden
                        // val.evidence_analysis_and_justification — hidden
                      };
                    })
                    .filter(e => e.question || e.observation || e.observationPoints.length || e.summary || e.reference || e.aiFinding);
                };

                const questionEntries = buildQuestionEntries(componentObs);

                // ── Badge & Ref helpers ──────────────────────────────────────
                const getAiBadgeClass = (finding) => {
                  if (!finding) return 'obs-pill-gray';
                  const f = String(finding).trim().toLowerCase();
                  if (f === 'agree' || f.includes('supported') || f.includes('full') || f === 'yes') {
                    return 'obs-pill-agree';
                  }
                  if (f === 'partial' || f.includes('partially') || f.includes('part')) {
                    return 'obs-pill-partial';
                  }
                  if (f === 'missing' || f.includes('missing') || f.includes('not found') || f === 'no' || f === 'absent') {
                    return 'obs-pill-missing';
                  }
                  return 'obs-pill-gray';
                };
                const isAgreeFinding = (f) => {
                  if (!f) return false;
                  const s = String(f).trim().toLowerCase();
                  return s === 'agree' || s.includes('supported') || s.includes('full') || s.includes('yes');
                };
                const fmtScore = (s) => {
                  if (s === null || s === undefined || s === '') return '';
                  const str = String(s).trim();
                  return str.includes('%') ? str : `${str}%`;
                };
                const isNoMatchingRef = (ref) => {
                  if (!ref) return true;
                  let r = '';
                  if (typeof ref === 'string') {
                    r = ref.trim().toLowerCase();
                  } else if (typeof ref === 'object' && ref !== null) {
                    r = (ref.quote || ref.text || ref.citation || ref.location || '').trim().toLowerCase();
                  }
                  if (!r) return true;
                  return r.includes('no matching') || r.includes('not found') || r.includes('no line') || r === 'none' || r === 'n/a';
                };
                const isAiAnswerMissing = (finding, ref) => {
                  if (!finding) return true;
                  const f = String(finding).trim().toLowerCase();
                  if (f === 'missing' || f.includes('missing') || f.includes('not found') || f === 'no' || f === 'absent') {
                    return true;
                  }
                  return isNoMatchingRef(ref);
                };


                // ── Per-component agreement stats ──────────────────────────
                const compAgree   = questionEntries.filter(e => getAiBadgeClass(e.aiFinding) === 'obs-pill-agree').length;
                const compPartial = questionEntries.filter(e => getAiBadgeClass(e.aiFinding) === 'obs-pill-partial').length;
                const compMissing = questionEntries.filter(e => getAiBadgeClass(e.aiFinding) === 'obs-pill-missing').length;
                const compTotal   = questionEntries.length;

                return (
                  <div key={item.id} className="obs-component-block" style={{ animationDelay: `${cardGroupIdx * 0.07}s` }}>

                    {/* ── COMPONENT HEADER (dark themed) ── */}
                    <div className="obs-comp-header">
                      <div className="obs-comp-icon-box">
                        <ShieldCheck size={20} />
                      </div>

                      {/* Title + subtitle — give this more space */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="obs-comp-title">{item.id}: {item.component}</div>
                      </div>

                      {/* Compact stats */}
                      {compTotal > 0 && (
                        <div className="obs-comp-mini-stats">
                          {compAgree   > 0 && <span className="obs-comp-stat-dot agree">{compAgree} Agree</span>}
                          {compPartial > 0 && <span className="obs-comp-stat-dot partial">{compPartial} Partial</span>}
                          {compMissing > 0 && <span className="obs-comp-stat-dot missing">{compMissing} Missing</span>}
                        </div>
                      )}

                      {/* File badge (compact, truncated) + icon-only delete */}
                      {uploaded ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0, maxWidth: '260px' }}>
                          <span className="obs-comp-file-badge">
                            <Paperclip size={11} />
                            <span className="obs-comp-file-name">{uploaded.fileName}</span>
                          </span>
                          <button
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="obs-comp-delete-btn"
                            title="Remove document"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', flexShrink: 0 }}>
                          No document
                        </span>
                      )}
                    </div>

                    {/* ── FULL-WIDTH BODY (no grid, no sidebar) ── */}
                    <div className="obs-main-col">
                      {!uploaded ? (
                        <div className="obs-no-doc">
                          <div className="obs-no-doc-icon"><FileText size={22} /></div>
                          <div style={{ fontWeight: 700, color: '#6366f1', fontSize: '13px' }}>No document uploaded</div>
                          <div style={{ fontSize: '12px' }}>Upload a policy document to get AI-powered observations</div>
                        </div>
                      ) : questionEntries.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Document uploaded</div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Evaluation pending — run AI Verification to generate observations</div>
                          </div>
                          <button
                            className="primary-btn"
                            style={{ padding: '7px 14px', fontSize: '12px', whiteSpace: 'nowrap', marginLeft: '16px' }}
                            onClick={handleProceedToReview}
                          >
                            ✨ Run AI Verification
                          </button>
                        </div>
                      ) : (
                        questionEntries.map((entry, qIdx) => {
                          const cardKey = `${item.id}__${entry.key}`;
                          const isExpanded = Boolean(expandedObs[cardKey]);
                          const isRefExpanded = Boolean(expandedRef[cardKey]);
                          const hasFinding = Boolean(entry.aiFinding);
                          const confVal = entry.aiConfidence || entry.ai_confidence || entry.score;
                          const hasScore = Boolean(confVal);
                          const hasRef = Boolean(entry.reference);

                          const scoreNum = (() => {
                            if (!confVal) return 0;
                            const n = parseInt(String(confVal).replace('%', '').trim(), 10);
                            return isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
                          })();

                          // Helper to accurately match criteria ID (e.g. 'p2_c2' or 'c2')
                          const findCriteriaForKey = (criteriaList, key, fallbackIndex) => {
                            if (!criteriaList || !criteriaList.length) return null;
                            const kLower = String(key || '').toLowerCase().trim();

                            // 1. Exact ID match (e.g., 'p2_c1' === 'p2_c1')
                            let match = criteriaList.find(c => String(c.id).toLowerCase() === kLower);
                            if (match) return match;

                            // 2. Ends-with / contains match (e.g., key 'c2' matching 'p2_c2')
                            match = criteriaList.find(c => {
                              const cIdLower = String(c.id).toLowerCase();
                              return cIdLower.endsWith(`_${kLower}`) || cIdLower === kLower || kLower.endsWith(`_${cIdLower}`);
                            });
                            if (match) return match;

                            // 3. Number match (e.g. '2' or 'c2' -> index 1)
                            const numMatch = kLower.match(/\d+/);
                            if (numMatch) {
                              const idx = parseInt(numMatch[0], 10) - 1;
                              if (idx >= 0 && idx < criteriaList.length) {
                                return criteriaList[idx];
                              }
                            }

                            // 4. Fallback to array index
                            if (typeof fallbackIndex === 'number' && fallbackIndex >= 0 && fallbackIndex < criteriaList.length) {
                              return criteriaList[fallbackIndex];
                            }
                            return null;
                          };

                          const matchedCriteria = findCriteriaForKey(item.criteria, entry.key, qIdx);
                          const criteriaIndex = matchedCriteria ? item.criteria.indexOf(matchedCriteria) : qIdx;
                          const displayNum = String(criteriaIndex + 1).padStart(2, '0');

                          const userAnswer = matchedCriteria
                            ? (sectionStates[sectionKey]?.[item.id]?.criteriaAnswers?.[matchedCriteria.id] || 'Yes')
                            : 'Yes';

                          // Card accent class
                          const cardAccentClass = getAiBadgeClass(entry.aiFinding);
                          
                          return (
                            <div key={entry.key} className={`obs-question-card ${cardAccentClass}`}>

                              {/* ── Two-zone layout: Content Left + Gauge Right ── */}
                              <div className="obs-card-layout">
                                {/* LEFT: Main content */}
                                <div className="obs-card-content">
                                  {/* Row 1: Number + Title + Badges */}
                                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                                    <div className="obs-q-num">{displayNum}</div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', lineHeight: '1.5' }}>
                                        {entry.question ? renderFormattedText(entry.question) : matchedCriteria?.label ? renderFormattedText(matchedCriteria.label) : `Criteria ${entry.key.toUpperCase()}`}
                                      </div>
                                      {entry.summary && (
                                        <div className="obs-summary-inline">
                                          <span className="obs-summary-label">Observation:</span>
                                          <span className="obs-summary-body">{renderFormattedText(entry.summary)}</span>
                                        </div>
                                      )}
                                      {/* ── Animated Verdict Strip ── */}
                                      <div className="obs-verdict-strip">

                                        {/* User Answer pill */}
                                        <div className={`obs-verdict-pill obs-verdict-pill-user ${userAnswer === 'Yes' ? 'yes' : 'no'}`}>
                                          <span className="obs-verdict-pill-dot" />
                                          <span className="obs-verdict-pill-label">Your Answer</span>
                                          <span className="obs-verdict-pill-val">{userAnswer}</span>
                                        </div>

                                        {/* Animated flowing arrow */}
                                        <div className="obs-verdict-flow">
                                          <span className="obs-flow-dot obs-flow-dot-1" />
                                          <span className="obs-flow-dot obs-flow-dot-2" />
                                          <span className="obs-flow-dot obs-flow-dot-3" />
                                          <span className="obs-flow-arrow">›</span>
                                        </div>

                                        {/* AI Finding pill */}
                                        {hasFinding ? (
                                          <div className={`obs-verdict-pill obs-verdict-pill-ai ${getAiBadgeClass(entry.aiFinding)}`}>
                                            <span className="obs-verdict-pill-dot" />
                                            <span className="obs-verdict-pill-label">AI Finding</span>
                                            <span className="obs-verdict-pill-val">{entry.aiFinding}</span>
                                          </div>
                                        ) : (
                                          <div className="obs-verdict-pill obs-verdict-pill-pending">
                                            <span className="obs-verdict-pill-dot" />
                                            <span className="obs-verdict-pill-label">AI Finding</span>
                                            <span className="obs-verdict-pill-val">Pending…</span>
                                          </div>
                                        )}

                                        {/* Aligned / Differs badge */}
                                        {hasFinding && (() => {
                                          const isAligned =
                                            (userAnswer === 'Yes' && getAiBadgeClass(entry.aiFinding) === 'obs-pill-agree') ||
                                            (userAnswer === 'No'  && getAiBadgeClass(entry.aiFinding) === 'obs-pill-missing');
                                          return (
                                            <div className={`obs-verdict-result ${isAligned ? 'aligned' : 'differs'}`}>
                                              <span className="obs-verdict-result-icon">{isAligned ? '✓' : '⚠'}</span>
                                              {isAligned ? 'Aligned' : 'Differs'}
                                            </div>
                                          );
                                        })()}

                                      </div>
                                    </div>
                                  </div>

                                  {/* Row 2: Action buttons */}
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                                    {/* View Details — only if there are sections OR fallback observation text */}
                                    {(entry.observationSections.length > 0 || entry.observation) && (
                                      <button
                                        className={`obs-toggle-btn${isExpanded ? ' active' : ''}`}
                                        onClick={() => toggleObsExpand(item.id, entry.key)}
                                      >
                                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                        {isExpanded ? 'Hide Details' : 'View Details'}
                                      </button>
                                    )}
                                    {hasRef && (
                                      <button
                                        className={`obs-toggle-btn ref${isRefExpanded ? ' active' : ''}`}
                                        onClick={() => toggleRefExpand(item.id, entry.key)}
                                      >
                                        <BookOpen size={13} />
                                        {isRefExpanded ? 'Hide Reference' : 'View Reference'}
                                      </button>
                                    )}
                                  </div>

                                  {/* Expandable Observation panel — structured section cards */}
                                  {isExpanded && (entry.observationSections.length > 0 || entry.observation) && (() => {
                                    const sectionsToRender = entry.observationSections.length > 0
                                      ? entry.observationSections
                                      : parseObservationSections(entry.observation);

                                    return (
                                      <div className="obs-detail-panel">
                                        <div className="obs-detail-panel-heading">
                                          <FileText size={14} />
                                          <span>Detailed Observation</span>
                                        </div>

                                        <div className="obs-section-cards-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                                          {sectionsToRender.map((sec, secIdx) => (
                                            <div key={secIdx} className="obs-section-card-box" style={{
                                              background: '#ffffff',
                                              borderRadius: '8px',
                                              border: '1px solid #e2e8f0',
                                              padding: '12px 14px',
                                              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                            }}>
                                              {/* SECTION HEADER */}
                                              {sec.title && (
                                                <div style={{
                                                  fontSize: '13px',
                                                  fontWeight: 700,
                                                  color: '#0f172a',
                                                  marginBottom: sec.paragraph || sec.items.length ? '8px' : '0',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '6px'
                                                }}>
                                                  <span style={{
                                                    width: '5px',
                                                    height: '13px',
                                                    borderRadius: '3px',
                                                    background: sec.title.toLowerCase().includes('gap')
                                                      ? '#ef4444'
                                                      : sec.title.toLowerCase().includes('action') || sec.title.toLowerCase().includes('required')
                                                        ? '#f59e0b'
                                                        : '#2563eb',
                                                    display: 'inline-block'
                                                  }} />
                                                  <span>{sec.title}</span>
                                                </div>
                                              )}

                                              {/* PARAGRAPH CONTENT */}
                                              {sec.paragraph && (
                                                <div style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#334155', marginBottom: sec.items.length ? '10px' : '0' }}>
                                                  {renderInlineBoldText(sec.paragraph)}
                                                </div>
                                              )}

                                              {/* BULLET ITEMS LIST */}
                                              {sec.items.length > 0 && (
                                                <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px', margin: 0, listStyle: 'none' }}>
                                                  {sec.items.map((itemStr, itIdx) => (
                                                    <li key={itIdx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', lineHeight: '1.6', color: '#334155' }}>
                                                      <span style={{
                                                        color: '#2563eb',
                                                        fontSize: '13px',
                                                        fontWeight: 800,
                                                        marginTop: '1px',
                                                        flexShrink: 0
                                                      }}>•</span>
                                                      <span style={{ flex: 1 }}>{renderInlineBoldText(itemStr)}</span>
                                                    </li>
                                                  ))}
                                                </ul>
                                              )}

                                              {/* RAW FALLBACK */}
                                              {!sec.title && !sec.paragraph && !sec.items.length && sec.raw && (
                                                <div style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#334155' }}>
                                                  {renderInlineBoldText(sec.raw)}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Expandable Reference panel */}
                                  {isRefExpanded && hasRef && (
                                    isAiAnswerMissing(entry.aiFinding, entry.reference) ? (
                                      <div className="obs-ref-no-match">
                                        <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                        <span>No reference citation available — requirement was not found in the uploaded document.</span>
                                      </div>
                                    ) : (
                                      <div className="obs-ref-panel">
                                        <div className="obs-ref-panel-heading">
                                          <Quote size={14} />
                                          Document Reference &amp; Citation
                                        </div>
                                        {renderReferenceContent(entry.reference)}
                                        {/* View in File button — opens PDF with highlight */}
                                        {uploaded?.fileBase64 && (
                                          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                                            <button
                                              onClick={() => setPdfViewer({
                                                fileBase64: uploaded.fileBase64,
                                                fileName: uploaded.fileName,
                                                reference: entry.reference,
                                              })}
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 14px',
                                                borderRadius: '20px',
                                                background: 'linear-gradient(135deg, #1e3a5f, #0b3b60)',
                                                border: '1px solid rgba(37,99,235,0.3)',
                                                color: '#ffffff',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 8px rgba(11,59,96,0.25)',
                                                transition: 'all 0.15s ease',
                                              }}
                                            >
                                              <ExternalLink size={12} />
                                              View in File
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>

                                {/* RIGHT: Compact Confidence Gauge */}
                                {hasScore && (
                                  <div className="obs-card-gauge">
                                    <div className="gauge-mini-label">AI CONFIDENCE</div>
                                    <div className="gauge-mini-ring-wrap">
                                      <svg className="gauge-mini-svg" viewBox="0 0 64 64">
                                        <circle className="gauge-ring-bg" cx="32" cy="32" r="26" />
                                        <circle
                                          className="gauge-ring-fill animated"
                                          cx="32" cy="32" r="26"
                                          stroke={gaugeStroke}
                                          strokeDasharray={2 * Math.PI * 26}
                                          strokeDashoffset={(2 * Math.PI * 26) - (scoreNum / 100) * (2 * Math.PI * 26)}
                                          style={{ '--gauge-glow': gaugeGlow }}
                                        />
                                      </svg>
                                      <div className="gauge-mini-center">
                                        <span className="gauge-mini-number" style={{ color: gaugeStroke }}>{scoreNum}</span>
                                        <span className="gauge-mini-pct" style={{ color: gaugeStroke }}>%</span>
                                      </div>
                                    </div>
                                    {/* Animated shimmer bar */}
                                    <div className="gauge-shimmer-track">
                                      <div
                                        className="gauge-shimmer-fill"
                                        style={{
                                          width: `${scoreNum}%`,
                                          background: `linear-gradient(90deg, ${gaugeStroke}, ${gaugeStroke}dd)`,
                                          '--shimmer-color': gaugeStroke,
                                        }}
                                      />
                                    </div>
                                    <div className={`gauge-mini-badge ${gaugeLevelClass}`}>
                                      {gaugeLevel}
                                    </div>
                                  </div>
                                )}
                              </div>

                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                );
                }) // end section.items.map
              ]; // end section array
            })}
          </div>

          {/* ── FOOTER BAR ── */}
          <footer className="obs-footer-bar">
            <button className="secondary-btn" onClick={() => setCurrentStep('UPLOAD_DOCUMENTS')}>
              <ArrowLeft size={15} />
              Back to Upload
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="primary-btn" onClick={handleSave}>
                <Save size={15} />
                Save
              </button>
              <button className="submit-btn obs-footer-cta" onClick={() => setCurrentStep('ACTION_PLAN')}>
                Generate Action Plan
                <ChevronRight size={15} />
              </button>
            </div>
          </footer>
        </main>
        );
      })()}

      {/* STEP 4: ACTION PLAN PAGE (EXACT MATCHING UPLOADED PHOTO) */}
      {currentStep === 'ACTION_PLAN' && (
        <main className="action-plan-container">
          <h1 className="page-main-heading">Action Plan</h1>

          {/* COMPONENT SUMMARY BOX */}
          <div className="component-summary-card">
            <div className="component-summary-title">Component Summary</div>

            <div className="summary-flex-row">
              {/* OVERALL SCORE BOX */}
              <div className="overall-score-subbox">
                <div className="overall-score-subbox-title">Overall Score</div>
                <svg className="overall-score-ring-svg" width="140" height="140" viewBox="0 0 140 140">
                  <circle
                    className="overall-score-ring-track"
                    cx="70"
                    cy="70"
                    r="60"
                  />
                  <circle
                    className="overall-score-ring-fill"
                    cx="70"
                    cy="70"
                    r="60"
                    stroke="#2563eb"
                    strokeDasharray="377"
                    strokeDashoffset={377 * (1 - Math.min(Math.max(overallPercentage, 0), 100) / 100)}
                    transform="rotate(-90 70 70)"
                  />
                  <text className="overall-score-ring-text" x="70" y="65">
                    {overallPercentage}%
                  </text>
                  <text className="overall-score-ring-label" x="70" y="88">
                    Compliant
                  </text>
                </svg>
              </div>

              {/* SCORE BY OPERATION BAR CHART BOX (4 MAIN SECTIONS) */}
              <div className="score-by-operation-subbox">
                <div className="score-by-operation-title">Score By Operation</div>

                <div className="bar-chart-container">
                  {[
                    { label: 'Policies', key: 'Policies' },
                    { label: 'Training', key: 'Training' },
                    { label: 'Internal Feedback System', key: 'Internal Feedback Systems' },
                    { label: 'Administrative Practices', key: 'Administrative Practices' }
                  ].map((sec) => {
                    const pct = sectionScores[sec.key] ?? 0;
                    return (
                      <div key={sec.key} className="bar-item-wrapper">
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#000000', marginBottom: '2px' }}>{pct}%</div>
                        <div className="bar-fill-container">
                          <div className="bar-fill" style={{ height: `${Math.max(pct, 15)}%` }}></div>
                        </div>
                        <div className="bar-label" style={{ fontWeight: 700, fontSize: '10px', marginTop: '4px' }}>{sec.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="assessment-breakdown-heading">Assessment Breakdown</div>

          {/* ACTION PLAN MAIN SECTION */}
          <div className="action-plan-main-card">
            <div className="action-plan-card-title">Action plan</div>

            <div className="action-plan-rows-list">
              {Object.keys(QUESTIONS_BY_SECTION).map((sectionKey) => {
                const section = QUESTIONS_BY_SECTION[sectionKey];

                return section.items.map((item) => {
                  const uploaded = uploadedDocs[item.id];
                  const itemAnswers = sectionStates[sectionKey]?.[item.id]?.criteriaAnswers || {};
                  const totalCriteria = item.criteria.length;
                  let yesCount = 0;

                  item.criteria.forEach(c => {
                    if (itemAnswers[c.id] === 'Yes') {
                      yesCount += 1;
                    }
                  });

                  const badgeClass = yesCount === totalCriteria ? 'full' : yesCount > 0 ? 'partial' : 'none';

                  return (
                    <div key={item.id} className="action-plan-row">
                      {/* COMPONENT NAME BOX */}
                      <div className="component-title-box">
                        {item.id}: Component
                      </div>

                      {/* COMPLIANCE STATUS BOX */}
                      <div className="compliance-status-box">
                        <span>Compliant with {yesCount}/{totalCriteria}</span>
                        <span className={`compliance-badge-chip ${badgeClass}`}>
                          {yesCount === totalCriteria ? 'Fully Compliant' : yesCount > 0 ? 'Partially Compliant' : 'Non Compliant'}
                        </span>
                      </div>

                      {/* DOCUMENT FILE NAME / UPLOAD BOX */}
                      <div className="document-status-box">
                        {uploaded && (uploaded.fileName || uploaded.fileBase64) ? (
                          <div
                            className="doc-pill-chip uploaded"
                            onClick={() => setPreviewDoc({ item, doc: uploaded })}
                            style={{ cursor: 'pointer' }}
                            title="Click to view document"
                          >
                            <Paperclip size={13} style={{ color: '#16a34a' }} />
                            <span>{uploaded.fileName}</span>
                          </div>
                        ) : (
                          <div className="doc-pill-chip missing">
                            <Upload size={13} style={{ color: '#ef4444' }} />
                            <span>Please upload related document</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })}
            </div>
          </div>

          <footer className="footer-bar" style={{ borderRadius: '8px', marginTop: '16px' }}>
            <button className="secondary-btn" onClick={() => setCurrentStep('REVIEW_OBSERVATIONS')}>
              <ArrowLeft size={15} />
              Back to Review Observations
            </button>
            <button className="primary-btn" onClick={handleSave}>
              <Save size={15} />
              Save Action Plan
            </button>
          </footer>
        </main>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2500,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '440px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#dc2626' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Confirm Document Deletion</h3>
            </div>

            <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.5 }}>
              Are you sure you want to delete the attached document for <strong>{deleteConfirmId}</strong> ({uploadedDocs[deleteConfirmId]?.fileName})? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                className="secondary-btn"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
              <button
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                onClick={confirmDeleteDocument}
              >
                Delete Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '550px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--navy-banner)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} />
                Document Viewer: {previewDoc.item.id}
              </div>
              <button onClick={() => setPreviewDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div><strong>File Name:</strong> <span style={{ color: '#0284c7' }}>{previewDoc.doc.fileName}</span></div>
              <div><strong>Policy Component:</strong> {previewDoc.item.component}</div>
              <div><strong>Uploaded By & Date:</strong> {previewDoc.doc.uploadStatus}</div>
              <div><strong>Audit Status:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>{previewDoc.doc.status}</span></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button className="primary-btn" onClick={() => setPreviewDoc(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0b3b60' }}>
              <LogOut size={22} />
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Confirm Log Out</h3>
            </div>

            <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.5 }}>
              Are you sure you want to log out of <strong>AI POLICY REVIEW</strong>? Any progress made in your session will remain saved.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                className="secondary-btn"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
              >
                <LogOut size={14} />
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI PROCESSING LOADING OVERLAY */}
      {isProcessingAI && (
        <div className="ai-loading-overlay">
          <div className="ai-loading-card">
            <div className="ai-orbit-rig">
              <div className="ai-orbit-core">
                <Sparkles size={16} />
              </div>
              <div className="ai-orbit-dot ai-orbit-dot-1"></div>
              <div className="ai-orbit-dot ai-orbit-dot-2"></div>
              <div className="ai-orbit-dot ai-orbit-dot-3"></div>
              <div className="ai-orbit-dot-inner"></div>
            </div>

            <div className="ai-loading-title">
              AI is analyzing your documents
              <span className="ai-loading-dots">
                <span></span><span></span><span></span>
              </span>
            </div>

            <div className="ai-shimmer-bar">
              <div className="ai-shimmer-fill"></div>
            </div>

            <div className="ai-loading-subtitle">
              Verifying your answers against the uploaded policy documents.<br />
              This may take up to a minute — please wait.
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toastMessage && (
        <div className="save-toast">
          <CheckCircle2 size={16} />
          {toastMessage}
        </div>
      )}

      {/* PDF HIGHLIGHT VIEWER MODAL */}
      {pdfViewer && (
        <PdfHighlightViewer
          fileBase64={pdfViewer.fileBase64}
          fileName={pdfViewer.fileName}
          reference={pdfViewer.reference}
          onClose={() => setPdfViewer(null)}
        />
      )}
    </div>
  );
}
