import scenario from "../../shared/scenario.json";
export { scenario };
export type Tone = "neutral" | "success" | "danger";
export type Entry = { text: string; tone: Tone; command?: boolean };
export type Event = { text: string; tone: Tone; time: string };
export type State = {
  version: number;
  step: number;
  entries: Entry[];
  events: Event[];
  startedAt: number;
};
export type Result = { state: State; accepted: boolean; message?: string };
export const initialState = (): State => ({
  version: 1,
  step: 0,
  entries: [
    { text: "BOUNDARY LAB / isolated terminal", tone: "neutral" },
    {
      text: "Session ready. 화면의 가이드를 따라 입력하고 Enter를 누르세요.",
      tone: "neutral",
    },
  ],
  events: [],
  startedAt: Date.now(),
});
export function execute(state: State, raw: string): Result {
  if (raw.length > 256)
    return {
      state,
      accepted: false,
      message: "명령어는 256자 이내로 입력해 주세요.",
    };
  const command = raw.trim();
  if (!command) return { state, accepted: false };
  if (command === "clear")
    return { state: { ...state, entries: [] }, accepted: false };
  const step = scenario.steps[state.step];
  const entry: Entry = {
    text: `${step?.prompt ?? "analyst@boundary:~$"} ${step?.prompt === "password:" ? "•".repeat(command.length) : command}`,
    tone: "neutral",
    command: true,
  };
  if (["help", "pwd"].includes(command))
    return {
      state: {
        ...state,
        entries: [
          ...state.entries,
          entry,
          {
            text:
              command === "help"
                ? "가이드 명령을 입력하세요. help 도움말 · pwd 현재 위치 · clear 화면 지우기. 모든 명령은 로컬 시뮬레이션입니다."
                : state.step < 2
                  ? "/home/analyst"
                  : state.step < 4
                    ? "/root"
                    : "/home/responder",
            tone: "neutral" as Tone,
          },
        ].slice(-100),
      },
      accepted: false,
    };
  if (!step)
    return {
      state,
      accepted: false,
      message: "시나리오를 완료했습니다. 결과 리포트를 확인하세요.",
    };
  const accepted = command === step.command;
  const output: Entry[] = accepted
    ? step.output.map((text) => ({
        text,
        tone: text.startsWith("fatal error:") ? "danger" : (step.tone as Tone),
      }))
    : [
        {
          text: "명령이 일치하지 않습니다. 위 가이드의 철자와 공백을 확인해 주세요.",
          tone: "danger",
        },
      ];
  return {
    state: {
      ...state,
      step: state.step + (accepted ? 1 : 0),
      entries: [...state.entries, entry, ...output].slice(-100),
      events: accepted
        ? [
            ...state.events,
            {
              text: step.event,
              tone: step.tone as Tone,
              time: new Date().toLocaleTimeString("ko-KR", { hour12: false }),
            },
          ]
        : state.events,
    },
    accepted,
  };
}
const key = "boundary.session.v1";
export function restore(): State {
  try {
    const s = JSON.parse(localStorage.getItem(key) || "null");
    if (
      s?.version === 1 &&
      Number.isInteger(s.step) &&
      s.step >= 0 &&
      s.step <= scenario.steps.length &&
      Array.isArray(s.entries) &&
      s.entries.length <= 100 &&
      s.entries.every(
        (e: Entry) =>
          typeof e.text === "string" &&
          ["neutral", "danger", "success"].includes(e.tone),
      ) &&
      Array.isArray(s.events) &&
      s.events.length <= 12 &&
      s.events.every(
        (e: Event) =>
          typeof e.text === "string" &&
          typeof e.time === "string" &&
          ["neutral", "danger", "success"].includes(e.tone),
      ) &&
      Number.isFinite(s.startedAt)
    )
      return s;
  } catch {
    /* Unavailable storage starts a temporary session. */
  }
  return initialState();
}
export function persist(state: State) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* Private browsing can disable storage. */
  }
}
export const serverMode = import.meta.env.VITE_SESSION_MODE === "server";
export async function serverState(reset = false): Promise<State> {
  const response = await fetch("/api/session" + (reset ? "/reset" : ""), {
    method: reset ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok)
    throw new Error("서버 연결을 확인해 주세요. 진행도는 유지됩니다.");
  return response.json();
}
export async function submit(state: State, command: string): Promise<Result> {
  if (!serverMode) return execute(state, command);
  const response = await fetch("/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, expectedStep: state.step }),
  });
  if (!response.ok)
    throw new Error(
      response.status === 409
        ? "다른 창에서 진행도가 변경됐습니다. 새로고침해 주세요."
        : "서버에 연결하지 못했습니다. 다시 시도해 주세요.",
    );
  return response.json();
}
