package dev.boundary.lab;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class ScenarioEngine {
    public record Entry(String text, String tone, boolean command) {}
    public record Event(String text, String tone, String time) {}
    public record State(int version, int step, List<Entry> entries, List<Event> events, long startedAt) {}
    public record Result(State state, boolean accepted, String message) {}
    public record Step(int stage, String command, String prompt, String title, String explanation, List<String> output, String event, String tone) {}
    public record Stage(String name, String label, String tag, String description, String note) {}
    public record Scenario(int version, List<Stage> stages, List<Step> steps) {}
    private final Scenario scenario;
    public ScenarioEngine(ObjectMapper mapper) throws IOException {
        try (var input = new ClassPathResource("scenario.json").getInputStream()) {
            scenario = mapper.readValue(input, Scenario.class);
        }
    }
    public State initial() {
        return new State(1, 0, List.of(new Entry("BOUNDARY LAB / isolated terminal", "neutral", false), new Entry("Session ready. 화면의 가이드를 따라 입력하고 Enter를 누르세요.", "neutral", false)), List.of(), System.currentTimeMillis());
    }
    public Result execute(State state, String raw) {
        if (raw == null || raw.length() > 256) return new Result(state, false, "명령어는 256자 이내로 입력해 주세요.");
        var command = raw.trim();
        if (command.isEmpty()) return new Result(state, false, null);
        if (command.equals("clear")) return new Result(new State(1,state.step(),List.of(),state.events(),state.startedAt()),false,null);
        var step = state.step() < scenario.steps().size() ? scenario.steps().get(state.step()) : null;
        var entries = new ArrayList<>(state.entries());
        var prompt = step == null ? "analyst@boundary:~$" : step.prompt();
        entries.add(new Entry(prompt + " " + (prompt.equals("password:") ? "•".repeat(command.length()) : command),"neutral",true));
        if (command.equals("help") || command.equals("pwd")) {
            var output = command.equals("help") ? "가이드 명령을 입력하세요. help 도움말 · pwd 현재 위치 · clear 화면 지우기. 모든 명령은 로컬 시뮬레이션입니다." : state.step() < 2 ? "/home/analyst" : state.step() < 4 ? "/root" : "/home/responder";
            entries.add(new Entry(output,"neutral",false));
            return new Result(new State(1,state.step(),bounded(entries),state.events(),state.startedAt()),false,null);
        }
        if (step == null) return new Result(state,false,"시나리오를 완료했습니다. 결과 리포트를 확인하세요.");
        boolean accepted = step.command().equals(command);
        var events = new ArrayList<>(state.events());
        if (accepted) {
            for (var line : step.output()) entries.add(new Entry(line,line.startsWith("fatal error:") ? "danger" : step.tone(),false));
            events.add(new Event(step.event(),step.tone(),LocalTime.now(ZoneId.of("Asia/Seoul")).format(DateTimeFormatter.ofPattern("HH:mm:ss"))));
        } else entries.add(new Entry("명령이 일치하지 않습니다. 위 가이드의 철자와 공백을 확인해 주세요.","danger",false));
        return new Result(new State(1,state.step()+(accepted?1:0),bounded(entries),List.copyOf(events),state.startedAt()),accepted,null);
    }
    private List<Entry> bounded(List<Entry> entries) { return List.copyOf(entries.subList(Math.max(0,entries.size()-100),entries.size())); }
}
