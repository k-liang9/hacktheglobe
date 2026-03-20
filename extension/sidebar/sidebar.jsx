import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  FileText,
  AlertCircle,
  Stethoscope,
  RefreshCw,
  WifiOff,
  LogIn,
} from 'lucide-react';
import './sidebar.css';

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
      <p className="text-sm text-gray-500">Analyzing your document...</p>
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
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      </div>
    </Card>
  );
}

function SummaryCard({ summary, pageTitle }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-blue-500" />
        <h2 className="text-sm font-semibold text-gray-900">Document Summary</h2>
      </div>
      {pageTitle && (
        <div className="mb-3 rounded-md bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">Currently viewing</p>
          <p className="text-sm font-medium text-gray-700 truncate">{pageTitle}</p>
        </div>
      )}
      <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
    </Card>
  );
}

function IssuesCard({ issues }) {
  if (!issues || !issues.length) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Stethoscope className="h-4 w-4 text-amber-600" />
        <h2 className="text-sm font-semibold text-gray-900">
          Bring Up With Your Doctor
        </h2>
      </div>
      <ul className="space-y-2">
        {issues.map((issue, i) => (
          <li key={i} className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <span className="text-sm text-gray-700">{issue}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AuthPrompt({ onAuth }) {
  return (
    <Card className="p-4">
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <LogIn className="h-8 w-8 text-blue-500" />
        <div>
          <p className="text-sm font-medium text-gray-900">Connect to MyChart</p>
          <p className="text-xs text-gray-500 mt-1">
            Sign in to access your medical records for personalized insights.
          </p>
        </div>
        <button
          type="button"
          onClick={onAuth}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <LogIn className="h-4 w-4" />
          Sign in with Epic
        </button>
      </div>
    </Card>
  );
}

function App() {
  const [state, setState] = useState('loading'); // loading | ready | error | auth
  const [insight, setInsight] = useState(null);
  const [error, setError] = useState(null);

  async function fetchInsight() {
    setState('loading');
    setError(null);

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'GENERATE_INSIGHT' }, (res) => {
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
    } catch (err) {
      setError(err.message || 'Could not connect to the server. Make sure it is running.');
      setState('error');
    }
  }

  function handleAuth() {
    chrome.runtime.sendMessage({ type: 'START_AUTH' });
  }

  useEffect(() => {
    // Check server health before fetching insight
    chrome.runtime.sendMessage({ type: 'HEALTH_CHECK' }, (res) => {
      if (res && res.ok) {
        fetchInsight();
      } else {
        setError('Server is not running. Start it with: npm run dev:server');
        setState('error');
      }
    });
  }, []);

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className="h-5 w-5 text-blue-600" />
        <h1 className="text-base font-bold text-gray-900">MyChart Copilot</h1>
      </div>

      <hr className="border-gray-200 mb-4" />

      <div className="space-y-4">
        {state === 'loading' && <Spinner />}
        {state === 'error' && (
          <ErrorState message={error} onRetry={fetchInsight} />
        )}
        {state === 'auth' && <AuthPrompt onAuth={handleAuth} />}
        {state === 'ready' && insight && (
          <>
            <SummaryCard
              summary={insight.summary}
              pageTitle={insight.pageTitle}
            />
            <IssuesCard issues={insight.issues} />
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={fetchInsight}
                className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </button>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-400">
          AI-generated insights — always consult your doctor
        </p>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
