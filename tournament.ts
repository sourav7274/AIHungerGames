import "./logger";
import { runDebate } from "./debate";
import { TournamentReport, Agent, AgentScore } from "./structure";
import { generateAgent } from "./agent";
import {
  initializeScoresForTournament,
  UpdateTournamentScores,
} from "./scoring";

const TOURNAMENT_CONFIG = {
  totalRounds: 2,
  agentsPerRound: 3,
  eliminatePerRound: 1,
  freshAgentsPerRound: 1,
};

let debateTopics = [
  "Should humans pursue immortality?",
  "Is AI a threat to humanity?",
  "Should we colonize Mars?",
  "Is democracy the best form of government?",
  "Should we prioritize economic growth over environmental protection?",
];

async function getRoundReport(agents: Agent[]) {
  const randomTopic =
    debateTopics[Math.floor(Math.random() * debateTopics.length)];
  const standings = await runDebate(randomTopic, 5, agents);
  return standings;
}

async function runTournament() {
  let agents = generateAgent(TOURNAMENT_CONFIG.agentsPerRound,[]);
  let tournamentScore = initializeScoresForTournament(agents);
  console.log(
    "*********************    TOURNAMENT START    *********************",
  );
  for (let round = 1; round <= TOURNAMENT_CONFIG.totalRounds; round++) {
    console.log(`\n\n**********    ROUND ${round} START    **********\n\n`);
    const roundReport = await getRoundReport(agents);
    console.log("Round Report:", roundReport);
    console.log(`\n\n**********    ROUND ${round} END    **********\n\n`);
    tournamentScore = UpdateTournamentScores(
      agents,
      tournamentScore,
      roundReport,
    );
    console.log("Updated Tournament Scores:", tournamentScore);
    // Eliminate lowest scoring agents
    if (round < TOURNAMENT_CONFIG.totalRounds) {
      const sortedByScore = [...tournamentScore].sort((a, b) => {
        const avgA = a.roundsPlayed > 0 ? a.totalPoints / a.roundsPlayed : 0;
        const avgB = b.roundsPlayed > 0 ? b.totalPoints / b.roundsPlayed : 0;
        return avgA - avgB;
      });
      const agentsToEliminate = sortedByScore.slice(
        0,
        TOURNAMENT_CONFIG.eliminatePerRound,
      );
      const remainingAgents = agents.filter(
        (a) => !agentsToEliminate.some((e) => e.id === a.id),
      );
      const newAgents = generateAgent(TOURNAMENT_CONFIG.freshAgentsPerRound,agentsToEliminate.map(a => a.name));
      agents = [...remainingAgents, ...newAgents];
    }
  }
  console.log("Tournament Report:", tournamentScore);
  console.log(
    "*********************    TOURNAMENT END    *********************",
  );

  console.log("Final Standings:");
  tournamentScore.forEach((agent, index) => {
    console.log(
      `${index + 1}. ${agent.name}: ${(agent.totalPoints / agent.roundsPlayed).toFixed(2)}`,
    );
  });
  console.log(
    "Winner:",
    tournamentScore.reduce((prev, current) =>
      prev.totalPoints / prev.roundsPlayed >
      current.totalPoints / current.roundsPlayed
        ? prev
        : current,
    ).name,
  );
  console.log("Detailed Report:", tournamentScore);
}

runTournament();
