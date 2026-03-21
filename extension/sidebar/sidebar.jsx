import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  FileText,
  AlertCircle,
  Stethoscope,
  RefreshCw,
  WifiOff,
  LogIn,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Globe,
  MessageCircle,
  Lightbulb,
  HeartPulse,
  Send,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
} from 'lucide-react';
import './sidebar.css';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'Spanish', label: 'Español' },
  { code: 'Chinese (Simplified)', label: '中文' },
  { code: 'Vietnamese', label: 'Tiếng Việt' },
  { code: 'Korean', label: '한국어' },
  { code: 'Tagalog', label: 'Tagalog' },
  { code: 'Russian', label: 'Русский' },
  { code: 'Arabic', label: 'العربية' },
  { code: 'French', label: 'Français' },
  { code: 'Portuguese', label: 'Português' },
  { code: 'Haitian Creole', label: 'Kreyòl Ayisyen' },
];

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Spinner({ text = 'Analyzing your document...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <WifiOff className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-700">Connection Error</p>
          <p className="text-sm text-gray-600 mt-1">{message}</p>
          <button type="button" onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      </div>
    </Card>
  );
}

function CollapsibleSection({
  icon: Icon, iconColor, title, badge, children, defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-4 text-left hover:bg-gray-50 transition-colors">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <h2 className="text-sm font-semibold text-gray-900 flex-1">{title}</h2>
        {badge && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{badge}</span>}
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100 pt-3">{children}</div>}
    </Card>
  );
}

// ── Summary with translation ────────────────────────────────────

function SummarySection({
  summary, pageTitle, language, onLanguageChange, onRefresh, loading,
}) {
  return (
    <CollapsibleSection icon={FileText} iconColor="text-blue-500" title="Document Summary" defaultOpen={false}>
      {pageTitle && (
        <div className="mb-3 rounded-md bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">Currently viewing</p>
          <p className="text-sm font-medium text-gray-700 truncate">{pageTitle}</p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <Globe className="h-3.5 w-3.5 text-gray-400" />
        <select value={language} onChange={(e) => onLanguageChange(e.target.value)}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300">
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        {loading && <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />}
      </div>

      <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>

      <div className="flex justify-end mt-3">
        <button type="button" onClick={onRefresh}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>
    </CollapsibleSection>
  );
}

// ── Insights ────────────────────────────────────────────────────

function InsightsSection({ insights }) {
  const items = insights || [];
  return (
    <CollapsibleSection icon={Lightbulb} iconColor="text-amber-500" title="Health Insights" badge={items.length ? `${items.length}` : null} defaultOpen={false}>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <span className="text-sm text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 italic">No insights available for this page.</p>
      )}
    </CollapsibleSection>
  );
}

// ── Aftercare ───────────────────────────────────────────────────

function AftercareSublist({
  label, items, icon: Icon, iconColor,
}) {
  if (!items || !items.length) return null;
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <Icon className={`h-3.5 w-3.5 ${iconColor} mt-0.5 shrink-0`} />
            <span className="text-sm text-gray-700">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MedTimeline({ schedule }) {
  if (!schedule || !schedule.length) return null;
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Daily Medication Schedule
      </p>
      <div className="relative pl-4 border-l-2 border-blue-200 space-y-4">
        {schedule.map((slot, i) => (
          <div key={i} className="relative">
            <div className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full bg-blue-500 border-2 border-white" />
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs font-bold text-blue-600">
                {slot.time}
              </span>
              <span className="text-xs font-semibold text-gray-800">
                {slot.label}
              </span>
            </div>
            <ul className="space-y-0.5">
              {(slot.meds || []).map((med, j) => (
                <li
                  key={j}
                  className="text-sm text-gray-600 flex items-start gap-1.5"
                >
                  <span className="text-blue-400 mt-1">•</span>
                  {med}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function AftercareSection({ aftercare }) {
  const ac = aftercare || {};
  const meds = ac.medication_schedule || [];
  const symptoms = ac.symptoms_to_monitor || [];
  const reminders = ac.daily_reminders || [];
  const hasContent = meds.length || symptoms.length || reminders.length;

  return (
    <CollapsibleSection
      icon={HeartPulse}
      iconColor="text-rose-500"
      title="Aftercare Instructions"
      defaultOpen={false}
    >
      {hasContent ? (
        <div>
          <MedTimeline schedule={meds} />
          <AftercareSublist
            label="Symptoms to Monitor"
            items={symptoms}
            icon={AlertCircle}
            iconColor="text-amber-400"
          />
          <AftercareSublist
            label="Daily Reminders"
            items={reminders}
            icon={CheckCircle2}
            iconColor="text-green-400"
          />
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">
          No aftercare instructions for this page.
        </p>
      )}
    </CollapsibleSection>
  );
}

// ── Issues / Questions ──────────────────────────────────────────

function IssuesSection({ issues }) {
  const items = issues || [];
  return (
    <CollapsibleSection icon={Stethoscope} iconColor="text-purple-500" title="Ask Your Doctor" badge={items.length ? `${items.length}` : null} defaultOpen={false}>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((issue, i) => (
            <li key={i} className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
              <span className="text-sm text-gray-700">{issue}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 italic">No questions identified for this page.</p>
      )}
    </CollapsibleSection>
  );
}

// ── Chatbot ─────────────────────────────────────────────────────

function ChatSection({ language }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || sending) return;

    const userMsg = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setSending(true);

    try {
      const reply = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'CHAT', messages: updated, language },
          (res) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!res || !res.ok) {
              reject(new Error(res?.error || 'Chat failed'));
              return;
            }
            resolve(res.reply);
          },
        );
      });
      setMessages([...updated, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages([...updated, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <CollapsibleSection icon={MessageCircle} iconColor="text-blue-500" title="Chat with DouglasAI" defaultOpen={false}>
      <div className="flex flex-col" style={{ maxHeight: '360px' }}>
        <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1" style={{ maxHeight: '280px' }}>
          {messages.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">
              Ask me anything about your health records, medications, or lab results.
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && <Bot className="h-4 w-4 text-blue-500 mt-1 shrink-0" />}
              <div className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
              {msg.role === 'user' && <User className="h-4 w-4 text-gray-400 mt-1 shrink-0" />}
            </div>
          ))}
          {sending && (
            <div className="flex gap-2">
              <Bot className="h-4 w-4 text-blue-500 mt-1 shrink-0" />
              <div className="bg-gray-100 rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your records..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
          />
          <button type="button" onClick={sendMessage} disabled={sending || !input.trim()}
            className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </CollapsibleSection>
  );
}

// ── Onboarding ──────────────────────────────────────────────────

function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState('consent');
  const [authError, setAuthError] = useState(null);

  function handleConsent() {
    setStep('signing-in');
    chrome.runtime.sendMessage({ type: 'START_AUTH' }, (res) => {
      if (!res || !res.ok) {
        setAuthError('Failed to start sign-in. Is the server running?');
        setStep('consent');
      }
    });
  }

  useEffect(() => {
    if (step !== 'signing-in') return undefined;
    const interval = setInterval(() => {
      chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (res) => {
        if (res && res.authenticated) {
          setStep('done');
          chrome.storage.local.set({ douglasai_onboarded: true });
          clearInterval(interval);
          setTimeout(() => onComplete(), 1000);
        }
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [step, onComplete]);

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className="h-5 w-5 text-blue-600" />
        <h1 className="text-base font-bold text-gray-900">DouglasAI</h1>
      </div>
      <hr className="border-gray-200 mb-4" />
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-green-600" />
          <h2 className="text-sm font-semibold text-gray-900">Before we get started</h2>
        </div>
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>
            DouglasAI helps you understand your medical documents by
            generating plain-language summaries and highlighting
            questions to discuss with your doctor.
          </p>
          <p className="font-medium text-gray-900">How your data is handled:</p>
          <ul className="space-y-2 ml-1">
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span><span>All personal health information (PHI) is <strong>stripped before</strong> it reaches any AI model.</span></li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span><span>De-identification happens locally on the server — your raw data never leaves your environment.</span></li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span><span>No data is stored permanently — everything is held in memory for your session only.</span></li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span><span>AI-generated summaries are <strong>not medical advice</strong>. Always consult your healthcare provider.</span></li>
          </ul>
        </div>
        {authError && (
          <div className="mt-4 rounded-md bg-red-50 px-3 py-2">
            <p className="text-xs text-red-700">{authError}</p>
          </div>
        )}
        {step === 'consent' && (
          <button type="button" onClick={handleConsent}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            <LogIn className="h-4 w-4" /> I agree — sign in with MyChart
          </button>
        )}
        {step === 'signing-in' && (
          <div className="mt-5 flex flex-col items-center gap-2 py-3">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-gray-200 border-t-blue-500" />
            <p className="text-xs text-gray-500">Complete sign-in in the new tab, then return here...</p>
          </div>
        )}
        {step === 'done' && (
          <div className="mt-5 flex items-center justify-center gap-2 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <p className="text-sm font-medium text-green-700">Connected! Loading your data...</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────

function App() {
  const [onboarded, setOnboarded] = useState(null);
  const [state, setState] = useState('loading');
  const [insight, setInsight] = useState(null);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('en');
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    chrome.storage.local.get('douglasai_onboarded', (result) => {
      if (result.douglasai_onboarded === true) {
        chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (res) => {
          if (res && res.authenticated) {
            setOnboarded(true);
          } else {
            chrome.storage.local.remove('douglasai_onboarded');
            setOnboarded(false);
          }
        });
      } else {
        setOnboarded(false);
      }
    });
  }, []);

  async function fetchInsight(lang) {
    setState('loading');
    setError(null);
    try {
      const response = await new Promise((resolve, reject) => {
        const msg = {
          type: 'GENERATE_INSIGHT',
          language: lang || language,
        };
        chrome.runtime.sendMessage(msg, (res) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!res || !res.ok) {
            reject(new Error(res?.error || 'Failed to generate insight'));
            return;
          }
          resolve(res.data);
        });
      });
      setInsight(response);
      setState('ready');

      // Schedule medication reminders from aftercare data
      const meds = response.aftercare?.medication_schedule;
      if (meds && meds.length) {
        chrome.runtime.sendMessage({
          type: 'SET_MED_REMINDERS',
          schedule: meds,
        });
      }
    } catch (err) {
      setError(err.message || 'Could not connect to the server.');
      setState('error');
    }
  }

  async function refreshSummary(lang) {
    setTranslating(true);
    try {
      const response = await new Promise((resolve, reject) => {
        const msg = {
          type: 'GENERATE_INSIGHT',
          language: lang || language,
        };
        chrome.runtime.sendMessage(msg, (res) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!res || !res.ok) {
            reject(new Error(res?.error || 'Failed to refresh'));
            return;
          }
          resolve(res.data);
        });
      });
      setInsight((prev) => ({
        ...prev,
        summary: response.summary,
        pageTitle: response.pageTitle,
      }));
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setTranslating(false);
    }
  }

  function handleLanguageChange(newLang) {
    setLanguage(newLang);
    refreshSummary(newLang);
  }

  function handleLogout() {
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
      chrome.storage.local.remove('douglasai_onboarded');
      setOnboarded(false);
      setInsight(null);
      setState('loading');
    });
  }

  useEffect(() => {
    if (onboarded !== true) return;
    chrome.runtime.sendMessage({ type: 'HEALTH_CHECK' }, (res) => {
      if (res && res.ok) {
        fetchInsight();
      } else {
        setError('Server is not running. Start it with: docker compose up');
        setState('error');
      }
    });
  }, [onboarded]);

  if (onboarded === null) return null;
  if (!onboarded) return <OnboardingScreen onComplete={() => setOnboarded(true)} />;

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className="h-5 w-5 text-blue-600" />
        <h1 className="text-base font-bold text-gray-900">DouglasAI</h1>
      </div>
      <hr className="border-gray-200 mb-4" />

      <div className="space-y-3">
        {state === 'loading' && <Spinner />}
        {state === 'error' && <ErrorState message={error} onRetry={() => fetchInsight()} />}
        {state === 'ready' && insight && (
          <>
            <SummarySection
              summary={insight.summary}
              pageTitle={insight.pageTitle}
              language={language}
              onLanguageChange={handleLanguageChange}
              onRefresh={() => refreshSummary()}
              loading={translating}
            />
            <InsightsSection insights={insight.insights} />
            <AftercareSection aftercare={insight.aftercare} />
            <IssuesSection issues={insight.issues} />
            <ChatSection language={language} />
          </>
        )}
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <p className="text-xs text-gray-400">AI-generated insights — always consult your doctor</p>
        <button type="button" onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors">
          <LogOut className="h-3 w-3" /> Sign out
        </button>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
