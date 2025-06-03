# SDOF Integrator Rules

This directory contains the rules and task definitions for the SDOF Integrator mode, responsible for Phase 5 of the Structured Decision Optimization Framework (SDOF).

## Overview

- Integrates learnings from previous phases
- Compares actual vs predicted performance
- Documents key learnings and suggests heuristic updates
- Returns integration summary via MDTM tasks and `attempt_completion`
- Saves integration results to the SDOF knowledge base using `store_sdof_plan` MCP tool
- Integrates with SDOF Knowledge Base for context retrieval and RAG

## Files

- `TASK-SDOF-INTEGRATOR.md`: Main MDTM task file describing the integration phase workflow
- `rules.toml`: TOML-based rules defining mode behavior, task delegation, and integration points