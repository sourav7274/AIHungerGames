import { Agent } from "./structure";
import { Traits } from "./structure";
import {buildPrompt} from "./prompt";

export const context = []

const styles = [
  "sarcastic",
  "formal",
  "aggressive",
  "calm",
  "philosophical",
];

const biases = [
  "targets emotional arguments",
  "distrusts logical people",
  "agrees with confident speakers",
  "prefers unique opinions",
  "attacks weak arguments",
];

const names = ["Nova", "Echo", "Vortex", "Atlas", "Nyx", "Orion", "Zara"];

function randNum(min:number, max:number):number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const generateAgent = (count:number=1,excludeNames:string[]=[]):Agent[]=>{
    console.log(`Generating ${count} agents...`)
    let shuffledNames = shuffleNames().filter(n => !excludeNames.includes(n))
    let agents:Agent[] = []
    for(let i=0; i<count; i++){
        const agent:Agent = {
            id: Math.random().toString(36).substring(2, 10) ,
            name: shuffledNames[i],
            traits:{
                aggression: randNum(1, 10),
                logic: randNum(1, 10),
                emotion: randNum(1, 10),
                confidence: randNum(1, 10),
            },
            style: styles[randNum(0, styles.length - 1)],
            bias: biases[randNum(0, biases.length - 1)],
        }
        agents.push(agent)
    }        
    return agents
}

function shuffleNames(){
    return names.sort(() => Math.random() - 0.5);
}

