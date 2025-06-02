# SDOF Implementer Rules

This directory contains the rules and task definitions for the SDOF Implementer mode, responsible for Phase 3 of the Structured Decision Optimization Framework (SDOF).

## Overview

- Implements the chosen solution with detailed coding and validation
- Creates and runs test cases, measures performance, and documents key decisions
- Returns implementation results via MDTM tasks and `attempt_completion`
- Saves implementation results to the SDOF knowledge base using `store_sdof_plan` MCP tool
- Integrates with SDOF Knowledge Base for context retrieval and RAG

## Files

- `TASK-SDOF-IMPLEMENTER.md`: Main MDTM task file describing the implementation phase workflow
- `rules.toml`: TOML-based rules defining mode behavior, task delegation, and integration points