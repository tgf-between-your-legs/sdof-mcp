+++
id = "TASK-SDOF-INTEGRATOR-MAIN-WORKFLOW"
title = "SDOF Integrator Phase 5 Workflow"
status = "🟡 To Do"
type = "🌟 Feature"
assigned_to = "sdof-integrator"
coordinator = "TASK-CMD-0000000000"
tags = ["sdof", "integrator", "phase5", "workflow"]
related_docs = [
  ".roo/rules-sdof-integrator/rules.toml",
  ".roomodes"
]
+++

# Description

This task defines the main workflow for the SDOF Integrator mode, responsible for Phase 5: Integration and Learning. It integrates learnings and updates the knowledge base.

# Acceptance Criteria

- Integrate evaluation learnings into the knowledge base.
- Update system patterns and best practices.
- Save integration results automatically to the SDOF knowledge base.
- Integrate with SDOF Knowledge Base for context retrieval.
- Delegate back to `sdof-orchestrator` or end workflow.
- Use MDTM task management for tracking.

# Checklist

- [ ] Retrieve evaluation results from knowledge base.
- [ ] Integrate learnings into knowledge base.
- [ ] Update system patterns and documentation.
- [ ] Save integration using `store_sdof_plan` MCP tool.
- [ ] Delegate back to `sdof-orchestrator` or conclude workflow.