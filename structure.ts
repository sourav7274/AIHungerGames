import "./logger";

export type Traits = {
    aggression:number,
    logic:number,
    emotion:number,
    confidence:number,
}

export type Agent= {
    id:string,
    name:string,
    traits:Traits,
    style:string,
    bias:string,
    roundsPlayed?:number
}

export interface AgentScore {
    id:string,
    name:string,
    score:number,
    timeSpoken:number,
    votesCast:number,
}

export interface TournamentReport {
    id: string
    name: string
    roundsPlayed: number
    totalPoints: number
    averagePoints: number 
}