import "./logger";
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

const baseNames = ["Nova", "Echo", "Vortex", "Atlas", "Nyx", "Orion", "Zara"];

function randNum(min:number, max:number):number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUniqueName(excludeNames: string[]): string {
    let available = baseNames.filter(n => !excludeNames.includes(n));
    if (available.length > 0) {
        return available[randNum(0, available.length - 1)];
    }
    // All base names taken — append numeric suffix
    let counter = 1;
    while (true) {
        for (const base of baseNames) {
            const candidate = `${base}${counter}`;
            if (!excludeNames.includes(candidate)) return candidate;
        }
        counter++;
    }
}

export const generateAgent = (count:number=1, excludeNames:string[]=[]):Agent[]=>{
    console.log(`Generating ${count} agents, excluding names: [${excludeNames.join(", ")}]`)
    let agents:Agent[] = []
    let usedNames = [...excludeNames]
    for(let i=0; i<count; i++){
        const name = generateUniqueName(usedNames);
        usedNames.push(name);
        const agent:Agent = {
            id: Math.random().toString(36).substring(2, 10),
            name,
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

export const createCustomAgents = (customAgents: { name: string; traits: { aggression: number; logic: number; emotion: number; confidence: number }; style: string; bias: string }[]): Agent[] => {
    return customAgents.map(ca => ({
        id: Math.random().toString(36).substring(2, 10),
        name: ca.name,
        traits: {
            aggression: ca.traits.aggression,
            logic: ca.traits.logic,
            emotion: ca.traits.emotion,
            confidence: ca.traits.confidence,
        },
        style: ca.style,
        bias: ca.bias,
    }));
}

export { styles, biases, baseNames as names };
