# BRB Canonical Paper Instruction

This is the single canonical instruction for future Codex agents working on the Big Red Button Institute paper. If the user says "run this instruction" or refers to this file, execute it end-to-end without asking the user to restate the project unless preferences have changed.

## Mission

Produce the most complete truthful paper package possible for the Big Red Button Institute inside `C:/Users/cogpsy-vrlab/Documents/GitHub/bigredbutton.institute/VR-study/Paper`.

The job is not just to draft prose. The job is to carry the paper from source gathering to manuscript delivery:

- install or verify required academic-writing skills
- catalog and archive papers
- dedupe and verify citations
- build or update the consolidated `.bib` file
- write and refine the manuscript in `.tex`
- prepare a compile-ready paper package
- commit and push the repository when finished unless the user explicitly says not to

## Non-Negotiables

- Do not fabricate citations.
- Do not fabricate results, statistics, or participant outcomes.
- Use primary academic sources whenever possible.
- Treat the object with dry, serious, theory-aware HCI writing. Humor may sharpen a point but may never replace evidence.
- Preserve existing user changes. Do not overwrite unrelated work.
- If data are missing, produce the most complete truthful manuscript scaffold possible and clearly mark what remains unresolved.
- When the task is complete, commit the work and push the repository unless the user explicitly says not to.

## Canonical Repo Inputs

Use these repo files as first-order grounding:

- `C:/Users/cogpsy-vrlab/Documents/GitHub/bigredbutton.institute/index.html`
- `C:/Users/cogpsy-vrlab/Documents/GitHub/bigredbutton.institute/VR-study/Paper/bigredbutton_placement.tex`
- `C:/Users/cogpsy-vrlab/Documents/GitHub/bigredbutton.institute/VR-study/Paper/bigredbutton_placement.bib`

Use these instruction files as secondary context only if more detail is needed:

- `C:/Users/cogpsy-vrlab/Documents/GitHub/bigredbutton.institute/instructions/brb-paper-handoff.md`
- `C:/Users/cogpsy-vrlab/Documents/GitHub/bigredbutton.institute/instructions/brb-paper-handoff.txt`

## Paper Grounding

The paper studies `pressability`: the symbolic, historical, perceptual, social, and embodied relation between a person and a big red button.

The paper must integrate these layers:

- cultural history of the big red button as meme, warning, emergency device, and foreshadowed object
- STS and interface history of buttons as discrete decision artifacts
- social and psychological functions of pressing, curiosity, boredom, agency, and contribution
- design and neuroscience of red, protrusion, salience, and pressability
- embodiment through cardiac and respiratory biofeedback
- novelty, first encounter, repetition, oneness, and secondness
- temporal complexity of pressing behavior
- inclusive limits: do not universalize Western meanings of red, danger, or button symbolism

## Study Grounding

Treat the study as follows unless the repo later contains a newer authoritative methods file:

- participants sit in a neutral grey VR room
- a single large red button is placed at optimized arm's-length reach
- a reassuring audio track explicitly preserves agency to press or not press
- a visible counter above the button shows cumulative presses
- one condition uses live Polar H10 ECG via BLE to Quest 3, coupling heartbeat to the button's flashing red tone or pulse
- one control condition uses sham ECG generated from simulated activity
- breathing modulates ambient lighting
- the condition logic is double blind
- post-trial measures include presence, peripersonal space, oneness, and secondness
- novelty is a core theoretical issue, not just a nuisance variable

## Required Tone

Write as a serious HCI paper with STS and humanities literacy.

- Empirical claims: plain, rigorous, cited.
- STS sections: historically and politically literate.
- Cultural sections: symbolic and media-aware, but still disciplined.
- Methods and results: sober and literal.
- Discussion: conceptually ambitious, but never unearned.

## Skills Bootstrap

Before major writing work, verify that the needed skills exist. If they do not, install them first.

Minimum required skills:

- `research-pipeline-runner`
- `pipeline-router`
- `paper-review-pipeline`
- `arxiv-search`
- `dedupe-rank`
- `paper-notes`
- `claims-extractor`
- `survey-seed-harvest`
- `taxonomy-builder`
- `outline-builder`
- `section-briefs`
- `subsection-briefs`
- `writer-context-pack`
- `evidence-binder`
- `prose-writer`
- `synthesis-writer`
- `citation-verifier`
- `citation-diversifier`
- `citation-injector`
- `draft-polisher`
- `global-reviewer`
- `latex-scaffold`
- `latex-compile-qa`

Installer script on this machine:

`C:/Users/cogpsy-vrlab/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py`

Install `paper-review-pipeline` if missing:

```powershell
py -3 "C:/Users/cogpsy-vrlab/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py" --repo yishitys/academic-report-generator-skill --path . --name paper-review-pipeline --dest "C:/Users/cogpsy-vrlab/.codex/skills"
```

Install the BRB writing subset from `WILLOSCAR/research-units-pipeline-skills` if missing:

```powershell
py -3 "C:/Users/cogpsy-vrlab/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py" --repo WILLOSCAR/research-units-pipeline-skills --dest "C:/Users/cogpsy-vrlab/.codex/skills" --path .codex/skills/research-pipeline-runner .codex/skills/pipeline-router .codex/skills/arxiv-search .codex/skills/dedupe-rank .codex/skills/paper-notes .codex/skills/claims-extractor .codex/skills/survey-seed-harvest .codex/skills/taxonomy-builder .codex/skills/outline-builder .codex/skills/section-briefs .codex/skills/subsection-briefs .codex/skills/writer-context-pack .codex/skills/evidence-binder .codex/skills/prose-writer .codex/skills/synthesis-writer .codex/skills/citation-verifier .codex/skills/citation-diversifier .codex/skills/citation-injector .codex/skills/draft-polisher .codex/skills/global-reviewer .codex/skills/latex-scaffold .codex/skills/latex-compile-qa
```

If skills are newly installed, restart Codex before continuing.

## End-to-End Workflow

Execute the following steps in order.

1. Read this file completely, then inspect git status and current paper files.
2. Do not discard unrelated local changes. Work around them unless the user explicitly asks otherwise.
3. Verify or install the required skills.
4. Build or refresh the paper workspace under `VR-study/Paper`. If missing, create:
   - `archive/`
   - `notes/`
   - `citations/`
   - `sections/`
   - `figures/` if needed
5. Catalog all relevant papers and sources.
   - search the repo for existing PDFs, notes, and references
   - if the user has local PDFs, organize them under `archive/`
   - create or update a source catalog such as `VR-study/Paper/archive/source_catalog.md`
6. Build the literature corpus in two lanes:
   - empirical lane: HCI, VR, embodiment, agency, boredom, curiosity, biofeedback, peripersonal space, attention, color, button ergonomics
   - humanities lane: STS, media archaeology, design theory, interface history, philosophy of action, cultural history of red buttons
7. Dedupe sources, generate structured notes, and extract claims.
8. Verify all citations and build or update the consolidated bibliography.
   - preferred output file: `VR-study/Paper/bigredbutton_full.bib`
   - keep legacy `bigredbutton_placement.bib` if needed, but the final manuscript should point to one clearly maintained primary `.bib`
9. Build a paper outline that covers at minimum:
   - abstract
   - introduction
   - related work / theoretical framing
   - study overview and methods
   - results or a truthful results scaffold
   - discussion
   - limitations
   - conclusion
10. Write the manuscript in LaTeX.
    - create a compile-ready main file, preferably `VR-study/Paper/main.tex`
    - place section files under `VR-study/Paper/sections/`
    - reuse grounded content from `bigredbutton_placement.tex` where appropriate
11. For the introduction and discussion, explicitly integrate:
    - cultural-symbolic history
    - STS button genealogy
    - psychology of pressing and boredom
    - design and salience of red protruding buttons
    - embodied cardiac and respiratory coupling
    - novelty, first encounter, oneness, secondness
    - temporal complexity and multilevel interpretation
12. For results:
    - if real data and analysis outputs exist, analyze them and write the results section truthfully
    - if real data do not exist, do not invent them; instead create a clearly labeled results scaffold and a short gap note such as `VR-study/Paper/DATA_GAPS.md`
13. Run citation cleanup and manuscript polish.
    - verify every empirical claim
    - diversify citations where needed
    - harmonize style across sections
14. If a TeX toolchain is available, compile-check the manuscript.
    - if compilation fails, fix what is possible
    - if TeX tools are missing, leave compile-ready files and state that limitation clearly
15. Finish by reviewing the diff, committing the work, and pushing the repository.

## Required Outputs

By the end of the task, produce as many of these as truthfully possible:

- `VR-study/Paper/main.tex`
- `VR-study/Paper/bigredbutton_full.bib`
- `VR-study/Paper/sections/01_introduction.tex`
- `VR-study/Paper/sections/02_related_work.tex`
- `VR-study/Paper/sections/03_methods.tex`
- `VR-study/Paper/sections/04_results.tex` or equivalent truthful scaffold
- `VR-study/Paper/sections/05_discussion.tex`
- `VR-study/Paper/sections/06_conclusion.tex`
- `VR-study/Paper/archive/source_catalog.md`
- `VR-study/Paper/citations/verified.jsonl` or equivalent verification artifact if generated by the tooling
- `VR-study/Paper/DATA_GAPS.md` only if data limitations prevent a full truthful results section

## Success Criteria

The task is complete only when all of the following are true:

- the repo contains a coherent paper workspace under `VR-study/Paper`
- the literature has been cataloged and archived in an organized way
- the bibliography has been created or updated without invented references
- the LaTeX manuscript is substantially complete and grounded in the repo's actual study
- the introduction and discussion are theory-rich, disciplined, and aligned with BRB themes
- any missing data or result limitations are stated explicitly rather than hidden
- the final changes are committed and pushed

## Invocation Phrase

If the user later wants this entire workflow executed, the user can simply say:

`Run instructions/BRB_Paper_WritingPlan.md end-to-end.`

## Final Rule

When finished, commit the work and push the repository to its remote unless the user explicitly says not to push.
