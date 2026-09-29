# Craft Library 增补 · 审计补遗

> 补 `craft-library.md` 遗漏的**通用方法论**(非图型专属),与 `shot-types.md` 的图型模板互补:那边给"某类图怎么搭骨架",这边给"任何图都用得上的手艺细节"。按需查,不必通读。
> 实证来源:《万物生·问心》176 条真实生产 prompt(gid 可追溯)+ 三份 playbook(01 双寄存器 / 02 三段式解剖 / 04 电影感签名)。

## 目录(本文 10 节)
1. API 参数建议(完整段)
2. hex 色板全档(强度递增 6 级)
3. DP 三位调性表 + 两条显影链配方
4. 题材级负向 Avoid(定制点名,不抄通用)
5. 参考图风格冲突会整批塌方
6. 三大原理 + 资产收敛链 5 步
7. 多动作叠加衰减(一次只压一个主动作)
8. "softness is intentional and desired" 锚点
9. CONSTRAINTS 三种否定句式
10. 渲染精确 HEX/文字不可靠

---

### 1. API 参数建议(完整段)

**原理**:`size/quality/output_format` 写在 prompt 末尾不是给模型看的,是"配置即文档"——让这条 prompt 离开作者也能被任何人原样复跑(gid7/gid26 末尾逐字相同的参数尾就是为此)。

**可直接抄的参数尾模板**:
```
【API 参数建议】
model: gpt-image-2
[EDIT 类任务(在已有图上改光/改局部)注明:调用 images.edit,不是 generate]
size: [按细节密度给,见下]   quality: medium   output_format: jpeg
Thinking Mode: 开启(复杂合成/多约束/多角色时)
参考图:Image 1 = [职责]   Image 2 = [职责]
【提醒】Preserve list 是核心,绝不能动的元素往 Preserve 里补一句;
若是九宫格,在 PRESERVE 开头加 "preserve the multi-panel grid layout and the content of every panel"。
```

逐项口径(本片实证):
- **images.edit vs generate**:在现成图上改(重打光/去元素/局部改写)走 `images.edit`;从零无中生有建场景/参考图/关键帧走 `generate`。建改不分,是双寄存器翻车的根因(见第 6 节)。
- **output_format**:成片/物料图一律 `jpeg`(体积小够用);要透明底/无损叠层才 `png`。
- **size 按细节密度**:单帧 1K~2K 即可;**九宫格/多视图/群像站位图必须上 1536 长边或 2K+**,否则每格细节糊——gid17/19 瞳孔倒影剪影在 2K 下都不可读,gid84 hex 码在 1K 下读不清,都是分辨率吃掉细节。
- **quality**:`medium` 是本片默认甜点;`high` 留最终交付。

正例 gid7(地龙九宫格,`size 1536x1024 / quality medium / output_format jpeg / Image1+Image2`,任何人接手可复现);进阶 gid 场景-003 重打光条更写到 `model: gpt-image-2 · images.edit · Thinking Mode 开` + Preserve 提醒,已是 SOP。反例:大量轻型条目没参数尾,复跑只能靠口头/节点记忆。

> **坑**:size 配不上细节密度 = 手法全对也翻车,这是独立旋钮里最常被省的一档。

---

### 2. hex 色板全档(强度递增 6 级)

**原理**:"暖色调/沙漠色"模型有一百种解读,`#A82A2A` 是唯一解。把调色从"听感觉"升级成"对色卡",强度逐级递增——按这张图值不值得越往下用得越重。

1. **逐元素 hex(嵌进描述)**:写物体顺手钉色,颜色和物体绑死。`cinnabar red #A82A2A talisman strips`、`tanned-hide brown #8C6F4A textile`。
2. **整段 color bible(13~22 色)**:PHOTOGRAPHIC TONE 之前列一条命名色板,每色"功能命名 + HEX":
   ```
   COLOR PALETTE (lock exactly): hot sunlight #F4E6C8, sand midtone #A89472,
   hard shadow #6B5A47, heat-bleached black #2A2620, cinnabar accent #A82A2A
   (sole saturated focal color). All other colors restrained, desaturated, within this palette.
   ```
3. **60-30-10 三色英雄律 + 可数约束**:不靠"大概多一点红",写成**可数**——`10% 点缀色 appearing at EXACTLY 4 named spots — no more than 4 accent points anywhere`。用数量而非面积制造节奏。
4. **Mondrian 计数法(最反直觉)**:同尺寸物靠**数量**做色块平衡——`all items identical in size; color-block sizing achieved PURELY through quantity and grouping, NOT variation in single-item size; a larger block = cluster of 5-6 identical items, smallest = a single isolated item; asymmetric Mondrian-style balance`。既保住道具真实尺寸一致,又拿到非对称构图平衡。
5. **甜区 13~22 色**:太少(<8)锁不住整片;太多(>25)模型记不住、互相干扰。本片有 13 色(EP2 日光)/ 22 色(极光夜景)两套。
6. **黑白片仍给彩色色卡 + 转灰阶层级**:`render the color palette as black-and-white but preserve tonal hierarchy(红→中深灰、黑保深、白保亮)`(gid129/141),否则模型自己定灰阶权重会乱。

正例:gid142(22 色卡转译冷青蓝极光,影调统一);gid137 杂志卡(60-30-10,teal 仅 4 处禁超 4 点,肉眼可分未溢色);gid4 桌面(Mondrian 计数,同尺寸符箓靠数量做色块)。
反例:gid81 唯一焦点色 `#A82A2A` 被暖沙调 + skip-bleach 一起吸收没抢出来——焦点色必须 `sole saturated / glowing` 显式拔高 + 周围显式压灰才对抗得过去饱和。

> **坑**:色板条要放在 PHOTOGRAPHIC TONE / 显影链**之前**("先定颜色,再定胶片质感")。

---

### 3. DP 三位调性表 + 两条显影链配方

**原理**:模型把"DP 名字"和"一整套视觉语言"在语料里绑死了——写一个 DP 名 ≈ 一次下达几十条打光/构图/色彩指令的压缩包;胶片型号是比 DP 名**更硬的物理锚点**,直接对应"感光→显影→颗粒"的成像链,把图从"数字 AI 渲染"拽向"实拍底片扫描"。

**三位 DP 调性表(可叠用)**:

| DP 署名 | 调出什么 |
|---|---|
| **Greig Fraser**(Dune 2021) | 暖沙金褐、火光内景、低反差柔散光、宽容度大的"被沙漠晒过"质感(本片主基调 DP) |
| **Roger Deakins** | 极简、冷峻、史诗孤独感、大 negative space、硬朗光比、克制色彩 |
| **Hoyte van Hoytema** | 大画幅 IMAX 质感、冷蓝夜景、暗部仍有色彩深度(Interstellar/Oppenheimer) |

三个名字**可以叠用**做"调性配方"而非二选一。gid142 同时写 `the visual language of Roger Deakins and Greig Fraser and Hoyte van Hoytema, low saturation high contrast cinematic dark scene` → 取 Deakins 的孤独构图 + Fraser 的沙漠色性 + Hoytema 的夜景画幅,合成"史诗孤独的极光夜景",吻合度高。退一步可用"导演名+作品名":`Denis Villeneuve and Greig Fraser, Dune 2021 aesthetic`。

**两条显影链配方(抄走)**:
```
// 彩色日/夜景显影链(低饱和高对比、暗部厚实、跳漂白的苍茫硬调)
35mm Kodak Vision3 500T film stock with skip-bleach negative LUT,
analog photochemical grain, single still frame from a feature film.

// 黑白武戏显影链(真实黑白片基灰阶、实拍武术剧照感)
Kodak Double-X 5222 black-and-white film stock aesthetic. Anamorphic widescreen lens.
Subtle organic film grain only. Colors restrained, slight gray tone.
```
三个零件各管一件,缺一不可:胶片型号 = 色彩科学与宽容度;`skip-bleach LUT` = 显影工艺(本片"苍茫不浪漫"的灵魂词,压饱和、加深暗部、高光发灰);`analog photochemical grain` = 颗粒纹理,干掉塑料磨皮/数字锐化。

正例:gid90 航拍(Vision3+skip-bleach+grain,完全避开塑料 AI 航拍味);gid141 黑白武戏(Double-X 5222+anamorphic,本片完成度最高动作静帧之一)。

> **坑**:① 优先用"DP + 公认代表作 + 时间"(`Greig Fraser Dune 2021`),比单写人名稳;语料里没绑定的组合等于没写。② DP 署名要和胶片/画幅**风格自洽**——写 Deakins 冷峻就别叠高饱和 HDR,会打架。③ `analog grain` 要配 `Avoid: heavy digital grain`,否则可能加成噪点(颗粒是 organic/subtle 不是 heavy digital)。④ skip-bleach 去饱和会一起吃掉焦点色(见第 2 节 gid81)。

---

### 4. 题材级负向 Avoid(定制点名,不抄通用)

**原理**:通用反 AI 味词库(塑料/HDR/过锐)防的是"渲染质感";但模型对每个**题材**有专属的"俗气模板偏置",通用 Avoid 防不住具体题材的滑动。题材级负向要按"**这张最可能被画歪成哪个相邻题材**"定制点名。

**做法**:出图前问一句"这个题材模型最爱套哪几种俗气模板?"逐个 `Avoid:` 掉。本片实例:
- **航拍营地** → 排 `drone shot of modern festival camp, Burning Man aesthetic, modern desert resort aerial, desert wedding, modern military bivouac`(gid90,完全没滑向现代节庆/军营航拍,零翻车)。
- **弓箭手** → 排 `fantasy elf archer, 日式弓道家`(gid123)——掐掉模型从"拉弓"最容易滑过去的两个相邻题材。

**句式**(贴在通用反 AI 味词库之后):
```
Avoid: [通用反 AI 味基底...], [题材级负向:此场景最容易被误画成的现实/幻想相邻题材].
```

正例 gid90(题材负向未触发,部落营地航拍稳)。反例参照:gid10 桌面构图流派词写得精,但没在 Avoid 显式排 `fisheye / wide-angle distortion`,结果出了 prompt 没点名的鱼眼畸变——负词不点名 = 不设防。

> **坑**:这一档是迁移到新项目时**最需要重写**的(它和题材强绑定);通用反 AI 味基底可原样抄,题材负向必须换成你项目的雷区。且负词是降概率不是开关——题材级负向也只是把"滑过去"的概率压下来,不保证消除。

---

### 5. 参考图风格冲突会整批塌方

**原理**:同一职责喂进**互斥风格**的源(写实真人 vs 卡通),模型无所适从,会整批塌方——不是某一张偶发,是连续多条系统性崩。

**实证**:gid57–64 两张参考图风格对立(写实真人 vs 卡通哆啦A梦),却同时要"复刻画风 + 构图",连续多条塌成卡通/熔脸,gid61 甚至自动叠了无关气泡。**直觉解法是错的**:以为"删掉'画风'两个字给模型浮动空间"能救——gid61/63 证伪,**配卡通参考时删画风反而放大塌方**。同批唯一较成功的是 gid62(保留"画风"字 + 让构图参考影响弱)。

**重起信号**:参考图风格冲突导致塌方时,**别在文本上硬磨、别删画风字**——回去换一套**自洽的参考图**重建。这是"重起重型 vs 接着微调"判定线里的一条独立触发条件。

> **坑**:塌方的根因在输入端(参考图互斥),不在 prompt 措辞;在 prompt 里加禁令/删词都是打补丁,治不了上游。

---

### 6. 三大原理 + 资产收敛链 5 步

**三大原理**(双寄存器的底层解释):
1. **滑块原理**:图生图每次出图都在"照抄输入↔自由发挥"之间选一个点。你写的每个字、给的每张图都在推这个滑块。重型 prompt 把滑块推向"按我说的造",轻型一句话推向"基本照抄、只动我点名的一处"。建时用轻型句、改时用重型句 = 把滑块推错方向,是所有翻车的统一解释。
2. **信息密度 = 可控度**(建必须重):一张设定表要同时锁物种解剖/版式/布光/材质/色板/比例尺/反 AI 味,没有任何一项能靠"一句话+一张图"传达。gid84 一页式 creature sheet 之所以最完整,正因把四视图+人形剪影+比例条+五色 HEX 一次写满。
3. **最小破坏**(改必须轻):图已存在且基本满意时,prompt 写得越多,模型越可能"顺手"重画你没让它动的地方——每多写一个字,多一处漂移风险。gid171"裙子再短一半,其他不作修改"只动裙长,脸/上装/披风/道具全保住。

**资产收敛链 5 步(建一次,改十次)**:
```
①重型建参考图 → ②重型建设定表/关键帧 → ③轻型修画质 → ④轻型改单变量(裙长/发型/衣领) → ⑤轻型清理(去元素/换元素/定妆)
```
真实样板(黑红机甲战士主线):重型建形态 gid135 → 加人剑等高比例锚 gid136 → 转轻型 gid170 双@换裙子披风 → gid171"裙子再短一半" → gid176"改成超短裙" → gid168/169/174 按宫格补衣领/丝袜破损 → gid175 去某格丝袜改光脚。一旦重型把"身份+形态+比例"钉死,后续 8 条全是中文一句话微调,没一条需要重写正文——这就是双寄存器的产能红利。

> **坑**:第一步判错"这次是建还是改"是最大的时间黑洞。手上没底图/要定全片调性/要出设定表 → 重型;已有满意底图只想动一处 → 轻型。

---

### 7. 多动作叠加衰减(一次只压一个主动作)

**原理**:叠 ≥3 个微动作做复合情绪/姿势,会**衰减**成中性结果,且加参考图也救不回。模型对"复合微表情"用纯文本难锁。

**实证**:gid146/153/154 想用"单眼眯 + 挑单边眉 + 抿嘴 + 歪头"四个微动作叠出"难以置信"的复合情绪,结果**都偏成"平静审视"**;gid154 加第二张五官参考对表情几乎零增益。

**正解**:一次只压**一个主动作/主情绪**;表情维度优先靠"表情参考图 + 逐特征点名"(gid48"复刻无奈流泪欲哭无泪的表情和厚嘴唇和明显的眼白和大黑眼珠子"——逐特征点名才奏效,抽象动词"复刻表情"无效)。

正例 gid48(单一情绪 + 逐特征点名,锁住)。反例 gid146/153/154(四动作叠加,全偏成平静审视)。

> **坑**:别指望"多写几个动作词 = 表情更丰富";动作越多反而越往中性回归。要丰富就拆成多张图各压一个,别一张图硬叠。

---

### 8. "softness is intentional and desired" 锚点

**原理**:你写 `slightly soft / film-like softness`(刻意的胶片柔焦)时,模型默认会把"soft"理解成"需要我修锐的缺陷",反手给你锐化掉。加一句"这柔是**故意的、想要的**",模型才肯把柔焦当目标而非 bug。

**抄走**(放 PHOTOGRAPHIC TONE 开头):
```
PHOTOGRAPHIC TONE: this image is a film still ... that may appear slightly soft
and imperfect, like a real photograph — this softness is intentional and desired.
```

正例:本片 50+ 条 PHOTOGRAPHIC TONE 基底都带这句(gid7/78/90/95...),柔焦质感稳定落地。这一句是该段最廉价、最高杠杆的一处——一句话的事,漏了就被反锐化。

> **坑**:这句只对"刻意柔焦"题材有用;要平面矢量色板/标题卡(本来就要 clinical tack-sharp)时**别加**,会和"精确清晰"打架。

---

### 9. CONSTRAINTS 三种否定句式

**原理**:CONSTRAINTS 块管"叙事/逻辑/物理层面绝对不能发生的事"(≠ Avoid 管渲染 AI 味)。同是禁令,按纠偏类型用三种不同句式,各管一类:

| 句式 | 管什么 | 例 |
|---|---|---|
| **NEVER** | 绝不出现(尺度/逻辑铁律) | `The whole dragon must NEVER be fully visible — only a fragment.` |
| **Do not** | 禁止操作(形态锁/NO-FACE/数量锁) | `Do not show any human facial features — the entire face is and must remain the black LED panel.` / `Do not add more than four teal-green points.` |
| **NOT...but...** | 程度纠偏(别走极端、保持可识别) | `Half-ruined, NOT flattened — must still be recognizable.` |

三种混用覆盖"绝不出现 / 禁止操作 / 程度纠偏"三类。

正例 gid7(三种句式齐全,尺度铁律 NEVER + 净底 Do not + 程度 NOT...but...)。反例 gid22:LED 脸的形态锁(本该用 `Do not...the face is and must remain...`)只写在色板里、没进 CONSTRAINTS 块,结果**出了普通人脸**——句式对了还得放对块。

> **坑**:别把 CONSTRAINTS 和 Avoid 混为一谈。逻辑/形态/数量禁令进 CONSTRAINTS;渲染 AI 味(锐/躁/塑料)进 Avoid。放错块权重不够会翻车(这与 craft-library.md 第 1 节"铁律"同源,此处补的是 CONSTRAINTS 内部的三种句式分工)。

---

### 10. 渲染精确 HEX/文字不可靠

**原理**:让模型把**精确 HEX 码 / 长串精确文字**当像素渲染**进图里**(色卡卡片、Pantone 卡、设计稿上的码与标签),文字与色块数量大概率错排——模型渲染长串精确字符的能力本就不可靠。

**铁律**:**以 prompt 里写死的码为准,不要回读出图核对。** prompt 写了 `#A82A2A`,这张图的"真值"就是 `#A82A2A`,哪怕出图上印的是别的码也别据图修正——错的是渲染,不是你的码。

实证:gid72 / gid161一 让模型把 hex 码当文字渲染进色板卡,文字/色块数量错排(playbook01 坑7 / playbook04 §3反例 / §9踩坑3 同源)。

〔复检订正,如实标注〕playbook04 原文曾把 gid72(色板卡)、gid140(换画幅吞标题)列为"渲染失败"反例,经放大读图复核**这两条实际都渲染成功了**,已撤为正例。所以:渲染精确字符**确有翻车风险**(一般性提醒保留),但不是必然失败——结论是"别依赖出图回读、以写死的码为准",而非"一定会错"。

> **坑**:别拿出图上印的 HEX/文字去反推或核对你的配色系统;那是输出端的不可靠渲染,不能当真值来源。

---

*取材:playbook 02(§2 段5/§0/§2 段3·4)、04(§1/§2/§3/§6/§9)、01(§1/§4/坑3/坑7);gid 与细节均来自原文,未核到实测样本处已标注(如第 10 节复检订正)。*
