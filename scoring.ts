import "./logger";
import { Agent, TournamentReport } from "./structure";
import { AgentScore } from "./structure";

export const initializeScores = (agents: Agent[]): AgentScore[] => {
  let scores:AgentScore[] = []
  for (let agent of agents) {
    scores.push({
        id:agent.id,
        name:agent.name,
        score:0,
        timeSpoken:0,
        votesCast:0,
    })
  }
  return scores
}

export const initializeScoresForTournament = (agents: Agent[]): TournamentReport[] => {
  let scores:TournamentReport[] = []
  for (let agent of agents) {
    scores.push({
        id:agent.id,
        name:agent.name,
        roundsPlayed:0,
        totalPoints:0,
        averagePoints:0,
    })
  }
  return scores
}

export const UpdateTournamentScores = (agents: Agent[],tournamentScores:TournamentReport[],roundPoints:any[]):TournamentReport[] =>{
  let updatedScores:TournamentReport[] = []
  for (let agent of agents) {
    const existingScore = tournamentScores.find(s => s.id === agent.id);
    const roundPoint = roundPoints.find(s => s.id === agent.id);
    if(existingScore){
        updatedScores.push({
            id:agent.id,
            name:agent.name,
            roundsPlayed:existingScore.roundsPlayed + 1,
            totalPoints:existingScore.totalPoints + (roundPoint?.score || 0),
            averagePoints: (existingScore.totalPoints + (roundPoint?.score || 0)) / (existingScore.roundsPlayed + 1)
        })
    } else {
        updatedScores.push({
            id:agent.id,
            name:agent.name,
            roundsPlayed:1,
            totalPoints:roundPoint?.score || 0,
            averagePoints: roundPoint?.score || 0
        })
    }
  }
  return updatedScores  
}

export const  awardSpeakingPoints = (scores:AgentScore[],agentId:string) =>{
    const agentScore = scores.find(s => s.id === agentId);
    if(agentScore){
        agentScore.score += 1;
        agentScore.timeSpoken += 1;
    }
}

export const applyVote = (scores:AgentScore[],voteType:string,agentId:string) => {
    let agentScore = scores.find(s => s.id === agentId);
    if(agentScore)
    {
       voteType == "POSITIVE" ? agentScore.score+=2  : agentScore.score-=1
    }
}

export const displayStandings = (scores:AgentScore[]) =>{
   let sortedStandings = scores.sort((a,b)=> b.score -a.score)
   
   let finalOutut = sortedStandings.map((agent) =>({
     id:agent.id,
     name:agent.name,
     score:agent.score
   }))
   return finalOutut
}

export const parseVote  = (modelOutput:string) =>{
  let positiveVote = modelOutput.match(/POSITIVE:\s*([^,]+)/)
  let negativeVote = modelOutput.match(/NEGATIVE:\s*([^,]+)/)
  if(!positiveVote && !negativeVote) return null
  return { positive:positiveVote?.at(1)?.replace("id=", "").trim(),negative:negativeVote?.at(1)?.replace("id=", "").trim()  }
}
