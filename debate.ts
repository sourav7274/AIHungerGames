import { generateAgent } from "./agent";
import { buildVotePrompt, buildPrompt, buildDecideVoteTypePrompt } from "./prompt";
import { askOllama } from "./ollama";
import { Agent,AgentScore } from "./structure";
import { Traits } from "./structure";
import {
  applyVote,
  awardSpeakingPoints,
  displayStandings,
  initializeScores,
  parseVote,
} from "./scoring";

function resolveToId(value: string, agents: Agent[]): string | undefined {
  const idMatch = value.match(/id:([a-z0-9]+)/)
  if(idMatch) return idMatch[1]
  const byId = agents.find((a) => a.id === value);
  if (byId) return byId.id;
  const byName = agents.find(
    (a) => a.name.toLowerCase() === value.toLowerCase().trim(),
  );
  if (byName) return byName.id;
  return undefined;
}

function applyVoteSafely(
  scores: AgentScore[], 
  voteType: "POSITIVE" | "NEGATIVE",
  voterId: string,
  targetId: string | undefined,
  agents: Agent[]
) {
  if(!targetId) {
    console.log(`Vote target not found, skipping...`)
    return
  }
  if(targetId === voterId) {
    console.log(`Agent tried to vote for themselves, skipping...`)
    return
  }
  applyVote(scores, voteType, targetId)
  const targetName = agents.find(a => a.id === targetId)?.name
  console.log(`Vote applied: ${voteType} → ${targetName}`)
}

export async function runDebate(topic: string, agentCount: number,agents:Agent[]) {
  let context: string[] = [];
  const scores = initializeScores(agents);
  let voteType
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

    const agentIndex = i % agents.length
    const isSecondPhase = i >= agents.length
    const agent = agents[agentIndex]

    if (isSecondPhase) {
      console.log("Second Phase has started")
      if(agentIndex == 0)
      {
        let agentVote = buildVotePrompt(agent, agents, context,"BOTH");
        let voteResponse = await askOllama(agentVote);
        console.log("vote Response:\n", voteResponse);
        let parsed = parseVote(voteResponse);
        console.log("Parsed vote:", parsed);
        if (parsed) {
          let positiveId = resolveToId(parsed.positive || "", agents);
          let negativeId = resolveToId(parsed.negative || "", agents);
          
          console.log(`${agent.name}'s Vote in favour:`, agents.find(a => a.id === positiveId)?.name || "None");
          console.log(`${agent.name}'s Vote against:`, agents.find(a => a.id === negativeId)?.name || "None");
          
          applyVoteSafely(scores, "POSITIVE", agent.id, positiveId, agents);
          applyVoteSafely(scores, "NEGATIVE", agent.id, negativeId, agents);
        } else {
          console.log("Could not parse votes.");
        }
      } 
      if(agentIndex == 1)
      {
        let remainingVoteType =  voteType === "POSITIVE" ? "NEGATIVE" : "POSITIVE"
        console.log(`${agent.name} decided to cast: ${remainingVoteType} vote`)

        let agentVote = buildVotePrompt(agent, agents, context, remainingVoteType)
        let voteResponse = await askOllama(agentVote)
        let parsed = parseVote(voteResponse)
      
      if(parsed && remainingVoteType === "NEGATIVE") {
        const resolvedNegative = resolveToId(parsed.negative || "", agents)
        if(resolvedNegative === agent.id) {
            console.log(`${agent.name} tried to vote against themselves, retrying...`)
            const retryVote = await askOllama(agentVote + 
                "\n IMPORTANT: Your last vote was invalid because you voted for yourself. Try again.")
            const retryParsed = parseVote(retryVote)
            if (retryParsed) {
              const retryResolved = resolveToId(retryParsed.negative || "", agents)
              applyVoteSafely(scores, "NEGATIVE", agent.id, retryResolved, agents)
            }
            continue
        }
        applyVoteSafely(scores, "NEGATIVE", agent.id, resolvedNegative, agents)
      } else if (parsed && remainingVoteType === "POSITIVE") {
        const resolvedPositive = resolveToId(parsed.positive || "", agents)
        if(resolvedPositive === agent.id) {
            console.log(`${agent.name} tried to vote for themselves, retrying...`)
            const retryVote = await askOllama(agentVote + 
                "\n IMPORTANT: Your last vote was invalid because you voted for yourself. Try again.")
            const retryParsed = parseVote(retryVote)
            if (retryParsed) {
              const retryResolved = resolveToId(retryParsed.positive || "", agents)
              applyVoteSafely(scores, "POSITIVE", agent.id, retryResolved, agents)
            }
            continue
        }
        applyVoteSafely(scores, "POSITIVE", agent.id, resolvedPositive, agents)
      }
      }
    }

    else
    {
    console.log("Initialising , first phase")
    let prompt = buildPrompt(agent, topic, context);
    let ollamaResponse = await askOllama(prompt);
    ollamaResponse = ollamaResponse
      .replace("That's all from my side.", "")
      .trim();
    context.push(`${agents[i].id}: ${ollamaResponse}`);
    awardSpeakingPoints(scores, agents[i].id);
    console.log(`\n\n${agents[i].name}'s thoughts: \n${ollamaResponse}\n\n`);
    if(i == 0) continue
    if(i == 1) {
      let voteTypeResponse = buildDecideVoteTypePrompt(agent, topic, context)
      let agentVoteType = await askOllama(voteTypeResponse)

      voteType = agentVoteType.toUpperCase().includes("POSITIVE") ? "POSITIVE" : "NEGATIVE"
      console.log(`${agent.name} decided to cast: ${voteType} vote`)
      const spokenAgents = agents.slice(0, i)
      let agentVote = buildVotePrompt(agent, spokenAgents, context, voteType)
      // break
      let voteResponse = await askOllama(agentVote)
      let parsed = parseVote(voteResponse)
      
      if(parsed && voteType === "NEGATIVE") {
        const resolvedNegative = resolveToId(parsed.negative || "", agents)
        if(resolvedNegative === agent.id) {
            console.log(`${agent.name} tried to vote against themselves, retrying...`)
            const retryVote = await askOllama(agentVote + 
                "\n IMPORTANT: Your last vote was invalid because you voted for yourself. Try again.")
            const retryParsed = parseVote(retryVote)
            if (retryParsed) {
              const retryResolved = resolveToId(retryParsed.negative || "", agents)
              applyVoteSafely(scores, "NEGATIVE", agent.id, retryResolved, agents)
            }
            continue
        }
        applyVoteSafely(scores, "NEGATIVE", agent.id, resolvedNegative, agents)
      } else if (parsed && voteType === "POSITIVE") {
        const resolvedPositive = resolveToId(parsed.positive || "", agents)
        if(resolvedPositive === agent.id) {
            console.log(`${agent.name} tried to vote for themselves, retrying...`)
            const retryVote = await askOllama(agentVote + 
                "\n IMPORTANT: Your last vote was invalid because you voted for yourself. Try again.")
            const retryParsed = parseVote(retryVote)
            if (retryParsed) {
              const retryResolved = resolveToId(retryParsed.positive || "", agents)
              applyVoteSafely(scores, "POSITIVE", agent.id, retryResolved, agents)
            }
            continue
        }
        applyVoteSafely(scores, "POSITIVE", agent.id, resolvedPositive, agents)
      }
      continue
    }
    const spokenAgents = agents.slice(0, i)
    let agentVote = buildVotePrompt(agent, spokenAgents, context, "BOTH");
    let voteResponse = await askOllama(agentVote);
    console.log("vote Response:\n", voteResponse);
    let parsed = parseVote(voteResponse);
    console.log("Parsed vote:", parsed);
    if (parsed) {
      let positiveId = resolveToId(parsed.positive || "", agents);
      let negativeId = resolveToId(parsed.negative || "", agents);
      
      console.log(`${agent.name}'s Vote in favour:`, agents.find(a => a.id === positiveId)?.name || "None");
      console.log(`${agent.name}'s Vote against:`, agents.find(a => a.id === negativeId)?.name || "None");
      
      applyVoteSafely(scores, "POSITIVE", agent.id, positiveId, agents);
      applyVoteSafely(scores, "NEGATIVE", agent.id, negativeId, agents);
    } else {
      console.log("Could not parse votes.");
    }
    }
  }
  let standinds = displayStandings(scores);
  return standinds
}

