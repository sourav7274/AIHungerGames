import "./logger";
import { buildVotePrompt, buildPrompt, buildDecideVoteTypePrompt } from "./prompt";
import { askOllama } from "./ollama";
import { Agent, AgentScore } from "./structure";
import {
  applyVote,
  awardSpeakingPoints,
  displayStandings,
  initializeScores,
  parseVote,
  recordVoteCast,
} from "./scoring";

function resolveToId(value: string, agents: Agent[]): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .replace(/[\[\]]/g, "")
    .replace(/^id[:=\s]+/i, "")
    .trim();

  const idMatch = cleaned.match(/\b([a-z0-9]{6,})\b/i);
  const token = idMatch?.[1] || cleaned;

  const byId = agents.find((a) => a.id === token || a.id === cleaned);
  if (byId) return byId.id;

  const byName = agents.find(
    (a) => a.name.toLowerCase() === cleaned.toLowerCase(),
  );
  if (byName) return byName.id;

  return undefined;
}

function parseVoteDetails(response: string, voteType: "POSITIVE" | "NEGATIVE") {
  const typeRegex = new RegExp(`${voteType}:\\s*([^\\n\\r,]+)`, "i");
  const typeMatch = response.match(typeRegex);
  if (!typeMatch) return null;

  const target = typeMatch[1]
    .replace(/[\[\]]/g, "")
    .replace(/^id[:=\s]+/i, "")
    .trim();

  let reason = "";
  const reasonRegex =
    /REASON:\s*([\s\S]*?)(?=(?:OPINION:|POSITIVE:|NEGATIVE:|$))/i;
  const reasonMatch = response.match(reasonRegex);
  if (reasonMatch) {
    reason = reasonMatch[1].trim().replace(/,$/, "").trim();
  }

  let opinion = "";
  const opinionRegex =
    /OPINION:\s*([\s\S]*?)(?=(?:REASON:|POSITIVE:|NEGATIVE:|$))/i;
  const opinionMatch = response.match(opinionRegex);
  if (opinionMatch) {
    opinion = opinionMatch[1].trim().replace(/,$/, "").trim();
  }

  return { target, reason, opinion };
}

/** Never return voterId; fall back to another eligible agent. */
function pickValidTarget(
  raw: string | undefined,
  voterId: string,
  eligibleAgents: Agent[],
  avoidIds: string[] = [],
): string | undefined {
  const pool = eligibleAgents.filter(
    (a) => a.id !== voterId && !avoidIds.includes(a.id),
  );
  if (pool.length === 0) {
    console.log(`No eligible vote targets for voter ${voterId}`);
    return undefined;
  }

  const resolved = raw ? resolveToId(raw, eligibleAgents) : undefined;
  if (resolved && resolved !== voterId && !avoidIds.includes(resolved)) {
    return resolved;
  }

  if (resolved === voterId) {
    console.log(`Self-vote detected for ${voterId}; reassigning to another agent`);
  } else if (raw) {
    console.log(`Could not resolve vote target "${raw}"; reassigning`);
  }

  return pool[Math.floor(Math.random() * pool.length)].id;
}

function applyVoteSafely(
  scores: AgentScore[],
  voteType: "POSITIVE" | "NEGATIVE",
  voterId: string,
  rawTarget: string | undefined,
  agents: Agent[],
  eligibleAgents: Agent[],
  reason: string,
  opinion: string,
  onEvent?: (event: any) => void,
  avoidIds: string[] = [],
): string | undefined {
  const targetId = pickValidTarget(rawTarget, voterId, eligibleAgents, avoidIds);
  if (!targetId) {
    console.log(`Vote skipped — no valid ${voteType} target for ${voterId}`);
    return undefined;
  }

  applyVote(scores, voteType, targetId);
  recordVoteCast(scores, voterId);

  const targetName = agents.find((a) => a.id === targetId)?.name;
  console.log(`Vote applied: ${voteType} → ${targetName}`);

  if (onEvent) {
    onEvent({
      type: "VOTE_CAST",
      voterId,
      voterName: agents.find((a) => a.id === voterId)?.name || "Unknown",
      voteType,
      targetId,
      targetName: targetName || "Unknown",
      points: voteType === "POSITIVE" ? 1 : -1,
      reason: reason || "No reason provided",
      opinion: opinion || "No opinion provided",
    });
    onEvent({
      type: "SCORE_UPDATE",
      standings: displayStandings(scores),
    });
  }

  return targetId;
}

async function castVotes(
  agent: Agent,
  agents: Agent[],
  eligibleAgents: Agent[],
  context: string[],
  voteMode: "POSITIVE" | "NEGATIVE" | "BOTH",
  scores: AgentScore[],
  onEvent?: (event: any) => void,
) {
  const pool = eligibleAgents.filter((a) => a.id !== agent.id);
  if (pool.length === 0) {
    console.log(`${agent.name} has nobody eligible to vote for — skipping`);
    return;
  }

  let agentVote = buildVotePrompt(agent, eligibleAgents, context, voteMode);
  let voteResponse = await askOllama(agentVote);
  console.log("vote Response:\n", voteResponse);
  let parsed = parseVote(voteResponse);
  console.log("Parsed vote:", parsed);

  const retryIfNeeded = async (
    voteType: "POSITIVE" | "NEGATIVE",
    raw: string | undefined,
  ) => {
    const resolved = raw ? resolveToId(raw, eligibleAgents) : undefined;
    if (resolved && resolved !== agent.id) return { raw, response: voteResponse };

    console.log(`${agent.name} produced invalid ${voteType} target; retrying...`);
    const retryVote = await askOllama(
      agentVote +
        `\n IMPORTANT: Your last ${voteType} vote was invalid (missing target or self-vote). ` +
        `You MUST vote for one of these IDs only: ${pool.map((a) => a.id).join(", ")}. ` +
        `Do NOT use your own ID (${agent.id}).`,
    );
    const retryParsed = parseVote(retryVote);
    const retryRaw =
      voteType === "POSITIVE" ? retryParsed?.positive : retryParsed?.negative;
    return { raw: retryRaw, response: retryVote };
  };

  if (voteMode === "BOTH") {
    const posTry = await retryIfNeeded("POSITIVE", parsed?.positive);
    const posDetails = parseVoteDetails(posTry.response, "POSITIVE");
    const posId = applyVoteSafely(
      scores,
      "POSITIVE",
      agent.id,
      posTry.raw || posDetails?.target,
      agents,
      eligibleAgents,
      posDetails?.reason || "",
      posDetails?.opinion || "",
      onEvent,
    );

    // Re-parse negative from original or retry response; avoid same target as positive
    let negRaw = parsed?.negative;
    let negResponse = voteResponse;
    const negResolved = negRaw ? resolveToId(negRaw, eligibleAgents) : undefined;
    if (!negResolved || negResolved === agent.id || negResolved === posId) {
      const negTry = await retryIfNeeded("NEGATIVE", negRaw);
      negRaw = negTry.raw;
      negResponse = negTry.response;
    }
    const negDetails = parseVoteDetails(negResponse, "NEGATIVE");
    applyVoteSafely(
      scores,
      "NEGATIVE",
      agent.id,
      negRaw || negDetails?.target,
      agents,
      eligibleAgents,
      negDetails?.reason || "",
      negDetails?.opinion || "",
      onEvent,
      posId ? [posId] : [],
    );
    return;
  }

  const tryResult = await retryIfNeeded(voteMode, voteMode === "POSITIVE" ? parsed?.positive : parsed?.negative);
  const details = parseVoteDetails(tryResult.response, voteMode);
  applyVoteSafely(
    scores,
    voteMode,
    agent.id,
    tryResult.raw || details?.target,
    agents,
    eligibleAgents,
    details?.reason || "",
    details?.opinion || "",
    onEvent,
  );
}

export async function runDebate(
  topic: string,
  agents: Agent[],
  onEvent?: (event: any) => void,
  controller?: { aborted: boolean },
) {
  const context: string[] = [];
  const scores = initializeScores(agents);
  let firstVoteType: "POSITIVE" | "NEGATIVE" | null = null;

  if (onEvent) {
    onEvent({
      type: "DEBATE_START",
      topic,
      agents,
    });
  }

  console.log(
    "Agents participating in the debate:",
    agents
      .map(
        (agent) =>
          `${agent.name}(${agent.id}) (${Object.entries(agent.traits)
            .map(([trait, value]) => `${trait}: ${value}`)
            .join(", ")})`,
      )
      .join(" | "),
  );
  console.log("Debate Topic:", topic);

  for (let i = 0; i < agents.length + 2; i++) {
    if (controller?.aborted) {
      console.log("Debate execution cancelled by controller.");
      break;
    }

    const agentIndex = i % agents.length;
    const isSecondPhase = i >= agents.length;
    const agent = agents[agentIndex];

    if (isSecondPhase) {
      console.log("Second Phase has started");

      if (onEvent) {
        onEvent({
          type: "PHASE_CHANGE",
          phase: "second_pass",
          voterId: agent.id,
          voterName: agent.name,
        });
      }

      // Agent 0: cast both votes after everyone has spoken
      if (agentIndex === 0) {
        await castVotes(agent, agents, agents, context, "BOTH", scores, onEvent);
      }

      // Agent 1: cast the remaining vote type from their first-pass choice
      if (agentIndex === 1) {
        const remainingVoteType: "POSITIVE" | "NEGATIVE" =
          firstVoteType === "POSITIVE" ? "NEGATIVE" : "POSITIVE";
        console.log(`${agent.name} decided to cast: ${remainingVoteType} vote`);
        await castVotes(
          agent,
          agents,
          agents,
          context,
          remainingVoteType,
          scores,
          onEvent,
        );
      }

      continue;
    }

    console.log("Initialising , first phase");

    if (onEvent) {
      onEvent({
        type: "PHASE_CHANGE",
        phase: "first_pass",
        speakingId: agent.id,
        speakingName: agent.name,
      });
    }

    let prompt = buildPrompt(agent, topic, context);
    let ollamaResponse = await askOllama(prompt);
    ollamaResponse = ollamaResponse.replace("That's all from my side.", "").trim();
    context.push(`${agent.id}: ${ollamaResponse}`);
    awardSpeakingPoints(scores, agent.id);
    console.log(`\n\n${agent.name}'s thoughts: \n${ollamaResponse}\n\n`);

    if (onEvent) {
      onEvent({
        type: "SCORE_UPDATE",
        standings: displayStandings(scores),
      });
      onEvent({
        type: "AGENT_SPEAKING",
        agentId: agent.id,
        agentName: agent.name,
        text: ollamaResponse,
      });
    }

    // Agent 0 speaks only — votes in second phase
    if (i === 0) continue;

    // Agents who already spoke (excluding self) are eligible vote targets
    const spokenOthers = agents.slice(0, i);

    // Agent 1: cast exactly one vote type now; remaining in second phase
    if (i === 1) {
      const voteTypeResponse = buildDecideVoteTypePrompt(agent, topic, context);
      const agentVoteType = await askOllama(voteTypeResponse);
      firstVoteType = agentVoteType.toUpperCase().includes("POSITIVE")
        ? "POSITIVE"
        : "NEGATIVE";
      console.log(`${agent.name} decided to cast: ${firstVoteType} vote`);
      await castVotes(
        agent,
        agents,
        spokenOthers,
        context,
        firstVoteType,
        scores,
        onEvent,
      );
      continue;
    }

    // Agents 2+: cast both votes among speakers so far
    await castVotes(agent, agents, spokenOthers, context, "BOTH", scores, onEvent);
  }

  const standings = displayStandings(scores);

  if (onEvent) {
    onEvent({
      type: "DEBATE_END",
      standings,
    });
  }

  return standings;
}
