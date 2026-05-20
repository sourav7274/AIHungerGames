import { generateAgent } from "./agent";
import { Agent } from "./structure";
import { Traits } from "./structure";

export function  buildDecideVoteTypePrompt (agent: Agent, topic: string, context: string[]):string{
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

      First Agents's response : ${context}

      Based on their response , do you want to cast a POSITIVE or NEGATIVE vote first?
      Reply with ONLY one word: POSITIVE or NEGATIVE
     `
 }

export function buildPrompt(agent: Agent, topic: string, context: string[]):any{
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
    - Mention "That's all from my side." at the end of your response to signal the end of your turn. 
  `
}

export const buildVotePrompt  = (voter:Agent,eligibleAgents:Agent[],context:string[],voteType: "POSITIVE" | "NEGATIVE" | "BOTH") =>{
 return  ` You are ${voter.name}.
    Your personality:
    - Aggression: ${voter.traits.aggression}/10
    - Logic: ${voter.traits.logic}/10
    - Emotion: ${voter.traits.emotion}/10
    - Confidence: ${voter.traits.confidence}/10

    Your speaking style: ${voter.style}
    Your bias: ${voter.bias}

    VOTER REGISTRY - YOU MUST USE THESE EXACT IDs:
    ${eligibleAgents.filter(a => a.id !== voter.id).map(a => `- ${a.name} → ID: ${a.id}`).join("\n")}

    YOUR OWN ID (DO NOT USE): ${voter.id}

    Other responses in the debate:
    ${context.join("\n")}

    You have to cast votes , 1 positive and 1 negative  give your own opinion and also reasons on why you cast
    the votes ,in this order 

    ${voteType === "BOTH" ? `
    You must cast TWO votes, one positive and one negative:
    POSITIVE: [agentId], REASON: [reason], OPINION: [your opinion]
    NEGATIVE: [agentId], REASON: [reason], OPINION: [your opinion]
    ` : voteType === "POSITIVE" ? `
    You must cast ONE positive vote only:
    POSITIVE: [agentId], REASON: [reason], OPINION: [your opinion]
    ` : `
    You must cast ONE negative vote only:
    NEGATIVE: [agentId], REASON: [reason], OPINION: [your opinion]
    `}

    RULES:-
    - In the context of the debate , please check the previous responses and  based on the context decide who to vote for
    - Use the agent's ID in the POSITIVE and NEGATIVE fields, not their name
    - You cannot vote for yourself (your name is ${voter.name}, and your id is ${voter.id}), the context provided is a array of strings exmaple : [ "agentId1: response1", "agentId2: response2" , .... ] , so check this and cross check your id vs the id of the agent you are trying to vote, only vote , if they are differet

    - You must follow the exact format, no extra text before or after
    - You must only vote in the context provided
    - You must ONLY cast the vote type instructed, nothing more
    - Do NOT repeat or copy the debate context in your response
    - Start your response DIRECTLY with POSITIVE: or NEGATIVE:, no preamble
    - Your entire response must be 3 lines maximum
    - Do not include any agent responses or quotes in your vote
  ` ;
}
