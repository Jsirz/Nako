---
name: seedance-video-prompt-router
display-name: Seedance 视频提示词助手
display-description: 将剧本片段和镜头描述转为中文视频提示词，按内容选择动作、文戏、奇观长镜头或手机随拍路线。
description: Route screenplay fragments, shot descriptions, or scene beats into Chinese Seedance 2.0 / 即梦 / Sora-style video prompts. Use when the user asks for 视频提示词, 即梦提示词, Seedance prompt, 剧本转视频prompt, 打斗prompt, 文戏prompt, 奇观长镜, FPV一镜到底, 手机随拍, 伪直播, 伪监控, VFX加强版, or wants a script segment automatically classified into action, drama, spectacle long-take, or phone-footage tracks.
---

# Seedance Video Prompt Router

## Core Rule

Use this skill only when the input is an already formed screenplay fragment, scene beat, shot list excerpt, or visual action description that should become a video-generation prompt. Do not use it to write a screenplay from scratch.

The bundled full template is the format authority:

- Read `references/full-seedance-router-template.md` before generating a complete prompt, auditing an existing prompt, using a specialized track, or applying VFX/GLOSSARY details.
- Keep the final answer production-facing. Do not output internal analysis unless the user asks for diagnosis.
- Output in Chinese by default.

## Routing Order

Classify each input segment in this order:

1. **Track D: phone footage** if the user wants 手机随拍, street capture, hidden camera, faux livestream, faux surveillance, vlog, behind-the-scenes, rough amateur phone texture, vertical handheld footage, wind noise, autofocus/exposure jumps, or anti-cinematic realism.
2. **Track C: spectacle long-take** if the shot is a pure camera-motion spectacle: FPV, drone, one-take, fly-through, tunnel/city/array traversal, formation reveal, or camera path as the main subject.
3. **Track A: action/fight** if the scene is driven by physical conflict, martial action, weapons, impact, pursuit with tackles, transformation, mecha, supernatural combat, destruction, or force exchange.
4. **Track B: drama** if the scene is driven by dialogue, silence, gaze, relationship change, withheld information, confession, rejection, confrontation without physical combat, or emotional state.

Tie-breakers:

- If there is real physical fighting, choose action even when the emotion is heavy.
- If there is threat, weapon display, or standoff without actual attack, choose drama.
- If FPV has strong character emotion, dialogue, or POV landing, route to action or drama and write the long-take motion inside that track instead of using Track C.
- If a script mixes talking and fighting, split by scene/function and generate separate prompts.
- If routing is genuinely uncertain, ask one short question.

## Track Outputs

Always start each segment with one routing line for user verification, such as:

`〔判定:打斗 · T5 机甲 · 打斗模板 + VFX润色 + 挂形态锁〕`

Then output only the prompt.

### Track A: Action / Fight

Use for 武戏. Generate two sections by default:

1. **干净版**: direct Seedance prompt, 10-15 seconds, target 1200-1400 Chinese characters, hard limit 1500 characters.
2. **特效加强版**: bracket-injected VFX version based on the clean version. Keep the original action wording and add VFX details in parentheses at 5-8 spectacle points only.

Required fields for the clean version:

`【整体风格】`, `【角色卡】`, `【场景设定】`, `【画面坐标】`, `【起幅】` or `【起势】`, `【过程】`, `【结尾】`, `【音效】`, `【禁止项】`, `【强制声明】`.

Use the template's action logic: extract three visual anchors, keep one main scene, one main change, one exit, write action as a causal chain, keep VFX as a byproduct of action, and preserve genre consistency.

### Track B: Drama / Narrative

Use for 文戏. Generate one prompt, 12-20 seconds, target 1000-1400 Chinese characters, hard limit 1500 characters.

Required fields:

`【整体风格】`, `【角色卡】`, `【场景设定】`, `【画面坐标】`, `【起境】`, `【戏剧推进】`, `【声音】`, `【禁止项】`, `【强制声明】`.

Lock the relationship and information change. Keep events and key dialogue faithful. Drive the prompt through visible reaction chains, facial shifts, pauses, distance, object handling, and final relationship state. Do not force emotional collapse or reconciliation unless it is in the source.

### Track C: Spectacle Long-Take

Use only for pure camera spectacle. Output one continuous multimodal path prompt, not a field-block prompt.

Include:

- Opening declaration: FPV / one-take / no cuts / no text when appropriate.
- Style baseline.
- Four timed camera-path segments with visual elements embedded into camera motion.
- Ending sound and no-text declaration.

Do not output a separate VFX-enhanced version; VFX belongs inside the path.

### Track D: Phone Footage

Use for 手机随拍 / 伪直播 / 伪监控 / 幕后花絮. Output one field-block prompt, usually 8-15 seconds, target 900-1300 Chinese characters.

Required fields:

`【整体风格(手机直拍质感)】`, `【角色卡】`, `【场景与拍摄逻辑】`, `【画面坐标】`, `【过程】`, `【声音(手机录音)】`, `【禁止项】`, `【强制声明】`.

Prioritize rough phone realism over action/drama completeness: handheld shake, autofocus breathing, auto-exposure jumps, wind noise, offscreen camera operator presence, imperfect framing, scan environment then approach subject, and a rough ending edge.

Phone negative items must include no subtitles, UI, timestamp, battery/signal icon, recording dot, camera interface, beauty stickers, or watermark.

## Shared Required Rules

- One prompt segment contains one main scene, one main transformation/change, and one exit.
- Hard limit for field-block prompts is 1500 Chinese characters unless the user explicitly asks for a longer development draft.
- Include `【画面坐标】` for all field-block tracks. Use 2-5 bullets:
  `- 画面左边 / 右边 / 中央 / 上方 / 下方·前景/中景/远景: 主体 + 状态或朝向`
- Use full position wording such as `画面左边`, not clipped wording like `画左`.
- Only write visible spatial facts: position, distance layer, blocking, light, occlusion, who/what is visible.
- Role cards use image slots when references are implied: `- @图片1作为...`, `- @图片2作为...`.
- Preserve fixed `【禁止项】` and `【强制声明】` wording from the relevant track template when producing a full prompt.
- Do not include flow analysis inside the prompt.

## Performance Realism Layer

Apply when humans or creatures perform:

- Convert emotions to visible physiology: pupils, eyelids, breath, jaw, throat, fingers, shoulders, weight shift.
- Add at least one anti-stiffness detail to important beats: micro-action, habitual action, nervous reaction, or loss-of-control reaction.
- Make sound physical: breath intake, nasal blockage, voice cracking, silent lip movement, swallowed words, impact resonance.
- Connect actions to environmental feedback: paper wrinkles, dust lifts, bottles fall, shelves shake, glass cracks, wall powder drops.
- Avoid exact measurements such as centimeters, hertz, precise angles, or decimals; use body-scale and screen-position language.

For drama, keep the layer restrained. Do not inflate suppressed emotion into melodrama.

## Specialized Layers

Apply after routing:

- **Morphology lock** for transformation, assembly, mecha activation, armor forming, magical array forming, splitting, recombination, or object/creature form change. Show a visible causal chain: initial visible state, unlock, parts moving along visible paths, anchor traction, layer-by-layer reveal, sound/weight lock.
- **Giant scale layer** for giant creatures, mecha, disaster scale, large pursuit, falling threat, or city-scale motion. Use human/small-object/large-object/giant contrast, off-frame framing, and delayed environmental reactions.

Both layers may be used together when appropriate.

## Final Self-Check

Before responding:

- The route line matches the actual scene engine.
- Mixed scenes are split.
- Field names and order match the selected track.
- `【画面坐标】` is present for field-block tracks.
- The prompt respects the track's duration and character budget.
- Action prompts have causal impacts and environment feedback.
- Drama prompts preserve relationship/information changes and end state.
- Phone footage suppresses cinematic polish.
- VFX injection adds detail only at spectacle/action anchors and does not hide the subject.
