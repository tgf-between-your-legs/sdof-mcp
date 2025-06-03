# SDOF Explorer Rules

This directory contains the rules and task definitions for the SDOF Explorer mode, responsible for Phase 1 of the Structured Decision Optimization Framework (SDOF).

## Overview

- Defines problem boundaries and explores multiple candidate solutions
- Estimates complexity, efficiency, and potential failure modes
- Returns structured exploration results via MDTM tasks and `attempt_completion`
- Saves exploration results to the SDOF knowledge base using `store_sdof_plan` MCP tool
- Integrates with SDOF Knowledge Base for context retrieval and RAG

## Files

- `TASK-SDOF-EXPLORER.md`: Main MDTM task file describing the exploration phase workflow
- `rules.toml`: TOML-based rules defining mode behavior, task delegation, and integration points