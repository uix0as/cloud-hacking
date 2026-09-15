package dev.boundary.lab;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class LabController {
    private final ScenarioEngine engine;
    public record Command(@NotNull @Size(max=256) String command, @NotNull @Min(0) @Max(12) Integer expectedStep) {}
    public LabController(ScenarioEngine engine) { this.engine=engine; }
    private ScenarioEngine.State state(HttpSession session) {
        var stored = (ScenarioEngine.State) session.getAttribute("state");
        if (stored == null) { stored=engine.initial(); session.setAttribute("state",stored); }
        return stored;
    }
    @GetMapping("/session")
    public ScenarioEngine.State get(HttpSession session) { synchronized(session) { return state(session); } }
    @PostMapping(value="/session/reset",consumes="application/json")
    public ScenarioEngine.State reset(HttpSession session) { synchronized(session) { var state=engine.initial();session.setAttribute("state",state);return state; } }
    @PostMapping(value="/command",consumes="application/json")
    public ScenarioEngine.Result command(HttpSession session,@Valid @RequestBody Command command) {
        synchronized(session) {
            var state=state(session);
            if (command.expectedStep()!=state.step()) throw new ResponseStatusException(HttpStatus.CONFLICT);
            var result=engine.execute(state,command.command());
            session.setAttribute("state",result.state());
            return result;
        }
    }
}
