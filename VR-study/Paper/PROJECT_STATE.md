# BRB Paper Project State

Canonical instruction:

- `instructions/BRB_Paper_WritingPlan.md`

Primary paper directory:

- `VR-study/Paper/`

Current grounded repo inputs:

- `index.html`
- `VR-study/Paper/bigredbutton_placement.tex`
- `VR-study/Paper/bigredbutton_placement.bib`

Current manuscript state:

- A compile-ready manuscript now exists at `VR-study/Paper/main.tex`.
- Section drafts now exist for introduction, related work/theoretical framing, methods, results scaffold, discussion, and conclusion.
- A consolidated bibliography now exists at `VR-study/Paper/bigredbutton_full.bib`.
- Source-catalog, literature-matrix, verification, and data-gap artifacts now exist under `archive/`, `notes/`, `citations/`, and `DATA_GAPS.md`.
- The manuscript compiles successfully with `latexmk` on this machine as of 2026-03-13.
- The results section remains a truthful scaffold because no participant-level dataset or analysis outputs are currently archived in the repository.

Current priorities:

1. Archive participant-level study data, questionnaire exports, and analysis outputs.
2. Archive blinding/randomization documentation and the concrete implementation details for the live/sham physiology pipeline.
3. Replace the results scaffold with real findings and tighten the discussion around the supported empirical branch.
4. Add any external PDFs that collaborators want stored locally under `VR-study/Paper/archive/`.
5. Restart Codex on this profile before a future skill-driven run, because the academic-writing skills were installed during this session.

Canonical expected outputs:

- `VR-study/Paper/main.tex`
- `VR-study/Paper/bigredbutton_full.bib`
- `VR-study/Paper/sections/01_introduction.tex`
- `VR-study/Paper/sections/02_related_work.tex`
- `VR-study/Paper/sections/03_methods.tex`
- `VR-study/Paper/sections/04_results.tex`
- `VR-study/Paper/sections/05_discussion.tex`
- `VR-study/Paper/sections/06_conclusion.tex`
- `VR-study/Paper/archive/source_catalog.md`
- `VR-study/Paper/citations/verified.jsonl`
- `VR-study/Paper/notes/literature_matrix.md`
- `VR-study/Paper/DATA_GAPS.md`
- `VR-study/Paper/PROJECT_STATE.md`
- `VR-study/Paper/SESSION_LOG.md`

Open blockers:

- No participant-level data, condition table, questionnaire export, or physiology export is currently archived in the repo.
- The `secondness` measure is still only documented as a project-specific construct and is not independently validated here.
- External paper PDFs are not yet archived locally; only the verified source catalog is present.
- The required academic-writing skills were installed on this Codex profile during this session, but a Codex restart is still needed before they become directly invokable as skills.

Next collaborator checklist:

1. Read `instructions/BRB_Paper_WritingPlan.md`.
2. Read the latest entry in `VR-study/Paper/SESSION_LOG.md`.
3. Restart Codex on this profile if you want to use the newly installed paper-writing skills directly.
4. Inspect `VR-study/Paper/DATA_GAPS.md` and add the missing data artifacts before editing the results section.
5. Sync git safely before editing if the worktree is clean.
6. Update this file before pushing.
