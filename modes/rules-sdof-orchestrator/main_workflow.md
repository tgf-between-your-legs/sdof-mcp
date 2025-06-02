+++
id = "TASK-SDOF-ORCHESTRATOR-MAIN-WORKFLOW"
title = "SDOF Orchestrator Main Workflow"
status = "🟡 To Do"
type = "🌟 Feature"
assigned_to = "sdof-orchestrator"
coordinator = "TASK-CMD-0000000000"
tags = ["sdof", "orchestrator", "workflow", "coordination"]
related_docs = [
  ".roo/rules-sdof-orchestrator/rules.toml",
  ".roomodes"
]
+++

# Description

This task defines the main workflow for the SDOF Orchestrator mode. It coordinates the entire 5-phase SDOF process by delegating tasks to each phase mode in sequence and managing overall progress.

# Acceptance Criteria

- The orchestrator delegates Phase 1 to `sdof-explorer`.
- After Phase 1 completes, it delegates Phase 2 to `sdof-analyzer`.
- After Phase 2 completes, it delegates Phase 3 to `sdof-implementer`.
- After Phase 3 completes, it delegates Phase 4 to `sdof-evaluator`.
- After Phase 4 completes, it delegates Phase 5 to `sdof-integrator`.
- After Phase 5 completes, it logs completion and optionally restarts or ends the workflow.
- The orchestrator uses MDTM task management for tracking.
- The orchestrator integrates with SDOF Knowledge Base for context retrieval.
- The orchestrator triggers automatic saving to the SDOF knowledge base after each phase.

# Checklist

- [ ] Implement delegation to `sdof-explorer` for Phase 1.
- [ ] Implement delegation to `sdof-analyzer` for Phase 2.
- [ ] Implement delegation to `sdof-implementer` for Phase 3.
- [ ] Implement delegation to `sdof-evaluator` for Phase 4.
- [ ] Implement delegation to `sdof-integrator` for Phase 5.
- [ ] Implement logging of workflow completion.
- [ ] Integrate SDOF Knowledge Base RAG context retrieval.
- [ ] Integrate automatic knowledge base saving using `store_sdof_plan`.