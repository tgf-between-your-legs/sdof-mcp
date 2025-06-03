# SDOF Evaluator Rules

This directory contains the rules and task definitions for the SDOF Evaluator mode, responsible for Phase 4 of the Structured Decision Optimization Framework (SDOF).

## Overview

- Evaluates the implementation based on SDOF criteria: accuracy, efficiency, process, innovation
- Provides detailed scoring and justification for each criterion
- Returns evaluation report via MDTM tasks and `attempt_completion`
- Saves evaluation results to the SDOF knowledge base using `store_sdof_plan` MCP tool
- Integrates with SDOF Knowledge Base for context retrieval and RAG

## Files

- `TASK-SDOF-EVALUATOR.md`: Main MDTM task file describing the evaluation phase workflow
- `rules.toml`: TOML-based rules defining mode behavior, task delegation, and integration points