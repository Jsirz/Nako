# Midjourney SKILL · 完整忠实版（原文合并）

> 把 `~/.claude/skills/midjourney` 的 SKILL.md + 全部 reference/* **原文一字不动**合并成单文件。
> 只去掉 CHANGELOG.md / README.md（纯维护元信息）。`params_as_of: 2026-06-13`，`[L]` 值以 MJ in-app 实测为准。
> 想要压缩版速查见同目录 `Midjourney_通用出图模板.md`。

---

<!-- ============================================================ -->
<!-- 来源文件: SKILL.md -->
<!-- ============================================================ -->

---
name: midjourney
description: >-
  Expert Midjourney prompt engineering and image-grading assistant. Use when the
  user wants to write, fix, refine, or critique a Midjourney prompt; mentions
  Midjourney / MJ / niji / nijijourney; talks about 出图 / 提示词 / 风格参考 / 垫图;
  references MJ flags (--ar --sref --oref --ow --sw --sv --stylize --s --chaos
  --weird --raw --hd --sd --niji --no --seed --p --exp --draft --tile --iw --q);
  asks which MJ model/version to use (V8.1 / V7 / niji 7); or pastes a
  Midjourney-generated image and asks why it looks wrong or how to improve it.
  中文触发:Midjourney提示词 / MJ参数 / 怎么出图 / 为什么这张图崩了 / 风格一致 / 垫图 / 角色一致.
  Defaults to V8.1; supports V7 and niji 7 as first-class targets.
license: MIT
metadata:
  version: 1.6.0
  params_as_of: 2026-06-13
---

# Midjourney Prompt Engineering

This skill writes, debugs, and grades Midjourney prompts. It is **version-aware** (default **V8.1**; also V7 and niji 7) and **methodology-first**. Detailed, volatile facts live in `reference/` files — load them on demand rather than reciting from memory.

> **Hard rule:** Midjourney consumes **English** — the prompt the user pastes into MJ is **always English**. Output is **bilingual by default**: a **中文版** of the prompt **and** an English version (the MJ-ready one) of the *same* image. Never paste the 中文版 into MJ (unless the user is on a Chinese-language tool). See `reference/translation-zh.md` for Chinese users.

> **Operating discipline:** never recite a parameter from memory — always read the loaded `params-*.md`. Never present a `[L]` (low-confidence) fact as certain; tell the user to verify in-app. Generation is **manual** — never attempt Discord/web automation. State the `params_as_of` date when parameters materially affect the answer.

> **Output contract — the user owns the flags:** the copy-ready prompt is **pure English description only**. Never write parameter flags (`--ar` `--s` `--no` `--seed` `--v` `--hd` `--sref` `--oref` …) into it. Param + version knowledge exists to **choose/recommend the target version** and to **answer param questions on request** — never to append to the prompt. The user sets every flag themselves in-app. (If they explicitly ask for a ready-to-run string *with* flags, put it on a **separate line outside** the prompt block, labelled as an editable suggestion.)

> **Standing user preference — character-design defaults.** When the user asks to design a character, default to a **portrait**, and keep what's *fixed* strictly separate from what must *vary*:
>
> **A. Structural defaults — stable (apply every time unless the user overrides):**
> - **Crop:** one tight **head-and-shoulders / chest-up portrait ("半身大头照")** — not full-body, not a wide scene; subject facing or near-facing camera.
> - **Background:** strongly **blurred / bokeh**, shallow depth of field — pure mood, no competing detail.
> - **Name overlay:** if the user gives a name, **add it** as bold title text in a corner (CJK may render imperfectly — still add it; don't lecture).
> - **Output:** bilingual (中文版 + English), description-only — per the contracts above.
>
> **B. Per-character variables — CHOOSE to fit each character, never lock a default:**
> - **Lighting *type* & intensity** (`reference/vocabulary.md §2`): soft natural backlight/rim, golden-hour, window/overcast, hard noir, neon, moonlight, dappled, god rays… — **soft or hard, dramatic or flat, including shadowless / high-key when the character calls for it. No minimum "drama" requirement.**
> - **Color temperature & palette** (`reference/vocabulary.md §4`): warm, cool, or neutral — whatever suits the character.
> - **Mood, facial features, styling** (`reference/vocabulary.md §6` etc.): per the character's concept.
> - **Vary these across characters** so two different characters never come out identically lit / graded.
>
> **Root rule (why this is split):** defaults govern **structure** (crop / background / output format) — **never a specific aesthetic** (a fixed temperature, one light type, a "drama" level, a face type).
> - **Placement test (mechanical):** if you can imagine a legitimate character for whom the *opposite* choice is right, it's an **aesthetic → put it in B**. Only put a trait in **A** if its opposite would *always* be a defect (e.g. a full-body wide scene, or a sharp busy background, defeats the 大头照 portrait itself).
> - Baking an aesthetic into the template is what made every character look the same. So when the user corrects the **same aesthetic** again, move it into **B**, do **not** add another fixed rule.

---

## 1. First move: pick the version, then load its params

Decide the target model **before** writing anything:

| Target | Choose when | Load |
|---|---|---|
| **V8.1** (default) | general image generation; newest, native HD | `reference/params-v8.1.md` + `reference/params-shared.md` |
| **V7** | need subject/character lock (`--oref`), Draft Mode, or `--q` | `reference/params-v7.md` + `reference/params-shared.md` |
| **niji 7** | anime / manga / Eastern-illustration | `reference/params-niji7.md` + `reference/params-shared.md` |

If unclear, default to **V8.1** and say so. Still load the version's params file — its flag knowledge keeps your **version recommendation and any param advice** correct (e.g. don't suggest `--oref` on V8.1, or `--q` where it does nothing). Per the output contract, none of these flags go into the prompt body.

## 2. Intake + clarifying gate

Collect the 6 intake dimensions: **subject, purpose/use, environment, mood, style references, aspect/constraints**.

**Gate:** if **≥2** of {subject, style direction, aspect/use} are unspecified, ask **up to 3** targeted questions before generating. Otherwise proceed and **surface your assumptions** in one line.

**Character-design shortcut:** the character-design default profile (above) sets framing & background and tells you how to **pick** lighting/palette per character — for character work **don't re-ask those**; only clarify genuinely missing subject specifics, then proceed.

## 3. Choose the approach

Read `reference/approach-matrix.md` to pick prompt-only vs `--sref` (look) vs `--oref` (subject, V7) vs personalization vs hybrid. If the chosen approach is version-exclusive (e.g. `--oref` forces V7), tell the user the trade-off, confirm, and **reload** that version's params (back to §1).

## 4. Construct (methodology-first)

Follow `reference/construction-method.md`. Element order, front-loaded:

> **subject → environment → lighting → style/medium → camera**  *(the prompt ends here — parameters are the user's, never appended)*

Write descriptive phrases (not tag soup). Apply the **concrete-descriptor rule** ("matte ceramic" > "smooth") and the **modifier cap** (2–3 style modifiers, different categories). Pull concrete words from `reference/vocabulary.md`.

## 5. Parameters are the user's to set (don't emit them)

Per the output contract, **never append flags to the prompt** — the user picks all of them. Use the loaded version file + `params-shared.md` only to:
- **recommend the target version** in prose, and tell the user to select it in-app (e.g. set the model to V7 / niji 7 — don't assume it's already active);
- **answer param questions on request**, version-correct: cite flags only from the loaded files, never mix version-exclusive flags, and flag any `[L]` value as "verify in-app" (e.g. `--exp` range).

If the user explicitly asks for a ready-to-run string *with* flags, give it on a **separate line outside** the copy-ready prompt block, labelled as a suggestion they can change.

## 6. Output format

Deliver, in this order:
1. **Two versions of the prompt, each in its own copy-ready code block — description only, no parameter flags:**
   - **中文版** — a full Chinese version of the prompt (for the user to read / edit).
   - **English version** — the **MJ-ready** one to paste into Midjourney (MJ consumes English).
   Both describe the *same* image; translate imagery, not word-for-word (see `reference/translation-zh.md`). Never paste the 中文版 into MJ.
2. One line of rationale (中文 when conversing in Chinese) — what the prompt is doing / how you read their intent.
3. The **recommended target version** in prose (the wording is tuned for it; the user sets the model + all flags). Add the `params_as_of` date and a "verify in-app" note only when you actually gave param advice.

## 7. Grading loop (when the user pastes a rendered image)

You are multimodal — when the user pastes a Midjourney output, run `reference/grading-rubric.md`: score 7 dimensions (1–5), name the **weakest**, route to `reference/failure-modes.md`, and propose **one** revised prompt that changes **one** lever. Re-grade on the next paste.

## 8. Debugging (something looks wrong, no image needed)

Use `reference/failure-modes.md` — match the symptom to an entry (`ADH/SUBJ/COMP/LIGHT/STYLE/COH/REF/VER`), apply the highest-priority fix, explain why.

## 9. Chinese users

Converse and run intake in 中文, and output **both a 中文版 and an English version** of the prompt (the English one is what goes into MJ). Use `reference/translation-zh.md` to translate aesthetic intent (国风/水墨/电影感…) into concrete description — **translate the imagery, not the words** — keeping the two versions describing the same image. Never mix Chinese into the **English** MJ prompt itself. For an in-image name/text, follow the character-design name-overlay default (add it; CJK may need a post pass — don't lecture the user).

## 10. Always-on rules

- Never hardcode a parameter from memory; read the loaded `params-*.md`.
- Never assert a `[L]` fact as certain — flag "verify in-app".
- Generation is manual; no Discord/browser automation (ToS/ban risk).
- When a param is version-specific, double-check it's in the loaded version's file before **recommending** it — you never emit flags into the prompt (see the output contract).


<!-- ============================================================ -->
<!-- 来源文件: reference/construction-method.md -->
<!-- ============================================================ -->

# Prompt Construction Method (version-independent)

A repeatable procedure for building a Midjourney prompt. This is **methodology** — it does not change across model versions. Pull concrete words from `vocabulary.md`. Parameters are the user's to set — `params-*.md` is for version choice and on-request advice, **not** for appending flags to the prompt.

## The element order (front-loaded)

Midjourney weights the **start** of the prompt most. Build in this order:

> **subject → environment → lighting → style/medium → camera**

The prompt body ends there — **parameters are the user's to set and never go into the prompt** (see the SKILL output contract). Write as natural descriptive phrases (V7/V8.1 reward description over bare comma-tags). Keep it tight — every word competes for attention.

---

### 1. Subject — *what is this, concretely?*
- **Ask:** Who/what is the single focus? What are they doing? What 2–3 concrete details make them specific?
- **Good:** `a weathered fisherman mending a green net`, `a single matte-black ceramic teapot, steam rising`, `a snow leopard mid-leap`
- **Replaces:** `a man`, `a nice object`, `an animal` (generic noun → stock-photo result).
- **Rule:** add 2–3 concrete descriptors (age, material, action, distinguishing feature). One clear subject beats three competing ones.

### 2. Environment — *where, and what's around it?*
- **Ask:** Setting, era, background density, foreground props?
- **Good:** `on a fog-wrapped stone pier at dawn`, `against a seamless warm-grey studio backdrop`, `in a neon-soaked rain-slick alley`
- **Replaces:** `in a cool place`, `nice background`.
- **Rule:** for text/logo overlays, specify `negative space` / `minimal centered composition on plain background`.

### 3. Lighting — *one light source + its quality?*
- **Ask:** Source, direction, hardness, mood?
- **Good:** `golden-hour side-light`, `overcast softbox diffusion`, `hard noir key-light from below`, `warm rim light from behind`
- **Replaces:** `good lighting`, `well lit`.
- **Rule:** name **source + direction + quality**. Lighting is the biggest lever on mood and realism.

### 4. Style / medium — *what is it made of, aesthetically?*
- **Ask:** Medium (photo, oil, 3D render, cel-shaded), and at most one aesthetic movement or technique?
- **Good:** `35mm film photograph`, `gouache illustration, visible brush texture`, `cel-shaded anime key visual`
- **Replaces:** `beautiful`, `masterpiece`, `award-winning`, `8k` (hype words that add nothing in V7/V8.1).
- **Rule:** **cap style modifiers at 2–3, each from a different category** (e.g. medium + lighting + era). 5+ conflicting modifiers average into mush.

### 5. Camera — *how is it framed (if it matters)?*
- **Ask:** Shot size, lens/DoF, angle?
- **Good:** `tight portrait, 85mm, shallow depth of field`, `wide establishing shot, low angle`, `flat-lay top-down`
- **Replaces:** `cool angle`.
- **Rule:** for faces/hands, prefer a **tighter shot** — small faces in wide shots are where anatomy breaks.

### 6. Parameters — *the user's to set; never emitted by the skill*
- The prompt body carries **no flags**. The user picks `--ar`, `--stylize`, `--no`, `--seed`, model, mode — all of it.
- Use `params-<version>.md` + `params-shared.md` only to **recommend the target version** and to **answer param questions on request** (version-correct: cite flags only from the loaded files; never mix version-exclusive flags).
- Tell the user to **select the model in-app** (e.g. V7 or niji 7) so they don't silently render on V8.1 — but don't write `--v` / `--niji` into the prompt.
- When you do give param advice, mark any `[L]` value: e.g. `--exp 20  (experimental; verify range in-app)`, and keep it **outside** the copy-ready prompt block.

---

## Two rules that carry the whole method

1. **Concrete over abstract.** Replace every evaluative word with a sensory one: `smooth` → `matte ceramic`; `good lighting` → `golden-hour side-light`; `detailed` → name the actual details.
2. **One subject, few modifiers.** A focused prompt with 2–3 deliberate modifiers beats a long wishlist. If the result is muddy, **remove** words before adding them.


<!-- ============================================================ -->
<!-- 来源文件: reference/vocabulary.md -->
<!-- ============================================================ -->

# Style Vocabulary (original word bank)

A curated, **original** lexicon written from scratch for this skill — no tables, lists, or images copied from other repositories. Pull terms here when filling the construction slots. Each term has a one-line usage hint. Mix at most 2–3 across different categories (see `construction-method.md`).

> Use these as *seeds*, not magic words. Describe what they mean if the result misses; the model rewards description.

---

## 1. Medium / technique
| Term | Use for |
|---|---|
| 35mm film photograph | grainy, organic, true-to-life realism |
| large-format studio photo | crisp product/portrait with controlled light |
| gouache illustration | matte, opaque, visible brushwork |
| ink wash / sumi-e | sparse, gestural, high-contrast monochrome |
| cel-shaded anime | flat color blocks, clean outlines |
| 3D render, physically-based | glossy, accurate materials, CGI look |
| linocut / woodblock print | bold carved edges, limited palette |
| watercolor, wet-on-wet | bleeding soft edges, paper texture |
| charcoal sketch | smudged tonal drawing |
| isometric vector | clean technical/diagrammatic flatness |

## 2. Lighting
| Term | Use for |
|---|---|
| golden-hour side-light | warm, long shadows, flattering |
| overcast softbox diffusion | even, shadowless, neutral |
| hard noir key-light | dramatic, high-contrast, single source |
| warm rim light from behind | subject separation, glow on edges |
| candle / firelight | intimate, flickering warmth |
| cold fluorescent overhead | clinical, unflattering, institutional |
| neon spill, magenta-cyan | nightlife, cyber, reflective wet surfaces |
| dappled light through leaves | natural, textured, outdoor calm |
| volumetric god rays | atmospheric depth, haze |
| moonlight, blue-grey | nocturnal, quiet, low-saturation |

## 3. Material / surface
| Term | Use for |
|---|---|
| matte ceramic | soft, non-reflective, crafted |
| brushed aluminium | cool, industrial, fine grain |
| weathered oak | warm, grained, aged |
| hand-blown glass | translucent, organic imperfection |
| raw concrete | brutalist, porous, grey |
| worn leather | creased, lived-in, tactile |
| wet asphalt | reflective, urban, moody |
| frosted acrylic | diffuse, soft-glow, modern |
| hammered brass | warm metal with texture |
| linen weave | natural fabric, subtle irregularity |

## 4. Color / palette
| Term | Use for |
|---|---|
| muted earth tones | grounded, natural, calm |
| high-key pastel | light, airy, gentle |
| teal-and-orange | cinematic, complementary punch |
| desaturated cool grey | restrained, editorial |
| warm sepia monochrome | nostalgic, timeless |
| acid neon on black | energetic, futuristic |
| jewel tones | rich, saturated, luxurious |
| limited two-color duotone | graphic, poster-like |
| sun-bleached faded | retro, weathered |
| ink-black with single accent | minimal, focused contrast |

## 5. Camera / framing
| Term | Use for |
|---|---|
| tight portrait, 85mm, shallow DoF | flattering face isolation |
| wide establishing shot | context, scale |
| low angle, looking up | power, monumentality |
| top-down flat-lay | products, food, layouts |
| dutch tilt | unease, dynamism |
| macro close-up | texture, tiny detail |
| over-the-shoulder | narrative, intimacy |
| symmetrical centered composition | calm, iconic, logo-ready |
| rule-of-thirds off-center | natural, balanced |
| long-lens compression, 200mm | flattened layers, bokeh |

## 6. Mood / atmosphere
| Term | Use for |
|---|---|
| serene, contemplative | quiet emotional calm |
| ominous, foreboding | tension, threat |
| whimsical, playful | light, imaginative |
| melancholic, wistful | gentle sadness |
| epic, awe-inspiring | grandeur, scale |
| cozy, intimate | warmth, closeness |
| sterile, detached | clinical distance |
| dreamlike, surreal | unreal logic, soft edges |
| gritty, raw | unpolished realism |
| triumphant, radiant | uplift, glow |

## 7. Aesthetic frameworks / eras (use AT MOST one)
| Term | Use for |
|---|---|
| Bauhaus geometric | clean, functional, primary shapes |
| Art Nouveau organic line | flowing botanical ornament |
| mid-century modern | warm retro, clean furniture lines |
| brutalist | heavy concrete, stark |
| solarpunk | green-tech optimism, plants + glass |
| vaporwave | pastel retro-digital nostalgia |
| Scandinavian minimal | light wood, white, restraint |
| baroque ornate | dramatic, gilded, dense detail |
| cyberpunk | neon, dense urban tech-noir |
| ukiyo-e | flat woodblock, bold outline, wave motifs |


<!-- ============================================================ -->
<!-- 来源文件: reference/approach-matrix.md -->
<!-- ============================================================ -->

# Approach Selection Matrix

Before writing the prompt, choose **how** you'll achieve the look. Picking the wrong approach is why results drift. Match the user's goal to a method, and watch the **version gotcha** column — some methods force a specific model.

| Goal | Recommended approach | Key flags | Version gotcha |
|---|---|---|---|
| One-off novel concept, max control | **Prompt-only** | construction method + `--stylize`/`--raw` | None. Cheapest, most flexible. Default starting point. |
| Same *look / mood* across different subjects (brand, series) | **Style reference** | `--sref <code or url>` + `--sw` (+ `--sv`) | Numeric codes transfer more reliably than image refs in V7+. Does **not** lock a character. |
| Same *specific character/object* recurring across scenes | **Omni Reference** | `--oref <url>` + `--ow 200–400` | **V7-only** → forces `--v 7`. Not available on V8.1/niji. On V8.1, approximate with repeated descriptors + shared `--sref` + locked `--seed`. |
| Anime / manga look | **niji model** | `--niji 7` + shared params | Switches model line. `--oref` unavailable; use `--sref` + seed for consistency. |
| Your personal taste applied to everything | **Personalization** | `--p` (after unlocking a profile) | Not on by default; strength scales with `--stylize`. Stackable with the above. |
| Match a broad style from many images you collected | **Moodboard** | `--p <moodboardID>` | Cannot combine with `--sw`/`--sv`. |
| Brand character + brand look + new scene (the powerful combo) | **Hybrid** | `--oref` (who) + `--sref` (look) + prompt (scene) + optional `--p` | Hybrid with `--oref` forces **V7**. Example: `... --oref URL --ow 250 --sref 123456 --sw 200 --v 7` |
| Cheap, fast iteration before committing GPU | **Draft / SD** | V7: `--draft` · V8.1: `--sd` | `--draft` is V7-only; `--sd` is V8.1-only. Pick by target version. |
| Seamless pattern / texture | **Tile** | `--tile` | Don't upscale (breaks seam). |

## Decision shortcuts
- **"I just want a good image of X"** → Prompt-only (V8.1 default).
- **"Make it look like THIS reference"** → is it the *subject* or the *style*? Subject → `--oref` (V7). Style → `--sref`.
- **"Keep my character consistent"** → `--oref` on V7 (+ identical descriptors + seed).
- **"Anime"** → `--niji 7`.
- **"It should match my brand's vibe every time"** → build a Moodboard / Personalization profile.

> When a chosen approach forces a version change (e.g. user is on V8.1 but needs `--oref`), **tell the user the trade-off and confirm the switch**, then reload that version's `params-*.md`.


<!-- ============================================================ -->
<!-- 来源文件: reference/params-shared.md -->
<!-- ============================================================ -->

# Midjourney — Cross-Version Parameter Reference (shared)

**As-of date:** 2026-06-13
**Scope:** parameters that behave the same across V8.1 / V7 / niji 7. Version-exclusive flags live in `params-v8.1.md`, `params-v7.md`, `params-niji7.md`.

**Confidence legend:**
- `[C]` confirmed against official docs (docs.midjourney.com) or official changelog.
- `[S]` secondary source (reputable 2025–2026 guides); directionally reliable.
- `[L]` low-confidence / disputed / community-sourced — **state the uncertainty and tell the user to verify in-app.** Never present an `[L]` number as fact.

**Maintenance rule:** when MJ changes a shared param, edit THIS file's row, bump the As-of date above, and add a `CHANGELOG.md` entry. Do not edit `SKILL.md`.

---

## Core table

| Param | Range / Values | Default | Conf | Push which way | Notes / interactions |
|---|---|---|---|---|---|
| `--ar` / `--aspect` | `w:h`, **whole numbers only** (no decimals). Practical max ~`14:1` | `1:1` | `[C]` | first number ↑ = landscape; second ↑ = portrait | Set explicitly for any non-square use (9:16 reels, 16:9, 3:2, 2:3). Extreme ratios are "experimental." |
| `--stylize` / `--s` | `0`–`1000` | `100` | `[C]` | low (50–150) = literal / photoreal; high (400–1000) = artistic, drifts from prompt | `[L]` V7/V8.1 are recalibrated **higher** than V6 — old V6 numbers look flat; raise them. Don't reuse V6 values 1:1. |
| `--chaos` / `--c` | `0`–`100` | `0` | `[C]` | ↑ = more varied / divergent grid (lowers prompt adherence) | Web UI calls this "Variety." Keep 0–10 for series consistency; 25–40 to explore. |
| `--weird` / `--weird` | `0`–`3000` | `0` | `[C]` | ↑ = quirky / unconventional aesthetics | Experimental; interacts poorly with `--seed` reproducibility. |
| `--no` | comma-separated terms | — | `[C]` | list things to exclude | Each term read **independently** (`--no modern clothing` → "no modern" + "no clothing"). Mechanically equals a `::-0.5` weight. The **only** officially universal negative mechanism. |
| `--seed` | integer `0`–`4294967295` | random | `[C]` | lock to A/B-test one prompt change | Not a style/character lock. Unreliable in Turbo mode and across sessions. |
| `--tile` | flag | off | `[C]` | on = one seamless repeating tile | Wallpaper/fabric/pattern. Do not upscale (breaks the seam). |
| `--repeat` / `--r` | `2`–`40` (plan-capped: Basic 2–4, Standard 2–10, Pro/Mega 2–40) | — | `[C]` | run same prompt N times at once | Fast/Turbo modes only. Stripped from the finished prompt; re-add to rerun. |

## Style reference family (works V6 and later)

| Param | Range / Values | Default | Conf | Push which way | Notes |
|---|---|---|---|---|---|
| `--sref` | image URL(s) · numeric **style code(s)** · `random` | — | `[C]` | match the *look/vibe* (color, medium, texture, light) — **not** the subject | Blend codes by space-separating: `--sref 111 222`. `--sref random` invents a style and prints a reusable code. You cannot mint a code from your own upload. |
| `--sw` (style weight) | `0`–`1000` | `100` | `[C]` | ↑ = stronger style adherence | `[S]` natural sweet spot ≈ 65–175; many run ~250–500 for strong **code** transfer. `[S]` in V7 `--sw` affects codes more than image refs. **Incompatible with Moodboards.** |
| `--sv` (sref version) | `4` or `6` (V7) | `6` | `[C]` | which sref algorithm | `[S]` use `--sv 4` to revive pre-2025-06-16 style codes. `--sref random`/codes work with `--sv 4` and `--sv 6`. |
| `::` per-code weighting | `code::N` | — | `[L]` | weight one code vs another (`A::2 B::1`) | Widely reported but **not in official docs for V7/V8.1**. Tell the user to verify; prefer the web Style Explorer for blends. |

## Image prompt & personalization

| Param | Range / Values | Default | Conf | Push which way | Notes |
|---|---|---|---|---|---|
| `--iw` (image prompt weight) | `0`–`3` (niji 7: `0`–`2`) | `1` | `[S]` | ↑ = lean on the image prompt; ↓ = lean on text | This weights an **image prompt** (a URL pasted *in* the prompt), distinct from `--sref`/`--oref`. Ceiling differs by model — verify on the active model. |
| `--p` / personalization | `--p` (your default profile) · `--p <profileID>` · `--p <moodboardID>` | off | `[C]` | apply your learned taste / a moodboard | **NOT on by default** — unlock a Global Profile by rating images first. Personalization strength scales with `--stylize` (`--s 0` minimizes it) `[S]`. |
| Moodboards | curated image set → `--p <moodboardID>` | — | `[C]` | broader style than a single sref | **Cannot combine with `--sw` or `--sv`.** |

## Syntax features

- **Permutations `{}`** `[C]`: comma-separated options in braces, incl. inside params (`--ar {1:1, 2:3}`). Plan-capped (Basic 4 / Standard 10 / Pro·Mega 40). Fast/Turbo only.
- **Rendered text** `[C]`: wrap the literal text in **double quotes** (`"OPEN"`). Single quotes/apostrophes don't trigger it. Best with ≤3 words, common Latin fonts; add "with the text". If garbled, use `--raw` or lower `--stylize`.
- **Multi-prompt `::` weighting** `[L]`: officially documented only up to model 6.1; **not listed for V7/V8.1**. Treat raw `::N` weighting on current models as unverified — use `--no` for negatives (universal).

## GPU / privacy modes (any version)

| Flag | Meaning |
|---|---|
| `--fast` / `--relax` / `--turbo` | speed/credit modes. Seeds unreliable in Turbo; some features Fast-only. |
| `--stealth` / `--public` | private vs public on the website (plan-dependent). |


<!-- ============================================================ -->
<!-- 来源文件: reference/params-v8.1.md -->
<!-- ============================================================ -->

# Midjourney V8.1 — Parameter Reference (DEFAULT target)

**As-of date:** 2026-06-13
**Default model since:** 2026-06-10 (V8.1 released 2026-04-30)
**Select with:** `--v 8.1` (this is the default; you usually omit it)

**Confidence legend:** `[C]` official · `[S]` secondary · `[L]` low-confidence — verify in-app, never assert as fact.
**Maintenance rule:** edit this file + bump As-of date + `CHANGELOG.md` when V8.1 changes. Do not edit `SKILL.md`.

> Load this file **plus** `params-shared.md` whenever V8.1 is the target. Use them to recommend flags **on request** (cite only flags that appear in these two files) — never write flags into the prompt body (see the SKILL output contract).

---

## V8.1-only parameters

| Param | Range / Values | Default | Conf | Push which way | Notes |
|---|---|---|---|---|---|
| `--hd` / `--sd` | toggle | **`--sd` is the temporary default** during the server transition | `[C]` | `--sd` = fast/cheap drafts (1024px, ~0.8 GPU-min); `--hd` = native 2K finals (~1.3 GPU-min) | V8.1 renders HD **without upscaling**. Switch the default in settings if you want HD-by-default. |

## What V8.1 does NOT have (route accordingly)

| Flag | Status on V8.1 | What to do instead |
|---|---|---|
| `--q` / `--quality` | `[C]` **not a V8.1 user knob** | Use `--hd` / `--sd` for resolution/detail. If a user pastes `--q` on V8.1, tell them it's a V6/V7 knob and is ignored here. |
| `--oref` / `--ow` (Omni Reference, subject lock) | `[C]` **V7-only** | For a recurring specific person/object, **switch the target to V7** (`params-v7.md`). On V8.1 approximate consistency via precise repeated descriptors + a shared `--sref` + a locked `--seed`. |
| `--draft` (Draft Mode) | `[C]` **V7-only** | Use `--sd` for cheap fast iteration on V8.1. |
| `--cref` / `--cw` | `[C]` deprecated everywhere current | Never emit. (Subject lock = `--oref` on V7.) |

## Shared params worth a V8.1 note

| Param | V8.1 behavior |
|---|---|
| `--seed` | `[C]` ~99% reproducible on V8.1 (tighter than older models). Still not a style/character lock. |
| `--stylize` / `--s` | `[L]` recalibrated higher than V6; default 100. Photoreal → `--s 50–150 --raw`; illustration → `--s 400–700`. |
| `--raw` | `[C]` strips MJ's default beautifying aesthetic → more literal/photographic. Pair with low `--stylize`. |
| `--exp` (experimental aesthetics) | `[L]` range **disputed** (`0–100` per most guides; some say higher); default `0`. Small values (~10–25) add detail/energy; high values override `--stylize`/`--p` and hurt prompt accuracy. **Tell the user to verify the ceiling in-app.** |

## V8.1 headline behavior (for guidance, not flags)

- ~4–5× faster than V7; better prompt comprehension and small-detail retention `[C]`.
- Native HD (2K) is the marquee feature; the old "quality" mental model is replaced by SD/HD.
- Prefer **natural-language descriptive phrases** over comma-keyword soup — V8.1's parser rewards description. Front-load the core subject.


<!-- ============================================================ -->
<!-- 来源文件: reference/params-v7.md -->
<!-- ============================================================ -->

# Midjourney V7 — Parameter Reference (first-class, not default)

**As-of date:** 2026-06-13
**Status:** default 2025-04-03 → 2026-06-10; now selectable but **not default**. **Select with `--v 7`.**
**Pick V7 when:** you need **subject/character lock** (`--oref`), **Draft Mode** (`--draft`), or `--q` quality control. Otherwise prefer V8.1.

**Confidence legend:** `[C]` official · `[S]` secondary · `[L]` low-confidence — verify in-app.
**Maintenance rule:** edit this file + bump As-of date + `CHANGELOG.md`. Do not edit `SKILL.md`.

> Load this file **plus** `params-shared.md` whenever V7 is the target. Use them to recommend the right flags **on request** (cite only flags that appear in these two files) — but never write flags into the prompt body (see the SKILL output contract). **Tell the user to select V7 in-app** so they don't silently render on V8.1.

---

## V7-only parameters

| Param | Range / Values | Default | Conf | Push which way | Notes / interactions |
|---|---|---|---|---|---|
| `--oref` (Omni Reference) | one image URL/upload | — | `[C]` | put a **specific** person / object / creature into the image | The V7 successor to character reference. Handles characters **and** objects/props. One reference per generation. Auto-forces V7. Costs ~2× GPU. **Incompatible with** Fast/Draft/Conversational modes, `--q 4`, Vary Region, Pan, Zoom Out `[S]`. |
| `--ow` (Omni Weight) | `1`–`1000` | `100` | `[C]` | ↑ = stronger likeness lock | `[S]` bands: 25–50 = re-style the character (photo→anime); ~100 = balanced; 200–400 = strong face/clothing likeness (most popular); 400+ = max fidelity. Keep **below ~400 unless `--stylize` is very high**, or output gets unpredictable. |
| `--draft` (Draft Mode) | flag | off | `[C]` | fast rough iteration | ~10× faster, ~half GPU cost. "Enhance" to finalize. V7-only. Not compatible with Omni Reference. |
| `--q` / `--quality` | `1`, `2`, `4` (no `3` → snaps to `4`) | `1` | `[C]` | ↑ = more GPU/detail on the first grid | `--q 4` is **not compatible with Omni Reference**. (V8.1 has no `--q` — uses `--hd`/`--sd`.) |

## Deprecated — never emit

| Flag | Status | Replacement |
|---|---|---|
| `--cref` / `--cw` | `[C]` **deprecated for V7+** — official docs say "use Omni Reference instead" | `--oref` + `--ow` |

## Shared params worth a V7 note

| Param | V7 behavior |
|---|---|
| `--stylize` / `--s` | `[L]` recalibrated higher than V6 (v6 `--s 100` ≈ v7 `--s 300–400`). If an old V6 prompt looks flat, raise stylize or add `--exp 10–25`. |
| `--sw` / `--sv` | `[C]` V7 sref default `--sv 6`; `--sv 4` revives old codes. `--sw` impacts numeric codes more than image refs `[S]`. |
| `--exp` | `[L]` present on V7; range disputed; keep small (≤25–50) or it overrides params. Verify in-app. |
| `::` multi-prompt weighting | `[L]` not officially documented for V7. Use `--no` for negatives. |

## Consistency strategy on V7 (guidance)

- **Same character across scenes:** `--oref <url> --ow 200–400` + keep **identical** wardrobe/hair wording every prompt + reuse the same `--sref` + lock `--seed`.
- **Re-style an existing character** (e.g. photo → illustration): same `--oref` but drop `--ow` to 25–50.


<!-- ============================================================ -->
<!-- 来源文件: reference/params-niji7.md -->
<!-- ============================================================ -->

# niji 7 — Parameter Reference (anime / Eastern-aesthetic model)

**As-of date:** 2026-06-13
**Status:** niji 7 released 2026-01-09. **Select with `--niji 7`.** (A separate model line, built with Spellbrush.)
**Pick niji when:** the target is anime / manga / Eastern-illustration aesthetics. For photoreal or Western-illustration, use V8.1.

**Confidence legend:** `[C]` official · `[S]` secondary · `[L]` low-confidence — verify in-app.
**Maintenance rule:** edit this file + bump As-of date + `CHANGELOG.md`. Do not edit `SKILL.md`.

> Load this file **plus** `params-shared.md` whenever niji 7 is the target. Use them to recommend flags **on request** (never write flags into the prompt body — see the SKILL output contract). **Tell the user to select the niji 7 model (`--niji 7`) in-app.** niji shares most of the shared table; the deltas are below.

---

## niji 7 selection & behavior

| Item | Value | Conf | Notes |
|---|---|---|---|
| `--niji` | `7` (older: `6`) | `[C]` | Anime/Eastern-aesthetic model. niji 6 released 2024-06-07; niji 7 is current. |
| Aesthetic deltas vs niji 6 | flatter, cleaner linework; sharper/more expressive eyes; more literal prompt reading | `[S]` | Lean on character/pose/expression description; anime tropes (chibi, cel-shading, key visual) land well. |
| `--iw` ceiling | `0`–`2` (not `0`–`3`) | `[S]` | Image-prompt weight ceiling is lower on niji 7 than V7/V8.1. Verify in-app. |

## What differs from V8.1 / V7

| Flag | Status on niji 7 | What to do |
|---|---|---|
| `--oref` / `--ow` | `[C]` **V7-only**, not a niji flag | For consistent anime characters use repeated precise descriptors + shared `--sref` + locked `--seed`. |
| `--cref` / `--cw` | `[L]` worked on niji 6; **niji 7 support uncertain** | Do not rely on it; verify in-app. Prefer `--sref` + seed for consistency. |
| `--hd` / `--sd` | `[L]` V8.1-only resolution flags; niji 7 status unconfirmed | Don't emit on niji; verify if the user asks for HD anime. |
| `--p` personalization / moodboards | `[L]` timing on niji 7 unconfirmed | Usable broadly per docs (V6/V7/V8.1 listed); confirm niji 7 before relying. |

## Shared params (apply as in `params-shared.md`)

`--ar`, `--stylize/--s`, `--chaos/--c`, `--weird`, `--raw`, `--sref/--sw/--sv`, `--no`, `--seed`, `--tile`, `--repeat/--r` all behave per the shared file. Anime work usually wants **lower `--chaos`** (clean, consistent) and `--stylize` tuned to taste (higher for illustrative flair, lower for model-sheet flatness).


<!-- ============================================================ -->
<!-- 来源文件: reference/translation-zh.md -->
<!-- ============================================================ -->

# 中文意图 → 英文 prompt 翻译指引

Midjourney 对中文支持差,**丢进 MJ 的 prompt 必须是英文**(另出一版中文平行版供阅读/修改)。用中文和用户沟通、走 intake、给释义都可以,但出图字符串一律翻成英文。**翻"意象"不翻"字面"** —— 把中文美学概念译成 MJ 真正吃得动的英文描述,而不是逐字直译。

## 工作方式
1. 中文对话,确认主体/风格/画幅(走 `construction-method.md` 的 6 槽)。
2. 把每个中文美学意图查下表或自行意译成**具体英文描述短语**。
3. 输出**中文版 + 英文版两版** prompt 代码块(英文版是丢进 MJ 的那版,中文版供阅读/修改),再附一句中文释义(说明你怎么理解他的意图)。
4. 绝不让中文混进**英文版** prompt 正文(英文版是给 MJ 的);中文版本身是中文,不受此限。

## 意象对照(译意不译字)
| 中文意图 | 英文 prompt 译法(意象) | 别用(字面直译) |
|---|---|---|
| 国风 / 中国风 | traditional Chinese aesthetic, ink-wash brushwork, flowing silk | "Chinese style" |
| 水墨 | sumi-e ink wash, sparse gestural strokes, rice-paper texture | "water ink painting" |
| 古风 | ancient Chinese setting, Hanfu robes, classical architecture | "ancient style" |
| 仙侠 / 修仙 | ethereal xianxia fantasy, floating mountains, flowing robes, jade and mist | "immortal hero" |
| 赛博朋克 | cyberpunk, neon-soaked rain-slick streets, tech-noir | (字面通常 OK,但补环境) |
| 电影感 | cinematic, anamorphic lens, teal-and-orange grade, shallow DoF | "movie feeling" |
| 高级感 | refined, restrained palette, editorial minimalism, premium materials | "high-class feeling" |
| 治愈 / 小清新 | soft pastel, gentle natural light, airy and calm | "healing" |
| 国潮 | modern Chinese street-culture graphic design, bold retro-pop | "national tide" |
| 烟火气 | warm everyday street life, lived-in detail, golden lamplight | "fireworks air" |
| 高级灰 | muted desaturated grey palette, low contrast | "advanced grey" |
| 氛围感 | moody atmospheric lighting, soft haze, intimate tone | "atmosphere feeling" |
| 大片感 | epic blockbuster shot, dramatic scale and lighting | "big film feeling" |
| 二次元 | anime / manga aesthetic (→ consider `--niji 7`) | "two-dimensional" |
| 水墨 + 留白 | ink wash with generous negative space, minimal composition | — |

## 易错陷阱
- **逐字直译会废**:成语、网络词、品牌化形容词("高级""治愈""氛围")直译后 MJ 不认,必须落到**可视觉化的具体描述**(光线/材质/色彩/构图)。
- **抽象情绪要落地**:中文常给情绪("孤独的""温暖的"),英文 prompt 要给**画面成因**(`a single figure on an empty pier, cold blue dusk` 而不是 `lonely`)。
- **画幅别忘**:中文用户常说"竖屏/手机壁纸/公众号封面",对应 `--ar 9:16` / `--ar 3:4` 等,在 intake 就问清。
- **文字渲染**:中文文字 MJ 几乎渲染不准;若要画面带字,改用**英文短词 + 双引号**,并提示用户中文字建议后期用设计软件加。


<!-- ============================================================ -->
<!-- 来源文件: reference/grading-rubric.md -->
<!-- ============================================================ -->

# Image Grading Rubric (multimodal loop)

**Trigger:** the user pastes a Midjourney-generated image — with or without "why does this look off / how do I improve it?"

You can see the image. Score it on **7 independent dimensions**, call out the **single weakest** one, then route to `failure-modes.md` and propose **one** revised prompt that changes **one lever**. Changing one thing at a time turns the loop into a controlled experiment that actually converges.

## The 7 dimensions (score each 1–5)

| # | Dimension | What you're judging | Routes to |
|---|---|---|---|
| 1 | **Prompt adherence** | Are all named subjects/objects/attributes present and correct? | `ADH-*` |
| 2 | **Subject fidelity** | Anatomy, faces, hands, correct counts | `SUBJ-*` |
| 3 | **Composition & framing** | Matches requested shot/aspect; balanced; subject placement | `COMP-*` |
| 4 | **Lighting & color** | Light direction/quality and palette match intent | `LIGHT-*` |
| 5 | **Style & medium match** | Reads as the requested medium/aesthetic | `STYLE-*` (or `REF-*` if a `--sref`/`--oref` was used) |
| 6 | **Coherence & artifacts** | Warping, melted/duplicated detail, garbled text | `COH-*` |
| 7 | **Aesthetic quality** | Overall polish, independent of adherence | usually `STYLE-*` / `LIGHT-*` |

## Score anchors (keep grading reproducible)
- **1** — broken / absent (e.g. six-fingered hand; requested object missing).
- **2** — clearly wrong, distracting.
- **3** — acceptable, minor issues.
- **4** — good, small polish remains.
- **5** — excellent, nothing to fix on this axis.

## Output format
A compact scorecard, then the diagnosis and one next prompt:

```
| Dimension          | Score | Note                              |
|--------------------|:-----:|-----------------------------------|
| Prompt adherence   |  4    | all elements present              |
| Subject fidelity   |  2    | left hand has 6 fingers           |
| Composition        |  4    | framing matches 3:2 request       |
| Lighting & color   |  4    | golden-hour read is good          |
| Style & medium     |  3    | a bit glossier than "film" asked  |
| Coherence          |  3    | minor warping in background       |
| Aesthetic          |  4    | strong overall                    |

Weakest: Subject fidelity (2) → failure-modes SUBJ-01.
```

## Routing rule
1. Pick the **lowest-scoring** dimension (tie-break toward the one most central to the user's stated goal).
2. Open its `failure-modes.md` family, choose the matching entry.
3. Apply **one** fix from that entry's priority list to the current prompt.
4. Re-emit the full revised prompt (English, **description only — no flags**, tuned for the target version) + one line on what changed and why. If the chosen fix is a **parameter** (e.g. lower `--stylize`, add `--no`), state it as advice **outside** the prompt block — the user applies it (see the SKILL output contract).
5. If the user re-pastes, grade again — the weakest dimension should move.

## Cross-cutting routes
- If a **`--sref`/`--oref`/`--iw`** was in play and style/subject is off → use `REF-*` regardless of which dimension scored low.
- If a flag seems **ignored** (e.g. `--q` on V8.1, `--oref` on niji) → `VER-*` first; it's a version mismatch, not a prompt problem.


<!-- ============================================================ -->
<!-- 来源文件: reference/failure-modes.md -->
<!-- ============================================================ -->

# Failure-Mode → Fix Playbook

Symptom → likely cause → specific fix. Indexed by ID so `grading-rubric.md` can route to an entry. Apply **one** fix at a time (highest-priority first), re-render, re-grade. Defaults: `--stylize 100`, `--ar 1:1`, `--chaos 0`, `--sw 100`, `--ow 100`.

Families: `ADH` adherence · `SUBJ` subject/anatomy · `COMP` composition · `LIGHT` lighting/color · `STYLE` style/medium · `COH` coherence/artifacts · `REF` reference images · `VER` version mismatch.

---

### [ADH-01] A named object is missing or merged
- **Symptom:** you asked for X; the render omits it or fuses it into something else.
- **Likely cause:** X is buried late, under-specified, or out-competed by a dominant subject / high `--chaos`.
- **Fix:** 1) move X **earlier** in the element order. 2) make X concrete (material + color + size). 3) lower `--chaos` toward 0; cut competing modifiers. 4) (V7) pin X with `--oref` if it's the recurring subject.
- **Version notes:** `--oref` step is V7-only; on V8.1 rely on ordering + specificity.
- **Confidence:** `[S]` ordering/specificity well-attested; exact `--chaos` thresholds `[L]`.

### [ADH-02] Part of the prompt is ignored / contradicted
- **Symptom:** a clause (pose, color, count) is dropped or reversed.
- **Likely cause:** overloaded or self-contradicting prompt; the clause buried under hype words; `--stylize`/`--exp` too high (aesthetics override instructions).
- **Fix:** 1) one idea per clause; delete contradictions and filler ("masterpiece, 8k"). 2) front-load the ignored clause. 3) lower `--stylize` (and `--exp` if used).
- **Version notes:** V7/V8.1 parse description well — prefer phrases over tag soup.
- **Confidence:** `[S]`.

---

### [SUBJ-01] Distorted hands / extra fingers
- **Symptom:** mangled hands, 6+ fingers.
- **Likely cause:** complex hand pose, hands small/off-center, cluttered scene.
- **Fix:** 1) simplify the hand action; describe it ("hands resting, relaxed"). 2) bring hands into focus / tighter shot. 3) regenerate. 4) **Vary Region** to inpaint just the hand. 5) `--no extra fingers, deformed hands` as a last nudge.
- **Version notes:** none version-specific; tighter framing helps on all.
- **Confidence:** `[S]`.

### [SUBJ-02] Distorted / asymmetric face
- **Symptom:** melted or off face, especially in wide shots or crowds.
- **Likely cause:** small face in a wide composition; too many people.
- **Fix:** 1) tighter shot ("portrait, close-up, 85mm"). 2) single subject. 3) **Vary Region** + Creative Upscale on the face. 4) (V7) `--oref` for a specific identity.
- **Version notes:** `--oref` = V7 only.
- **Confidence:** `[S]`.

### [SUBJ-03] Wrong count / duplicated or merged subjects
- **Symptom:** asked for 2, got 3; figures blend together.
- **Likely cause:** attention spreads across many subjects; models count poorly above ~4–5.
- **Fix:** 1) limit to 1–2 subjects; composite extras separately. 2) avoid exact high counts ("a pile of" not "exactly seven"). 3) `--no duplicate, clone, twin` if it persists. 4) lower `--chaos`.
- **Confidence:** `[S]`.

---

### [COMP-01] Wrong aspect ratio / bad crop
- **Symptom:** unwanted square, subject cut off.
- **Likely cause:** no `--ar`, or composition not planned.
- **Fix:** 1) set `--ar` to target (9:16, 16:9, 3:2). 2) for an otherwise-good image cropped wrong, use **Pan / Zoom Out** (outpaint) rather than re-rolling. 3) name the shot size in the prompt.
- **Confidence:** `[C]` for `--ar`; editor steps `[S]`.

### [COMP-02] Composition too busy for text / logo overlay
- **Symptom:** no clean area to place a headline or logo.
- **Likely cause:** detail spread full-frame.
- **Fix:** 1) prompt `negative space`, `minimalist`, `centered subject on plain background`. 2) keep the center ~60% uniform, push detail to corners. 3) low `--chaos`. 4) pick a layout-appropriate `--ar`.
- **Confidence:** `[S]`.

---

### [LIGHT-01] Flat, moodless lighting
- **Symptom:** even, lifeless light; no depth.
- **Likely cause:** no lighting cue given.
- **Fix:** 1) specify **source + direction + quality** ("golden-hour side-light, warm rim from left"). 2) add time-of-day/weather. 3) consider lower `--stylize` so the named light survives.
- **Confidence:** `[S]`.

### [LIGHT-02] Oversaturated / "AI-glossy" / over-processed
- **Symptom:** plasticky, HDR-ish, too punchy.
- **Likely cause:** default beautifying aesthetic + high stylize.
- **Fix:** 1) add `--raw`. 2) drop `--stylize` to ~100–150. 3) name a realistic medium ("35mm film, natural color"). 4) reduce `--exp` if used.
- **Version notes:** it's `--raw` (not "--style raw") on current models.
- **Confidence:** `[S]`.

---

### [STYLE-01] Over-stylized vs too literal
- **Symptom:** too artsy and off-prompt, or flat and uninspired.
- **Likely cause:** `--stylize`/`--exp` mismatched to intent.
- **Fix:** photoreal → `--s 50–150 --raw`; illustration → `--s 400–700`. Never reuse V6 stylize numbers (V7/V8.1 read higher). Adjust `--exp` in small steps.
- **Confidence:** `[L]` exact bands (recalibration is single-source).

### [STYLE-02] Generic / stock-photo subject
- **Symptom:** bland, anonymous result.
- **Likely cause:** vague noun ("a man", "a city").
- **Fix:** add 3–5 concrete descriptors (age, wardrobe, expression, distinguishing feature, era). Replace evaluative words with sensory ones.
- **Confidence:** `[S]`.

### [STYLE-03] Muddy / indecisive aesthetic
- **Symptom:** looks like several styles averaged together.
- **Likely cause:** 5+ conflicting style modifiers.
- **Fix:** cap at **2–3 modifiers from different categories** (medium + lighting + era). Remove words before adding.
- **Confidence:** `[S]`.

---

### [COH-01] Warping / melted detail / extra limbs in background
- **Symptom:** nonsense geometry, duplicated limbs, dissolving detail.
- **Likely cause:** `--weird`/`--chaos` too high, or overloaded scene.
- **Fix:** 1) lower `--weird` and `--chaos`. 2) simplify the scene. 3) `--raw` for more literal structure. 4) Vary Region to repair a local area.
- **Confidence:** `[S]`.

### [COH-02] Garbled / misspelled text
- **Symptom:** letters wrong or gibberish.
- **Likely cause:** phrase too long, odd font, no quotes.
- **Fix:** 1) wrap text in **double quotes**, ≤3 words. 2) common font ("bold sans-serif"). 3) `--raw` or lower `--stylize`. 4) finish real typography in a design tool. (Chinese text: don't rely on MJ — add it in post.)
- **Version notes:** newer models render text better, but still limited.
- **Confidence:** `[C]` quotes mechanism; rest `[S]`.

---

### [REF-01] Style not transferring (`--sref` too weak)
- **Symptom:** the reference's look barely shows.
- **Likely cause:** `--sw` too low, or using an image ref (weaker than codes in V7).
- **Fix:** 1) raise `--sw` (250–500). 2) prefer a **numeric style code** over an image. 3) ensure `--sv 6` (or `--sv 4` for legacy codes).
- **Confidence:** `[S]`.

### [REF-02] Style too dominant / subject lost
- **Symptom:** everything looks like the reference; your subject is gone.
- **Likely cause:** `--sw` too high; too many stacked codes.
- **Fix:** 1) lower `--sw` toward 65–175. 2) reduce the number of sref codes. 3) strengthen the subject description.
- **Confidence:** `[S]`.

### [REF-03] Character drift across a series
- **Symptom:** the "same" character changes face/outfit between images.
- **Likely cause:** no subject lock; inconsistent descriptors; new style cues mid-series; chaos too high.
- **Fix:** 1) (V7) `--oref <url> --ow 200–400`. 2) keep **identical** wardrobe/hair wording every prompt. 3) reuse the same `--sref` + lock `--seed`. 4) `--chaos 0`.
- **Version notes:** `--oref` is V7-only; on V8.1/niji rely on descriptors + shared `--sref` + seed.
- **Confidence:** `[S]`.

### [REF-04] Omni-Reference character present but warped / over-baked
- **Symptom:** the referenced subject appears but looks distorted or pasted-on.
- **Likely cause:** `--ow` too high relative to `--stylize`.
- **Fix:** 1) drop `--ow` below ~400. 2) to re-style the character (e.g. photo→anime), lower `--ow` to 25–50. 3) raise `--stylize` if you need high `--ow`.
- **Version notes:** V7 only.
- **Confidence:** `[S]`.

---

### [VER-01] `--q` seems ignored
- **Symptom:** `--q 2`/`--q 4` has no effect.
- **Likely cause:** you're on **V8.1**, which has no `--q` knob.
- **Fix:** use `--hd` / `--sd` for resolution/detail on V8.1; `--q` only works on V6/V7.
- **Confidence:** `[C]`.

### [VER-02] `--oref` / `--ow` seems ignored
- **Symptom:** the omni reference does nothing.
- **Likely cause:** you're on **V8.1 or niji** — Omni Reference is **V7-only**.
- **Fix:** add `--v 7` to use `--oref`; or, staying on V8.1, approximate with repeated descriptors + shared `--sref` + locked `--seed`.
- **Confidence:** `[C]`.

### [VER-03] Using `--cref` / `--cw`
- **Symptom:** character reference flags do nothing on current models.
- **Likely cause:** `--cref`/`--cw` are **deprecated**; replaced by Omni Reference in V7.
- **Fix:** never emit `--cref`. Use `--oref`/`--ow` on V7.
- **Confidence:** `[C]`.

### [VER-04] An old V6 prompt looks flat in V7 / V8.1
- **Symptom:** a prompt that used to pop now looks dull.
- **Likely cause:** stylize was recalibrated higher on V7/V8.1.
- **Fix:** raise `--stylize` (e.g. old v6 `--s 100` ≈ v7 `--s 300–400`) and/or add modest `--exp 10–25`. Verify the exact mapping in-app.
- **Confidence:** `[L]` (recalibration map is single-source).

