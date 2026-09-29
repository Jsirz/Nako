# Craft Library · 出图手艺全集

> 引擎(SKILL.md)调你来挖某一项细节时读这里。也可以出图前整体过一遍。
> 实证来源:《万物生·问心》176 条真实生产 prompt(gid 编号可在 `30万物生\分析\` 追溯)+ 一整轮大逃杀分镜实战。

## 目录
1. 六段式骨架细则 + 完整范例
2. 双寄存器 + 模型分工(建/改、Image 2/Nano Pro)
3. 参考图锁定体系 + 多角色防串脸
4. 颜色锁成系统(双区分轴)
5. 高度/位置用构图关系(别用米数)
6. 特效质感正负词库
7. 粒子感 ≠ 整图噪点
8. 清爽明亮调 vs 压抑调
9. 反 AI 味词库 + 电影感签名块
10. 资产设定图(四视图/比例尺/灰底物料)
11. 二次优化治糊(升清晰度 + 高清重制)
12. 数量是弱项 + 九宫格适用边界
13. 角色关系驱动姿态/demeanor

---

## 1. 六段式骨架细则 + 完整范例

每段的填写要点:

- **【参考图标注】**——给每张参考图分**唯一职责** + **排他声明**。一图一职:构图图只管站位、角色图只管某人样貌(逐角色一张)、色卡图只管调色、场景图只管背景。排他声明("仅作为…""不提供…""此图只适用于画面中 X 的位置")是分工真正生效的关键:它不仅说"你管这个",还说"你别管那个"。凡没分配的维度,模型一定自作主张。
- **[主体]**——一句话定画面:景别 + 机位/视角 + 谁在哪做什么 + 环境。位置/高度用构图关系(第 5 节)。
- **[特效层]**——参考图里没有、全靠文字堆的东西。颜色 + 质感(第 6 节)+ 体量。多角色逐个写,并**显式写颜色/形态对比**。
- **【锁定·不改变】**——内部分两层写,别混:**保留 PRESERVE**(身份/影调/构图等不变量,`不改变[五官]和[发型]和[光线]和[调色]和[构图],只把他改成"<新姿态>"`)+ **硬约束 CONSTRAINTS**(逻辑/形态/数量禁令)。⚠ **铁律:形态锁·数量锁·NO-FACE 这类逻辑禁令必须进 CONSTRAINTS,不能塞进 TONE 或 Avoid**——放错块权重不够会翻车(playbook gid22:LED 脸的禁令放进调性段,结果出了人脸)。**表情这一维:别写"复刻表情",写具名特征**(厚唇/眼白/挑眉/眯眼)——抽象动词无效,具名特征有效。
- **【PHOTOGRAPHIC TONE】**——基调 + 天空 + 光 + 调色板 + 清晰度质感(第 8、9 节)。**含角色帧必有光影立体感**(详 §8.1):用人话写"光从哪儿来 / 哪半脸亮哪半脸暗 / 哪儿有暖高光点",**朴素一句**,别堆术语(为什么别堆见 §14 精简原则)。
- **【Avoid】**——结果导向写负向("确保画面里没有任何刀"比"删掉那把刀"扫得全);把这一路翻过的坑全钉死。

**完整范例(单角色建场)**:
```
【参考图标注】
Image 1(角色参考·风刃男):仅锚定风刃男的身份(脸/五官/发型/脏米白亨利衫·深色牛仔裤·工装靴),严格保留不变,只提供样貌不提供姿势。
Image 2(场景参考):仅锚定废墟战场环境,只提供背景,不提供人物与色调。

[主体] A cinematic LOW-ANGLE shot looking UP at him against the open sky: a young man flying HIGH above the ruined city — he sits in the UPPER-CENTER of the frame surrounded by sky, the rooftops small and FAR BELOW him, a large gap of open air between his feet and the rooftops; camera looks slightly up from below (NOT a top-down aerial). One arm thrust forward unleashing his wind.

[特效层] his body wrapped in a powerful yet OPEN/AIRY vortex of CYAN-BLUE wind — translucent, with clear GAPS between the swirling bands (sky visible through it), strongly PARTICULATE (countless glowing cyan specks and fine particles), NOT a dense opaque wall, NOT a solid glass tube.

【锁定·不改变】不改变风刃男的五官和发型和服装,只把他改成"高空悬浮、御风"的姿态;脸严格保留 Image 1,不要换脸、不要卡通/游戏风。

【PHOTOGRAPHIC TONE】bright, clean, FRESH cinematic daylight; soft light-blue sky (not over-saturated) with white clouds; CLEAN, SHARP, SMOOTH, NO film grain / no noise (particles belong to the WIND only, not a grain layer over the photo); palette = light blue sky + warm ruins + luminous cyan-blue wind.

【Avoid】dense opaque wall of wind, solid glass tube, thin weak wisps, aerial bird's-eye, film grain over the photo, photo noise, over-saturated deep blue sky, gloomy, gray overcast, plastic skin, cartoon, video-game render, extra characters, text, watermark, logo.

size 16:9, quality 4K
```

---

## 2. 双寄存器 + 模型分工

- **重型英文 prompt = 建**(图生图 · 基于用户参考图:角色 + 场景 + 色卡电影感参考,出场景/关键帧/定调)→ **Neo Image 2**。**无纯文生图,【参考图标注】必填(SKILL 总纲第一律)。**
- **中文一句话 = 改**(在现成图上迭代微调)→ **Neo Nano Pro**(吃中文、做轻型微调,从零建大特效会软)。

**改图中文模板(三种重量)**:
- 轻量锁:`不改变[五官]和[发型]和[光线]和[调色]和[构图],让<改动项>。`
- 单点定向 + 兜底:`<改一处>。其他不作任何改动。`（最安全的局部改造形态）
- 方位定向:`修改右下角的<X>,改成<Y>,除此之外不要做任何改动。`

**7 类高频微调动作(改图日常,中文一句话,均配"其余不变")**:
| 动作 | 中文模板 |
|---|---|
| 镜头远近 | `把镜头拉远/推近一点,其余不变。` |
| 居中/构图 | `把人物居中(或挪到左/右),其余不变。` |
| 景别 | `从全身改成半身特写(或反之),其余不变。` |
| 表情 | `表情改成<具名特征:眯眼/挑眉/厚唇>,其余不变。` |
| 材质改写 | `把<部件>材质改成<X>,结构不变,其余不变。` |
| 去元素 | `去掉<X>,改成<替代状态>,其余不变。` |
| 换元素 | `把<A>换成<B>(双@:@基底 @样式来源),其余不变。` |
两条规则:**删元素必给替代状态**(去丝袜→"光脚",别只说"去掉",否则模型脑补别的鞋袜);**改动必给物理因果**(湿身→"衣袖紧贴皮肤"),否则模型把反常理细节"合理化"抹平。

**何时"接着微调" vs "重起重型"**:只动 1 个变量、底图基本满意 → 微调。要同时改 ≥3 件事 / 换姿态 / 换结构 / 换机位 / 连续微调后开始熔脸串身份 → 停手,回 Image 2 重起。改不动就别在微调里硬磨。

---

## 3. 参考图锁定体系 + 多角色防串脸

核心:**创作权在文本和参考图间显式分配。文本只锁"什么不变/改哪里/放在哪",内容外包给参考图。** 没显式分配的维度必漂。

- **一图一职 + 排他声明**(第 1 节)。
- **位置用图像坐标**:需要精确站位时,在构图参考图上打点(白点/黑点皆可)+ 文字"标记 = 谁的落点" + 补"其余区域填什么";没条件打点就用"左上角/右下角"方位词 + 改完的替代状态。
- **位置 ≠ 身份**:打点只锁"在哪",身份得另靠角色参考图 + 排他声明咬死(否则身份贴反)。

**多角色防串脸三件套**(实证多角色最易身份贴反):
1. 逐张角色参考图**排他 + 绑画面位置**:`Image 1 对应画面左上方的男人 / Image 2 对应画面右下方的女人`。
2. 锁定段写`不要两人互相串脸`。
3. Avoid 写 `the two faces swapped or merged`。
出图后逐个核身份;串了就加强方位绑定或用打点。

---

## 4. 颜色锁成系统(双区分轴)

颜色一旦开工就**锁死成系统**,不许逐张漂。多方对垒时,靠**两根轴**把各方拉开:

- **轴一·色相/饱和度**:每方一个固定色。相邻色(如都偏蓝)就拉开饱和度(一方饱和青蓝、一方淡白)。
- **轴二·形态/质地**:比颜色更强的区分轴。软流动粒子 vs 硬结晶尖锐;气态 vs 固态。即便两方都偏蓝白,"软的在翻卷 / 硬的在立墙"一眼能分。

**做法**:开工前先定一张"色卡"(每个角色/能力 = 颜色 + 形态),写进项目档案,每镜照搬。Avoid 里钉死"错误颜色 + 与对方同色同质"。

**适度重复=注意力强化**:同一条配色/形态铁律,要在 **[特效层](正面描述)+【锁定】(作禁令)+【Avoid】(负向)三处各说一遍**。这不是啰嗦——给 AI 读的 prompt 适度重复=加权(代码 DRY 不适用于喂 AI 的 prompt)。某镜配色漂掉,多半就是那镜只写了一处、没三处压。

> 踩坑:同一能力的颜色在 S1 是青蓝、S2 漂成青绿、S3 又成蓝,就是没锁系统。先定死再出图。

---

## 5. 高度/位置用构图关系(别用米数)

模型对"飞 10 米"这种抽象数字锚不住——它按构图放人,楼立在人两侧同高,人就只飞了一两层楼。**把"高"翻译成模型能画的空间关系**:

- 楼顶/地面在**他脚下**、压到画面**下方一条**、又小又远
- 脚和楼顶之间留**一大段空旷天空**(空气间隙)
- 他在画面**上半部、四周是天空**
- **低角度仰拍**(从下往上看他、背景是天)→ 读作"高",又不变成俯瞰城市地图

"再高一点"也给可对照量 + 锁机位:`离地约 10 米出头 + 保持平视/仰拍 + 绝不要鸟瞰`,防一句话冲上平流层。同理"凌空"要写`脚不沾任何东西 / NOT on any surface`,否则模型让他站楼顶。

---

## 6. 特效质感正负词库

特效"实/脏"还是"通透/高级",全在这组词。"加足特效"≠"变实心墙"——加的是气势和粒子,不是密度。

**正向(要)**:translucent, semi-transparent, airy, open with clear GAPS, see-through (sky visible through it), particulate, made of fine particles / dust motes / glowing specks, soft flowing ribbons, luminous from within, light passing through, energetic.

**负向(避,放 Avoid)**:dense opaque wall, solid glass tube, dense water rope, smooth solid ribbons, thin weak wisps / faint, neon glowing tube, plastic / CGI / video-game look, muddy.

**两个平衡**:
- 又要"加足"又要"通透":`HUGE/voluminous/intense/wide-coverage/packed with particles` + 同时 `OPEN/AIRY/GAPS/translucent`。
- "密不透风"的解法 = 拉开间隙 + 降密度 + 能透过看到背景,**不是**减少风量。

---

## 7. 粒子感 ≠ 整图噪点

两件事,别混:
- **整图胶片颗粒/噪点(film grain / photo noise)**:一层噪点铺满全图——多数人不要,删掉。它是 prompt 里主动写的风格词,删词即走。
- **特效里的粒子感**:风/能量**本身**由无数细小尘埃/光点构成——要,它让特效有细节和能量。

prompt 里**分作用域写**:TONE 段 `the overall PHOTO is clean/sharp, NO film grain, no photo noise`;特效层段 `the WIND is particulate, full of fine swirling particles`。并加一句`(the particles belong to the WIND only, not a grain layer over the image)`。否则模型一听"粒子"就糊一层 grain。

---

## 8. 清爽明亮调 vs 压抑调

调子是基调级决策,先定再出图。

- **清爽明亮**(蓝天/通透/干净):**删** `Dune 2021 / skip-bleach LUT / film grain / dust haze`(这些是沙漠末世压抑调的来源)。**改** `bright clean fresh daylight + clear/soft light-blue sky + white clouds + high clarity + shallow DoF`。冷特效靠 **teal-orange 互补**(暖废墟 vs 冷特效)干净跳出。蓝天注意别过饱和(`not over-saturated`)。
- **压抑/末世**(沙尘/冷峻):才用 `Dune aesthetic + Kodak Vision3 500T + skip-bleach + analog grain + dusty haze + desaturated`。

特效冷色在清爽蓝天下要够亮(`bright luminous`)才不被天空吃掉。

---

## 8.1 角色帧必有光影立体感 + 大光圈背景虚化(朴素 · 每条角色 prompt 都要写)

**铁律**:角色帧(特写/中景/越肩/全身/双人/**多格分镜板**)的【PHOTOGRAPHIC TONE】段必须钉死 **4 件**:**光从哪儿来 / 哪半脸亮哪半脸暗 / 哪儿有暖高光点 / 背景大光圈虚化**。只写"low-key / 暖光 / candlelit"等基调词 = 模型默认平光 + 背景清晰抢戏 = 像剧组定妆照不像电影帧。

**用人话写朴素一句**(K1 v2 + K2b v4 实测有效模板,直接抄改):
```
Warm light from camera-right. Right half of her face brightly lit, left half in warm shadow.
Highlights on cheekbone, nose bridge, lips, collarbone. Shallow DoF, wide aperture, background
heavily out of focus.
```

4 件分别钉:
1. **光从哪儿来**:`from camera-right` / `from camera-left` / `from above` —— 必须指方向,绝不只写"暖光"。
2. **半脸光**:`right half lit, left half in warm shadow` —— 哪半亮哪半暗写清楚,暗部加"warm shadow, not crushed black"防死黑。
3. **高光点**:`highlights on cheekbone, nose bridge, lips, collarbone` —— 点几个具体位置,模型才会打;不点 = 没立体。
4. **大光圈背景虚化**:朴素 3-4 个词 —— `shallow DoF` / `wide aperture` / `background heavily out of focus` / `bokeh background`。**别堆术语**(`f/1.4 anamorphic bokeh with circular highlights` 这种 = 稀释)。多格分镜板加前缀 `each panel: shallow DoF, background out of focus behind the subject`。

**例外**:图型14 角色四视图定妆是摄影棚中性底(背景本来就空)→ 不需要这条;图型23 色卡是反摄影平面图 → 不需要;图型 24 灰底物料 → 不需要。其他**凡有角色 + 真实场景背景**(图型 01/02/06/07/08/10/11/12/13/15/16/17/18/19/22/26/27/29/31)都要大光圈虚化。

**别堆术语**:`★ 1/3 光向:warm DIRECTIONAL key light at ~45° elevation; ★ 2/3 specular highlights catching...; ★ 3/3 chiaroscuro lighting with deep falloff` 这种分项展开 + 学术英文,在简单帧勉强能行,**复杂帧(双人/OS/长焦/多 Image)注意力被构图段吃掉就失效**。实测:K2b v2(1200 词术语堆叠)半脸光打不出 ✗;K2b v4(390 词朴素一句)✓。详见 §14。

**总长目标**:光影 + 虚化段合计 ≤ 80 词。超了就剪。

---

## 9. 反 AI 味词库 + 电影感签名块

**反 AI 味结尾(Avoid 常驻)**:overpolished studio look, plastic smoothing skin, oversaturation of non-red elements, glossy highlight blowout, generic AI image quality, HDR glow, doll-like skin, 3D rendered look, cartoon / anime / video-game render。

**电影感"签名块"**(口诀:**摆→色→谁拍→拿啥拍→封口**):构图流派 + hex 色板 + DP 摄影师署名(`Greig Fraser Dune 2021` 这种"DP+代表作+年代"比单写人名稳)+ 胶片型号/画幅 + 反 AI 味封口。五个锚点指向同一种真实成像物理,互相纠偏。注意 DP 署名要和后面的胶片/画幅风格自洽(写 Deakins 冷峻就别叠高饱和 HDR)。**清爽调时整套签名要按第 8 节减负**,别照搬 Dune。

---

## 10. 资产设定图(四视图/比例尺/灰底物料)

出"设定图/turnaround/物料"这类交付物时:
- **正交无畸变**(`orthographic, no perspective distortion`),戏剧透视留给海报——两者互斥。
- **四视图/多视图**:整张当不可分割底图,一次只叠**单一变量** + 保留清单(版面结构靠底图继承,不是逐格对齐)。逐格塞多项不同指派模型吃不全。
- **比例尺**控体量:放人形剪影/等高武器/多物种条当"参照锚",把"多大"从形容词降维成图内可对照量(同"白点定位降维位置")。
- **灰底物料图**:`单独抠出<X>放灰底,干净可复用,no environment`。
- **缺全身只有半身肖像** → 先出一张全身/四视图设定图当复用基准,再做动作镜头,否则下半身漂。设定图放灰底(它是要复用的基准/输出),但**当输入参考图时背景随便、不必白底**(靠排他声明挡背景泄漏)。

---

## 11. 二次优化治糊(升清晰度 + 高清重制)

"噪点多/糊/脏"在这套模型里**多数是分辨率不够**,不是真噪点。

- **第一招·升清晰度**:size 拉到 2K/4K(清晰度是与内容正交的独立旋钮)。细节越密(多格/小标签/hex 码),size 必须越大。
- **第二招·高清重制**:把已出好的图喂回去当底图,中文只下 `重绘 + 高清重制 + 真人电影质感,去掉噪点和颗粒。严格保持人物/脸/姿态/构图/配色/特效全部不变,只提升画质。` + 升 size。
- **配锁定防漂**:升质=重绘=会顺手重新创作,身份/构图可能飘,所以二次优化句里**必须带"保持…全部不变"**;只改局部就用方位词框死。

---

## 12. 数量是弱项 + 九宫格适用边界

- **硬数量是 Neo Image 2 的死穴**:"九套/3×3/N 个不同"连跑两次都做不准,靠"逐格点名 + 多跑筛"兜,别指望一句话出准。
- **九宫格只适合"同主体多视图"**(角色四视图/turnaround/同角色多表情——结构从底图继承、只改单一变量)。**不适合"多个完全不同的镜头"**(每格不同机位/动作/角色/场景 → 数量翻车 + 逐格指派吃不全 + 每格只剩 1/9 分辨率,做视频首帧必糊)。
- **多分镜 → 一镜一出**(全分辨率 + 单镜可反复调);一致性靠参考图锁,不靠九宫格。

**高风险特征"必出" SOP**(易翻车的关键形态/特征——机械兽种属、冰墙得是硬结晶、风得通透有粒子):① 把该特征**前置标 `if missing the design fails`**(但光标这句不保证生效);② 预想它最可能翻成什么,写一条"失败模式 → 补救句"映射(如"赛加丢长鼻 → explicitly long drooping nose");③ **出图后逐项对账**该特征到没到位;④ 没到位就**真重跑 + 追加补救句**,别凑合。形态/特征是"硬维度"值得这套对账;表情/画风是"软维度",靠具名特征 + 多跑筛。

---

## 13. 角色关系驱动姿态/demeanor

姿态和特效不是孤立美术,是**人物关系的外化**。先想清谁强谁弱、谁主动谁被动,demeanor 跟着定:
- **真正的强者:平静、从容、甚至零特效**(强到不需要展示力量——他在那放大招,她杵着不动就赢了,这是最高级的"强")。
- **弱/急的一方:张扬、用力、满身特效**(越使劲越显被压制)。
- 关系定了要**全片一致**:强者始终平静、弱者始终张扬,别中途反过来。关系还会反向校正剧情(谁攻谁守、结尾是否反转)。
- **多人同框:把"关系"翻译成具体 blocking 并写死,光想清强弱不够**。要落到"谁坐/卧/倚/立、谁高谁低、谁俯视谁仰视、谁的目光锁在谁脸上"。**漏写体位 → 模型默认全员站立齐高;只写"看向某方向" → 望向虚空而非看人**。双方体位 + 相对高度 + 视线锁定到对方脸,按 正向 + CONSTRAINTS + Avoid 三处复写(详见 shot-types 图型02 命门6;轴线方向见 图型31 命门1)。

---

## 14. prompt 精简原则(适用全图型 · 短优于长 / 朴素优于术语)

**一句话哲学**:给 AI 读的 prompt **适度重复 = 注意力强化**(同一硬铁律在 [特效层]+【锁定】+【Avoid】三处复写 = 加权,见 §4),但**术语堆叠 ≠ 重复 = 稀释**。把"工程化分项 / 学术英文 / 元指令大段"换成朴素直白的人话,模型反而更读得懂、更服帖。

**实测踩坑**(《丹引》K2b 三版迭代):
- v2 = 1200 词,术语堆叠("★ 1/3 光向 / ★ 2/3 chiaroscuro / 8 大 Avoid 族 / 大块 ★★★ 开头 / 每 ref 长 disclaim / HEX 大全")→ 半脸光打不出 ✗
- v4 = 390 词,朴素一句 → 半脸光 ✓
**短一半,效果更好** —— prompt 工程的反直觉,但实测如此。

### 5 类常见过度复杂(每写完一稿 prompt 逐项自查)

**1. 术语堆叠 vs 朴素一句**
× `★ 1/3 光向:warm DIRECTIONAL key light from CAMERA-RIGHT at ~45° elevation; ★ 2/3 the CAMERA-RIGHT side of her face is BRIGHTLY LIT, the CAMERA-LEFT side falls into deep warm shadow with faint warm bounce; ★ 3/3 warm specular highlights catching cheekbone, nose bridge, jawline, lips, collarbone, bare shoulder...`
✓ `Warm light from camera-right. Right half of her face brightly lit, left half in warm shadow. Highlights on cheekbone, nose bridge, lips, collarbone.`
**Why**:复杂构图(双人/OS/长焦/多 Image)时模型注意力被构图段吃掉,光影段长 → 权重稀释。朴素一句把"半脸光"权重集中,反而打得出。

**2. "族"标签分组 Avoid vs 平铺核心**
× Avoid 段写 `★ (锚点漂移族) ... ★ (体位漂移族) ... ★ (视线漂移族) ... ★ (光向漂移族) ...` 8 大族每族 2-4 项,共 20+ 条。
✓ Avoid 直接平铺 6-12 条核心禁令,无标签:`谢凛's face revealed, 虞晚 sitting up, smoke ribbon missing, flat front fill, faces swapped, plastic skin, HDR, cartoon, text, watermark`。
**Why**:"族"标签是给作者看的工程化分类,模型不在乎标签、只在乎里面那几条具体禁令。分组反而把每条具体禁令藏在标签下,权重变弱。

**3. ★★★ 大块开头声明 vs 一行点题**
× 开头 4-6 行:`★★★ THIS IS A WIDE MEDIUM SHOT ACROSS THE ROOM — NOT an over-the-shoulder closeup, NOT a shoulder-to-shoulder closeup. Strictly follow Image N (P2.4) ABOVE ALL OTHER REFERENCES — its spatial layout supersedes any closeness implied by the character refs ★★★`
✓ 开头一行:`OS reverse-shot favoring 虞晚, 120mm telephoto, very shallow DoF.` 提权挪到【KEY CONSTRAINTS】平铺。
**Why**:开头大段元指令(this is X / not Y / above all)把后面真正的 [主体] 段冲淡了。一行点题 + 把强调挪到 CONSTRAINTS 段自然写,反而更稳。

**4. 每张 ref 都长 disclaim vs 只对易漂处 disclaim**
× 每张 Image 后跟一长串:`Image 1 (虞晚 — identity ONLY, NOT a closeness reference, NOT a framing reference, NOT a foreground close-up reference, likeness only not pose, appears ONLY as X, NOT a Y...)`
✓ 只对**真正易漂的那张**写 disclaim(如 OS 软前景容易被当近景主体抢焦 → 写 `FACE NOT SHOWN`);其他简单一句 `Image 1 (虞晚): face / hair / robe ONLY`。
**Why**:每张 ref 后都跟一长串 negation → 模型注意力疲劳,漂移点反而被淹没。

**5. HEX 色板大全堆叠 vs 沿用色卡一句**
× 每帧 TONE 末尾重复:`palette = crimson #7E1C1C, antique gold #C9A24B, candle glow #D9883F, warm-black #171210, cold moonlight #C4D2DE, skin highlight #E8C58A`
✓ 第一帧定色卡后,后续仅 `warm crimson-gold per established color bible, with a cold moonlight accent`。
**Why**:模型记不住第几帧的 HEX 数值是关键,它只需要"暖红金 + 冷月光"这种语义。HEX 堆叠是给作者看的、不是给模型看的;重复堆叠反而占注意力额度。

### 自查清单(每写完一稿 prompt 过一遍)

- [ ] 光影段是不是堆了术语?能不能换成"半脸光"那种朴素一句?(详 §8.1)
- [ ] Avoid 段是不是用了"族"标签?去掉标签平铺,只留核心禁令?
- [ ] 开头有没有 ★★★ 大段元指令?能不能压成一行?
- [ ] 每张 ref 是不是都跟一长串 disclaim?只对易漂处保留?
- [ ] PHOTOGRAPHIC TONE 末尾是不是又抄了一遍 HEX 全表?能不能改"沿用色卡"?

**总字数目标**:复杂帧 prompt ≤ 500 词;简单帧 ≤ 350 词。超了就回头剪。

**适度重复 ≠ 啰嗦**:§4 的"同一硬铁律三处复写"仍然有效——那是把**同一条信息**在不同段落各说一次以加权;本节反对的是把**一条信息用术语堆叠展开成 5 行**。二者别混。

> 出图前先问一句"这一镜里谁强谁弱、谁松谁紧",再落姿态。这一条经常比特效本身更决定一张图"对不对"。
