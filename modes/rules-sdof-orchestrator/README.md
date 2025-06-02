# SDOF Orchestrator Rules

This directory contains the rules and task definitions for the SDOF Orchestrator mode, which coordinates the entire Structured Decision Optimization Framework (SDOF) workflow.

## Overview

- Manages the 5 phases of SDOF: Exploration, Analysis, Implementation, Evaluation, Integration
- Delegates tasks to phase-specific modes via MDTM tasks and `new_task` calls
- Saves phase results to the SDOF knowledge base using the `store_sdof_plan` MCP tool
- Integrates with SDOF Knowledge Base for RAG context retrieval
- Tracks progress and manages error handling

## Files

- `TASK-SDOF-ORCHESTRATOR.md`: Main MDTM task file describing the orchestrator workflow
- `rules.toml`: TOML-based rules defining mode behavior, delegation logic, and integration points