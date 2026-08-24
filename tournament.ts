import "./logger";
import { runDebate } from "./debate";
import { TournamentReport, Agent, AgentScore } from "./structure";
import { generateAgent, createCustomAgents } from "./agent";
import {
  initializeScoresForTournament,
  UpdateTournamentScores,
} from "./scoring";

export const TOURNAMENT_CONFIG = {
  totalRounds: 5,
  agentsPerRound: 5,
  eliminatePerRound: 1,
  freshAgentsPerRound: 1,
};

export let debateTopics = [
  "Should humans pursue immortality?",
  "Is AI a threat to humanity?",
  "Should we colonize Mars?",
  "Is democracy the best form of government?",
  "Should we prioritize economic growth over environmental protection?",
];

function shuffleAgents(list: Agent[]): Agent[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function getRoundReport(agents: Agent[], topic: string, onEvent?: (event: any) => void, controller?: { aborted: boolean }) {
  const standings = await runDebate(topic, agents, onEvent, controller);
  return standings;
}

export async function runTournament(
  customTopic?: string,
  onEvent?: (event: any) => void,
  controller?: { aborted: boolean },
  config?: { totalRounds?: number; agentsPerRound?: number; customAgents?: { name: string; traits: { aggression: number; logic: number; emotion: number; confidence: number }; style: string; bias: string }[] },
  waitForContinue?: (round: number) => Promise<void>
) {
  const totalRounds = config?.totalRounds ?? TOURNAMENT_CONFIG.totalRounds;
  const agentsPerRound = config?.agentsPerRound ?? TOURNAMENT_CONFIG.agentsPerRound;
  
  let agents: Agent[];
  if (config?.customAgents && config.customAgents.length > 0) {
    const custom = createCustomAgents(config.customAgents);
    const remaining = Math.max(0, agentsPerRound - custom.length);
    const generated = remaining > 0 ? generateAgent(remaining, custom.map(a => a.name)) : [];
    agents = [...custom, ...generated];
  } else {
    agents = generateAgent(agentsPerRound, []);
  }
  
  let tournamentScore = initializeScoresForTournament(agents);
  
  if (onEvent) {
    onEvent({
      type: "TOURNAMENT_START",
      config: { ...TOURNAMENT_CONFIG, totalRounds, agentsPerRound },
      agents
    });
  }

  console.log(
    "*********************    TOURNAMENT START    *********************",
  );
  
  for (let round = 1; round <= totalRounds; round++) {
    if (controller?.aborted) {
      console.log("Tournament execution cancelled by controller.");
      break;
    }
    console.log(`\n\n**********    ROUND ${round} START    **********\n\n`);
    
    // Shuffle speak/vote order each round so the first seat isn't always favored
    agents = shuffleAgents(agents);
    console.log(
      "Speak order this round:",
      agents.map((a) => a.name).join(" → "),
    );

    // Choose topic: use customTopic if provided, otherwise random topic
    const topic = customTopic || debateTopics[Math.floor(Math.random() * debateTopics.length)];
    
    if (onEvent) {
      onEvent({
        type: "ROUND_START",
        round,
        topic,
        agents
      });
    }

    const roundReport = await getRoundReport(agents, topic, onEvent, controller);
    console.log("Round Report:", roundReport);
    console.log(`\n\n**********    ROUND ${round} END    **********\n\n`);
    
    tournamentScore = UpdateTournamentScores(
      agents,
      tournamentScore,
      roundReport,
    );
    
    if (onEvent) {
      onEvent({
        type: "ROUND_END",
        round,
        roundReport,
        tournamentScore
      });
    }

    console.log("Updated Tournament Scores:", tournamentScore);
    
    // Eliminate lowest-average agents among those still active this round
    if (round < totalRounds) {
      const activeIds = new Set(agents.map((a) => a.id));
      const sortedByScore = tournamentScore
        .filter((s) => activeIds.has(s.id))
        .sort((a, b) => {
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
      const newAgents = generateAgent(
        TOURNAMENT_CONFIG.freshAgentsPerRound,
        agents.map((a) => a.name),
      );
      agents = [...remainingAgents, ...newAgents];

      if (onEvent) {
        onEvent({
          type: "AGENT_ELIMINATED",
          eliminated: agentsToEliminate.map((a) => ({ id: a.id, name: a.name })),
          introduced: newAgents,
        });
      }

      // Wait for user to signal continue
      if (waitForContinue) {
        await waitForContinue(round);
      }
    }
  }
  
  console.log("Tournament Report:", tournamentScore);
  console.log(
    "*********************    TOURNAMENT END    *********************",
  );

  console.log("Final Standings:");
  const finalSorted = [...tournamentScore].sort(
    (a, b) =>
      b.totalPoints / Math.max(b.roundsPlayed, 1) -
      a.totalPoints / Math.max(a.roundsPlayed, 1),
  );
  finalSorted.forEach((agent, index) => {
    console.log(
      `${index + 1}. ${agent.name}: ${(agent.totalPoints / Math.max(agent.roundsPlayed, 1)).toFixed(2)}`,
    );
  });

  const winner = finalSorted[0];
  
  console.log("Winner:", winner.name);
  console.log("Detailed Report:", tournamentScore);
  
  if (onEvent) {
    onEvent({
      type: "TOURNAMENT_END",
      standings: tournamentScore,
      winner: {
        id: winner.id,
        name: winner.name,
        averagePoints: winner.totalPoints / winner.roundsPlayed
      }
    });
  }
}

// Only run automatically if executed directly from CLI
if (require.main === module) {
  runTournament();
}
