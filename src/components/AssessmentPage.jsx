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
  ChevronDown
} from 'lucide-react';

import { QUESTIONS_BY_SECTION } from '../data/questionsData';

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
          console.error('n8n response parsing failed. Raw response:', resText);
        }

        console.log('>>> n8n Raw Webhook Response:', data);

        if (data.success && data.observations) {
          // Normalize observations into { P1: { p1_c1: '...', p1_c2: '...' }, ... }
          const rawObs = data.observations;
          const normalized = {};
          const payloadCompIds = (components || []).map(c => c.componentId || c.id || 'P1');

          Object.keys(rawObs).forEach((k, idx) => {
            const val = rawObs[k];
            const targetCompId = payloadCompIds[idx] || (k.includes('_') ? k.split('_')[0].toUpperCase() : 'P1');

            if (typeof val === 'object' && val !== null) {
              normalized[targetCompId] = val;
              normalized[k] = val;
            } else if (typeof val === 'string') {
              if (!normalized[targetCompId]) normalized[targetCompId] = {};
              normalized[targetCompId][k] = val;
            }
          });

          // Fallback: if flat keys like p1_c1 exist at root, group under component P1
          Object.keys(rawObs).forEach(k => {
            if (typeof rawObs[k] === 'string' && k.includes('_')) {
              const compId = k.split('_')[0].toUpperCase();
              if (!normalized[compId]) normalized[compId] = {};
              normalized[compId][k] = rawObs[k];
            }
          });

          console.log('>>> Normalized AI Observations:', normalized);
          setAiObservations(normalized);
          setToastMessage(`AI verified ${data.processedCount || components.length} document(s) successfully!`);
        } else {
          console.warn('n8n returned empty observations:', data);
          setToastMessage('n8n webhook responded but observations object was empty. Check n8n execution.');
        }
      } else {
        console.error('n8n webhook error:', response.status, resText);
        setToastMessage(`n8n webhook error (${response.status}). Check n8n workflow execution logs.`);
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
          <div className="tabs-container">
            <div className="tabs-wrapper">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  <CheckCircle2 className="tab-check-icon" />
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <main className="main-layout-single">
            <div className="global-assign-banner">
              <div className="global-assign-info">
                <div className="global-title-row">
                  <span className="tab-title-text">{activeTab}</span>
                </div>
                <div className="global-label">Assign all {activeTab} questions to:</div>
                <div className="mention-subtext">
                  This will not be overridden by assigning individual components to additional individuals.
                </div>
              </div>

              <div className="global-assign-input-box">
                <input
                  type="text"
                  className="card-input"
                  placeholder="Mention someone..."
                  value={globalSearch}
                  onFocus={() => setShowGlobalDropdown(true)}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    setGlobalAssignee(e.target.value);
                  }}
                  onBlur={() => setTimeout(() => setShowGlobalDropdown(false), 200)}
                />

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

            <div className="standard-banner">
              <div className="standard-banner-title">
                {currentSectionData.standardTitle}
              </div>
            </div>

            {currentSectionData.items.map((item) => {
              const itemState = sectionStates[activeTab]?.[item.id] || {
                assignee: '',
                comments: '',
                showRationale: false,
                criteriaAnswers: {}
              };

              const currentSearch = searchStates[item.id]?.search ?? itemState.assignee;
              const showItemDropdown = searchStates[item.id]?.showDropdown ?? false;

              return (
                <div key={item.id} className="policy-card">
                  <div className="policy-header">
                    <div className="policy-title-container">
                      <div className="policy-id">
                        <span>{item.id}</span>
                        <span className={`policy-badge ${item.criticalLevel === 'Critical' ? 'critical' : 'non-critical'}`}>
                          {item.criticalLevel}
                        </span>
                      </div>
                      <p className="policy-description">Component: {item.component}</p>
                    </div>
                  </div>

                  <div className="criteria-container">
                    <div className="criteria-section-title">Criteria: The Organization:</div>

                    {item.criteria.map((c) => {
                      const selectedVal = itemState.criteriaAnswers[c.id] || 'Yes';
                      return (
                        <div key={c.id} className="criteria-row">
                          <div className="criteria-text">{c.label}</div>
                          <div className="radio-group">
                            <label className={`radio-label ${selectedVal === 'Yes' ? 'selected' : ''}`}>
                              <input
                                type="radio"
                                name={`radio_${item.id}_${c.id}`}
                                className="radio-input"
                                checked={selectedVal === 'Yes'}
                                onChange={() => handleRadioChange(item.id, c.id, 'Yes')}
                              />
                              Yes
                            </label>
                            <label className={`radio-label ${selectedVal === 'No' ? 'selected' : ''}`}>
                              <input
                                type="radio"
                                name={`radio_${item.id}_${c.id}`}
                                className="radio-input"
                                checked={selectedVal === 'No'}
                                onChange={() => handleRadioChange(item.id, c.id, 'No')}
                              />
                              No
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="card-details-grid">
                    <div className="detail-column">
                      <div className="detail-label">Assign to</div>
                      <div className="mention-input-container">
                        <input
                          type="text"
                          className="card-input"
                          placeholder={globalAssignee ? `Mention someone (Global: ${globalAssignee})` : 'Mention someone'}
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
                        className="rationale-toggle-btn"
                        onClick={() => toggleRationale(item.id)}
                      >
                        Rationale
                      </button>
                    </div>

                    <div className="detail-column">
                      <div className="detail-label">Comments</div>
                      <textarea
                        className="card-input"
                        placeholder="Provide any details (optional)"
                        value={itemState.comments}
                        onChange={(e) => handleCommentChange(item.id, e.target.value)}
                      />
                    </div>
                  </div>

                  {itemState.showRationale && (
                    <div className="rationale-drawer">
                      <div className="rationale-drawer-title">Rationale Details</div>
                      <p>{item.rationaleText}</p>
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
      {currentStep === 'UPLOAD_DOCUMENTS' && (
        <main className="doc-review-container">
          <div className="doc-controls-bar">
            <div className="doc-filters-group">
              <div className="search-box-input">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search documents"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="filter-select"
                value={selectedOperation}
                onChange={(e) => setSelectedOperation(e.target.value)}
              >
                <option value="All">Operations: All Sections</option>
                <option value="Policies">Policies</option>
                <option value="Training">Training</option>
                <option value="Internal Feedback Systems">Internal Feedback Systems</option>
                <option value="Administrative Practices">Administrative Practices</option>
              </select>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Designation</th>
                  <th style={{ minWidth: '320px' }}>Standard / Component / Criteria</th>
                  <th style={{ width: '80px' }}>Status</th>
                  <th style={{ width: '220px' }}>Document</th>
                  <th style={{ width: '180px' }}>Upload Status</th>
                  <th style={{ width: '140px' }}>Uploaded By</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(QUESTIONS_BY_SECTION)
                  .filter(sectionKey => selectedOperation === 'All' || selectedOperation === sectionKey)
                  .map((sectionKey) => {
                    const section = QUESTIONS_BY_SECTION[sectionKey];

                    return (
                      <React.Fragment key={sectionKey}>
                        <tr className="table-section-row">
                          <td colSpan="6">{sectionKey}</td>
                        </tr>

                        {section.items
                          .filter(item =>
                            item.component.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                            item.id.toLowerCase().includes(docSearchQuery.toLowerCase())
                          )
                          .map((item) => {
                            const uploaded = uploadedDocs[item.id];

                            return (
                              <tr key={item.id}>
                                <td>
                                  <span className={`policy-badge ${item.criticalLevel === 'Critical' ? 'critical' : 'non-critical'}`}>
                                    {item.criticalLevel}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 800, color: 'var(--navy-banner)', marginBottom: '4px' }}>
                                    {item.id}
                                  </div>
                                  <div style={{ fontSize: '12.5px', lineHeight: 1.4 }}>
                                    {item.component}
                                  </div>
                                </td>
                                <td style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
                                  {uploaded ? uploaded.status : 'N/A'}
                                </td>
                                <td>
                                  {uploaded ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span
                                        className="doc-file-link"
                                        onClick={() => setPreviewDoc({ item, doc: uploaded })}
                                      >
                                        <Paperclip size={13} />
                                        {uploaded.fileName}
                                      </span>
                                      <button
                                        title="Delete document"
                                        onClick={() => setDeleteConfirmId(item.id)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', padding: '2px' }}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="upload-trigger-btn">
                                      <Upload size={13} />
                                      Upload Document
                                      <input
                                        type="file"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleFileUpload(item.id, e)}
                                      />
                                    </label>
                                  )}
                                </td>
                                <td>
                                  <span className="upload-status-text">
                                    {uploaded ? uploaded.uploadStatus : 'No document attached'}
                                  </span>
                                </td>
                                <td style={{ fontSize: '12px', color: '#334155' }}>
                                  {uploaded ? (uploaded.uploadedBy || uploaded.reviewedBy || user.username) : '-'}
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

          <footer className="footer-bar" style={{ borderRadius: '8px', marginTop: '16px' }}>
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
      )}

      {/* STEP 3: REVIEW OBSERVATIONS VIEW */}
      {currentStep === 'REVIEW_OBSERVATIONS' && (
        <main className="review-obs-container">

          <div className="obs-list-container">
            {Object.keys(QUESTIONS_BY_SECTION).map((sectionKey) => {
              const section = QUESTIONS_BY_SECTION[sectionKey];

              return section.items.map((item) => {
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
                // Each entry: { key, question, summary, observation, aiFinding, score, reference }
                const buildQuestionEntries = (compObs) => {
                  if (!compObs || typeof compObs !== 'object') return [];
                  return Object.entries(compObs)
                    .filter(([, val]) => val && typeof val === 'object')
                    .map(([key, val]) => ({
                      key,
                      question:    val.question    || '',
                      summary:     val.summary     || '',
                      observation: val.observation || val.text || '',
                      aiFinding:   val.AI_finding  || val.ai_finding || val.finding || '',
                      score:       val.score       || '',
                      reference:   val.reference   || val.citation   || val.ref || ''
                    }))
                    .filter(e => e.observation || e.summary || e.reference);
                };

                const questionEntries = buildQuestionEntries(componentObs);

                // ── Badge & Ref helpers ──────────────────────────────────────
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
                  const r = String(ref).trim().toLowerCase();
                  return r.includes('no matching') || r.includes('not found') || r.includes('no line') || r === 'none' || r === 'n/a';
                };



                return (
                  <div key={item.id} className="obs-component-block">

                    {/* ── COMPONENT HEADER ── */}
                    <div className="obs-comp-header">
                      <div className="obs-comp-icon-box">
                        <ShieldCheck size={22} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="obs-comp-title">{item.id}: Component</div>
                        <div className="obs-comp-subtitle">{item.component}</div>
                      </div>

                      {/* Document badge + Delete */}
                      {uploaded ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto', flexShrink: 0 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '5px 12px', borderRadius: '20px',
                            background: '#eff6ff', border: '1px solid #bfdbfe',
                            color: '#2563eb', fontSize: '12px', fontWeight: 600
                          }}>
                            <Paperclip size={12} />
                            {uploaded.fileName}
                          </span>
                          <button
                            onClick={() => setDeleteConfirmId(item.id)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '5px 12px', borderRadius: '20px',
                              background: '#fff1f2', border: '1px solid #fecdd3',
                              color: '#e11d48', fontSize: '12px', fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic', marginLeft: 'auto', flexShrink: 0 }}>
                          No document uploaded
                        </span>
                      )}
                    </div>

                    {/* ── TWO-COLUMN BODY ── */}
                    <div className="obs-content-grid">

                      {/* LEFT: Questions / Observations */}
                      <div className="obs-main-col">
                        {!uploaded ? (
                          <div className="obs-no-doc">
                            <div className="obs-no-doc-icon"><FileText size={22} /></div>
                            <div style={{ fontWeight: 700, color: '#6366f1', fontSize: '13px' }}>No document uploaded</div>
                            <div style={{ fontSize: '12px' }}>Upload a policy document to get AI-powered observations</div>
                          </div>
                        ) : questionEntries.length === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
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
                            const agree = isAgreeFinding(entry.aiFinding);
                            const hasFinding = Boolean(entry.aiFinding);
                            const hasScore = Boolean(entry.score);
                            const hasRef = Boolean(entry.reference);

                            const scoreNum = (() => {
                              if (!entry.score) return 0;
                              const n = parseInt(String(entry.score).replace('%', '').trim(), 10);
                              return isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
                            })();

                            const matchedCriteria = item.criteria[qIdx] || item.criteria.find(c => c.id === entry.key) || null;
                            const userAnswer = matchedCriteria
                              ? (sectionStates[sectionKey]?.[item.id]?.criteriaAnswers?.[matchedCriteria.id] || 'Yes')
                              : 'Yes';
                            const userAnswerYes = userAnswer === 'Yes';

                            const scoreColor = scoreNum >= 75 ? '#16a34a' : scoreNum >= 50 ? '#d97706' : '#dc2626';
                            const scoreGradient = scoreNum >= 75
                              ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                              : scoreNum >= 50
                              ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                              : 'linear-gradient(90deg, #f87171, #ef4444)';

                            return (
                              <div key={entry.key} className="obs-question-card">

                                {/* Row 1: Number + Title + Badges */}
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                  <div className="obs-q-num">{String(qIdx + 1).padStart(2, '0')}</div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', lineHeight: '1.45' }}>
                                      {entry.question || `Criteria ${entry.key.toUpperCase()}`}
                                    </div>
                                    {entry.summary && (
                                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
                                        {entry.summary}
                                      </div>
                                    )}
                                  </div>
                                  {/* Top-right badges */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                    <span className={`obs-pill obs-pill-user`}>
                                      User: <strong>{userAnswer}</strong>
                                    </span>
                                    {hasFinding && (
                                      <span className={`obs-pill ${agree ? 'obs-pill-agree' : 'obs-pill-missing'}`}>
                                        AI: <strong>{entry.aiFinding}</strong>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Row 2: Action buttons */}
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                                  {entry.observation && (
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

                                {/* Expandable Observation panel */}
                                {isExpanded && entry.observation && (
                                  <div className="obs-detail-panel">
                                    <div className="obs-detail-panel-heading">
                                      <FileText size={14} />
                                      Observation
                                    </div>
                                    <div className="obs-detail-panel-body">{entry.observation}</div>
                                  </div>
                                )}

                                {/* Expandable Reference panel */}
                                {isRefExpanded && hasRef && (
                                  isNoMatchingRef(entry.reference) ? (
                                    <div className="obs-ref-no-match">No matching line reference found in uploaded document.</div>
                                  ) : (
                                    <div className="obs-ref-panel">
                                      <div className="obs-ref-panel-heading">
                                        <Quote size={14} />
                                        Document Reference &amp; Citation
                                      </div>
                                      <div style={{ fontSize: '12.5px', lineHeight: '1.65', color: '#1e293b', whiteSpace: 'pre-line' }}>
                                        {entry.reference}
                                      </div>
                                    </div>
                                  )
                                )}

                                {/* AI Confidence score */}
                                {hasScore && (
                                  <div className="obs-confidence-row">
                                    <span className="obs-confidence-label">AI Confidence</span>
                                    <div className="obs-confidence-track">
                                      <div
                                        className="obs-confidence-fill"
                                        style={{ width: `${scoreNum}%`, background: scoreGradient }}
                                      />
                                    </div>
                                    <span className="obs-confidence-pct" style={{ color: scoreColor }}>
                                      {fmtScore(entry.score)}
                                    </span>
                                  </div>
                                )}

                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* RIGHT: Sidebar */}
                      <div className="obs-sidebar-col">

                        {/* Review Comments card */}
                        <div className="obs-sidebar-card">
                          <div className="obs-sidebar-card-heading">
                            <MessageSquare size={15} style={{ color: '#2563eb' }} />
                            Review Comments
                          </div>
                          <textarea
                            className="review-comments-input"
                            value={commentText}
                            placeholder="Add your review observations or notes here..."
                            onChange={(e) => {
                              const val = e.target.value;
                              setReviewComments(prev => ({ ...prev, [item.id]: val }));
                            }}
                          />
                          {commentText && (
                            <div style={{ marginTop: '8px', textAlign: 'right' }}>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>{commentText.length} chars</span>
                            </div>
                          )}
                        </div>


                      </div>
                    </div>

                  </div>
                );
              });
            })}


          </div>

          {/* FOOTER BAR WITH GENERATE ACTION PLAN BUTTON */}
          <footer className="footer-bar" style={{ borderRadius: '8px', marginTop: '16px' }}>
            <button className="secondary-btn" onClick={() => setCurrentStep('UPLOAD_DOCUMENTS')}>
              <ArrowLeft size={15} />
              Back to Upload Documents
            </button>
            <button className="primary-btn" onClick={handleSave}>
              <Save size={15} />
              Save Review Observations
            </button>
            <button className="submit-btn" onClick={() => setCurrentStep('ACTION_PLAN')}>
              Generate Action Plan
              <ChevronRight size={15} />
            </button>
          </footer>
        </main>
      )}

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
                <div className="overall-score-value-big">{overallPercentage}%</div>
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
            <div className="ai-spinner"></div>
            <div className="ai-loading-title">AI is analyzing your documents</div>
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
    </div>
  );
}
