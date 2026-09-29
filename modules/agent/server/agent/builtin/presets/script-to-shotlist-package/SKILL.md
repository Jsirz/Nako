---
name: script-to-shotlist-package
display-name: 剧本分镜制作包
display-description: 将中文剧本或短片创意整理为完整分镜制作包，包含场景结构、对白表、镜头卡、节奏诊断及声音与特效附录。
description: Convert Chinese screenplays, scene outlines, or short-film concepts into a complete Chinese shotlist production package with visual signature, reorganized scenes, dialogue list, sequence structure, shot cards, ASL rhythm diagnostics, VFX grading, and production appendices. Use when the user asks for 剧本转分镜, 分镜表, 镜头表, 视听签名, 完整制作包, 短片/短剧拍摄拆解, VFX/声音/角色附录, or wants output following the uploaded Work-Fisher shotlist template.
---

# Script To Shotlist Package

## Core Rule

Produce Chinese output unless the user explicitly requests another language. Use the bundled template as the format authority when the user asks for the full document:

- Read `references/full-production-package-template.md` before generating a complete package, validating a package, or when exact table/appendix wording matters.
- Keep `SKILL.md` as the workflow guide; do not paste the full reference unless the user asks for the template itself.

## Input Triage

First identify what the user provided:

1. **Complete screenplay**: generate the full package directly.
2. **Scene outline or concept**: state reasonable assumptions, then generate a draft package with clear invented connective tissue.
3. **Existing shotlist/package**: audit and revise against the template rules.
4. **Partial request**: output only the requested section while preserving template constraints.

If essential constraints are missing, infer conservatively. Ask only when the choice materially changes the production, such as aspect ratio, target duration, or whether the output is for vertical short drama versus cinematic widescreen.

## Seven-Step Workflow

Follow this order for full packages:

1. **Script digestion**: extract premise, conflict, characters, locations, time span, motifs, dialogue, implied VFX, and sound anchors.
2. **Visual signature**: lock the 8 fields before writing shot cards: medium, aspect ratio, color grading, color ID, texture, core theme, master DNA, genre formula.
3. **Scene reorganization**: rewrite the script into industrial scene blocks guided by the visual signature.
4. **Sequence structure**: divide the film into duration-appropriate dramatic units.
5. **Shot cards**: create continuous numbered shot tables, one table per unit.
6. **Rhythm and VFX**: calculate ASL, unit rhythm, rhythm diagnostics, VFX grades, and rough schedule/budget logic.
7. **Appendices**: derive worldbuilding, character definitions, and sound design from scenes, dialogue, and shot cards only.

## Required Full-Package Sections

For complete output, include these sections in order:

1. Document metadata
2. Part 1: core screenplay document
3. Part 2: shot-level breakdown
4. Appendix A: worldbuilding anchors
5. Appendix B: character definitions
6. Appendix C: complete sound design list

Use the exact section/table structure from `references/full-production-package-template.md` when the user needs a deliverable rather than a quick sketch.

## Formatting Constraints

- Do not use emoji decoration.
- Do not write raw hex colors or pixel values in the package.
- Use Chinese shot scale names only: 极端特写, 特写, 近景, 中近景, 中景, 中远景, 全景, 远景. Use `—` for black screen, flash cut, or text-only screen.
- In shot tables, use exactly 7 columns: `#`, `时间`, `时长`, `景别`, `机位·运动`, `内容`, `声音`.
- Keep shot `内容` to 30 Chinese characters or fewer when possible; make it shootable: subject + action + key detail.
- Fill the `声音` column for every shot, including `静默` when silent.
- Keep shot numbers continuous with no skipped numbers.
- In sequence structure tables, do not add emoji columns.
- Keep master DNA to 1-3 directors.
- Keep color ID to 6 roles/factions or fewer.

## Timing And Structure Heuristics

Choose unit count by total duration:

- 30-90 seconds: 2-3 units
- 1-3 minutes: 3-5 units
- 5-10 minutes: 4-6 units
- 30-60 minutes: 5-7 units
- 90-120 minutes: 8 units
- 120+ minutes: 9-12 units

Place the climax around 60-80% of total duration. Ensure adjacent units contrast in at least one axis: emotion, visual motif, or rhythm. Make unit durations sum to the total runtime within about 5% unless the user asked for exact timing.

## Audit Before Final Output

Before delivering a full package, run a concise self-check:

- Metadata matches the shot count, unit count, total duration, and full-film ASL.
- The 8 visual-signature fields are complete and do not contradict the genre.
- Every visual motif in unit structure comes from the visual signature.
- Shot tables have 7 columns, continuous numbering, valid Chinese shot scales, non-empty sound, and content under 30 characters where practical.
- ASL equals total duration divided by total shot count; diagnose any unit ASL that differs from the film mean by more than 50%.
- VFX grades use S/A/B/C logic from the template and account for high-risk factors.
- Appendix A/B/C entries include source markers such as `〔出处: SHOT NN〕`, `〔出处: 场景 N〕`, or `〔出处: 单元 N〕`.
- Appendix entries are derived from the package, not invented without a source. If source material is missing, mark it explicitly as `剧本未明确, 服务 X 主题`.

## Partial Outputs

When the user asks for only one artifact:

- **视听签名**: provide the 8-field table plus self-check.
- **场景重排**: provide scene blocks with rhythm axes and sound blocks.
- **单元结构**: provide the unit table and unit self-check.
- **镜头表/分镜表**: provide shot tables and ASL summary.
- **VFX 清单**: grade shots S/A/B/C and include schedule implications.
- **声音设计**: include the 4-layer architecture and fixed 12-slot key sound events.

Prefer the template's industrial terminology over casual prose. Keep notes brief and production-facing.
