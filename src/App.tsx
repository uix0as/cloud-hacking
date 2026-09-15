import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Command,
  ExternalLink,
  FileCheck2,
  FlaskConical,
  Globe2,
  Info,
  Layers3,
  PanelLeftClose,
  RotateCcw,
  Settings2,
  Shield,
  ShieldCheck,
  TerminalSquare,
  X,
} from "lucide-react";
import Terminal from "./components/Terminal";
import InfraMap from "./components/InfraMap";
import Modal from "./components/Modal";
import {
  initialState,
  persist,
  restore,
  scenario,
  serverMode,
  serverState,
  submit,
  type State,
} from "./lib/engine";
const concepts: Record<
  string,
  { title: string; analogy: string; body: string }
> = {
  S3: {
    title: "S3 · 인터넷에 있는 파일 창고",
    analogy: "버킷은 보관함, 객체는 파일.",
    body: "S3는 파일을 보관하는 클라우드 서비스입니다. 창고가 튼튼해도 열쇠를 누구에게 줄지는 직접 정해야 합니다. 이 실습은 가상 버킷만 만들며 저장 비용이 없습니다.",
  },
  IAM: {
    title: "IAM · 누가 무엇을 할 수 있는지",
    analogy: "직원마다 다른 출입증을 나눠 주는 관리소.",
    body: "IAM은 사용자와 역할의 권한을 관리합니다. 파일을 읽을 사람과 설정을 바꿀 사람을 구분하고, 필요한 작업만 허용하는 것이 최소 권한 원칙입니다.",
  },
  MFA: {
    title: "MFA · 한 번 더 본인 확인",
    analogy: "비밀번호 열쇠에, 본인만 가진 확인 수단을 더해요.",
    body: "MFA는 다중 인증입니다. 비밀번호가 유출돼도 별도의 인증 수단을 요구하면 위험을 줄일 수 있습니다. 이 시나리오는 MFA로 인증된 세션을 요구하는 정책까지 설정합니다. MFA를 켜는 것만으로 모든 API 접근이 자동 차단되는 것은 아닙니다.",
  },
  EC2: {
    title: "EC2 · 클라우드에서 빌리는 컴퓨터",
    analogy: "내 책상 대신 데이터센터에 놓인 컴퓨터.",
    body: "EC2는 프로그램을 실행할 수 있는 가상 서버입니다. 운영체제 업데이트와 접근 설정은 여전히 사용자의 책임입니다. 맵의 EC2는 구조를 설명하는 참고 노드이며 이 실습에서 실제로 생성하지 않습니다.",
  },
  SSH: {
    title: "SSH · 다른 컴퓨터에 접속하는 통로",
    analogy: "원격 컴퓨터의 키보드를 잠시 빌리는 것.",
    body: "SSH는 암호화된 원격 접속 방식입니다. 연결을 암호화해도 유출된 계정으로 로그인하는 문제까지 해결하지는 못합니다. 이 실습의 .invalid 주소는 실제 서버에 연결되지 않습니다.",
  },
  ROOT: {
    title: "root · 시스템의 관리자",
    analogy: "건물의 모든 문을 열 수 있는 마스터키.",
    body: "관리자는 시스템 전체에 큰 영향을 줄 수 있습니다. 평소에는 일반 계정을 쓰고 필요한 작업에만 권한을 높이는 방식이 안전합니다. 온프레미스에서도 MFA와 권한 분리를 적용할 수 있습니다.",
  },
  DATA: {
    title: "고객 데이터 · 보호해야 할 자산",
    analogy: "기술의 중심에는 결국 사람의 정보가 있어요.",
    body: "이 시나리오에는 실제 개인정보가 없습니다. 파일 이름만 있는 합성 자산으로, 관리자 권한이 과도하면 사고의 범위가 얼마나 커지는지 보여 줍니다.",
  },
  SERVER: {
    title: "업무 서버 · 서비스가 동작하는 곳",
    analogy: "회사의 일상 업무를 처리하는 작업실.",
    body: "서버 한 대의 관리자 계정이 다른 데이터까지 모두 접근할 수 있다면 사고 범위가 커집니다. 자산마다 접근 권한을 나누고 인증을 강화해야 합니다.",
  },
  BACKUP: {
    title: "백업 · 별도로 보관하는 복사본",
    analogy: "원본에 문제가 생겼을 때 꺼내 쓰는 예비 사본.",
    body: "백업도 권한을 분리해야 합니다. 원본과 백업에 같은 관리자 계정으로 접근할 수 있다면, 계정 유출이 두 곳에 모두 영향을 줍니다.",
  },
};
export default function App() {
  const [state, setState] = useState<State>(() =>
    serverMode ? initialState() : restore(),
  );
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(serverMode);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [view, setView] = useState("lab");
  const [shadow, setShadow] = useState(true);
  const [motion, setMotion] = useState(true);
  const [nav, setNav] = useState(false);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(!serverMode);
  const pending = useRef(false);
  const done = state.step === scenario.steps.length;
  const stage = done ? 2 : scenario.steps[state.step].stage;
  const current = scenario.steps[Math.min(state.step, 11)];
  const chapter = scenario.stages[stage];
  const stageProgress = Math.min(4, state.step - stage * 4);
  const progress = Math.round((state.step / 12) * 100);
  useEffect(() => {
    if (serverMode)
      serverState()
        .then((s) => {
          setState(s);
          setReady(true);
        })
        .catch((e) => setError(e.message))
        .finally(() => setBusy(false));
  }, []);
  useEffect(() => {
    if (!serverMode) persist(state);
  }, [state]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(id);
  }, [notice]);
  async function run() {
    if (pending.current || busy || done || !ready) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await submit(state, value);
      setState(result.state);
      setValue("");
      if (result.message) setError(result.message);
      if (result.accepted && [4, 8].includes(result.state.step))
        setNotice(
          result.state.step === 4
            ? "사고 확인 완료. 이제 데이터를 옮기고 보호할 차례입니다."
            : "보호 설정 완료. 이제 접근을 검증합니다.",
        );
      if (result.accepted && result.state.step === 12)
        setNotice("접근 검증을 완료했습니다. 결과 리포트를 확인하세요.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function reset() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      setState(serverMode ? await serverState(true) : initialState());
      setReady(true);
      setValue("");
      setError("");
      setModal(null);
      setView("lab");
      setNotice("새 시뮬레이션을 시작합니다.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function download() {
    const report = `BOUNDARY / Cloud Security Report\n\n진행: ${state.step}/12 (${progress}%)\n\n핵심: 클라우드 보안은 서비스 이전만으로 완성되지 않습니다.\n최소 권한, 다중 인증 조건, 공개 접근 차단을 함께 설정해야 합니다.\n서버 비밀번호는 클라우드 인증 정보와 다릅니다.\n온프레미스에서도 같은 보호 원칙을 적용할 수 있습니다.\n\n이벤트 기록\n${state.events.map((e) => `${e.time}  ${e.text}`).join("\n")}\n\n모든 결과는 가상 환경의 시뮬레이션입니다.\n`;
    const url = URL.createObjectURL(
      new Blob([report], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "boundary-report.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const selectView = (next: string) => {
    setView(next);
    setNav(false);
  };
  return (
    <div
      className={`app ${motion ? "" : "reduce-motion"} ${nav ? "nav-open" : ""}`}
    >
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            selectView("lab");
          }}
        >
          <span className="brand-symbol">
            b<span />
          </span>
          <span>
            boundary<span className="brand-period">.</span>
          </span>
        </a>
        <div className="workspace-selector">
          <span className="workspace-icon">
            <Layers3 size={17} />
          </span>
          <div>
            <strong>Security workspace</strong>
            <small>Personal workspace</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="워크스페이스">
          <button
            className={view === "lab" ? "selected" : ""}
            onClick={() => selectView("lab")}
          >
            <FlaskConical size={18} />
            시뮬레이션<span className="nav-count">01</span>
          </button>
          <button
            className={view === "events" ? "selected" : ""}
            onClick={() => selectView("events")}
          >
            <Activity size={18} />
            활동 기록{state.events.length > 0 && <span className="small-dot" />}
          </button>
          <button onClick={() => setModal("glossary")}>
            <BookOpen size={18} />
            개념 라이브러리
            <ExternalLink size={13} className="nav-end" />
          </button>
          <button
            className={view === "report" ? "selected" : ""}
            onClick={() => selectView("report")}
          >
            <FileCheck2 size={18} />
            결과 리포트
          </button>
        </nav>
        <div className="sidebar-scenario">
          <div className="nav-caption">CURRENT SCENARIO</div>
          <div className="scenario-side-title">
            <span className="small-dot orange" />
            The misplaced key
          </div>
          <p>하나의 열쇠가 유출된 밤</p>
          <div className="mini-progress">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-text">
            <span>진행률</span>
            <strong>{progress}%</strong>
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-shield">
              <ShieldCheck size={18} />
            </span>
            <strong>안전하게, 로컬에서</strong>
            <p>
              클라우드 연결 없이.
              <br />
              계정도, 비용도 필요 없이.
            </p>
            <span>
              <i /> LOCAL SANDBOX
            </span>
          </div>
          <button
            className="settings-button"
            onClick={() => setModal("settings")}
          >
            <Settings2 size={17} /> 워크스페이스 설정
          </button>
          <div className="profile">
            <span>Y</span>
            <div>
              <strong>Your workspace</strong>
              <small>Explorer · Free</small>
            </div>
            <span className="profile-status" />
          </div>
        </div>
      </aside>
      {nav && (
        <button
          className="nav-scrim"
          aria-label="메뉴 닫기"
          onClick={() => setNav(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button menu-toggle"
              aria-label="메뉴 열기"
              aria-expanded={nav}
              onClick={() => setNav(!nav)}
            >
              <PanelLeftClose size={18} />
            </button>
            <span>워크스페이스</span>
            <ChevronRight size={14} />
            <strong>
              {view === "lab"
                ? "시뮬레이션"
                : view === "events"
                  ? "활동 기록"
                  : "결과 리포트"}
            </strong>
          </div>
          <div className="top-actions">
            <span className="sandbox-badge">
              <span />
              Sandbox mode
            </span>
            <button
              className="icon-button help-button"
              aria-label="사용 가이드"
              onClick={() => setModal("help")}
            >
              <Info size={18} />
            </button>
            <span className="avatar">Y</span>
          </div>
        </header>
        <main>
          <div className="page-title-row">
            <div>
              <div className="eyebrow">
                CLOUD SECURITY LAB <span>/</span> SCENARIO 001
              </div>
              <h1>
                {view === "lab"
                  ? "하나의 열쇠가 유출된 밤"
                  : view === "events"
                    ? "모든 변화에는 기록이 남습니다"
                    : "경계를 만드는 것은, 설정입니다"}
                <span className="title-dot">.</span>
              </h1>
              <p className="page-description">
                {view === "lab"
                  ? "직접 입력하고, 변화를 관찰하세요. 클라우드 보안이 필요한 이유가 보입니다."
                  : view === "events"
                    ? "터미널에서 일어난 일과 인프라의 변화를 시간순으로 확인하세요."
                    : "접근을 막은 이유와 허용한 이유. 시뮬레이션의 핵심을 한눈에 확인하세요."}
              </p>
            </div>
            <button
              className="secondary-button restart-button"
              onClick={() => setModal("reset")}
            >
              <RotateCcw size={14} />
              처음부터
            </button>
          </div>
          {view === "lab" ? (
            <>
              <div className="scenario-strip">
                <span>
                  <span className="tiny-orange-square" /> INTERACTIVE SCENARIO
                </span>
                <div>
                  <span>
                    <Clock3 size={13} />약 5분
                  </span>
                  <span>
                    <TerminalSquare size={13} />
                    12개의 명령
                  </span>
                  <button onClick={() => setModal("brief")}>
                    시나리오 브리핑 <ArrowRight size={13} />
                  </button>
                </div>
              </div>
              <div className="stage-track">
                {scenario.stages.map((s, i) => (
                  <button
                    key={s.tag}
                    className={`stage-item ${stage === i ? "active" : ""} ${stage > i || done ? "complete" : ""}`}
                    onClick={() => setModal(`stage-${i}`)}
                  >
                    <span className="stage-number">
                      {stage > i || done ? (
                        <Check size={15} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <div>
                      <span>{s.label}</span>
                      <strong>{s.name}</strong>
                    </div>
                    <span className="stage-state">
                      {stage > i || done
                        ? "완료"
                        : stage === i
                          ? "진행 중"
                          : "예정"}
                    </span>
                    {i < 2 && (
                      <ChevronRight className="stage-divider" size={17} />
                    )}
                  </button>
                ))}
              </div>
              <div className="section-heading">
                <div>
                  <span className="section-index">0{stage + 1}</span>
                  <h2>{chapter.name}</h2>
                  <span className="section-tag">{chapter.tag}</span>
                </div>
                <span className="step-count">
                  STEP{" "}
                  <strong>
                    {done ? "04" : String(stageProgress + 1).padStart(2, "0")}
                  </strong>{" "}
                  / 04
                </span>
              </div>
              <div className="lab-grid">
                <div className="visual-column">
                  <InfraMap
                    step={state.step}
                    events={state.events}
                    onConcept={(s) => setModal(`concept-${s}`)}
                  />
                  <div className="context-card">
                    <span className="context-icon">
                      <Info size={19} />
                    </span>
                    <div>
                      <h3>
                        {stage === 0
                          ? "지금, 무슨 일이 일어나고 있나요?"
                          : stage === 1
                            ? "옮기는 것만으로는 충분하지 않아요"
                            : "무엇이 접근을 막았을까요?"}
                      </h3>
                      <p>{chapter.description}</p>
                      <button onClick={() => setModal(`stage-${stage}`)}>
                        상황 자세히 보기 <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="console-column">
                  <Terminal
                    entries={state.entries}
                    command={done ? "" : current.command}
                    prompt={current.prompt}
                    value={value}
                    onChange={setValue}
                    onSubmit={run}
                    busy={busy}
                    done={done}
                    shadow={shadow}
                    onReport={() => setView("report")}
                  />
                  <section className="command-guide">
                    <div className="guide-heading">
                      <span>
                        <span className="guide-icon">
                          <Command size={14} />
                        </span>
                        {done ? "MISSION COMPLETE" : "YOUR NEXT MOVE"}
                      </span>
                      <span>{done ? "12 / 12" : `${state.step + 1} / 12`}</span>
                    </div>
                    <h3>{done ? "필요한 접근만, 안전하게." : current.title}</h3>
                    <p>
                      {done
                        ? "올바른 역할과 인증을 갖춘 접근은 허용했습니다. 방금 만든 보안 경계를 리포트에서 다시 확인하세요."
                        : current.explanation}
                    </p>
                    {done ? (
                      <button
                        className="primary-button"
                        onClick={() => setView("report")}
                      >
                        결과 리포트 보기 <ArrowRight size={15} />
                      </button>
                    ) : (
                      <>
                        <div className="guide-command">
                          <code>{current.command}</code>
                          <span>↵</span>
                        </div>
                        <div className="guide-bottom">
                          <span>
                            <span className="keyboard-key">↵</span>터미널에
                            입력한 뒤 Enter
                          </span>
                          <button
                            onClick={() => {
                              setValue(current.command);
                              document.getElementById("command-input")?.focus();
                            }}
                            disabled={busy}
                          >
                            명령 채우기 <ArrowRight size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </section>
                </div>
              </div>
              {error && (
                <div role="alert" className="error-banner">
                  {error}
                  {!ready && (
                    <button onClick={() => location.reload()}>
                      연결 다시 확인
                    </button>
                  )}
                </div>
              )}
              <div className="insight-strip">
                <span className="insight-icon">
                  <Shield size={19} />
                </span>
                <div>
                  <strong>보안은 장소가 아니라, 경계를 설계하는 일.</strong>
                  <span>
                    클라우드에서도 인증과 접근 권한은 우리가 설정해야 합니다.
                  </span>
                </div>
                <button onClick={() => setModal("responsibility")}>
                  공동 책임 모델 <ArrowRight size={14} />
                </button>
              </div>
            </>
          ) : view === "events" ? (
            <section className="activity-panel">
              <div className="activity-title">
                <h2>세션 타임라인</h2>
                <span>{state.events.length} EVENTS</span>
              </div>
              {state.events.length ? (
                state.events.map((e, i) => (
                  <div className="activity-event" key={i}>
                    <span className={`event-icon ${e.tone}`}>
                      {e.tone === "success" ? (
                        <ShieldCheck size={18} />
                      ) : (
                        <Activity size={18} />
                      )}
                    </span>
                    <div>
                      <strong>{e.text}</strong>
                      <small>
                        {scenario.stages[Math.floor(i / 4)].label} · 명령{" "}
                        {String(i + 1).padStart(2, "0")}
                      </small>
                    </div>
                    <time>{e.time}</time>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <Activity size={32} />
                  <h3>아직 기록된 활동이 없습니다</h3>
                  <p>첫 명령을 실행하면 이곳에 기록됩니다.</p>
                  <button
                    className="primary-button"
                    onClick={() => setView("lab")}
                  >
                    시뮬레이션 열기 <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </section>
          ) : (
            <section className="report-panel">
              <div className="report-top">
                <div className="report-symbol">
                  <ShieldCheck size={34} />
                </div>
                <span className="eyebrow">SECURITY DEBRIEF</span>
                <h2>
                  {done
                    ? "같은 데이터, 달라진 접근 경계."
                    : "검증을 이어가고 있습니다."}
                </h2>
                <p>
                  {done
                    ? "유출된 계정 하나가 모든 데이터의 열쇠가 되지 않도록."
                    : "시나리오를 완료하면 차단 결과와 정상 접근 결과를 모두 확인할 수 있습니다."}
                </p>
                <span className="report-progress">
                  {state.step} / 12 명령 완료 · {progress}%
                </span>
              </div>
              <div className="report-comparison">
                <div>
                  <span className="report-label">BEFORE</span>
                  <h3>하나의 비밀번호, 모든 권한</h3>
                  <ul>
                    <li>관리자 비밀번호만으로 접속</li>
                    <li>추가 인증 없음</li>
                    <li>계정별 접근 범위 분리 없음</li>
                  </ul>
                  <span className="result-tag danger">
                    {state.step >= 4 ? "업무 자산 3개 접근 노출" : "확인 대기"}
                  </span>
                </div>
                <ArrowRight className="comparison-arrow" size={22} />
                <div>
                  <span className="report-label">AFTER</span>
                  <h3>역할과 인증에 따라 다른 권한</h3>
                  <ul>
                    <li>서버와 클라우드 인증 분리</li>
                    <li>백업 담당 역할에만 읽기 허용</li>
                    <li>MFA 인증 세션 조건 확인</li>
                  </ul>
                  <span className="result-tag success">
                    {done
                      ? "비인가 접근 차단 · 정상 접근 허용"
                      : "설정 및 검증 진행 중"}
                  </span>
                </div>
              </div>
              <div className="report-lesson">
                <Info size={20} />
                <p>
                  <strong>
                    클라우드가 자동으로 모든 공격을 막지는 않습니다.
                  </strong>
                  <br />
                  이번 결과는 최소 권한과 추가 인증 조건을 직접 설정했기
                  때문입니다. 온프레미스에도 같은 보안 원칙을 적용할 수
                  있습니다. 모든 결과는 가상 환경에서 재현한 것입니다.
                </p>
              </div>
              <div className="report-actions">
                <button className="secondary-button" onClick={download}>
                  <ArrowDownToLine size={16} />
                  리포트 다운로드
                </button>
                <button
                  className="primary-button"
                  onClick={() => setView("lab")}
                >
                  {done ? "시뮬레이션 돌아보기" : "이어서 진행하기"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </section>
          )}
          <footer className="page-footer">
            <span>
              <span className="footer-mark">b.</span> BOUNDARY{" "}
              <span className="footer-divider">/</span> Explore the limits.
              Build the boundary.
            </span>
            <span>
              <i />
              {serverMode ? "Spring Boot session" : "Local simulation"}
              <span className="footer-divider">·</span>v1.0
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          <button aria-label="알림 닫기" onClick={() => setNotice("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal === "glossary"
              ? "개념 라이브러리"
              : modal === "settings"
                ? "워크스페이스 설정"
                : modal === "reset"
                  ? "처음부터 다시 시작할까요?"
                  : modal === "help"
                    ? "터미널 사용 가이드"
                    : modal === "responsibility"
                      ? "클라우드 보안은 함께 만드는 것"
                      : modal === "brief"
                        ? "시나리오 브리핑"
                        : modal.startsWith("concept-")
                          ? (concepts[modal.slice(8)]?.title ?? "인프라 개념")
                          : (scenario.stages[Number(modal.slice(6))]?.name ??
                            "상세 정보")
          }
          onClose={() => setModal(null)}
          wide={modal === "glossary"}
        >
          {modal === "glossary" ? (
            <>
              <p className="modal-intro">
                어려운 이름 뒤에는 익숙한 개념이 있습니다.
              </p>
              <div className="glossary-grid">
                {Object.entries(concepts)
                  .slice(0, 6)
                  .map(([id, c]) => (
                    <button key={id} onClick={() => setModal(`concept-${id}`)}>
                      <span className="concept-code">{id}</span>
                      <strong>{c.title.split(" · ")[1]}</strong>
                      <p>{c.analogy}</p>
                      <ArrowRight size={16} />
                    </button>
                  ))}
              </div>
            </>
          ) : modal === "settings" ? (
            <>
              <div className="setting-row">
                <div>
                  <strong>명령어 그림자 가이드</strong>
                  <p>터미널에 다음 명령을 희미하게 표시합니다.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={shadow}
                  className={`switch ${shadow ? "on" : ""}`}
                  onClick={() => setShadow(!shadow)}
                  aria-label="명령어 그림자 가이드"
                >
                  <span />
                </button>
              </div>
              <div className="setting-row">
                <div>
                  <strong>맵 애니메이션</strong>
                  <p>연결선을 따라 움직이는 신호를 표시합니다.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={motion}
                  className={`switch ${motion ? "on" : ""}`}
                  onClick={() => setMotion(!motion)}
                  aria-label="맵 애니메이션"
                >
                  <span />
                </button>
              </div>
              <div className="modal-note">
                {serverMode
                  ? "진행도는 서버 세션에 저장됩니다. 서버 재시작 또는 세션 만료 시 초기화됩니다."
                  : "진행도는 이 브라우저에 저장됩니다. 브라우저 데이터를 지우면 진행도도 초기화됩니다."}{" "}
                표시 설정은 현재 창에만 적용됩니다.
              </div>
            </>
          ) : modal === "reset" ? (
            <>
              <p>
                현재 진행도와 이벤트 기록을 지우고 첫 번째 명령부터 시작합니다.
              </p>
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  onClick={() => setModal(null)}
                >
                  이어서 진행
                </button>
                <button
                  disabled={busy}
                  className="primary-button"
                  onClick={reset}
                >
                  <RotateCcw size={15} />
                  초기화하고 시작
                </button>
              </div>
              {error && <p role="alert">{error}</p>}
            </>
          ) : modal === "help" ? (
            <>
              <ol className="help-steps">
                <li>
                  <span>01</span>
                  <div>
                    <strong>다음 행동을 확인하세요</strong>
                    <p>터미널 아래에 명령과 쉬운 설명이 표시됩니다.</p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>회색 글자 위에 따라 입력하세요</strong>
                    <p>
                      입력줄을 누른 뒤 타이핑하고 Enter를 누르세요. ‘명령
                      채우기’로 입력을 도울 수도 있습니다.
                    </p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>맵의 변화를 관찰하세요</strong>
                    <p>
                      노드를 누르면 개념을 볼 수 있습니다. help, pwd, clear
                      명령도 사용할 수 있습니다.
                    </p>
                  </div>
                </li>
              </ol>
              <div className="modal-note">
                이 터미널은 정해진 실습 명령만 처리합니다. 실제 리눅스 셸이나
                AWS에 연결되지 않습니다.
              </div>
            </>
          ) : modal === "responsibility" ? (
            <>
              <p className="concept-analogy">
                건물은 제공자가 지키고, 출입증은 우리가 관리합니다.
              </p>
              <div className="responsibility-grid">
                <div>
                  <Globe2 size={24} />
                  <h3>클라우드 제공자</h3>
                  <p>데이터센터, 물리 장비, 기반 서비스의 보안을 담당합니다.</p>
                </div>
                <div>
                  <ShieldCheck size={24} />
                  <h3>서비스 사용자</h3>
                  <p>
                    데이터 접근 권한, 사용자 인증, 서비스 설정을 관리합니다.
                    책임 범위는 서비스에 따라 달라집니다.
                  </p>
                </div>
              </div>
              <a
                className="text-link"
                href="https://aws.amazon.com/compliance/shared-responsibility-model/"
                target="_blank"
                rel="noreferrer"
              >
                AWS 공동 책임 모델 읽기 <ExternalLink size={14} />
              </a>
            </>
          ) : modal === "brief" ? (
            <>
              <p className="concept-analogy">
                02:14 AM. 유출된 비밀번호 하나가 발견됐습니다.
              </p>
              <p>
                가상의 회사 ‘Boundary Works’는 관리자 권한을 공유하고
                있었습니다. 사고의 범위를 확인하고, 백업을 클라우드로 옮기고,
                접근 규칙을 설계합니다.
              </p>
              <ol className="brief-list">
                {scenario.stages.map((s, i) => (
                  <li key={s.name}>
                    <strong>
                      0{i + 1} · {s.name}
                    </strong>
                    <p>{s.description}</p>
                  </li>
                ))}
              </ol>
              <div className="modal-note">
                예상 5분 · 12개 명령 · 모든 계정과 데이터는 가상입니다. 실제
                외부 서버, 파일, 클라우드 리소스를 사용하지 않습니다.
              </div>
            </>
          ) : modal.startsWith("concept-") ? (
            <>
              <span className="concept-code">{modal.slice(8)}</span>
              <p className="concept-analogy">
                {concepts[modal.slice(8)]?.analogy}
              </p>
              <p>{concepts[modal.slice(8)]?.body}</p>
              <button
                className="text-button"
                onClick={() => setModal("glossary")}
              >
                ← 개념 라이브러리
              </button>
            </>
          ) : (
            <>
              <p className="concept-analogy">
                {scenario.stages[Number(modal.slice(6))]?.description}
              </p>
              <div className="modal-note">
                {scenario.stages[Number(modal.slice(6))]?.note}
              </div>
              <p className="modal-small">
                진행 순서는 유지됩니다. 터미널에서 현재 명령을 완료하면 다음
                단계로 이동합니다.
              </p>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
