import "./logger";
import { Agent,AgentScore } from "./structure"

let TournamentState = {
    // Tournament level
    currentRound: Number,
    totalRounds: Number,
    topics: [String],
    
    // Agent level  
    agents: Agent[],
    eliminatedAgents: Agent[],
    tournamentRecords: TournamentRecord[],
    
    // Round level
    scores: AgentScore[],
    context: string[],
    agent1VoteType: "POSITIVE" | "NEGATIVE" | null,
    currentPhase: "speaking" | "voting" | "elimination" | "complete"
}