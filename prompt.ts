import "./logger";
import { Agent } from "./structure";

export function buildDecideVoteTypePrompt(
  agent: Agent,
  topic: string,
  context: string[],
): string {
  return `
You are ${agent.name}.
Your personality:
- Aggression: ${agent.traits.aggression}/10
- Logic: ${agent.traits.logic}/10
- Emotion: ${agent.traits.emotion}/10
- Confidence: ${agent.traits.confidence}/10

Your speaking style: ${agent.style}
Your bias: ${agent.bias}

Debate topic: ${topic}

Debate so far:
${context.join("\n")}

Choose whether your FIRST vote should be POSITIVE or NEGATIVE based on argument quality — not speaking order.
Do NOT default to rewarding whoever spoke first.
Reply with ONLY one word: POSITIVE or NEGATIVE
`;
}

export function buildPrompt(
  agent: Agent,
  topic: string,
  context: string[],
): string {
  return `
You are ${agent.name}.
Your personality:
- Aggression: ${agent.traits.aggression}/10
- Logic: ${agent.traits.logic}/10
- Emotion: ${agent.traits.emotion}/10
- Confidence: ${agent.traits.confidence}/10

Your speaking style: ${agent.style}
Your bias: ${agent.bias}

Debate topic: ${topic}

Other responses in the debate:
${context.join("\n")}

Rules:
- Stay in character
- Be concise (max 80 words)
- Respond like a human debater
- Use your traits to guide your responses
- Avoid repetition and generic statements
- Focus on the debate topic and counterarguments
- Challenge weak points even if they came from an early speaker
- Mention "That's all from my side." at the end of your response to signal the end of your turn.
`;
}

export const buildVotePrompt = (
  voter: Agent,
  eligibleAgents: Agent[],
  context: string[],
  voteType: "POSITIVE" | "NEGATIVE" | "BOTH",
) => {
  const registry = eligibleAgents
    .filter((a) => a.id !== voter.id)
    .map((a) => `- ${a.name} → ID: ${a.id}`)
    .join("\n");

  return `You are ${voter.name}.
Your personality:
- Aggression: ${voter.traits.aggression}/10
- Logic: ${voter.traits.logic}/10
- Emotion: ${voter.traits.emotion}/10
- Confidence: ${voter.traits.confidence}/10

Your speaking style: ${voter.style}
Your bias: ${voter.bias}

VOTER REGISTRY — YOU MUST USE THESE EXACT IDs:
${registry}

YOUR OWN ID (DO NOT USE): ${voter.id}

Debate responses:
${context.join("\n")}

${
  voteType === "BOTH"
    ? `Cast TWO votes on DIFFERENT agents:
POSITIVE: [agentId], REASON: [reason], OPINION: [your opinion]
NEGATIVE: [agentId], REASON: [reason], OPINION: [your opinion]`
    : voteType === "POSITIVE"
      ? `Cast ONE positive vote only:
POSITIVE: [agentId], REASON: [reason], OPINION: [your opinion]`
      : `Cast ONE negative vote only:
NEGATIVE: [agentId], REASON: [reason], OPINION: [your opinion]`
}

CRITICAL VOTING RULES:
- Judge argument quality only. Speaking order does NOT matter.
- Do NOT bandwagon: do not always reward the first speaker or the most confident tone.
- Prefer the strongest reasoning for POSITIVE and the weakest/most flawed for NEGATIVE.
- Use your bias (${voter.bias}) and traits to choose DISTINCT targets from other voters when possible.
- POSITIVE and NEGATIVE must be two different agent IDs (when casting both).
- Use agent IDs from the registry only — never your own ID (${voter.id}).
- Follow the exact format. No preamble. Max 3 lines.
- Start DIRECTLY with POSITIVE: or NEGATIVE:
`;
};
