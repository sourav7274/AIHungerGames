# 🎭AI Hunger Games

A multi-agent debate tournament system powered by a local LLM (Ollama). Agents with unique personalities debate topics, vote on each other, and compete across multiple rounds until a winner is declared.

---

## What It Does

- Generates AI agents with randomized traits (aggression, logic, emotion, confidence), speaking styles, and biases
- Agents debate a given topic in turns, responding to each other's arguments
- After each speaking round, agents vote for and against each other
- Scores are tracked per round and across the tournament
- Bottom agents are eliminated each round, replaced by fresh ones
- Winner is determined by highest average points per round

---

## Project Structure

```
src/
  structure.ts   — Interfaces: Agent, AgentScore, TournamentReport
  agent.ts       — Agent generation with unique names and randomized traits
  prompt.ts      — Prompt builders for speaking, voting, and vote-type decision
  ollama.ts      — Ollama API client (llama3.2:3b)
  scoring.ts     — Score tracking, vote parsing, standings, tournament records
  debate.ts      — Core debate loop: speaking phase + voting phase
  tournament.ts  — Tournament orchestration: rounds, elimination, winner
```

---

## Debate Flow

```
Round starts
  → Each agent speaks in turn (sees all previous responses)
  → Agent[0] skips voting in first pass
  → Agent[1] casts ONE vote (positive OR negative) based on Agent[0]'s response
  → Agent[2+] cast BOTH votes (positive AND negative)
Second pass
  → Agent[0] casts BOTH votes
  → Agent[1] casts their remaining vote type
Scores updated
  → Speaking: +1 per agent
  → Positive vote received: +1
  → Negative vote received: -1
  → For and against have equal weight; speak order is shuffled each round
```

---

## Tournament Flow

```
5 rounds total
  → 5 agents debate per round
  → Bottom agents eliminated after each round
  → Fresh agents replace eliminated ones
  → Tournament score tracked by average points per round (totalPoints / roundsPlayed)
  → Winner declared after final round
```

---

## Tech Stack

- **Runtime:** Node.js + TypeScript (tsx)
- **LLM:** Ollama (llama3.2:3b) running locally
- **No external APIs** — fully offline

---

## Setup

```bash
# Install dependencies
npm install ollama

# Pull the model
ollama pull llama3.2:3b

# Start Ollama server
ollama serve

# Run the tournament
tsx tournament.ts
```

---

## Status

Work in progress. Core debate and tournament logic is functional. Deployment and frontend coming soon.