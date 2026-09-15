package dev.boundary.lab;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class LabControllerTest {
 @Autowired MockMvc mvc;
 @Autowired ObjectMapper mapper;
 @Autowired ScenarioEngine engine;
 @Test void fullScenarioUsesSessionAndPreservesProgress() throws Exception {
  var session=new MockHttpSession();
  ScenarioEngine.Scenario scenario;
  try(var input=new ClassPathResource("scenario.json").getInputStream()) {scenario=mapper.readValue(input,ScenarioEngine.Scenario.class);}
  for(int i=0;i<scenario.steps().size();i++) {
   mvc.perform(post("/api/command").session(session).contentType("application/json").content(mapper.writeValueAsString(Map.of("expectedStep",i,"command",scenario.steps().get(i).command()))))
    .andExpect(status().isOk()).andExpect(jsonPath("$.accepted").value(true)).andExpect(jsonPath("$.state.step").value(i+1));
  }
  mvc.perform(get("/api/session").session(session)).andExpect(jsonPath("$.step").value(12)).andExpect(jsonPath("$.events.length()").value(12));
  var state=(ScenarioEngine.State) session.getAttribute("state");
  assertThat(state.entries().stream().map(ScenarioEngine.Entry::text)).anyMatch(s->s.contains("Access Denied")).anyMatch(s->s.contains("GetObject: ALLOWED")).noneMatch(s->s.contains("Admin123!"));
 }
 @Test void isolatedSessionsAndReset() throws Exception {
  var one=new MockHttpSession();var two=new MockHttpSession();
  mvc.perform(post("/api/command").session(one).contentType("application/json").content("{\"expectedStep\":0,\"command\":\"ssh root@legacy.invalid\"}"));
  mvc.perform(get("/api/session").session(two)).andExpect(jsonPath("$.step").value(0));
  mvc.perform(post("/api/session/reset").session(one).contentType("application/json")).andExpect(jsonPath("$.step").value(0)).andExpect(jsonPath("$.events.length()").value(0));
 }
 @Test void rejectsStaleStepsAndInvalidBodies() throws Exception {
  var session=new MockHttpSession();
  mvc.perform(post("/api/command").session(session).contentType("application/json").content("{\"expectedStep\":7,\"command\":\"whoami\"}")).andExpect(status().isConflict());
  for(var body:new String[]{"{}","{\"expectedStep\":0}","{\"command\":\"help\"}","{\"expectedStep\":0,\"command\":null}"}) {
   mvc.perform(post("/api/command").session(session).contentType("application/json").content(body)).andExpect(status().isBadRequest());
  }
  mvc.perform(post("/api/command").session(session).contentType("application/json").content(mapper.writeValueAsString(Map.of("expectedStep",0,"command","x".repeat(257))))).andExpect(status().isBadRequest());
  mvc.perform(post("/api/command").session(session).contentType("text/plain").content("help")).andExpect(status().isUnsupportedMediaType());
 }
 @Test void wrongCommandNeverAdvancesAndHistoryIsBounded() {
  var state=engine.initial();
  for(int i=0;i<120;i++) {var result=engine.execute(state,"unexpected command");assertThat(result.accepted()).isFalse();state=result.state();}
  assertThat(state.step()).isZero();assertThat(state.entries()).hasSize(100);assertThat(state.events()).isEmpty();
 }
}
