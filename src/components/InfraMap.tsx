import {
  ArrowUpRight,
  Database,
  FileText,
  Globe2,
  HardDrive,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  ShieldX,
  UserRound,
  Check,
} from "lucide-react";
import { useState } from "react";
import type { Event } from "../lib/engine";
export default function InfraMap({
  step,
  events,
  onConcept,
}: {
  step: number;
  events: Event[];
  onConcept: (s: string) => void;
}) {
  const [tab, setTab] = useState("map");
  const cloud = step >= 4;
  const breach = step >= 2 && step < 4;
  const secure = step >= 8;
  const blocked = step === 11;
  const policy = step >= 7;
  return (
    <section className="map-panel">
      <div className="panel-tabs">
        <div>
          <button
            className={tab === "map" ? "active" : ""}
            onClick={() => setTab("map")}
          >
            인프라 맵
          </button>
          <button
            className={tab === "events" ? "active" : ""}
            onClick={() => setTab("events")}
          >
            이벤트 로그 <span className="count">{events.length}</span>
          </button>
        </div>
        <span className="live-label">
          <i /> LIVE VIEW
        </span>
      </div>
      {tab === "events" ? (
        <div className="map-events">
          {events.length ? (
            events
              .slice()
              .reverse()
              .map((e, i) => (
                <div className="log-row" key={i}>
                  <span className={`event-dot ${e.tone}`} />
                  <time>{e.time}</time>
                  <span>{e.text}</span>
                </div>
              ))
          ) : (
            <div className="empty-state">
              <Globe2 size={28} />
              <h3>첫 번째 연결을 기다리고 있습니다</h3>
              <p>터미널에서 명령을 실행하면 변화가 여기에 기록됩니다.</p>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`infra-canvas ${breach ? "breached" : ""} ${secure ? "secured" : ""}`}
        >
          <div className="canvas-heading">
            <span className="environment-tag">
              {cloud ? "CLOUD ENVIRONMENT" : "ON-PREMISE ENVIRONMENT"}
            </span>
            <span
              className={`risk-pill ${secure ? "safe" : cloud ? "pending" : ""}`}
            >
              <i />
              {secure
                ? "접근 제어 활성"
                : cloud
                  ? "보호 설정 중"
                  : "단일 인증 · 높은 위험"}
            </span>
          </div>
          <svg
            className="connections"
            viewBox="0 0 660 330"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              className="boundary-outline"
              d="M225 45H617Q631 45 631 59V265Q631 279 617 279H225Q211 279 211 265V59Q211 45 225 45Z"
            />
            <path
              className={`connection ${blocked ? "blocked-line" : ""}`}
              d="M112 162H294"
            />
            <path
              className="connection"
              d="M356 162H456V83H513M456 162H513M456 162V242H513"
            />
            <circle className="packet" r="3">
              <animateMotion
                dur="3s"
                repeatCount="indefinite"
                path={blocked ? "M112 162H280L112 162" : "M112 162H294"}
              />
            </circle>
            <circle className="joint" cx="456" cy="162" r="4" />
          </svg>
          <span className="network-zone">
            {cloud ? "PRIVATE CLOUD / 가상 AWS" : "LOCAL NETWORK / 사내망"}
          </span>
          <button
            className="map-source"
            onClick={() => onConcept(cloud ? "IAM" : "SSH")}
          >
            <span className="source-icon">
              <UserRound size={22} />
            </span>
            <strong>
              {step === 12
                ? "백업 담당자"
                : cloud && step < 8
                  ? "사고 대응자"
                  : "외부 접속자"}
            </strong>
            <small>
              {step === 12
                ? "인증된 세션"
                : cloud && step < 8
                  ? "responder"
                  : "unknown session"}
            </small>
          </button>
          <span className="connection-label">
            {step === 12
              ? "VERIFIED"
              : blocked
                ? "DENIED"
                : cloud
                  ? "AUTH REQUEST"
                  : "SSH · 22"}
          </span>
          <button
            className={`main-node ${breach ? "danger" : ""} ${policy ? "protected" : ""}`}
            onClick={() => onConcept(cloud ? "IAM" : "ROOT")}
          >
            <span className="server-illustration">
              {cloud ? (
                <>
                  <div className="shield-halo" />
                  <ShieldCheck size={47} strokeWidth={1.15} />
                </>
              ) : (
                <svg
                  width="74"
                  height="78"
                  viewBox="0 0 74 78"
                  aria-hidden="true"
                >
                  <path
                    d="M9 19 37 5 65 19 37 33Z"
                    fill="#ecedf1"
                    stroke="#97a1b0"
                  />
                  <path
                    d="M9 19v42l28 14V33Z"
                    fill="#c9cfd9"
                    stroke="#97a1b0"
                  />
                  <path
                    d="M37 33v42l28-14V19Z"
                    fill="#fafbfc"
                    stroke="#97a1b0"
                  />
                  <path
                    d="M15 32l16 8M15 44l16 8M15 56l16 8"
                    stroke="#7b8798"
                    strokeWidth="3"
                  />
                  <circle
                    cx="57"
                    cy="36"
                    r="2"
                    fill={breach ? "#ee623b" : "#66a994"}
                  />
                  <circle
                    cx="57"
                    cy="48"
                    r="2"
                    fill={breach ? "#ee623b" : "#66a994"}
                  />
                  <circle
                    cx="57"
                    cy="60"
                    r="2"
                    fill={breach ? "#ee623b" : "#66a994"}
                  />
                </svg>
              )}
            </span>
            <strong>{cloud ? "IAM boundary" : "Legacy server"}</strong>
            <small>
              {cloud
                ? policy
                  ? "최소 권한 적용됨"
                  : "권한 설정 대기"
                : "Ubuntu · root access"}
            </small>
            <span
              className={`node-status ${breach ? "danger" : ""} ${policy ? "safe" : ""}`}
            >
              {cloud
                ? policy
                  ? "POLICY ACTIVE"
                  : "CONFIGURING"
                : breach
                  ? "ACCESS EXPOSED"
                  : "PASSWORD ONLY"}
            </span>
          </button>
          <div className="asset-stack">
            {(cloud
              ? [
                  ["S3 bucket", "파일 보관함", Database, "S3"],
                  ["EC2 instance", "컴퓨팅 서버", HardDrive, "EC2"],
                  [
                    "MFA check",
                    secure ? "추가 인증 필수" : "인증 조건 대기",
                    KeyRound,
                    "MFA",
                  ],
                ]
              : [
                  ["Customer data", "고객 데이터", Database, "DATA"],
                  ["App server", "업무 서비스", HardDrive, "SERVER"],
                  ["Backup files", "백업 파일", FileText, "BACKUP"],
                ]
            ).map(([name, desc, Icon, concept]) => {
              const I = Icon as typeof Database;
              return (
                <button
                  key={String(name)}
                  className={`asset-node ${breach ? "exposed" : ""} ${secure ? "guarded" : ""}`}
                  onClick={() => onConcept(String(concept))}
                >
                  <span className="asset-icon">
                    <I size={20} />
                  </span>
                  <span>
                    <strong>{String(name)}</strong>
                    <small>{String(desc)}</small>
                  </span>
                  {secure ? (
                    <LockKeyhole size={12} />
                  ) : (
                    <ArrowUpRight size={12} />
                  )}
                </button>
              );
            })}
          </div>
          <div
            className={`map-outcome ${breach ? "danger" : ""} ${secure ? "safe" : ""}`}
          >
            {secure ? (
              <ShieldCheck size={15} />
            ) : breach ? (
              <ShieldX size={15} />
            ) : (
              <Globe2 size={15} />
            )}
            <span>
              {step === 12
                ? "정상 접근 허용 · 비인가 접근 차단"
                : blocked
                  ? "접근 거부 — 데이터는 경계 안에 있습니다"
                  : secure
                    ? "역할과 추가 인증, 두 개의 조건으로 보호합니다"
                    : breach
                      ? "관리자 계정 하나로 모든 자산에 접근할 수 있습니다"
                      : cloud
                        ? "파일을 옮긴 다음, 접근 규칙을 설정하세요"
                        : "서버와 업무 데이터가 하나의 신뢰 경계 안에 있습니다"}
            </span>
          </div>
        </div>
      )}
      <div className="map-bottom">
        <span>
          <i className={secure ? "green" : breach ? "orange" : "gray"} />
          {cloud ? "아키텍처 요소" : "연결된 자산"} <strong>3</strong>
        </span>
        <span>
          <Check size={13} /> {cloud ? "공개 접근 차단" : "시뮬레이션 환경"}
        </span>
        <span>노드를 눌러 자세히 보기</span>
      </div>
    </section>
  );
}
