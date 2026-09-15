import { useEffect, useRef } from "react";
import { Terminal as XTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import {
  ArrowDownLeft,
  Check,
  CornerDownLeft,
  TerminalSquare,
} from "lucide-react";
import "@xterm/xterm/css/xterm.css";
import type { Entry } from "../lib/engine";
type Props = {
  entries: Entry[];
  command: string;
  prompt: string;
  value: string;
  onChange: (s: string) => void;
  onSubmit: () => void;
  busy: boolean;
  done: boolean;
  shadow: boolean;
  onReport: () => void;
};
export default function Terminal({
  entries,
  command,
  prompt,
  value,
  onChange,
  onSubmit,
  busy,
  done,
  shadow,
  onReport,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const terminal = useRef<XTerminal | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const wasBusy = useRef(false);
  useEffect(() => {
    if (!host.current) return;
    const term = new XTerminal({
      disableStdin: true,
      convertEol: true,
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
      fontSize: 12,
      lineHeight: 1.65,
      cursorBlink: false,
      scrollback: 300,
      theme: {
        background: "#151b25",
        foreground: "#b2bccc",
        selectionBackground: "#344055",
      },
      allowProposedApi: false,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host.current);
    if (term.textarea) term.textarea.tabIndex = -1;
    terminal.current = term;
    const observer = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        /* Hidden panel. */
      }
    });
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      term.dispose();
      terminal.current = null;
    };
  }, []);
  useEffect(() => {
    const term = terminal.current;
    if (!term) return;
    term.reset();
    for (const e of entries) {
      const color = e.command
        ? "\x1b[97m"
        : e.tone === "danger"
          ? "\x1b[38;2;248;143;128m"
          : e.tone === "success"
            ? "\x1b[38;2;135;208;174m"
            : "\x1b[38;2;169;181;199m";
      term.writeln(color + e.text + "\x1b[0m");
    }
    term.scrollToBottom();
  }, [entries]);
  useEffect(() => {
    if (wasBusy.current && !busy) input.current?.focus();
    wasBusy.current = busy;
  }, [busy]);
  const password = prompt === "password:";
  const mismatch = !command.startsWith(value);
  const ghost = shadow ? (password ? "•".repeat(command.length) : command) : "";
  return (
    <section className="terminal-panel" aria-label="가상 리눅스 터미널">
      <div className="terminal-bar">
        <div className="window-dots">
          <i />
          <i />
          <i />
        </div>
        <span>
          <TerminalSquare size={14} />{" "}
          {prompt.startsWith("root") ? "root@legacy" : "boundary — bash"}
        </span>
        <span className="terminal-badge">LOCAL</span>
      </div>
      <div className="terminal-meta">
        <span>
          Ubuntu 24.04 LTS <span className="dim">/ simulated</span>
        </span>
        <span className="online-dot">연결됨</span>
      </div>
      <div className="terminal-output" ref={host} aria-hidden="true" />
      <div className="sr-only" role="log" aria-live="polite">
        {entries.slice(-4).map((e, i) => (
          <p key={i}>{e.text}</p>
        ))}
      </div>
      {done ? (
        <div className="terminal-complete">
          <Check size={18} />
          <span>모든 접근 검증을 완료했습니다.</span>
          <button onClick={onReport}>리포트 보기 ↗</button>
        </div>
      ) : (
        <form
          className={`terminal-input-row ${mismatch ? "has-error" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          onClick={() => input.current?.focus()}
        >
          <label htmlFor="command-input">{prompt}</label>
          <div className="shadow-input">
            <div aria-hidden="true" className="ghost-command">
              {ghost}
            </div>
            <input
              ref={input}
              id="command-input"
              aria-label="터미널 명령어"
              type={password ? "password" : "text"}
              value={value}
              maxLength={256}
              onChange={(e) => onChange(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              disabled={busy}
              placeholder={shadow ? "" : "명령어 입력"}
            />
            <span
              className="input-caret"
              aria-hidden="true"
              style={{ left: `${value.length}ch` }}
            />
          </div>
          <button
            disabled={busy || !value.trim()}
            aria-label="명령어 실행"
            title="명령어 실행"
          >
            <CornerDownLeft size={16} />
          </button>
        </form>
      )}
      <div className="terminal-footer">
        <span>
          <span className={`status-light ${mismatch ? "error" : ""}`} />
          {busy
            ? "응답 확인 중…"
            : done
              ? "검증 완료"
              : mismatch
                ? "철자와 공백을 확인하세요"
                : "가이드를 따라 입력하고 Enter"}
        </span>
        <span>
          <ArrowDownLeft size={12} /> {done ? "12 / 12" : "SHADOW TYPING"}
        </span>
      </div>
    </section>
  );
}
