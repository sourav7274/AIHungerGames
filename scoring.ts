import "./logger";
import { Agent, TournamentReport } from "./structure";
import { AgentScore } from "./structure";

export const SCORE = {
  SPEAK: 1,
  VOTE_FOR: 1,
  VOTE_AGAINST: 1, // subtracted; for/against have equal weight
} as const;

export const initializeScores = (agents: Agent[]): AgentScore[] => {
  return agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    score: 0,
    timeSpoken: 0,
    votesCast: 0,
  }));
};

export const initializeScoresForTournament = (
  agents: Agent[],
): TournamentReport[] => {
  return agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    roundsPlayed: 0,
    totalPoints: 0,
    averagePoints: 0,
  }));
};

/** Merge current-round points into tournament history; keep eliminated agents. */
export const UpdateTournamentScores = (
  agents: Agent[],
  tournamentScores: TournamentReport[],
  roundPoints: Array<{ id: string; name: string; score: number }>,
): TournamentReport[] => {
  const byId = new Map<string, TournamentReport>();
  for (const score of tournamentScores) {
    byId.set(score.id, { ...score });
  }

  for (const agent of agents) {
    const existing = byId.get(agent.id);
    const roundPoint = roundPoints.find((s) => s.id === agent.id);
    const gained = roundPoint?.score ?? 0;

    if (existing) {
      const roundsPlayed = existing.roundsPlayed + 1;
      const totalPoints = existing.totalPoints + gained;
      byId.set(agent.id, {
        id: agent.id,
        name: agent.name,
        roundsPlayed,
        totalPoints,
        averagePoints: totalPoints / roundsPlayed,
      });
    } else {
      byId.set(agent.id, {
        id: agent.id,
        name: agent.name,
        roundsPlayed: 1,
        totalPoints: gained,
        averagePoints: gained,
      });
    }
  }

  return Array.from(byId.values());
};

export const awardSpeakingPoints = (scores: AgentScore[], agentId: string) => {
  const agentScore = scores.find((s) => s.id === agentId);
  if (agentScore) {
    agentScore.score += SCORE.SPEAK;
    agentScore.timeSpoken += 1;
  }
};

export const applyVote = (
  scores: AgentScore[],
  voteType: string,
  agentId: string,
) => {
  const agentScore = scores.find((s) => s.id === agentId);
  if (!agentScore) return;
  if (voteType === "POSITIVE") agentScore.score += SCORE.VOTE_FOR;
  else agentScore.score -= SCORE.VOTE_AGAINST;
};

export const recordVoteCast = (scores: AgentScore[], voterId: string) => {
  const voter = scores.find((s) => s.id === voterId);
  if (voter) voter.votesCast += 1;
};

export const displayStandings = (scores: AgentScore[]) => {
  return [...scores]
    .sort((a, b) => b.score - a.score)
    .map((agent) => ({
      id: agent.id,
      name: agent.name,
      score: agent.score,
    }));
};

/** Extract POSITIVE/NEGATIVE target tokens from model output. */
export const parseVote = (modelOutput: string) => {
  const positiveVote = modelOutput.match(/POSITIVE:\s*([^\n\r,]+)/i);
  const negativeVote = modelOutput.match(/NEGATIVE:\s*([^\n\r,]+)/i);
  if (!positiveVote && !negativeVote) return null;

  const clean = (raw?: string) =>
    raw
      ?.replace(/[\[\]]/g, "")
      .replace(/^id[:=\s]+/i, "")
      .trim();

  return {
    positive: clean(positiveVote?.[1]),
    negative: clean(negativeVote?.[1]),
  };
};
