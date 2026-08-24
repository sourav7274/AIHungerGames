import express from "express";
import cors from "cors";
import crypto from "crypto";
import { runTournament, debateTopics } from "./tournament";

const app = express();
const PORT = 5000;

app.use(cors({
  origin: "*" // Allow any origin for local dev
}));
app.use(express.json());

// Store pending continuations: sessionId -> { resolve: () => void }
const pendingContinues = new Map<string, { resolve: () => void; reject: (err: Error) => void }>();

// Endpoint to fetch available preset topics
app.get("/api/topics", (req, res) => {
  res.json({ topics: debateTopics });
});

// Endpoint to signal continue to next round
app.post("/api/continue-round", (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId || !pendingContinues.has(sessionId)) {
    return res.status(400).json({ error: "Invalid or missing sessionId" });
  }
  const pending = pendingContinues.get(sessionId)!;
  pendingContinues.delete(sessionId);
  pending.resolve();
  res.json({ status: "continuing" });
});

// SSE endpoint to trigger and stream the tournament debate
app.get("/api/stream-tournament", async (req, res) => {
  const customTopic = req.query.topic as string | undefined;
  const agentCount = parseInt(req.query.agentCount as string) || 5;
  const roundCount = parseInt(req.query.roundCount as string) || 5;
  const sessionId = crypto.randomBytes(8).toString("hex");
  let customAgents: any[] = [];
  
  try {
    if (req.query.customAgents) {
      customAgents = JSON.parse(req.query.customAgents as string);
    }
  } catch (e) {
    console.warn("Failed to parse customAgents:", e);
  }

  // Set SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  console.log(`Starting tournament SSE stream. Session: ${sessionId}, Topic: ${customTopic || "None"}, Agents: ${agentCount}, Rounds: ${roundCount}, Custom agents: ${customAgents.length}`);

  const controller = { aborted: false };

  req.on("close", () => {
    console.log("SSE client connection closed. Aborting tournament execution...");
    controller.aborted = true;
    // Reject any pending continue
    if (pendingContinues.has(sessionId)) {
      pendingContinues.get(sessionId)!.reject(new Error("Connection closed"));
      pendingContinues.delete(sessionId);
    }
  });

  // Callback to stream events in SSE format
  const handleEvent = (event: any) => {
    if (!controller.aborted) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  };

  // Function that creates a promise the backend waits on
  const waitForContinue = (round: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (controller.aborted) {
        resolve();
        return;
      }
      pendingContinues.set(sessionId, { resolve, reject });
      handleEvent({ type: "WAITING_FOR_CONTINUE", round, sessionId });
    });
  };

  try {
    await runTournament(customTopic, handleEvent, controller, {
      totalRounds: roundCount,
      agentsPerRound: agentCount,
      customAgents: customAgents.length > 0 ? customAgents : undefined,
    }, waitForContinue);
    
    if (!controller.aborted) {
      // Send final completion signal
      res.write(`data: ${JSON.stringify({ type: "COMPLETE" })}\n\n`);
    }
  } catch (error: any) {
    if (error.message === "Connection closed") {
      console.log("Tournament aborted by client disconnect.");
    } else {
      console.error("Error in tournament run:", error);
      if (!controller.aborted) {
        res.write(`data: ${JSON.stringify({ type: "ERROR", message: error.message || "Internal server error" })}\n\n`);
      }
    }
  } finally {
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`[Hunger Games Server] Running on http://localhost:${PORT}`);
});
