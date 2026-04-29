import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type CheckResult,
  type CheckStatus,
  type HealthReport,
  STATUS_ICON,
  runHealthChecks,
} from './healthCheckUtils';

/* ── Status badge colour ─────────────────────────────────────── */

const STATUS_CLASS: Record<CheckStatus, string> = {
  pass: 'hc-pass',
  fail: 'hc-fail',
  warn: 'hc-warn',
  running: 'hc-running',
  idle: 'hc-idle',
};

/* ── Component ───────────────────────────────────────────────── */

export default function HealthCheck() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [report, setReport] = useState<HealthReport | null>(null);
  const [running, setRunning] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setResults([]);
    setReport(null);

    try {
      const r = await runHealthChecks((partial) => {
        if (mountedRef.current) setResults(partial);
      });
      if (mountedRef.current) {
        setResults(r.results);
        setReport(r);
      }
    } finally {
      if (mountedRef.current) setRunning(false);
    }
  }, [running]);

  return (
    <div className="hc-container">
      {/* Header row */}
      <div className="hc-header">
        <span className="hc-title">System Health</span>
        <button
          className="hc-run-btn"
          onClick={run}
          disabled={running}
          title="Run health checks"
        >
          {running ? 'Running…' : 'Run Checks'}
        </button>
      </div>

      {/* Results list */}
      {results.length > 0 && (
        <ul className="hc-list">
          {results.map((r) => (
            <li key={r.id} className={`hc-item ${STATUS_CLASS[r.status]}`}>
              <span className="hc-icon">{STATUS_ICON[r.status]}</span>
              <span className="hc-label">{r.label}</span>
              <span className="hc-detail">{r.detail}</span>
              {r.durationMs > 0 && (
                <span className="hc-ms">{r.durationMs}ms</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Overall status */}
      {report && (
        <div className={`hc-overall ${STATUS_CLASS[report.overallStatus]}`}>
          <span className="hc-icon">{STATUS_ICON[report.overallStatus]}</span>
          <span>
            Overall: <strong>{report.overallStatus.toUpperCase()}</strong>
          </span>
          <span className="hc-timestamp">
            {new Date(report.ranAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Empty state */}
      {!running && results.length === 0 && (
        <p className="hc-empty">
          Click <strong>Run Checks</strong> to verify connectivity.
        </p>
      )}
    </div>
  );
}
