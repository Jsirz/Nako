# 图型模板库 · shot-types.md

> neoimage-prompt-engine 的**零件库**。编排流水线(SKILL.md)第 ② 步分类、第 ④ 步生成时,按图型来这里取对应骨架。
> 每个图型条目 = **何时用 / 命门 / 专门骨架(填空)/ 真实范例 gid / 校对清单 / 坑 & 调参**。
> 实证来源:《万物生·问心》176 条真实生产 prompt(gid 可在 `30万物生/分析/` 追溯)。

---

## 图型总表(分类路由查这张表)

判图型时先归大类,再落具体型。下面 31 种图型已全部建好,每种七段(✅)。

**Ⅰ 叙事画面(成片镜头)**
- 01 ✅ 上帝视角群像站位图 (blocking) ｜ 02 ✅ 彩色叙事关键帧 ｜ 03 ✅ 建场航拍 ｜ 04 ✅ 黑白武戏静帧 ｜ 05 ✅ 双头沙漠极光帧(白点+22色卡) ｜ 06 ✅ 角色姿态/表情复刻帧 ｜ 07 ✅ 从成图抠主体特写 ｜ 08 ✅ 极限微距叙事帧 ｜ 09 ✅ 重打光 edit(只改光)

**Ⅱ 多格/分镜板**
- 10 ✅ 九宫格场景多机位分镜 ｜ 11 ✅ 九宫格武戏分镜(首尾镜像) ｜ 12 ✅ 状态批量九宫格(完好→被毁) ｜ 13 ✅ 民族志服装陈列板(3×3) ｜ 31 ✅ 正反打双人对话关系板(180°轴线·换场景必出)

**Ⅲ 工业设定图(turnaround)**
- 14 ✅ 角色四视图定妆 ｜ 15 ✅ 生物 creature sheet(多视图) ｜ 16 ✅ 生物侧身正交全景 ｜ 17 ✅ 纪实实景陈列(反棚拍) ｜ 18 ✅ 载具设计图 ｜ 19 ✅ 机械兽形态设计图 ｜ 20 ✅ 武器四视图(借结构换材质) ｜ 21 ✅ 比例尺立绘(人剑等高) ｜ 22 ✅ 同物种变体(兽王/精英)

**Ⅳ 物料/平面图**
- 23 ✅ 色卡 color bible ｜ 24 ✅ 灰底物料抠图 ｜ 25 ✅ knolling 桌面陈列 ｜ 26 ✅ 杂志风介绍卡(60-30-10) ｜ 27 ✅ EVA 风人物海报 ｜ 28 ✅ 片头标题卡 ｜ 29 ✅ 绿幕/动捕占位图 ｜ 30 ✅ 质感后缀模块(挂载件,非独立图)

> 每条统一七段:**何时用 → 命门 → 专门骨架 → 真实范例 → 校对清单 → 坑&调参**。下面 01 是标准样板,其余按此颗粒度补。

---

## 图型 01 · 上帝视角群像站位图(blocking diagram) ✅

### 何时用
剧本里**一个空间内 ≥3 个角色/生物同框**、需要锁死"谁站哪、朝向、谁挡谁、谁离镜头远近"时。它是 blocking diagram(站位蓝图),**位置/朝向/影调正确优先于美感**——给剧组当机位与调度参考,不是成片美图。全库最常用、产量最大的图型(gid83 + gid95–113,20+ 条)。

### 命门(这种图独有的成败关键)
1. **depth order 逐层声明,且结尾再复述一遍**:从相机往里,前景→近侧→远侧中景→最远→背景,逐层写谁在哪;写完再用一句 `So the depth order from camera into the scene is: A → B → C → D → 背景` 复述。原文真的说了两遍——这是 AI 把"纵深站位"读对的关键。
2. **长投影当"站位读取器"**:`long soft shadows cast across the sand from each figure（the shadows help read the staging from above）`——高空俯瞰靠影子才看得清谁站哪。
3. **巨物横陈做"分割墙"**:有大体量物(倒地巨兽)时,让它 `forming a long horizontal wall that splits the scene into two sides`,用它给画面分区 + 做尺度对照。
4. **三件分工**:逐张关键帧标机位职责 + 逐角色一行身份锚 + 色卡。

### 专门骨架(填空)
```
模式:图生图(多关键帧机位图 + 角色参考图 → 合成俯瞰站位图)
size 21:9 超宽 / quality medium / jpeg / Thinking Mode 开
用途:blocking diagram,位置/朝向/影调必须正确,美感其次

【参考图标注 — 务必逐张对应】
- 关键帧1:<从谁背后·越过谁·望向谁 的机位> —— 仅提供机位视角,不提供内容
- 关键帧2:<怼近拍某角色的机位>
- 关键帧3:<拍另一侧的机位>
- 角色参考(逐个一行,仅锁身份):<角色A 一句外观锚>;<角色B…>
  （同一角色可喂多张增强一致性,如丹眉×10,prompt 不变）
- 色卡:整图色彩严格按色卡执行

【PROMPT 正文】
A high-angle bird's-eye establishing shot — an oblique overhead view looking down at the scene
from high above at an angle, used as a staging / blocking diagram. The entire layout of this single
moment must be read clearly from above. <胶片+调性签名:35mm / low-saturation / desert haze /
Villeneuve naturalistic look / subtle grain>. 21:9 ultra-widescreen. <环境一句:崖底/沙地/碎石…>.
Spatial layout (this is the critical part — lay it out exactly), reading across the depth of the frame:
- FOREGROUND, near side: <最大主体/巨物,横陈做 long horizontal wall 切开画面>
- NEAR side: <角色组A + 朝向 + 状态>
- FAR side / middle distance: <角色组B + 朝向 + 状态>
- FARTHEST back: <角色/物C + 状态>
So the depth order from camera into the scene is: <A → B → C → D → cliff/haze 背景>.
Poses must match: <逐角色锁姿态/状态>.
Lighting / tone: warm hazy directional light raking from one side, long soft shadows cast across the
sand from each figure and the beast (the shadows help read the staging from above), low-contrast
desaturated tone, strictly following the color card.
PHOTOGRAPHIC TONE: real photographed film still from high above, slightly soft, not tack-sharp.
Avoid: oversharpening, HDR, plastic smoothing, oversaturation, generic AI aesthetic, <题材级负向>.
```

### 完整真实 prompt 全文(gid83 逐字 · 可直接改填)
```
模式:图生图(基于多关键帧 + 角色参考图合成俯瞰站位图)
quality=medium / output_format=jpeg / size 2K以内(21:9 超宽)/ Thinking Mode 开启
用途:站位参考图 blocking diagram,位置关系、人物朝向动作、影调必须正确。

【参考图标注 — 务必逐张对应】
关键帧1:从丹眉与江流背后、越过前景甲壳兽、望向远处琉璃与赛加的机位。
关键帧2:怼近拍琉璃低头抱着昏迷独眼老头刘回的机位。
关键帧3:拍丹眉与江流这一侧的机位(江流黑屏脸、螃蟹趴头顶,丹眉黑短发白湿衣)。
琉璃:金黑华服、戴兜帽、金臂环的女子(刘回的女儿)。
赛加:犀象体态、双塔状角、青铜甲、蓝眼的机械兽。
刘回:独眼、布缠、机械义肢的沙猎人,此刻闭眼昏迷。
江流:黑色光面屏脸、双蓝眼点、青绿管耳坠、暗红破布衣的机械人。
螃蟹:巴掌大、青铜甲、蓝眼柄的青铜螃蟹。
丹眉:黑色短发、红色发饰、米白/白色立领湿衣的少女。
甲壳兽:体量极其庞大、分节盾片状背甲、铲状口器、多腿的巨兽,此刻侧翻横倒在地。
色卡:整图色彩严格按色卡执行。

【PROMPT 正文】
A high-angle bird's-eye establishing shot — an oblique overhead view looking down at the scene from high above at an angle, used as a staging / blocking diagram. The entire layout of this single moment must be read clearly from above. Shot on 35mm film, low saturation desaturated sandy palette, heavy atmospheric desert haze, soft natural directional light, the restrained naturalistic look of a Denis Villeneuve desert film, subtle film grain. 21:9 ultra-widescreen. The setting is the foot of a damaged cliff in a desert: cracked sandy ground strewn with rubble, a tall fractured rock cliff face along one edge of the frame, hazy dusty air.
Spatial layout (this is the critical part — lay it out exactly), reading across the depth of the frame:
- FOREGROUND, near side: the enormous toppled armored beast (甲壳兽) lies on its side across the near part of the frame, its huge segmented plated body forming a long horizontal wall that splits the scene into two sides. It is by far the largest object, sprawled across the foreground.
- On the NEAR side of the toppled beast (closest to camera): Danmei and Jiangliu stand side by side, both soaking wet. Danmei (black short hair, red hair ornament, white wet stand-collar top) and Jiangliu (black glossy screen-face with glowing cyan eyes, dark-red ragged clothes) stand close together, facing across the beast toward the far side. The small bronze crab perches on top of Jiangliu's head. The two are turned away from camera / toward the depth of the scene, looking over the beast.
- BEYOND the toppled beast, FAR side, middle distance: Liuli kneels / sits low on the sand, cradling the unconscious one-eyed old man Liuhui across her lap — Liuli in black-and-gold hooded robe with gold arm-cuffs, head bowed over Liuhui who lies limp with eye closed.
- FARTHEST back, deep distance: the saiga bronze beast (赛加), a rhino-elephant-bodied mechanical creature with twin pagoda-spire horns and a blue eye, lies collapsed and motionless on the sand behind Liuli.
So the depth order from camera into the scene is: toppled armored beast (foreground) → Danmei & Jiangliu on the near side → Liuli cradling Liuhui on the far side → collapsed Saiga in the far distance → cliff face and haze behind.
Everyone is soaking wet, slick with clear slime, hair dripping. Poses must match: Danmei and Jiangliu standing and looking across; crab lively on Jiangliu's head; Liuli kneeling and bowed cradling the limp Liuhui; Saiga collapsed flat.
Lighting / tone: warm hazy directional light raking across from one side, long soft shadows cast across the sand from each figure and the huge beast (the shadows help read the staging from above), low-contrast desaturated warm-grey desert tone, dusty haze softening the far distance, strictly following the color card.
PHOTOGRAPHIC TONE: real photographed film still from high above, slightly soft, natural lens depth of field, not digitally tack-sharp. Materials photographically captured, not 3D-rendered or AI-stylized. Colors restrained with slight gray tone, not oversaturated.
Avoid: oversharpening, artificial sharpness, heavy digital grain, HDR effect, beauty-filter skin, AI-generated aesthetic, overpolished studio look, plastic smoothing, oversaturation, glossy highlight blowout, generic AI image quality, default model aesthetic bias.
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid83**(首版·全文来源):分割墙 + depth order + 长影助读站位 成立 ✓;但甲壳兽尺度偏小被读成中型、最远赛加被雾吞没(末两层深度没兑现)✗。
- **gid95**(道具-018,**全片最成功的复杂群像调度**):五层纵深全落地 + 长投影生效 + 巨物尺度对比强烈 + Villeneuve 沙调 ✓;角色个体特征在高空小尺寸下不可辨(站位图可接受)。
- **gid100**(道具-023,**全批最清晰**/出图 p151):四主体位置·朝向·远近一目了然,blocking 可用度最高 ✓;机位仍抬高斜侧、非真高空鸟瞰 ✗。
- **gid107 / gid110**:命中帧(站位最准)。

**变体技巧(同 prompt 衍生)**
- **gid102**:把每主体姿态显式锁死(`Poses must match:` 清单)防重生漂移。
- **gid104**:`Everyone soaking wet, slick with clear slime` 一句统一全员物理状态,不逐个重复。
- **gid101**:巨物当"分隔墙"、一次出多张候选扩大命中率。

**反复翻车点(整批教训)**
- 机位整批偏"抬高斜侧近平视",模型对"真·正上方鸟瞰"有阻力 → 接受为分镜机位图;真要俯瞰得多刷 + 强调 `straight-down 90°`。
- 螃蟹 / 最远赛加等小目标在此尺度常丢失(远景取舍,非 bug)。
- gid83 + gid95–113 共 **20+ 条 prompt 逐字相同**,靠多种子复跑挑站位最准那张(gid107/110 命中)。

### 校对清单(出图后逐项对账)
- [ ] depth order 几层**都读出来了吗**?(最远两层易被雾吞没;关键角色丢了要重跑,纯远景小兵丢了可接受)
- [ ] 巨物**够不够大、有没有当成分割墙**?(易翻:倒地巨兽被画成中型,失去尺度压迫)
- [ ] 每个角色**身份对不对、有没有串脸/贴反**?
- [ ] **长投影**出来了没?(没有就读不出站位)
- [ ] 机位是不是**真·高空斜俯**?(易翻:画成抬高的近平视/越肩,不是俯瞰)

### 坑 & 调参
- **冻结 prompt + 多种子穷举挑帧**:一次跑很难全对。gid95–113 同 prompt 连刷 ~8 批,靠数量挑站位最准那张。**别写完跑一次就收**——这是本图型的标准产能方式。
- 巨物易缩水成中型 → 叠挂【巨物尺度铁律】(永不全见/只见局部/做分割墙)。
- 远景小角色在高空小尺寸下不可辨,是站位图**可接受的取舍**(站位对就行)。
- 同角色多张参考图(丹眉×10)只增强一致性,**prompt 一字不动**。

---

---

## 图型 02 · 彩色叙事关键帧(参考图锁脸 + prompt 管构图)✅

### 何时用
**单主角(偶尔含巨物道具)、要一张能直接当成片镜头用的彩色关键帧**——海报级/章节定帧/情绪英姿,讲究构图张力与冷暖电影感,**脸交给参考图、镜头交给 prompt**。和图型 01(blocking 站位、多角色、影调正确优先于美感)正相反:这里**单人、美感与构图张力优先**,且脸往往出画或被透视牺牲。典型三态:① 浅景深单点对焦的持刀仰拍(gid12);② 极端荷兰角 + 红飘带横贯天空的逆光英姿(gid14);③ 巨剑怼镜头超强透视、以小衬大(gid119)。

### 命门(这种图独有的成败关键)
1. **"参考图管脸、prompt 管构图"的职责切分,且在正文开头一句话写死**:`以放入的小丹眉作为参考角色锚定人物长相/发型/服装,本 prompt 只规定构图、姿势、占比、光线、景别与前景,不描述五官`。脸一旦让 prompt 描述就串脸,这条切分是彩色叙事帧不串脸的根。
2. **Markdown 分节拆功能块**:`# 画幅与镜头 / # 人物占比与构图 / # 衣物的动态 / # 光线与色调 / # 纵深层次与对焦 / # 约束`——每块只管一件事,最后 `# 约束` 把全部要点**再复述一遍**(和图型 01 的 depth-order 复述同理:重复=注意力强化)。
3. **一个"视觉锚点"统管全画面虚实/动势**:gid12 把唯一对焦点钉成"左下剑身冷白高光,清晰区由此点状向四周发散虚化";gid14 把"红飘带横贯天空"定为最大动势线;gid119 把"巨剑近端怼镜头"定为视觉重量压前景的支点。一张图只能有一个这种锚。
4. **正反双管锁着装防脑补换装**:gid14 既正向列着装清单,又负向写 `不要无袖战斗装、不要护臂革囊`——彩色英姿帧最容易被模型脑补成"战斗装",正反双管才压得住。
5. **冷暖对撞 + 逆光半剪影做电影感**:暖前景(金麦/沙金)对撞冷背景(灰蓝天/发白逆光天),人物在亮天映衬下偏暗、留光边——这是这一图型的签名打光。
6. **双人/越肩/对话帧:体位 + 视线锁定必须写死(单人帧忽略此条)**:画面多于一人时,模型默认会"好摆构图"——把两人**摆成齐高站立、视线各自散开**。所以 blocking 必须显式钉两项:① **每个人的体位 + 相对高度**(谁坐/卧/倚/立、谁高谁低、谁俯视谁仰视)——漏写哪个,哪个就被默认成站立齐高(实测:越肩帧没写女方"斜倚锦榻"→她被摆成站立、跟对方齐高);② **视线锁定到对方的脸/眼**,写 `gaze LOCKED onto X's face / eyelines meet`,**绝不只写模糊的 "look toward / 朝向"**(只写朝向某方向→人物望向虚空而非看人,实测越肩帧男方"朝左"却没看人)。两项都按 [正文/特效层] +【CONSTRAINTS】+【Avoid】三处复写(轴线方向另见 图型31 命门1)。
7. **远距离对话帧(隔屋对峙、跨房间对视、跨桌对峙)视线锁定难度阶跃,常规三处复写不够**:近距离视线靠几何约束就能锁住,**远距离一旦超出"一臂之内"就掉控**——模型会把"望"翻译成更安全的统计模式:**两人各自低头沉思**(看着像"凝重的对话氛围",其实没在看对方)。比"望向虚空"更隐蔽,因为乍看像在"看",其实视线垂下了。**实测**:K2 同 prompt 第一版"望向虚空",加强后第二版变成"低头看香炉";构图位置烟柱俯仰全对,但视线垮了。**加固方案(超出三处复写,本图型独有)**:① 正向写 **`eyelines MEET across the room, both heads slightly LIFTED to look at each other`**(显式说"头要抬,跨房间相接")— 加"头抬"二字是因为模型默认低头;② Avoid 段把"低头沉思"族**逐项排除**:`looking down at the table / looking down at the incense burner / looking at the floor / heads bowed / eyes lowered / each lost in their own thoughts / not looking at each other / averted gaze / closed eyes`—— 把所有可能滑去的"看似在看其实没看"具名钉死;③ 若一人是纯侧脸,改成 **3/4 朝向对方**(纯侧脸眼睛朝向更难判,3/4 角度能露出双眼朝向);④ 头部姿态写死:`head TURNED toward the other person, chin slightly LIFTED`,把"脖子转向 + 下巴抬"加进体位描述。


### 专门骨架(填空式)
```
模式:图生图(角色参考图锚脸 + 本 prompt 只管构图)
size 21:9 超宽 / quality 2K / Thinking Mode 开
中文分节式,纯叙事彩色关键帧,脸出画或透视牺牲皆可

[图像生成 prompt — <镜头名> · 参考角色<X> · 无文字]
以放入的<X>作为参考角色锚定人物长相/发型/服装,本 prompt 只规定构图、姿势、占比、
光线、景别与<前景/环境>,不描述五官。画面中不出现任何文字、签名、手写字、水印<、UI/图标/电量/时间>。
# 画幅与镜头:<21:9;机位角度——仰拍/荷兰角/广角畸变;镜头——长焦浅景深 or 广角透视>
# 人物着装(用<X>本身那套,严格锚定):<正向列衣物>;<负向:不要__、不要__>
# 人物占比与构图 / 姿势:<位置(右半/偏右三分之一)+朝向+身体取景段(头出画/只露上半身)+张力姿态>
# 核心视觉锚点:<唯一对焦高光 / 红飘带横贯动势 / 巨剑怼镜头透视支点——三选一,只能一个>
# 衣物的动态:<被风掀动、定格动态模糊、布料绷弧>
# 光线与色调:<冷暖对撞:暖前景 vs 冷/发白背景;逆光半剪影留光边;低饱和>
# 纵深层次与对焦:<最实处是谁、由此向外发散虚化、焦外是谁>
# 约束:<把以上每条要点逐行复述一遍 + "画面只有这一个人物" + 无文字>
```

### 完整真实 prompt 全文(gid12 逐字 · 可直接改填)
```
场景-012 · 麦田持刀仰拍构图 · 参考角色小丹眉 · 无文字
Neo Nano 2 / 21:9 / 2K

[图像生成 prompt — 麦田持刀仰拍构图 · 参考角色小丹眉 · 无文字] 以放入的小丹眉作为参考角色锚定人物长相、发型、服装，本 prompt 只规定构图、姿势、占比、光线、景别与前景，不描述五官。画面中不出现任何文字、签名、手写字、水印。 # 画幅与镜头 - 横向超宽银幕画幅，约 21:9。 - 低角度仰拍：机位贴近地面、从下往上仰望人物，人物背靠天空。 - 长焦镜头、极浅景深，焦平面精确锁定在画面左下侧的剑身高光点上：对焦点是左下方剑身迎光那一处最亮的反光，画面的清晰区域以这个高光点为中心、向四周呈点状逐渐发散虚化（bokeh 由此处向外晕开），离这个高光点越远越虚。 # 人物占比与构图 - 人物立于画面右半部、身体明显朝向画面右侧（侧身向右），身体只取躯干一段、头部与脸在画面上缘之外不入画。 - 人物的身体处于焦外、绝对不是清晰的：身体、衣物都被长焦浅景深虚化成柔和模糊的色块，看不清细节。 - 一柄长刀反握于手中：剑柄朝向画面右侧、剑刃朝下，刀身自画面右上方的剑护处向画面左下方斜伸出去、斜切过画面，刀尖朝左下、几乎探到画面左缘；剑身金属迎光，在画面左下侧泛出最亮的一处冷白高光反光（即对焦点）。 - 圆形的剑护（护手）正好锁死在画面右上角的位置，紧贴右上角；握剑的手几乎被剑护与画框边缘遮住、几乎看不到手，只隐约一点。 # 衣物的动态 - 人物的衣物并非静止：衣料、下摆、垂坠的布料呈现被风吹动的状态，并带有定格下来的动态模糊效果——布料朝一侧被风掀动、边缘拖出轻微的运动模糊拖影，是一个动势被定格的瞬间，而非静态站立。配合焦外虚化，身体与衣物整体是柔和、流动、模糊的。 # 前景 - 画面下半部与近处布满大量金黄色、成熟麦穗，麦秆麦芒丛生、自下缘向上探入画面；除了对焦点附近的麦穗与剑身高光较实，其余麦穗大幅虚化成柔软的暖金色光斑与剪影。 - 几支麦穗可虚化地穿插于画面中部、搭在剑身前方。 # 光线与色调 - 晴朗白昼的自然光，低饱和。 - 冷暖对比：背景是大片低饱和的灰蓝色天空（冷调），前景麦穗与麦田是温暖的金黄色（暖调），冷暖在画面里对撞。 - 光线柔和均匀，人物虚化的深色衣装在蓝天映衬下偏暗，画面最亮、最实的亮点是左下侧剑身上那处冷白高光反光。 # 纵深层次与对焦 - 全画面唯一最清晰处：画面左下侧剑身上的那一处冷白高光反光（对焦点），清晰区由此向四周点状发散虚化。 - 中景偏虚：斜贯的长刀其余部分、穿插的麦穗，离高光点越远越虚。 - 焦外：人物躯干与被风吹动的衣物（柔和模糊、带动态模糊）、大片金黄麦穗（暖金光斑）、低饱和灰蓝天空（冷、空），全部处于焦外虚化。 # 约束 - 不描述、不改动人物五官，长相完全依参考角色；本镜看不到脸（头在画外）。 - 画面只有这一个人物。 - 绝不出现任何文字、英文、签名、手写艺术字、水印、logo。 - 人物身体侧身朝向画面右侧；剑为反握，剑柄朝右、剑刃朝下。 - 圆形剑护必须正好锁死在画面右上角，握剑手几乎不可见。 - 对焦点必须是画面左下侧的剑身高光，清晰区由此点状向外发散虚化；人物身体与衣物绝对处于焦外、不清晰。 - 人物衣物带被风吹动的动态模糊效果，不是静态。 - 前景麦穗虚化、冷暖对比必须明显。
```
> 另两态原文片段(均可逐字追溯):
> **gid14·极端仰拍反握刀红飘带**(Neo Image 2 / 21:9 / 2K):`极端低角度大仰拍…从腿部到头部有明显的仰拍透视缩减…极端的荷兰角倾斜构图…剑柄端系着一条红色长飘带,被狂风从剑柄一端猛地甩出、向画面左上方拉出一道极长、流畅的弧线,横贯整个画面上方的天空,是画面里最大、最舒展的动势线条…# 约束 - 着装严格用上述小丹眉本身那套,不要无袖战斗装、不要护臂革囊。`
> **gid119·巨剑怼镜头超强透视**(Neo Image 2 official / 21:9 / 2K):`一柄巨型重剑沿画面对角线斜贯整个画面,呈极端夸张的近大远小透视…剑身靠近镜头的一端怼到镜头正前方、被广角透视极度放大…变身后的丹眉站在这柄剑的远端…因为透视缩减,她整个人在画面里占比小、显得又远又小…把视觉重量压给近端的巨剑…# 光线与色调(正常沙丘色调,不要青橙对冲)…不做青绿与橙色的冷暖对冲,整体是沙漠的暖灰土金调。`

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid12**(全文来源,吻合度高):仰拍/头出画/单人/麦田虚化/冷暖对比/衣物风吹定格/浅景深焦外全接住,**剑身高光为最实最亮点** ✓;圆护手"锁死右上角"、刀尖探左下缘未严格落地(刀偏中部斜贯),属构图微差 ✗。
- **gid14**(吻合度高,本图型最干净的一条):红飘带横贯动势线、极端仰拍、荷兰角、逆光半剪影、脚出画剑出画、衣发狂风定格几乎逐条命中;**正反双管未见脑补换装** ✓。
- **gid45/gid46**(同 gid12 镜头跨模型 A/B):gid45 是"本片受控度最高的成功案例",gid46 用 Image 2 Lite + 双参考图复跑证明重型 prompt 可跨模型移植 ✓。

**反例 / 教训**
- **gid119**(吻合度中):超强近大远小透视成立、青铜甲纹写实、统一暖灰土金调避开被禁青橙 ✓;但**远端人物本应"虽小仍看清脸/肩/握剑张力",实际因透视缩减 + 前景巨剑遮挡几乎不可辨,角色可读性被牺牲** ✗(海报可接受,人物表演诉求未兑现)。教训:用"以小衬大"的强透视时,人物表演会被透视吃掉——海报可、需要演技的关键帧慎用。

### 校对清单(出图后逐项对账)
- [ ] **脸串了没**?(职责切分失效的首要症状;脸出画的镜次直接看身份锚)
- [ ] **唯一视觉锚点立住了吗**?(gid12 看剑身高光是不是全图最实最亮;gid14 看红飘带是不是最大动势;gid119 看巨剑是不是压住视觉重量)
- [ ] **冷暖对撞 + 逆光半剪影**出来了没?(暖前景 vs 冷/发白背景;人物偏暗留光边)
- [ ] **着装有没有被脑补换装**?(尤其 gid14 类:有没有冒出无袖战斗装/护臂)
- [ ] **构图微指标**(护手锁角/朝向/脚出画剑出画)落地了几条?(常翻:护手不在指定角、刀偏中部)
- [ ] 强透视镜:**远端人物还认得出脸/动作吗**?(gid119 教训,认不出就是牺牲过度)
- [ ] **双人/越肩帧**:双方**体位/相对高度对不对**(该坐/卧/倚的没被摆成站立齐高)?**视线真锁到对方脸上**(不是望向虚空)?
- [ ] **远距离对话帧**(隔屋对峙/跨桌)双方**头都抬起、视线跨房间相接**了吗?**没有人在低头看桌面/香炉/地面/闭目沉思**?(命门7 警示的"低头沉思族"漂移)
- [ ] 画面是不是**人物数对(单人帧只一人)+ 零文字**?

### 坑 & 调参
- **脸出画/牺牲是这一图型的常态,不是 bug**:gid12 头在画外、gid119 人物退远缩小,刻意如此。要脸清楚的关键帧别选强透视/头出画构图。
- **`# 约束` 段的逐行复述别删**:这是把分节里的要点拉回模型注意力的关键,删了构图微指标更容易飘。
- **强透视 = 牺牲表演**:gid119 证明"剑越近越大、人越远越小"会把人物吃成不可辨。海报/视觉冲击优先选它,演技帧不选。
- **冻结 prompt + 多种子/跨模型挑帧**:gid12→gid45→gid46 同镜头反复跑,构图微指标(护手锁角等)靠多刷命中。
- **强透视镜统一暖灰土金调、显式禁青橙**(gid119):不写死容易飘成青橙冷暖对冲的 AI 味。

---

## 图型 03 · 建场航拍(top-down 高空俯瞰 establishing)✅

### 何时用
**给一个聚落/营地/场景做世界观奠基的高空大全景**——一张图钉死整个空间的布局/建筑/光照/色板,当 establishing shot 用。和图型 01(blocking 站位、放角色、影调优先)不同:这里**几乎没有具名角色**(只有"tiny human figures"做生活气),重点是**空间组织 + 数量锚定 + 可信生活细节 + 反 AI 航拍味**。两个实证态:① 依崖而建的蜂窝崖居聚落(gid81);② 开阔沙丘上的同心圆环游牧营地(gid90)。

### 命门(这种图独有的成败关键)
1. **空间组织写成一句可读的几何**:gid81 是"崖壁蜂窝崖居 + 崖脚中央广场";gid90 是"concentric loose rings,最中心一顶仪式大帐,向外环环叠出约 40 顶帐篷"。建场图的灵魂是布局,布局要能一句话画出来。
2. **数量锚定增可信**:`roughly forty individual tents` / `dozens of tiny human figures`——给具体数量,模型才不会糊成一团。
3. **散布"signs of life"细节**:炊烟 + 晒肉架 + 打铁火星 + 兽栏 + 沙艇 + 晾晒染布…一串生活细节让航拍"活"过来,这是反"无人 CGI 沙盘"的关键。
4. **golden hour 低角侧光 + 长影**:`late afternoon golden hour, low warm sun from screen left, casting long crisp shadows`——长影既给电影感又帮读建筑体量。
5. **完整摄影签名 + 题材级负向**:`high silent drone or distant cliff perch + 35mm Kodak Vision3 + skip-bleach LUT` 摄影签名,加超长 Avoid **专门排掉模型的航拍审美偏置**(`drone shot of modern desert resort / 沙漠婚礼 / Burning Man / 现代军营`)。

### 专门骨架(填空式)
```
模式:文生图(单段连贯英文,无需参考图)
size 16:9 / quality 1K-2K
单段叙事式航拍,世界观奠基,钉死布局/建筑/光照/色板

A photorealistic top-down aerial bird's-eye view photograph of <聚落/营地一句话>,
16:9 horizontal cinematic composition.
<空间组织几何:依崖蜂窝 / concentric rings + 中心地标 + 数量锚定 roughly N units>.
<建筑/帐篷材质 + 染色 deep burgundy / dust-cream>.
<中心地标:relic forge / ceremonial tent + 黑烟柱/旗幡>.
<散布道具:沙艇 / 兽栏 / 打铁站 / salvage pile>.
Signs of life: <tiny human figures + 炊烟 + 晒肉架 + 晾染布 + 骑兽者接近>.
Lighting: late afternoon golden hour, low warm sun from screen left, long crisp shadows,
<heat-shimmer + 悬浮尘粒>.
Color palette: <8-10 色逐项 hex,含 cinnabar red #A82A2A 做唯一/重点饱和色>.
PHOTOGRAPHIC TONE: high silent drone or distant cliff perch, 35mm Kodak Vision3,
skip-bleach LUT, organic film grain, aerial atmospheric haze, restrained colors.
Avoid: <反AI味通用串> + drone shot of modern desert resort / Burning Man / 现代军营 等题材级负向.
```

### 完整真实 prompt 全文(gid81 逐字 · 可直接改填)
```
道具-004 · 沙猎部落聚落 高空俯瞰建场航拍
Neo Image 2 official / 16:9 / 1K

A photorealistic top-down aerial bird's-eye view photograph of a hidden desert tribal settlement carved into the base of a massive weathered sandstone cliff, 16:9 horizontal cinematic composition. The settlement sits at the foot of a curving canyon wall in the open desert, with multi-tier honeycomb stone structures cut directly into the cliff face revealing dozens of cave-dwelling openings stacked in irregular vertical rows, weathered sand-colored stone façades pockmarked with arched doorways and small wind-cooled openings, narrow stepped pathways zigzagging up the cliff connecting the levels. At the base of the cliff a central open courtyard of packed sand spreads out into the desert, dotted with weathered leather-and-textile nomadic tents pitched in clusters, the tents are conical and hardened with metallic fiber thread reinforcement, dyed in deep burgundy and dust-cream tones. Small wooden trading stalls with hanging fabric awnings line the edges of the courtyard. At the center of the courtyard stands a massive ancient bronze mechanical forge installation about three meters tall, weathered patina green-bronze with embedded copper coils and exposed gears, a column of thin black smoke rising from it, this is the tribe's relic forge where they salvage and repair mechanical limbs and weapons. Scattered across the courtyard are the parked sand-skiff vessels of the tribe, low-slung wind-powered desert craft with mechanical legs folded under, covered in dust and aged leather wraps. A few sand-grazing mechanical beasts (sand antelope-like creatures with bronze armor plating) are tethered near a trough at the cliff base. The settlement has signs of life: tiny human figures moving about the courtyard from this bird's-eye view, small cooking fires with thin smoke rising at the tent clusters, hanging carpets and dyed fabrics drying on cliff-face lines, drying racks of cured meat. Lighting: late afternoon golden hour with a low warm sun raking across the cliff face from screen left, casting long dramatic shadows from the cliff into the courtyard, the sandstone walls glowing warm amber and rust-orange, the tent canvas catching the warm light, the deep cliff shadows holding cool blue-gray undertones, atmosphere holds visible heat-shimmer in the lower air and faint suspended dust particles. Color palette: dominant Dune Arrakis sun-baked tones, faded sandstone amber #C4A176, dust-cream tent canvas #DDC9A0, deep oxidized bronze #6B5A38, burgundy textile accents #7A2F2C, cinnabar red banner accents #A82A2A as the sole saturated focal color, cliff shadow cool grey #6B5A47, sand floor pale gold #D4B896, late golden hour warmth #F4E6C8. PHOTOGRAPHIC TONE: shot as if from a high silent drone or distant cliff perch, real on-location aerial photography aesthetic, 35mm Kodak Vision3 film stock look, skip-bleach negative LUT emulation, slight organic film grain, real physical scene captured through a real camera lens during principal photography. Soft natural lighting with realistic falloff not punchy HDR. Subtle organic film grain. Slight aerial atmospheric haze in distance. Colors restrained with slight gray tone not oversaturated. Avoid: oversharpening, artificial sharpness, heavy digital grain, HDR effect, AI-generated aesthetic, overpolished studio look, plastic smoothing, oversaturation, glossy highlight blowout, generic AI image quality, 3D render look, CGI look, video game aerial view, anime style, illustration style, fantasy painting style, isometric pixel art look, drone shot of modern desert resort, romantic sunset desert wedding aesthetic.
```
> **gid90·游牧营地航拍**(Neo Image 2 official / 16:9)逐字片段(开阔沙丘版,与 gid81 同骨架换布局):`...a sprawling nomadic desert encampment in the open dunes... The encampment is organized in concentric loose rings: at the very center a large ceremonial circular tent the size of a small house... around it ring upon ring of smaller dome-shaped yurt-style tents... the rings stagger outward in roughly forty individual tents... On the eastern edge of the village rises a tall wooden watchtower made of weathered timber and dried bone, with a banner of cinnabar red fabric snapping in the wind at its top...` 同款 10 色 hex + 同款 PHOTOGRAPHIC TONE,Avoid 末尾题材负向换成 `drone shot of modern festival camp, Burning Man aesthetic, modern military bivouac`。

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid90**(吻合度高,**本图型零翻车的满分条**):同心环布局 + 中心仪式大帐 + 几十顶帐篷数量锚定全成立;瞭望塔红旗幡/炊烟/巷道齐全;暖沙 10 色 + 黄金时刻长影到位;**避开塑料 AI 航拍味,题材负向未触发** ✓;❌(无)。
- **gid81**(全文来源,吻合度高):蜂窝崖居 + 广场建场结构清晰;golden hour 低角侧光 + 长影成功;暖沙色板 + Dune 影调到位;胶片质感避开 CGI/游戏航拍味 ✓。

**反例 / 教训**
- **gid81 的弱点**:`cinnabar red #A82A2A as the sole saturated focal color` 这个"唯一饱和焦点色"**效果偏弱——红被整体暖沙调吸收,没形成抢眼视觉重心**;中央青铜熔炉的黑烟柱也不易辨认 ✗。教训:在一片同色系暖沙里钉"唯一焦点色"容易被环境同化,真要抢眼得加大面积/提对比,或换更跳的位置(gid90 把红旗幡放在瞭望塔顶就更醒目)。

### 校对清单(出图后逐项对账)
- [ ] **布局几何对不对**?(蜂窝崖居有没有依崖分层 / 同心圆环有没有中心地标 + 向外环叠)
- [ ] **数量锚定兑现了吗**?(约 40 顶帐篷别糊成一片;tiny figures 看得出是人)
- [ ] **signs of life 细节齐不齐**?(炊烟/晒肉/打铁火星/兽栏/沙艇——少了就"死城")
- [ ] **golden hour 长影**出来没?(没长影=没体量、没电影感)
- [ ] **唯一/重点饱和焦点色立住了吗**?(gid81 教训:红常被暖沙吞掉,看是否抢眼)
- [ ] **有没有 AI 航拍味/题材跑偏**?(度假村/婚礼/Burning Man/军营——命中任一即重跑)
- [ ] 中心地标(relic forge 黑烟柱 / 仪式大帐 / 瞭望塔旗幡)**辨认得出吗**?

### 坑 & 调参
- **"唯一焦点色"在同色系里会被吃掉**(gid81):暖沙调里钉一抹朱砂红,常被环境同化。要抢眼就加面积/提对比/挪到反差位(参考 gid90 旗幡放塔顶)。
- **题材级负向不能省**:模型对"沙漠航拍"的默认审美是度假村/婚礼/Burning Man,Avoid 里必须显式排掉,否则极易跑偏。gid90 全跑对,负向未触发,证明这串负向有效。
- **数量给具体数**(`roughly forty`):写"很多帐篷"会糊,写约 40 顶才有阵列感。
- **gid81/gid90 是"同骨架换布局"的范本**:依崖蜂窝 vs 开阔同心环,主体段换掉、摄影签名 + hex + 负向几乎照搬。建新聚落直接套。

---

## 图型 07 · 从成图抠主体特写(场景内单人切特写)✅

### 何时用
**已有一张多人/双人成图,想从同一场景里"切"出某个主体的中近景或极特写**——景别推近、其余主体去掉、背景沿用同一场景但要真景深而非贴图。极轻量的中文一句话改图(单 prompt 常只一两句),靠**底图承载场景 + 参考图锁脸**,prompt 只下"切谁、占多大、在哪、去掉谁、要真景深"。本片实证四连:左机器人头中近景(gid73)→右短发女中近景(gid74)→女极特写(gid75)→女极特写光影参考版(gid76)。

### 命门(这种图独有的成败关键)
1. **显式禁"直接挪用背景" + 要"正确景深变化"**:`场景依旧是夜晚沙漠,但是要有正确的景深变化而不是直接挪用背景`——这是这一图型的命门。不写这句,模型会偷懒把原背景原样贴上去,特写就"贴脸"假。
2. **去元素:点名"画面里不要出现 X 的头"**:从双人切单人,必须明确把另一个主体删掉(切机器人就 `不要出现女人的头`,切女生就 `不要出现机器人的头`)。
3. **景别越近,越要显式要求"光影与背景完美融合"**:推到极特写(头占 1/2)时加 `人脸的光影应当与背景完美融合`,防"贴脸感"——景别越近这句越重要(gid75/76 才加)。
4. **构图指令与身份锁定拆两路**:位置/占比用 prompt(`占四分之一、左边三分之一`),脸用参考图(`参考图作为女生五官的参考`),切机器人则不需要锁脸参考图。
5. **迭代靠加参考图、不改 prompt**:gid76 几乎复用 gid75 原句,只在输入端追加一张"光影参考"图来修正照明("文本不动、靠参考图驱动")。

### 专门骨架(填空式)
```
模式:图生图(成图当底图承场景 + 参考图锁脸)
size 21:9 / quality 1K
中文一句话改图,从成图切单人特写

生成这个场景里的<左/右><主体>的<中近景特写/极特写>,
<主体>的头约占画面<四分之一/二分之一>,位于画面<左/右/中间略偏右><三分之一>的位置。
场景依旧是<原场景一句>,但是要有正确的景深变化而不是直接挪用背景<,人脸的光影应当与背景完美融合>。
画面里不要出现<另一主体>的头。<参考图作为五官的参考。>
（推到极特写再追加"光影应与背景融合";要改光只追加一张光影参考图、原句不动）
```

### 完整真实 prompt 全文(gid73–76 逐字 · 可直接改填)
```
场景-005（gid73）· 左机器人头中近景特写 · Neo Image 2 official / 21:9 / 1K
生成这个场景里的左边机器人的头的中近景特写，机器人的头约占画面四分之一，位于画面左边三分之一的位置。场景依旧是夜晚沙漠，但是要有正确的景深变化而不是直接挪用背景。画面里不要出现女人的头。

场景-006（gid74）· 右短发女中近景特写 · Neo Image 2 official / 21:9 / 1K
生成这个场景里的右边短发女生的中近景特写，女生的头约占画面四分之一，位于画面右边三分之一的位置。场景依旧是夜晚沙漠，但是要有正确的景深变化而不是直接挪用背景。画面里不要出现机器人的头。参考图作为女生五官的参考。

场景-007（gid75）· 右短发女极特写 · Neo Image 2 official / 21:9 / 1K
生成这个场景里的右边短发女生的极特写，女生的头约占画面二分之一，位于画面中间略微偏右边的位置。场景依旧是夜晚沙漠，但是要有正确的景深变化而不是直接挪用背景，人脸的光影应当与背景完美融合。画面里不要出现机器人的头。参考图作为女生五官的参考。

场景-008（gid76）· 右短发女极特写（光影参考版）· Neo Image 2 official / 21:9 / 1K
生成这个场景里的右边短发女生的极特写，女生的头约占画面二分之一，位于画面中间略微偏右边的位置。场景依旧是夜晚沙漠，但是要有正确的景深变化而不是直接挪用背景，人脸的光影应当与背景完美融合。画面里不要出现机器人的头。参考图 作为女生五官的参考。
（gid76 文本与 gid75 几乎一字不差，差别只在输入端多挂了一张"光影参考"图）
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid75**(吻合度高):极特写推近成功;**光影融合见效**(冷调人脸与夜景匹配,无突兀贴脸);锁脸 + 去元素到位 ✓。
- **gid76**(吻合度高,**"文本不动靠参考图驱动"范例**):与 gid75 相比受光方向/色温明显改变(偏暖/侧光),**证明光影参考图接管了照明** ✓;无明显翻车。
- **gid74**(吻合度中):锁脸见效(五官与参考一致);去元素(无机器人头);夜晚沙漠延续;**景深虚化非生贴** ✓。

**反例 / 教训**
- **gid73**(吻合度中):去元素见效(无女人头)、景深非生贴、场景延续 ✓;但 **`左三分之一/占四分之一` 定位偏居中偏左、占比偏大——中文占比/方位词响应较弱** ✗。
- **整批系统性弱点**:gid74/75/76 的"右三分之一""中间略偏右"**全部只大致居中,方位微调未严格落地**。教训:中文"几分之一占比 + 方位词"在这一图型上是稳定弱项,别指望精确,要精确得多刷或在参考构图上钉白点。

### 校对清单(出图后逐项对账)
- [ ] **背景是不是"真景深"而非直接贴原图**?(命门;贴图会有"抠像感"、边缘违和)
- [ ] **另一主体去干净了吗**?(切谁就不能出现另一个的头)
- [ ] **脸锁住了吗**(锁脸的镜次)?五官与参考一致、没串?
- [ ] **景别/占比对不对**?(中近景头占 1/4 / 极特写头占 1/2)
- [ ] **方位**落地了吗?(本批系统性偏中央,偏差大就重刷)
- [ ] 极特写镜:**人脸光影和背景融合了吗**?(有没有"贴脸"突兀感)

### 坑 & 调参
- **不写"正确景深变化"必偷懒贴图**:这是全图型最关键的一句,别省。
- **中文占比/方位词响应弱是系统性现象**(整批 73–76):"右三分之一"基本只能做到大致居中。要精确定位:多刷挑帧,或改用构图参考图上的白点定位(见图型 01 白点手法)。
- **景别越近越要写"光影融合"**:中近景可不写,极特写(头占 1/2)必须写,否则贴脸感明显。
- **改光不改脸:只加光影参考图、原句不动**(gid76):这是这一图型最干净的迭代方式,比改文字描述光照更可控。
- **切机器人不需要锁脸参考图,切真人需要**:身份载体不同,按主体决定挂不挂五官参考。

---

## 图型 08 · 极限微距叙事帧(extreme macro + 巨物压迫)✅

### 何时用
**用一个微观特写讲一句叙事/埋一个危机**——蚂蚁爬睫毛、虫子停在五官上这种 extreme macro,既要昆虫纤毫毕现,又要在虚化的画面边缘藏一个"压迫源"(逼近的靴底)暗示危险。本片实证仅 gid78 一条(蚂蚁爬熟睡女主睫毛、靴底压顶)。和图型 02 彩色叙事帧的区别:这是**极浅景深的微观尺度**,主体是昆虫而非人,人只露一小块(睫毛/眼睑)。

### 命门(这种图独有的成败关键)
1. **把"巨物尺度压迫"做进微距**:让虚化的靴底 `filling roughly the upper 80 percent of the frame's upper region`——微观尺度里,一只靴子就是压顶巨物,以微衬大制造危机感。
2. **三层焦点显式分级**:① 蚂蚁 = 最锐焦点(`sharply in focus, occupies the visual focal center`);② 睫毛 = 第二层焦点(`slightly soft but readable as individual strands`);③ 靴底/天空/皮肤 = 焦外(`heavily blurred / soft pale-warm bokeh`)。微距的灵魂是这层分级,谁实谁虚必须钉死。
3. **双参考图分工 + 逐元素 hex 映射**:`参考图 as the master color palette anchor`(锁 13 色 Arrakis 色板,且逐元素给 hex)+ `参考图 as visual identity anchor for Danmei`(锁脸,但本帧只露睫毛/眼睑一小块)。
4. **明写主体的生物解剖真实**:`six legs distinctly visible / segmented body, head, thorax, abdomen, antennae all clearly visible` + 负向 `cartoon ant, stylized ant, oversized ant, fantasy creature`——防模型把昆虫画成卡通/超大。
5. **"刻意微软"对抗过锐 AI 味**:`This image is a real macro photography still that may appear slightly soft and imperfect — this softness is intentional and desired`。

### 专门骨架(填空式)
```
模式:文生图 / 图生图(色板参考图 + 锁脸参考图)
size 16:9 / quality 1K-2K
单段英文,extreme macro 叙事帧,昆虫主体 + 压迫源

A photorealistic extreme macro photography film still captured during a real shoot, 16:9,
ultra close-up extreme macro view of <昆虫主体> crawling across <人体局部:睫毛/眼睑>,
camera <角度,如 to the side, angled slightly upward>,
with <压迫源,如 flat sole of a boot> looming heavily blurred filling roughly the upper 80% of the frame,
and <一小块透气元素,如 sliver of bleached sky in a corner>.
参考图 as master color palette anchor, all colors per this N-color palette. Explicit color mapping: <逐元素 hex>.
参考图 as visual identity anchor for <角色>, only a small portion of the face visible: <睫毛/眼睑>.
The subject is <昆虫> — anatomically realistic, six legs visible, segmented body/head/thorax/antennae sharply in focus.
Second layer of focus: <睫毛> slightly soft but readable. Everything else falls into soft bokeh.
Light: <directly overhead noon sunlight + 逐睫毛/逐腿的 micro-shadows>.
Cinematography: nature-documentary / art-house macro, Villeneuve & Fraser Dune tonality, skip-bleach LUT, film grain.
PHOTOGRAPHIC TONE: real macro still, slightly soft & imperfect (intentional), sharp focus ONLY on the insect.
Avoid: <反AI味通用串> + cartoon ant / stylized ant / oversized ant / multiple ants / facial distortion / eye open 等.
```

### 完整真实 prompt 全文(gid78 逐字 · 可直接改填)
```
道具-001 · 蚂蚁爬睫毛极微距胶片静帧
Neo Image 2 official / 16:9

A photorealistic extreme macro photography film still captured during a real shoot, 16:9 horizontal aspect ratio, ultra close-up extreme macro view of a single small black ant crawling across human eyelashes, the camera positioned to the side of the face and angled slightly upward, capturing the eyelashes in side profile as they extend outward from the soft curve of the closed eyelid, with the flat sole of a leather boot looming heavily blurred just above the face filling roughly the upper 80 percent of the frame's upper region, and a small triangular sliver of pale bleached sky visible only in the upper-left corner. 参考图 as the master color palette anchor, all colors strictly executed according to this 13-color sun-baked Arrakis daylight palette. Explicit color mapping for this frame: - Overall warm light bathing the scene = #F4E6C8 hot sunlight cast - Skin tone of the eyelid and surrounding cheek = warm pale tone receiving #F4E6C8 light with soft #6B5A47 shadow falloff - Eyelashes color = #2A2620 heat-bleached black - Ant body color = #2A2620 heat-bleached black - Heavily blurred flat boot sole filling most of the upper portion of the frame = #4A332A cracked leather - Small sky sliver in upper-left corner = #E8E0D2 bleached sky 参考图 as visual identity anchor for the female character, the young woman named Danmei, her face and all facial features must faithfully match the reference image without any alteration. Only a small portion of her face is visible in this extreme macro frame: the natural black eyelashes of one closed eye, a small section of soft warm pale skin surrounding that eye, and faint suggestion of her closed eyelid. The subject of the frame is a single small black ant, anatomically realistic common desert ant species, its six legs distinctly visible and positioned across multiple individual eyelashes, the ant captured mid-stride as it crawls from one eyelash strand onto an adjacent eyelash strand, the legs gripping the slender curved black hair-like eyelashes like a creature traversing a delicate forest of black filaments. The ant's segmented body, head, thorax, abdomen, and antennae all clearly visible and sharply in focus, the surface of its black exoskeleton catching tiny highlights of warm sunlight. The eyelashes themselves are the second layer of focus, slightly soft but readable as individual strands of natural dark eyelashes, captured in side profile, curving outward and upward away from the soft curve of the closed eyelid like a row of slender black filaments extending sideways across the frame, the lashes catching warm directional sunlight from above and casting tiny soft shadows on the skin below. The skin visible at the lower portion and edges of the frame is soft warm pale human skin texture, gently lit by overhead warm sunlight, showing natural pore texture and very faint fine peach fuzz, not retouched, not airbrushed. The skin shows realistic warmth and slight redness from sun exposure. The closed eyelid is visible as a soft horizontal curve where the eyelashes meet the skin, viewed from the side, completely relaxed in deep unconscious sleep, no movement, no tension. Composition: Camera positioned to the side of the face at very close range, angled slightly upward. The ant occupies the visual focal center of the frame, sharply in focus, standing on the eyelashes which extend sideways across the middle band of the frame. The eyelashes are seen in side profile spreading laterally across the composition, mostly in focus with slight softness at their tips. Below the eyelashes, the soft curve of the closed eyelid and the cheek skin form the lower portion of the frame. Above the eyelashes, the entire upper portion of the frame is dominated by a massive heavily blurred dark warm-brown shape — this is the flat sole of a leather boot hanging in the air directly above the face, very close in real distance but heavily out of focus due to the shallow macro depth of field, occupying roughly 80 percent of the upper portion of the frame as a soft dark warm-brown blur, a continuous flat surface of worn leather sole with very vague hints of worn tread wear and clinging sand grains, no stitching, no seams, no shoelaces visible because we are looking at the flat bottom surface of the boot only. A small triangular sliver of pale bleached sky pokes through in the upper-left corner of the frame, the only break in the overhead darkness. The depth of field is extremely shallow, characteristic of true extreme macro photography. Light: directly overhead noon sunlight striking the scene from directly above, the warm light bathing the eyelashes and ant in soft directional warmth, casting tiny soft hard-edged micro-shadows beside each eyelash and beside each of the ant's legs onto the skin below. Cinematography reference: extreme macro photography of insects on human features, the kind of intimate detail-revealing shot that opens nature documentaries or art-house cinema, Denis Villeneuve and Greig Fraser Dune 2021 sun-baked tonality applied to a macro intimate frame, skip-bleach negative film LUT emulation, slight organic film grain, real physical scene captured through a real macro camera lens during principal photography, not a 3D render not CGI not digital painting not illustration. PHOTOGRAPHIC TONE: This image is a real macro photography still that may appear slightly soft and imperfect, like a real photograph - this softness is intentional and desired. Soft natural lighting falloff, not punchy HDR. Subtle organic film grain only, not heavy digital noise. Extreme shallow depth of field with sharp focus only on the ant, eyelashes slightly soft, everything else falling off into soft pale-warm bokeh, including the heavily blurred dark warm-brown mass of the flat boot sole dominating the upper portion of the frame. Skin texture natural with visible pores and very fine peach fuzz, no plastic smoothing, no beauty filter retouching. The ant's exoskeleton showing real biological detail. Colors with realistic restraint following the locked palette swatches, slight overall gray-warm tone, not oversaturated, not HDR-pumped. Avoid: oversharpening, artificial sharpness, heavy digital grain overlay, HDR pumping, beauty-filter skin, plastic smoothing, AI-generated aesthetic, overpolished studio look, oversaturation, glossy highlight blowout, generic AI image quality, default model aesthetic bias, 3D render look, CGI look, digital painting, anime style, illustration style, video game graphics, cartoon ant, stylized ant, oversized ant, fantasy creature, facial distortion, deformed face, changed face structure, unrecognizable likeness, color deviation from the locked palette, multiple ants, ant swarm, dirty skin, blood on skin, makeup, mascara on lashes, eye open, visible iris, visible pupil, visible stitching on the boot, visible seams on the boot, visible shoelaces on the boot, visible boot shaft, visible side of the boot, the boot showing anything other than its flat bottom sole.
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**(本图型本片仅 gid78 一条,既是全文来源也是唯一实证)
- **gid78**(吻合度中):**靴底压顶 80% 巨物压迫成立**;暖正午顶光 + skip-bleach 暖灰胶片调到位;皮肤睫毛非塑料磨皮(反 AI 味兜底见效)✓。

**反例 / 教训**(出自同条 gid78 的失败点)
- **核心主体翻车**:`蚂蚁` 几乎被靴底块与睫毛吞没,**"蚂蚁最锐"的主次没立住** ✗——三层焦点分级里"最锐=蚂蚁"这条没兑现,主体被压迫源和第二层焦点抢走。
- **锁脸无法验证**:只露睫毛,丹眉的脸锁没锁住无从判断(微距帧的固有局限)。
- 教训:微距帧里"压迫源(靴底)"和"主体(蚂蚁)"会抢视觉权重,prompt 虽显式写了"sharp focus ONLY on the ant",但靴底占 80% + 睫毛做第二焦点,主体仍易被淹。要主体立住,需进一步压小压迫源占比或加大主体相对尺寸/对比。

### 校对清单(出图后逐项对账)
- [ ] **主体(昆虫)是不是全图最锐、占视觉中心**?(gid78 翻车点:蚂蚁被吞没——这是本图型头号失败模式)
- [ ] **三层焦点分级对不对**?(昆虫最锐 / 睫毛微软可辨 / 其余 bokeh)
- [ ] **压迫源(靴底)够不够大、压迫感出来没**?(占上方 ~80%、重虚化)
- [ ] **昆虫解剖真实吗**?(六腿/分节体可辨,没画成卡通/超大/一群)
- [ ] **色板逐元素 hex 落地了吗**?(睫毛/蚂蚁 #2A2620、靴底 #4A332A 等)
- [ ] **皮肤是真实毛孔还是塑料磨皮**?(露的那一小块皮肤别 beauty filter)
- [ ] 眼睛是不是**闭着**(no eye open / no visible iris)?

### 坑 & 调参
- **头号坑:主体被压迫源/第二焦点淹没**(gid78 实测)。靴底占 80% + 睫毛做第二层焦点时,蚂蚁极易被吞。对策:压小压迫源占比、或显式加大主体相对尺寸与边缘对比,出图后第一眼就核"蚂蚁是不是最锐"。
- **昆虫负向必须写满**:`cartoon ant / stylized ant / oversized ant / multiple ants / ant swarm`——不写模型爱画成卡通大蚂蚁或一群。
- **微距帧锁脸基本不可验证**:只露睫毛/眼睑,别指望靠这张确认身份一致性,身份一致性交给别的镜次。
- **"刻意微软"要写**:`softness is intentional and desired` + `sharp focus ONLY on the insect`,既反过锐 AI 味又把锐度预算全给主体。

---

## 图型 09 · 重打光 edit(只改光,不改内容)✅

### 何时用
**已有一张成图,只想换光照/时间/调色,内容/构图/几何一个像素都不能动**——把白天金光场景重打成清晨晨光这类需求。区别于其它图型:它走 **`images.edit` 模式(不是 generate)**,正文是 **CHANGE / PRESERVE / CONSTRAINTS 三段式**,是"保内容换调性"的教科书写法。本片实证 gid71 一条(沙漠营地重打成清晨晨光),三段式可搬到任何"只换光/调色"的 edit 任务。

### 命门(这种图独有的成败关键)
1. **三段式职责切死,缺一不可**:
   - **CHANGE** 只描述目标光的情绪(时间/角度/雾感/色调),且**显式对比掉原光**(`NOT the strong warm golden daylight of the original`);
   - **PRESERVE** 逐项点名绝不能动的实体,精确到 `deep red tents stay deep red, only re-lit`(深红帐篷只重打光、不变色);
   - **CONSTRAINTS** 封死增删改挪(`Do not add or remove / redesign / reshape / move / change composition / add text`)。
2. **开头声明两张图的职责**:`Image 1: the base scene to relight — preserve all content, geometry and composition. Image 2: color palette reference — use ONLY as the target morning lighting mood and color grade`(色板图只借调性、不借内容)。
3. **挂 `images.edit` 专属参数 + 漂移自检提醒**:`model: gpt-image-2 · 调用 images.edit(不是 generate)` `quality: medium / jpeg / Thinking Mode 开启`;并自带提醒"跑出来对比原图,重点看建筑/帐篷/人有没有被悄悄改形或挪位"。
4. **PRESERVE 可补 + 九宫格特例**:提醒里写明——若有特别在意绝不能动的元素往 PRESERVE 补一句;若底图是九宫格,PRESERVE 开头加 `preserve the multi-panel grid layout and the content of every panel` 防分格被重排。

### 专门骨架(填空式)
```
模式:images.edit(不是 generate!)
model: gpt-image-2 · quality medium · jpeg · Thinking Mode 开
用途:只改光/时间/调色,内容几何构图一像素不动

[gpt-image-2 · EDIT 模式 · 只改光线]
Image 1: the base scene to relight — preserve all of its content, geometry and composition.
Image 2: color palette reference — use ONLY as the target <目标光> mood and color grade.
--- CHANGE — Change ONLY the lighting, time of day, and overall color grade of Image 1.
<目标光描述:时间/太阳角度/长软影/雾感浮尘/目标色调> — NOT <原光,显式对比掉>.
--- PRESERVE (exactly, no change) — <逐项点名:构图/机位、每栋建筑岩窟、每顶帐篷含其底色(__ stay __, only re-lit)、每个人/物/道具的位置与形态、所有几何透视与细节纹理、整体布局>. Only the light may change.
--- CONSTRAINTS — Do not add or remove any object/person/structure/detail. Do not redesign/reshape/move anything. Do not change composition/framing/crop/layout. Do not add text/label/watermark. Change nothing except lighting, shadow, time-of-day, and color grade.
--- 【参数】model: gpt-image-2 · images.edit · quality medium · jpeg · Thinking Mode 开
【提醒】PRESERVE 是核心,绝不能动的元素往里补;九宫格底图加 "preserve the multi-panel grid layout and the content of every panel";跑完对比原图查有没有被悄悄改形/挪位。
```

### 完整真实 prompt 全文(gid71 逐字 · 可直接改填)
```
场景-003 · gpt-image-2 EDIT · 只改光线为清晨晨光的重打光
元信息标 Neo Nano Pro / 正文 gpt-image-2 EDIT / 16:9 / 2K

[gpt-image-2 · EDIT 模式 · 只改光线] Image 1: the base scene to relight — preserve all of its content, geometry and composition. Image 2: color palette reference — use ONLY as the target morning lighting mood and color grade. --- CHANGE — Change ONLY the lighting, time of day, and overall color grade of the scene in Image 1. Relight the entire scene as early morning just after first light, when the sun is still very low and the sky is not yet fully bright. Use soft, low-angle directional morning sunlight coming from one side (the sunrise direction), casting long soft shadows, with atmospheric morning haze and fine drifting dust softening the distance. The overall color grade should match the reference palette in Image 2: a muted, low-saturation, warm-grey early-morning tone — a bright hazy pale sky against darker shadowed forms, high tonal contrast with a skip-bleach feel, restrained desaturated colors — NOT the strong warm golden daylight of the original. The mood is quiet, still, pre-bustle early morning. PRESERVE (exactly, no change) — the entire composition, framing and camera angle; every building, cliff dwelling, rock face and structure, in their exact shapes and positions; every tent, including its shape and its base color (deep red tents stay deep red, only re-lit); every person, camel, object and prop, in their exact positions and forms; all geometry, perspective, architecture and fine texture detail; the overall layout of the image. Only the light falling on these otherwise-unchanged elements may change. CONSTRAINTS — Do not add or remove any object, person, structure, or detail. Do not redesign, reshape, or move anything. Do not change the composition, framing, crop, or layout. Do not add any text, label, or watermark. Change nothing except lighting, shadow, time-of-day, and color grade. --- 【参数】 model: gpt-image-2 · 调用 images.edit（不是 generate） quality: medium · output_format: jpeg · Thinking Mode: 开启 【提醒】 - Preserve list 是核心：上面已尽量写满，若场景图里还有特别在意、绝不能动的元素，往 Preserve 里补一句 - 若场景图是九宫格/多格拼图：在 PRESERVE 开头加一句 "preserve the multi-panel grid layout and the content of every panel"，避免分格被重排 - 只改光不改内容是 edit 模式相对稳的活，但仍可能轻微漂移细节；跑出来对比原图，重点看建筑/帐篷/人有没有被悄悄改形或挪位
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**(本图型本片仅 gid71 一条,既是全文来源也是唯一实证)
- **gid71**(吻合度高,**本片最完整的"保内容换调性"edit 范本**):三段式见效——晨光低角度/长软影/雾感浮尘/skip-bleach 暖灰调全落地;**原构图/岩窟/结构稳定**;"去金色强日光"的对比指令兑现;Image2 色板把色调带到目标暖灰 ✓。

**反例 / 教训**(出自同条 gid71)
- **轻微细节漂移风险**:edit 模式即便三段式写满,**仍可能轻微漂移细节** ✗(本条整体稳,但风险客观存在)——所以提醒里强制"跑完对比原图查改形/挪位"。
- 教训:重打光 edit 没有"零漂移"保证,PRESERVE 写得越满越稳,但出图后逐项比对原图是必做工序,不能写完即收。

### 校对清单(出图后逐项对账)
- [ ] **内容有没有被悄悄改**?(逐项对比原图:建筑/帐篷/人/道具的位置与形态——这是 edit 的头号风险)
- [ ] **构图/机位/裁切**是不是一像素没动?
- [ ] **目标光对不对**?(晨光低角度侧光 / 长软影 / 雾感浮尘 / skip-bleach 暖灰)
- [ ] **原光被替换掉了吗**?(没残留"强金色日光";CHANGE 里的 NOT 对比生效没)
- [ ] **PRESERVE 里点名的底色守住了吗**?(深红帐篷还是深红、只是重打光)
- [ ] **有没有多/少东西、有没有乱加文字**?(CONSTRAINTS 兜底是否生效)
- [ ] 用的是 **`images.edit` 而不是 generate** 吗?(模式选错=必漂)

### 坑 & 调参
- **必须用 `images.edit` 不是 generate**:用 generate 等于重画,内容守不住。这是这一图型的前置硬条件。
- **PRESERVE 是核心,写得越满越稳**:连"深红帐篷只重打光不变色"这种底色都要点名,否则模型重打光时连物体固有色一起改。
- **CHANGE 里要显式对比掉原光**(`NOT the strong warm golden daylight of the original`):只说目标光不够,得明确否定原光,否则会"叠加"而非"替换"。
- **九宫格底图加一句防重排**:`preserve the multi-panel grid layout and the content of every panel`。
- **edit 无零漂移保证,出图必逐项比对原图**:gid71 整体稳但漂移风险客观存在,"跑完对比原图查改形/挪位"是固定收尾工序,别写完即收。

---

## 图型 04 · 黑白武戏静帧(B&W wuxia action film still) ✅

### 何时用
剧本里**主角持械打斗 / 群战 / 单帧动作高潮**,要的是「**真实片场拍的黑白武术电影剧照**」而非彩色成片或插画——黑白片基本身就在帮你滤掉 AI 的塑料感与过饱和。两种产出形态:**单帧**(一招一式定格,如上挑反击 gid124、横扫沙墙 gid141)与**九宫格分镜**(一张 prompt 出整段武戏 storyboard,首尾镜像闭环,gid126)。本图型与「武器四视图」共用同一把机械重剑参考图,但这里**借的是动作张力,不是器物结构**。

### 命门(这种图独有的成败关键)
1. **三参考图严格分工,第三张当「灰阶色卡」**:`Image 1 = main character (lock costume design exactly) / Image 2 = heavy mechanical sword (lock weapon design exactly) / Image 3 = color palette for tonal hierarchy in grayscale`——黑白片里**仍用彩色色卡分配明暗权重**,把红/黑/白的色彩信息转译成灰阶层级,否则黑白成片会糊成一团没层次。
2. **暴力降级句必带(过审命脉)**:`opponents are knocked back by force, not visibly injured. No wounds, no damage, no blood.`——把武打从「伤害」重定向为「力度/冲击」。交击帧再叠 `sword meeting sword, NOT sword meeting body`;倒地帧叠 `lying still as if asleep or unconscious, no visible injuries`。这是武戏能跑出来的前提。
3. **黑白胶片签名固定段**:`Kodak Double-X 5222 black-and-white film stock aesthetic. Anamorphic widescreen lens. Colors restrained, slight gray tone.` + `Black-and-white grayscale only with full continuous tonal range`(强调连续灰阶,挡 line art / manga)。
4. **力 = 沙墙 + motion blur,不是血**:视觉焦点写成 `the visual focus is on the sand wall and the force of the swing, not on body damage`——用扬起的扇形沙墙、真实运动模糊、弯刀脱手旋飞来承载暴力感,绕开见血。
5. **(九宫格专属)全局锁定 + 首尾镜像**:开头一段写死跨格一致性(主角 + 7 敌 + 光向 upper-left + 风向 right-to-left + 胶片机型 + 逐材质灰阶映射),再逐格写镜别;`PANEL 09 = EXACT same camera as PANEL 01`,只把敌从「逼近」变「伏地」、光从晨变暮,形成叙事闭环。

### 专门骨架(填空式)
```
模式:图生图(3 参考图 → 单帧 / 或文生图九宫格)
size 16:9 / quality 2K / Neo Image 2
用途:黑白武术电影剧照,要真实片场实拍感,非插画/漫画/concept art

【参考图分工 — 黑白武戏铁三件】
- Image 1 = 主角(lock costume design exactly,必要时点名 boots/leg wear/lower coat)
- Image 2 = 武器(lock weapon design exactly)
- Image 3 = color palette for tonal hierarchy in grayscale ← 彩色色卡转译灰阶层级

【PROMPT 正文 · 单帧】
A single 16:9 cinematic black-and-white film still from a live-action martial arts film.
Photorealistic photographic image, NOT illustration, NOT manga, NOT concept art.
Black-and-white grayscale only with full continuous tonal range.
Reference images: <三件分工逐行>.
SHOT: <机位 + 景别 + 构图,如 Extreme low angle, explosive vertical composition>.
The warrior from Image 1 <动作:bursting upward / horizontal swing / kneeling block>,
the heavy mechanical sword from Image 2 <剑的运动 + realistic motion blur>.
<N> desert raiders <被掀飞/格挡的物理动势>, their sabers knocked loose spinning away.
Focus on force, motion, and impact — opponents are knocked back by force, not visibly injured.
No wounds, no damage, no blood. <交击帧加:sword meeting sword, NOT sword meeting body>.
Composition: <能量走向,如 dynamic diagonal sweep lower-left to upper-right>.
PHOTOGRAPHIC TONE: Film still captured during a real shoot — slightly soft and imperfect.
Soft natural lighting with realistic falloff, not HDR. Subtle organic film grain only.
Realistic motion blur on the sword arc and tumbling figures. Natural lens depth of field.
Kodak Double-X 5222 black-and-white film stock aesthetic. Anamorphic widescreen lens.
Colors restrained, slight gray tone.
Avoid: oversharpening, artificial sharpness, heavy digital grain, HDR effect, beauty-filter
skin, AI-generated aesthetic, overpolished studio look, plastic smoothing, oversaturation,
glossy highlight blowout, generic AI image quality, illustration style, manga style, concept
art style. Aspect ratio: 16:9. Output: single cinematic film still.

【九宫格变体 — 见 gid126 全文】:开头加全局锁定段(7敌+光向+风向+逐材质 GRAYSCALE RENDERING
REQUIREMENTS),逐格 PANEL 01–09 写镜别动作,PANEL 09 镜像 PANEL 01,结尾 CRITICAL FINAL
DIRECTIVE 复述「黑白 / 真实片场 / 编排武打非血腥」。Output: 3x3 grid, 编号 "01"–"09"。
```

### 完整真实 prompt 全文(gid124 逐字 · 单帧上挑反击)
```
A single 16:9 cinematic black-and-white film still from a live-action martial arts film. Photorealistic photographic image, NOT illustration, NOT manga, NOT concept art. Black-and-white grayscale only with full continuous tonal range. Reference images: Image 1 = main character (lock costume design exactly). Image 2 = heavy mechanical sword (lock weapon design exactly). Image 3 = color palette for tonal hierarchy in grayscale. SHOT: Extreme low angle, ground-level upward, explosive vertical composition. Camera positioned at sand level looking sharply upward. The warrior from Image 1 bursting upward from a kneeling position into a standing position, the heavy mechanical sword from Image 2 swung in a powerful upward semicircular arc, the blade tracing a path across the upper half of the frame with realistic motion blur. Two desert raiders who had been pressing down on her are now thrown upward and backward by the force of her rising counter-strike, their bodies tumbling backward through the air with arms and legs splayed in tumbling motion, their curved sabers knocked loose from their grips spinning away through the air. Her coat fully extended behind her at the apex of the motion, the interior lining flared wide with real heavy fabric motion. Her face visible from below: teeth slightly bared in effort, hair lifted by the upward movement, expression showing controlled intensity. Background: dramatic sky with cloud detail filling the upper frame. Sand particles thrown up around her feet in a cloud, individual grains catching the light. Focus on the explosive force of her rising movement - opponents are tumbling backward through the air, not visibly injured. No wounds, no damage, no blood. Composition: powerful vertical thrust, energy explodes from lower-center to the upper edges of the frame. PHOTOGRAPHIC TONE: Film still captured during a real shoot - slightly soft and imperfect like a real photograph. Soft natural lighting with realistic falloff, not HDR. Subtle organic film grain only. Realistic motion blur on the sword arc and tumbling figures. Natural lens depth of field. Kodak Double-X 5222 black-and-white film stock aesthetic. Anamorphic widescreen lens. Colors restrained, slight gray tone. Avoid: oversharpening, artificial sharpness, heavy digital grain, HDR effect, beauty-filter skin, AI-generated aesthetic, overpolished studio look, plastic smoothing, oversaturation, glossy highlight blowout, generic AI image quality, illustration style, manga style, concept art style. Aspect ratio: 16:9. Output: single cinematic film still.
```

> 九宫格全文(gid126,含 GRAYSCALE RENDERING REQUIREMENTS + PANEL 01–09 + CRITICAL FINAL DIRECTIVE,约 80 行)见原文 `万物生问心_提示词全文.md` 道具-009(行 4021–4139),篇幅过长此处不复制;横扫沙墙全文(gid141)见道具-024(行 5183–5201),与 gid124 同骨架仅 SHOT/动作段不同。

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid124**(上挑反击单帧 · 全文来源):极低仰拍 + 垂直爆发构图、重剑上挑弧 + motion blur、两敌被掀翻、黑白全灰阶实拍(Double-X 5222 向)、参考图锁服装武器、无伤害(掀飞非见血)**全部落地,无翻车 ✓**。
- **gid141**(横扫剑卷沙墙击退沙匪 · **本片完成度最高的动作静帧之一**):三参考图分工生效(服装 + 重剑可辨、彩色色卡转译灰阶使明暗权重分明)、扇形沙墙 + 人物掀飞 + 弯刀碎布旋飞动势全落地、「只表现力与冲击不见伤/无血」成立、左下到右上对角线席卷构图成立、Double-X + anamorphic 压住 AI 味与插画味 ✓。**无翻车 ✓**。
- **gid126**(沙漠群战九宫格 · 一张出整段分镜):3×3 网格 + 细黑边 + 编号、跨格主角光向风向一致、逐格镜别变化、首尾(01/09)构图呼应闭环、全连续灰阶照相级(非 line art/manga)、编排武打无血均落地;逐材质灰阶指令使层次到位 ✓。

**反复翻车点(整批教训)**
- **单格分辨率上限**:九宫格里每格细节(瞳孔倒影敌剪影 PANEL 06、剑身褪色文字)受单格分辨率限**难逐一确认**——整体一致性无翻车,但微文字/微反射别指望逐字可读(gid125 的「褪色文字 catch 高光」即因此无法核验,吻合度只能记中)。
- 极远景小目标:`7 tiny figures advance in spread formation` 这类极远景里七敌过小、几乎不可数,「七敌」叙事可读性偏弱(极远景固有取舍,非 bug)。

### 校对清单(出图后逐项对账)
- [ ] **真黑白连续灰阶**吗?(没跑成 line art / manga / 上了色?红黑白三档**明暗层级拉开了没**——这是第三张色卡的活儿)
- [ ] **无伤害降级兑现了吗**?(有没有出现伤口/血/破肉?交击帧是「剑碰剑」还是误画成「剑砍身」?)
- [ ] 服装 / 重剑**身份对不对**(Image1/2 锁得住吗,有没有把签名重剑画走样)
- [ ] **力度感**出来没?(沙墙 / motion blur / 弯刀脱手旋飞——靠这些读「力」,不是靠血)
- [ ] **胶片实拍质感**:Double-X 颗粒 + anamorphic + 微软焦,没被 AI 锐成塑料?
- [ ] (九宫格)跨格**光向/风向/主角设计一致**吗?**首尾 01↔09 同机位镜像**对上没?

### 坑 & 调参
- **黑白色卡是反直觉但必带的一件**:新手会以为黑白片不用色卡——错。第三张彩色色卡是用来**分配灰阶明暗权重**的(红→中深灰、黑保深、白保亮),不给它黑白会糊成一坨。叠 `color palette for tonal hierarchy in grayscale` 一句即可。
- **暴力降级是过审命门,别省**:`knocked back NOT injured / no blood / no wounds / no torn flesh` 这组词在 gid124/126/131/132/134/141 全部出现;交击帧专用 `sword meeting sword NOT body`;倒地帧专用 `lying still as if asleep, no visible injuries`。漏写极易被判违规或跑出血腥。
- **单帧 vs 九宫格选型**:要一招定格的关键视觉用单帧(gid124/141);要一次性铺整段武戏 storyboard 用九宫格(gid126),但**接受单格细节糊**——九宫格是给节奏/调度看的,不是给微距看的。
- **首尾镜像是免费的叙事闭环**:九宫格让 `PANEL 09 EXACT same camera as PANEL 01`,只变敌人状态(逼近→伏地)与光(晨→暮),零成本拿到「战前 vs 战后」时间推进对照。

---

## 图型 05 · 双头沙漠极光帧(白点定位 + 22色卡)(dual-head aurora desert frame) ✅

### 何时用
**两个主体(尤其一人一机)在同一空旷画面里,要精确钉死各自 XY 位置 + 各自身份不串**的史诗叙事静帧。本片用例:江流(机器人)与丹眉(人类)双头从夜晚沙漠埋到下颌处露出、头顶极光横贯——孤独感 + 宽银幕诗意定格。**最大风险是「机器人头被画成人类脸」**,本图型整套手法就是为攻克这个而生(白点定位 + 逐头身份锚定 + 显式「非人类」声明)。21:9 宽银幕、纯中文重型结构。

### 命门(这种图独有的成败关键)
1. **白点构图定位图(把 XY 写成可指认坐标)**:专门喂一张参考图,上面**两个白点精确标记两个头的最终位置**——`画面左侧的白点标记机器人江流的头出现的位置,画面右侧的白点标记女性丹眉的头出现的位置,最终画面里两个头必须分别占据与这两个白点完全一致的位置`。这是双主体不挤、不漂、不互换位置的关键。
2. **逐头身份锚定 + 显式「非人类」声明**:每个头**单独一张参考图只锚一个身份**,且对机器人**明写否定**:`江流是一个人形机器人而非人类……他不应被生成为人类`。这一句是「机器人头不被画成人脸」的命门,缺它必翻。
3. **姿态写成物理因果,不写「请仰头」**:`两个角色都被完全埋在沙子里直到下颌底部以下,完全看不见脖子……因为他们的脖子被完全埋住,头部都被迫呈现一种轻微后仰的姿态——下巴朝天空略微抬起……这个姿态是被埋到下颌的物理约束自然产生的结果`。用「脖子被埋→被迫后仰」的因果链让姿态自然成立,而非生硬指令。
4. **22色环境色卡当影调统帅**:专喂一张色卡 `沙漠和夜空严格按22色色卡执行不可偏离色板`——冷青蓝夜色主导、极光带翠绿→紫罗兰渐变作诗性主光源、沙丘阴影没入近黑冷青但保留色彩深度而非死黑。
5. **多 DP 署名 + Kodak Vision3 定影调**:`Roger Deakins 与 Greig Fraser 与 Hoyte van Hoytema 综合的电影摄影视觉语言,低饱和高对比电影暗场,21:9宽银幕anamorphic,35mm Kodak Vision3 500T 胶片 + skip-bleach negative LUT`。

### 专门骨架(填空式)
```
模式:图生图(4 参考图 → 双主体定位合成)
size 21:9 超宽 / quality 1K / Neo Image 2 official / 纯中文重型结构
用途:双主体史诗叙事静帧,精确控 XY 位置 + 身份不串(尤其人机不混)

【参考图分工 — 四件,各司一职】
- 参考图①(构图定位):两个白点精确钉位 ← 左白点=主体A的XY,右白点=主体B的XY
- 参考图②(身份锚A):仅锚 A 身份;若 A 是机器人/非人,显式写「是机器人非人类,不应被生成为人类」
- 参考图③(身份锚B):仅锚 B 身份 + 神态(眼神/表情/发被风吹)
- 参考图④(环境色卡):N 色色卡,沙漠+天空严格按色板不可偏离

【PROMPT 正文】
一张21:9宽银幕电影质感的静态照片,<主体A> 和 <主体B> 从 <环境:夜晚沙漠表面> 露出,
<头顶上方:被极光照亮的辽阔夜空>。
<埋没/约束的物理状态:埋到下颌→看不见脖子→被迫轻微后仰,写成因果链而非指令>。
参考图 严格决定本镜构图空间布局,两个白点精确标记两个头的位置,左白点=<A>的位置,
右白点=<B>的位置,最终画面里两个头必须分别占据与白点完全一致的位置,其余空间由空旷
沙地与夜空填满。
参考图 仅作为 <A> 的视觉锚定,<A 是机器人而非人类……不应被生成为人类>,出现在左白点位置,
机械视觉特征严格保留不做修改。
参考图 仅作为 <B> 的角色锚定,<B 身份 + 神态:眼神清澈警觉、冷静沉着、明确是活着有意识的状态,
长发被夜风从两侧吹拂>,出现在右白点位置。
参考图 作为环境色卡锚定,严格按22色色卡执行不可偏离色板,<主导色调 + 极光主光源 + 星辰
+ 沙地冷光调子 + 阴影保留色彩深度非死黑>。
电影摄影的史诗孤独感,Roger Deakins / Greig Fraser / Hoyte van Hoytema 综合视觉语言,
低饱和高对比电影暗场,21:9 anamorphic,35mm Kodak Vision3 500T + skip-bleach negative LUT,
模拟胶片颗粒,真实电影长片的单帧定格画质。
```

### 完整真实 prompt 全文(gid142 逐字 · 双头出沙极光)
```
一张21:9宽银幕电影质感的静态照片,一个女性人类的头和一个机器人的头从一片广阔的夜晚沙漠表面露出,头顶上方是一片被极光照亮的辽阔夜空。 两个角色都被完全埋在沙子里直到下颌底部以下,完全看不见脖子,只有头颅本身从沙地里露出。沙子一直覆盖到两个角色的下颌线,完全包裹住下巴底部。因为他们的脖子被完全埋住,两个角色的头部都被迫呈现一种轻微后仰的姿态——下巴朝天空略微抬起,头部后方压在沙面上,脸部朝向镜头但微微仰起,这个姿态是被埋到下颌的物理约束自然产生的结果。 参考图 严格决定本镜画面的构图空间布局,这张参考图里的两个白点精确标记最终画面中两个头的位置,画面左侧的白点标记机器人江流的头出现的位置,画面右侧的白点标记女性丹眉的头出现的位置,最终画面里两个头必须分别占据与这两个白点完全一致的位置,两人头部之间和上方的大片空旷沙地与夜空填满画面的剩余部分。 参考图 仅作为机器人江流的视觉锚定参考,江流是一个人形机器人而非人类,他的机械头部出现在构图参考图中左侧白点的位置,他的头部和所有机械视觉特征严格保留这张参考图的样貌不做任何修改,这张参考图仅适用于最终画面中左侧位置的机器人头,他不应被生成为人类。 参考图 仅作为女性人类丹眉的角色锚定参考,丹眉是一个年轻女性,她的头出现在构图参考图中右侧白点的位置,她的头部和所有视觉特征严格保留这张角色参考图的样貌不做任何修改,这张角色参考图仅适用于最终画面中右侧位置的人类女性头。她的眼神清澈、警觉、聚焦清晰,神情冷静而沉着,表情冷淡疏离但明确是活着的、有意识的状态。她的长发被沙漠夜风从头部两侧向外吹拂。 参考图 作为整段画面的环境色卡锚定,沙漠和夜空严格按22色色卡执行不可偏离色板,画面以冷青蓝夜色为主导,一道大面积的极光带横跨夜空的上部,呈翠绿到紫罗兰的渐变色,作为画面诗性的主光源,密集的星辰分布在深靛和蓝紫交接的夜空中,沙地表面在极光的冷光下呈现冷青蓝调子,沙丘的阴影面没入接近黑的冷青深色但仍保留色彩深度而非死黑。 电影摄影的史诗孤独感,Roger Deakins 与 Greig Fraser 与 Hoyte van Hoytema 综合的电影摄影视觉语言,低饱和高对比电影暗场,21:9宽银幕anamorphic画幅,35mm Kodak Vision3 500T 胶片+skip-bleach negative LUT,模拟胶片颗粒,真实电影长片的单帧定格画质。
```

> gid143(道具-026,行 5247–5261)与上文 **逐字相同**,仅原始序号/节点 ID 不同,是同一 prompt 的子批次复跑(写死后多次抽卡)。

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid142**(全文来源 · **本图型最成功样板**):白点构图定位精准落地(左=机器人/右=人类 XY 成立);四参考图分工见效,尤其**「江流是机器人非人类」被严格执行**(左头清晰 LED 面板机械头、非人脸,放大可见两点 teal 眼光与机械颈);丹眉人类身份/警觉眼神/夜风吹发全兑现;22色色卡转译冷青蓝 + 翠绿紫极光统一影调;埋到下颌微仰物理因果成立;多 DP + Kodak Vision3 500T + skip-bleach 低饱和高对比暗场质感成立。**无翻车 ✓——最易翻车的「机器人头被画成人类」被白点定位 + 身份锚定 + 「非人类」声明成功避免。**

**复跑(同 prompt 衍生)**
- **gid143**(子批次复跑):白点定位 + 多参考图身份分工(机器人头非人类)+ 22色色卡核心手法沿用,佐证「重型 prompt 写死后多次抽卡」的产出节奏。⚠ 该条**版面未见与 gid142 区分开的独立最终出图**,单独成片效果无法从原片版面判定,**吻合度记「无法判断」**(并非翻车,只是不可核验)。

**(本图型反例缺失说明)**:gid142/143 是本型仅有两条,gid142 全成、gid143 不可核验,**无明确翻车反例可引**。最大风险点「人机混淆」恰恰是被本型手法成功压住的——可视为「反例被预防」。

### 校对清单(出图后逐项对账)
- [ ] **两个头的 XY 位置**对上白点了吗?(左头/右头有没有漂移、有没有左右互换)
- [ ] **机器人头是不是机械头**?(最大坑:被画成人脸/半人脸 → 检查 LED 面板/机械颈/teal 眼点在不在;不在就重跑并强化「非人类」句)
- [ ] **人类头身份**对不对、神态(清澈警觉/冷静/活着有意识/夜风吹发)有没有兑现
- [ ] **埋到下颌 + 看不见脖子 + 轻微后仰**的物理状态成立吗?(有没有露出脖子/全身)
- [ ] **极光 + 22色冷青蓝影调**统一吗?阴影是「保留色彩深度的冷青深色」还是被压成**死黑**?
- [ ] 宽银幕 anamorphic + Vision3 500T + skip-bleach **低饱和高对比暗场**质感在不在?

### 坑 & 调参
- **白点定位图是双主体不互换/不挤的命门**:多主体精确构图别靠文字描述「A 在左 B 在右」,模型读不准。专画一张**带白点的构图参考图**,文字里把「左白点=A、右白点=B、必须占据与白点完全一致的位置」写死——这是本型最硬的可搬手法,也是「白点定位」标签的来源(gid88/95/96/115/117/120/142/143 共 8 条用过)。
- **人机/异类混淆,靠「显式否定 + 单图单锚」双保险**:不仅正面写「江流是机器人」,还要负面写「他不应被生成为人类」,并且**机器人身份只喂机器人那一张参考图**(单图单锚,别和人类参考混在一张)。两者缺一,模型极易把机械头「补全」成人脸。
- **姿态写因果链,不写裸指令**:要「轻微后仰」别直接命令「请抬头」,而是写「脖子被沙埋住→被迫后仰→这是物理约束自然产生的结果」。因果链能让模型把姿态画得自然且稳定,这是本片反复用的「物理因果」写法。
- **重型中文 prompt 写死后多种子抽卡**:gid142→143 一字不改复跑(仅换参考图组合),与图型04/01 同属「冻结 prompt + 多批次刷帧」产能模式;1K 清晰度下别指望微距,够叙事定格即可。

---

## 图型 06 · 角色姿态/表情复刻帧(pose & expression replication frame) ✅

### 何时用
**已有一张参考图(角色定妆/某情绪定帧),要把它的表情、姿势、构图整套迁移到本项目角色身上**时,最轻量的一致性手法——一句中文枚举式「完全复刻参考图的 X / Y / Z」。适用于快速做角色设定图、情绪关键帧采样、风格/姿势迁移实验。**核心教训:笼统说「复刻表情」基本无效,必须把表情拆成「逐特征点名」(具名情绪 + 五官特征清单)才锁得住。**

### 命门(这种图独有的成败关键)
1. **维度枚举清单,越细迁移越彻底**:基础句 `完全复刻参考图的表情，姿势，构图，比例，画面占比，人物造型和服装参考`——把要迁移的维度逐项列全(表情/姿势/构图/比例/占比/造型/服装,跨画风时再加「画风」)。漏写的维度模型就自由发挥。
2. **「复刻表情」是空话 → 必须逐特征点名才生效(本图型最大命门)**:笼统写「复刻表情」,模型只迁移一个大概情绪,细节全丢。真正生效的写法是把抽象表情**拆成具名情绪 + 五官特征清单**:gid48 的 `完全复刻参考图的无奈流泪欲哭无泪的表情和厚嘴唇和明显的眼白和大黑眼珠子和画风` —— 「欲哭无泪 + 厚嘴唇 + 明显眼白 + 大黑眼珠 + 画风」逐项点名,才把表情真正搬过来。**这是 gid1(笼统)吻合度只到「中」、gid48(逐特征)吻合度到「高」的根本差异。**
3. **轻量句,不挂胶片/反AI味签名**:本型是最小指令集迁移,不需要 PHOTOGRAPHIC TONE / Avoid 长串——风格随参考图走。这也意味着**它本身不保证「干净设定图」**(见坑)。

### 专门骨架(填空式)
```
模式:图生图(角色/造型参考图 + [可选]第二张构图/表情参考图)
size 1:1 / Neo Image 2(或 Lite)/ 中文一句式
用途:轻量一致性迁移 / 情绪关键帧采样

【基础句 — 笼统版(只锁大致一致性,表情会丢细节)】
完全复刻参考图的表情，姿势，构图，比例，画面占比，人物造型和服装参考

【强化句 — 逐特征点名版(表情真要锁就用这条)】
完全复刻参考图的 <具名情绪,如:无奈流泪欲哭无泪> 的表情 和 <五官特征1,如厚嘴唇>
和 <五官特征2,如明显的眼白> 和 <五官特征3,如大黑眼珠子> 和画风，姿势，构图，比例，
画面占比，人物造型和服装参考

【双参考图分工变体(跨画风迁移)】
参考图1 = 固定角色造型/服装;参考图2(构图参考)= 迁移画风 + 姿势 + 构图
→ 维度清单按需增删调迁移松紧(留「画风」=连风格一起搬;删「画风」=只搬姿势表情)
```

### 完整真实 prompt 全文(gid1 + gid48 逐字)
```
【gid1 · 场景-001 · Neo Image 2 / 1:1 / 2K · 笼统版】
完全复刻参考图的表情，姿势，构图，比例，画面占比，人物造型和服装参考

【gid48 · 场景-048 · Neo Image 2 Lite / 1:1 / 1k · 逐特征点名版】
完全复刻参考图的无奈流泪欲哭无泪的表情和厚嘴唇和明显的眼白和大黑眼珠子和画风，姿势，构图，比例，画面占比，人物造型和服装参考
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例(逐特征点名 → 生效)**
- **gid48**(场景-048 · 逐特征点名版 · **本型「表情真锁住」的样板**):逐特征点名锁定奏效——欲哭无泪 / 厚嘴唇 / 明显眼白 / 大黑眼珠 / 画风(真实照片质感)**全照搬 ✓**。证明把抽象「复刻表情」升级成「具名情绪 + 五官特征清单」才是表情迁移的正解。

**半成功 / 反例(笼统 → 打折)**
- **gid1**(场景-001 · 笼统版 · 全文来源,吻合度仅**中**):表情 / 正面半身构图 / 造型服装均成功复刻 ✓;但 **✗ 出图带「我咩咩逼人?」梗图字幕**,成了表情包式静帧而非干净设定图。⚠ 教训:笼统一句式连参考图的字幕/梗图元素一起搬过来了,**用途偏物料而非干净定帧**。
- **gid48 的另一面(目标脱钩反例)**:✗ **与项目角色脱钩**——出图是写实照片里持手机的深肤色男子,**不是丹眉**,无法直接作丹眉关键帧。⚠ 通读曾误判 purpose 为「复刻丹眉哭戏」,实为**换参考图做表情/画风采样**(借的是表情样本,不是本项目角色身份)。即:本型「复刻表情成功」与「复刻到对的人身上」是两回事。

**跨画风迁移变体(同手法谱系,见目录 gid49–56)**
- 维度清单 + 双参考图分工可做「同角色 × 各式参考」的风格迁移矩阵:一张锁角色造型,另一张(梗图/真人照/卡通)迁移画风 + 姿势 + 构图;维度越细迁移越彻底,删「画风」项则只搬姿势构图、保留本角色画风。

### 校对清单(出图后逐项对账)
- [ ] **表情真的复刻了吗**?(若只写笼统「复刻表情」→ 多半只搬到大概情绪、细节丢失 → 改用逐特征点名重跑)
- [ ] **五官特征清单**逐项兑现没?(具名情绪 + 嘴唇/眼白/眼珠/画风 等点名项,逐条核对)
- [ ] 姿势 / 构图 / 比例 / 画面占比 / 造型服装**各维度都搬到了吗**?(漏列的维度模型会自由发挥)
- [ ] **身份是不是本项目角色**?(最大坑:表情搬对了,但人没搬对——出成别的人/换参考图采样时尤其要查)
- [ ] **有没有连参考图的字幕/梗图/水印一起搬过来**?(要干净定帧就得排除这些)

### 坑 & 调参
- **「复刻表情」是无效咒语,逐特征点名才是真锁**:这是本图型唯一最重要的规律。`复刻表情` 笼统写 → 失效;`复刻无奈流泪欲哭无泪的表情 + 厚嘴唇 + 明显眼白 + 大黑眼珠 + 画风` 逐特征点名 → 生效(gid1 中 vs gid48 高的根因)。要锁哪个情绪,就把它**拆成情绪名 + 几个关键五官状态**逐项写出。
- **轻量句会「连脏东西一起搬」**:参考图若带字幕/梗图/水印,笼统复刻会一并迁移(gid1 出了「我咩咩逼人?」字幕)。要干净设定图,得在句中显式排除或换干净参考图。
- **「复刻表情」≠「复刻到对的角色」**:换参考图采表情/画风时,出图身份会跟着参考图走(gid48 出成了持手机的深肤色男子,不是丹眉)。若要本项目角色的情绪帧,**角色造型/服装参考必须是本角色**,否则只是采到一个表情样本。
- **维度清单是迁移松紧的旋钮**:留「画风」=连风格一起搬(适合跨画风);删「画风」=只搬姿势表情、保留本角色画风。按需增删维度调松紧(gid49 留画风、gid50 删画风换满血模型复跑)。
- **模型档位**:Lite 档(gid48)也能跑通逐特征复刻;笼统句对模型档位不敏感,瓶颈在 prompt 颗粒度而非算力。

---

---

## 图型 10 · 九宫格场景多机位分镜(3×3 contact sheet) ✅

### 何时用
要把**同一空间/同一时刻**用**九个不同机位**一次性铺成一张 3×3 故事板(contact sheet / storyboard sheet)时——典型是"一场大事件(巨物降临/部落被毁)发生的那一瞬,要剧组从九个角度同时看清"。它是**多机位分镜板**,不是多视图设定图。⚠ 现有 SKILL 把九宫格误判为"只适合多视图(turnaround)";实证(gid7/26/70)恰恰相反:九宫格最强的用法是**同一场景多机位分镜**与**状态批量**(见图型 12),turnaround 反而要用四视图/六视图(图型 14–16)。两种产线:重型(gid7/26,逐格写死镜别+巨物铁律+全局锁,4K 一次成片级)与轻量(gid70,一句"生成九宫格多视图、不同角度"靠底图驱动,低成本拿多角度参考)。

### 命门(这种图独有的成败关键)
1. **全局锁跨格一致——九格必须读成"一个时刻"**:把光向/风向/色板/胶片/大气(尘霾)抽出来一次性声明,并显式 `Keep all nine panels visually consistent (same light, same dust, same color palette) — they are one moment from nine angles`。这是九宫格区别于"九张独立图拼贴"的根本——少了它就散成九个不同时刻。
2. **巨物尺度铁律(有巨物时)**:`the dragon is SO unimaginably gigantic that NO panel ever shows the whole dragon` + 每格只露 `a fragment` + `dwarfing the entire village to the scale of dust`。巨物在九宫格里**永不全见**,只靠"局部填满/压顶/横贯地平线"反衬村落如尘,九格各换一种露法。
3. **逐格写镜别 + 内容**:Panel 1…Panel 9 逐格点名(top-left/top-center…bottom-right)+ 该格机位(高空俯瞰/低角仰视/洞内向外/沙丘远眺/航拍俯顶)+ 巨物在该格怎么露。读序固定 left-to-right, top-to-bottom。
4. **双参考图分工 + 约束块兜底**:Image1 锁村落(建筑/帐篷色/色板/光/调性),Image2 锁巨物(鳞片材质/形体);末尾 CONSTRAINTS 复述铁律(永不全见/半毁非夷平/无水印)+ PHOTOGRAPHIC TONE 反 AI 味。

### 专门骨架(填空式)
```
模式:图生图(场景参考图 Image1 + 巨物/事件参考图 Image2 → 3x3 九宫格分镜)
size 16:9 (1536×1024 或更大以容九格细节) / quality medium / jpeg / Thinking Mode 开
用途:多机位分镜板(同一时刻九机位 contact sheet),不是 turnaround 多视图

【参考图标注】
- Image1:<场景原图——锁建筑/色板/光/调性>
- Image2:<巨物/事件主体——只锁材质与形体>

【PROMPT 正文】
Generate a single 3x3 nine-panel grid image (nine separate cinematic frames arranged in a 3-row,
3-column grid, each panel divided by thin black borders, like a film contact sheet / storyboard sheet).
All nine panels depict the SAME <场景> (from Image 1) at the SAME moment — <这一瞬发生了什么>.
<全局气氛一句:光向/尘霾/调性签名>. In EVERY panel <巨物/主体> dominates — but it is SO
unimaginably gigantic that NO panel ever shows the whole <它>. In each panel only a fragment is
visible, always filling or towering over the frame, dwarfing <环境> to the scale of dust.
The nine panels show nine different views:
Panel 1 (top-left): <机位 + 内容 + 巨物怎么露>. Panel 2 (top-center): … … Panel 9 (bottom-right): <航拍俯顶>.
【PRESERVE】Preserve from Image1: <建筑/帐篷色/色板/光/调性>. Preserve from Image2: <材质/形体>.
Preserve overall: 9-panel 3x3 grid layout with thin black dividing borders; consistent <光+尘+色板>
across all nine panels so they read as the same moment.
【CONSTRAINTS】- 巨物永不全见,只露片段,永远压环境如尘. - 每格都要极端尺度对比. - 九格同光同尘同色板=同一时刻九角度. - 无文字/水印/logo. - 半毁非夷平,<环境>仍可辨.
【PHOTOGRAPHIC TONE】each panel is a film still that may appear slightly soft… Avoid: <反AI味清单> + fully-visible whole <巨物>, cartoon or CGI look, clean undamaged <环境>.
```

### 完整真实 prompt 全文(gid7 逐字 · 可直接改填)
```
原始序号:014 / 模型:Neo Nano Pro / 比例:16:9 / 清晰度:4K

Generate a single 3x3 nine-panel grid image (nine separate cinematic frames arranged in a 3-row, 3-column grid, each panel divided by thin black borders, like a film contact sheet / storyboard sheet). All nine panels depict the SAME cliffside Silk-Road desert village (from Image 1) at the SAME moment — the instant it is being destroyed by the colossal earth-dragon (from Image 2). The village is half-ruined: tents toppled and torn, cave-dwellings partially collapsed, structures cracked and crushed, sand and dust billowing, debris scattered — but still recognizable as the original village. Warm hazy dawn light, heavy drifting dust, Dune-like cinematic desert aesthetic throughout. In EVERY panel the colossal earth-dragon dominates — but the dragon is SO unimaginably gigantic that NO panel ever shows the whole dragon. In each panel only a fragment of the dragon is visible, always filling or towering over the frame, dwarfing the entire village to the scale of dust. The extreme scale difference between the titanic dragon and the tiny human village is the core of every panel. The nine panels show nine different views: Panel 1 (top-left): a collapsed cliff cave-dwelling, the dragon's vast wall-like body looming just outside the cave mouth filling the background, tiny human figures fleeing. Panel 2 (top-center): high-angle view over the ruined market, the dragon's enormous shadow cast across the entire scene, the colossal body filling the top of the frame. Panel 3 (top-right): the toppled tent quarter, a single segment of the dragon's body slicing diagonally across the frame like a titanic pillar, far wider than the whole tent field. Panel 4 (middle-left): interior of a cave dwelling, the window/door opening completely blocked and filled by the dragon's massive scaled body surface outside. Panel 5 (middle-center): low ground-level upward view, the dragon's body rising like a sheer cliff-wall to the top of the sky, human figures tiny as ants at its base. Panel 6 (middle-right): distant view across the sand dunes, one single segment of the dragon's body stretching across the entire horizon, the whole village a speck of debris beneath it. Panel 7 (bottom-left): the carved stone stairway street, the dragon's vast body pressing down and filling the far end of the street. Panel 8 (bottom-center): the camel market in panic, the dragon's enormous body surface filling the entire background behind the fleeing crowd and animals. Panel 9 (bottom-right): aerial top-down view, the dragon's body lying across the village having gouged a vast trench through it, the village crushed into the dragon's shadow.
----------------------------------------
【PRESERVE — 锁住不变】 Preserve from Image 1: the carved sandstone cliff-dwelling architecture, the dark-red woven fabric tents, the ochre/sand color palette, the warm hazy dawn lighting, the Dune-like cinematic desert film aesthetic, the Central-Asian Silk-Road desert setting. Preserve from Image 2: the earth-dragon's scale texture, surface material and bodily form. Preserve overall: 9-panel 3x3 grid layout with thin black dividing borders; consistent warm dawn lighting and dust atmosphere across all nine panels so they read as the same moment.
----------------------------------------
【CONSTRAINTS — 约束】 - The whole dragon must NEVER be fully visible in any panel — only a fragment, always gigantic, always dwarfing the village. - Every panel must show the extreme scale contrast: titanic dragon vs ant-sized village/humans. - Keep all nine panels visually consistent (same light, same dust, same color palette) — they are one moment from nine angles. - No text, no captions, no watermark, no logos in any panel. - Half-ruined, not flattened — the village must still be recognizable.
----------------------------------------
【PHOTOGRAPHIC TONE — 反锐反躁结尾】 PHOTOGRAPHIC TONE: each panel is a film still that may appear slightly soft and imperfect, like a real photograph — this softness is intentional. Soft natural hazy dawn light with realistic falloff, not HDR. Subtle organic film grain only, not heavy digital noise. Natural lens depth of field, not digitally tack-sharp. Colors restrained with slight warm-gray desert tone, not oversaturated. Avoid: oversharpening, artificial sharpness, heavy digital grain, HDR effect, AI-generated aesthetic, overpolished studio look, plastic smoothing, oversaturation, glossy highlight blowout, generic AI image quality, default model aesthetic bias, fully-visible whole dragon, cartoon or CGI look, clean undamaged village.
----------------------------------------
【API 参数建议】 size: 1536x1024 (或更大以容纳九格细节) quality: medium output_format: jpeg 参考图:传 Image 1(九宫格原图)+ Image 2(地龙图)
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid26**(场景-026,Neo Nano Pro/16:9,**本图型最高吻合**):与 gid7 prompt 逐字相同的复跑,3x3 细黑边布局/统一暖朦胧黎明飞尘/极端尺度铁律多数格清晰/半毁可辨/无水印,双参考图分工(村庄锁建筑色调光、地龙锁鳞片材质)见效 ✓;个别格机位与清单非严格对位、部分格尺度压迫弱于"压成尘埃"、九格鳞片一致性仅大致统一 ✗。
- **gid7**(场景-007,4K,**全文来源**):3x3 布局/细黑边/暖雾晨光/赭沙色板/巨物碎片压迫/村落渺小基本兑现 ✓;缩略图下无法逐格核验九机位对应、"整龙绝不全见/半毁非夷平"是否每格严守 ✗。

**变体技巧(轻量产线)**
- **gid70**(场景-002,Neo Nano Pro/16:9/4K,**一句话九宫格**):整条 prompt 仅"根据这个图片生成九宫格多视图,包含不同角度的场景图。"——靠底图承载结构,模型一次吐出同场景多机位阵列(角度有变化非简单复制),参考图暖黄色调统一全格 ✓。重型 gid7/26 是成片级、逐格写死;gid70 是低成本拿多角度参考的极简版,两端按需取用。

**反复翻车点(整批教训)**
- gid7 = gid26 prompt 逐字相同(场景-007/场景-026 两子批次),靠多种子复跑挑九格最齐的那张——这是九宫格重型 prompt 的标准产能方式。
- 巨物易缩水成中型、"压成尘埃"的极端尺度在部分格打折 → 叠挂【巨物尺度铁律】(永不全见/只见局部)。
- 九格"同一时刻"一致性是常见短板(鳞片/尺度仅大致统一),要靠全局锁那句反复强调。

### 校对清单(出图后逐项对账)
- [ ] 是不是**真 3×3 九格**?细黑边/编号/读序对不对?(数量翻车是九宫格头号风险,见图型 13)
- [ ] **九格读成"一个时刻"了吗**?光/尘/色板跨格一致,还是散成九个不同时刻?
- [ ] **巨物每格都只露片段、永不全见**吗?有没有哪格画出整条/缩成中型?
- [ ] **极端尺度对比**够不够?村落/人有没有"压成尘埃如蚂蚁"?
- [ ] 逐格机位**和 Panel 1–9 清单对得上**吗?(易翻:机位近似落地、个别格对不上)
- [ ] 双参考图分工到位?村落锁了建筑/色,巨物锁了材质/形体?半毁非夷平、环境仍可辨?

### 坑 & 调参
- **冻结 prompt + 多种子穷举挑帧**:重型九宫格一次很难九格全对,gid7/26 同 prompt 复跑挑最齐那张,别写完跑一次就收。
- **巨物尺度铁律必挂**:不写"永不全见/压成尘埃",模型会把巨物画成可全见的中型,失去压迫——这是九宫格巨物题材的标准失败模式。
- **全局锁是九宫格的灵魂**:`same light/dust/palette, one moment from nine angles` 这句不能省,否则九格漂成九个时刻、九种光。
- 轻量 gid70 句式适合快速探角度;要成片必须升级到 gid7 重型骨架(逐格写死 + 约束块 + 反 AI 味)。

---

## 图型 11 · 九宫格武戏分镜(首尾镜像闭环) ✅

### 何时用
要把**一整段动作戏/群战**用九格黑白(或彩色)分镜一次性讲完、并形成**叙事闭环**时——一张 prompt 出整段 storyboard,01 格开场、09 格收势,首尾同机位同姿势镜像呼应(敌从逼近→倒地、光从晨→暮),中间七格逐格推进。它是图型 10(场景多机位)的**动作戏 + 时间推进**变体:10 锁"同一时刻九角度",11 锁"一段时间九拍 + 首尾镜像"。黑白武戏尤其适合,叠"逐材质灰阶映射"把片基控到位。

### 命门(这种图独有的成败关键)
1. **全局锁(主角 + 敌数 + 光向 + 风向 + 胶片机型)做跨格一致**:武戏九格里主角必须是同一人、敌人数量固定(7 名)、光向/风向/胶片签名一次性声明并贯穿九格——这是动作戏九宫格不串脸、不变天的根。
2. **首尾镜像闭环(01 ↔ 09)**:`Panel 09 must mirror the framing of Panel 01` 同机位同景别同姿势,只改"敌从逼近变倒地 + 光从晨光到暮色",用首尾呼应把九格收成一个完整叙事弧。这是本图型独有手法(单帧版见 gid129/131 开场↔收势镜像)。
3. **逐材质灰阶映射指令**:黑白片里仍给每种材质指定灰阶层级(红→中深灰、黑保深、白保亮),把彩色色板信息转译成灰阶权重,防止黑白成片层次糊成一团。
4. **逐格镜别 + 暴力降级合规**:Panel 01–09 逐格写景别/动作;武戏叠 `sword meeting sword NOT body / knocked back not injured / no blood`,把打斗压成"力度而非伤害"的可过审表达。

### 专门骨架(填空式)
```
模式:图生图(主角参考 + 武器参考 + 灰阶色卡参考 → 3x3 九宫格黑白武戏分镜)
size 16:9 / quality 2K / 用途:一张 prompt 出整段群战 storyboard,首尾镜像闭环

【参考图标注】
- 主角参考:<锁服装/造型/身份>
- 武器参考:<锁兵器形体>
- 灰阶色卡:<彩色色板,供黑白灰阶层级映射>

【PROMPT 正文 — 全局锁先行】
A 3x3 grid of 9 cinematic black-and-white film stills, total canvas 16:9. Each panel is itself a 16:9
frame, separated by clean thin black borders, panel numbers "01"–"09" in top-left corner, read order
left-to-right top-to-bottom. CRITICAL: these are PHOTOREALISTIC CINEMATIC STILL PHOTOGRAPHS
in pure B&W grayscale (NOT line art, NOT manga panels, NOT sketches). MAIN CHARACTER (identical
across all 9 panels): <主角锁>. OPPONENTS (consistent across panels): <N 名敌人锁>. Consistent
across all panels: <光向 + 风向 + 胶片机型(Kodak Double-X 5222 等)+ anamorphic>.
逐材质灰阶映射:<红→中深灰 / 黑保深 / 白保亮…>.
Panel 01: <开场机位 + 动作 + 敌逼近 + 晨光>. Panel 02 … Panel 08: <逐拍推进>.
Panel 09: MUST mirror the framing of Panel 01 — same camera, same pose — but <敌已倒地 + 暮色长影>.
合规:opponents knocked back by force not injured, sword meeting sword NOT body, no wounds no blood.
【反AI味结尾 + Avoid】
```

### 完整真实 prompt 全文(gid126 逐字摘录 · 节选首尾镜像与全局锁关键段)
```
原始序号(道具-类)/ 模型:Neo Image 2 / 比例:16:9 / 清晰度:2K

A 3x3 grid of 9 cinematic black-and-white film stills, total canvas aspect ratio 16:9. Each of the 9 panels is itself a 16:9 cinematic frame, separated by clean thin black borders (2-3px) with small white margins between panels. Small panel numbers "01" through "09" rendered in clean sans-serif font in the top-left corner of each panel. Read order: left-to-right, top-to-bottom. CRITICAL RENDERING DIRECTIVE: These are NOT line art, NOT manga panels, NOT sketches, NOT concept illustrations. These are PHOTOREALISTIC CINEMATIC STILL PHOTOGRAPHS rendered in pure black-and-white grayscale only - as if shot on a black-and-white digital cinema camera. Every panel must [看起来是连续灰阶照相级,统一光向自上左、无风格化排线/图形效果]. MAIN CHARACTER (must be identical across all 9 panels - [主角:江流眉,逐项锁服装/造型,东方机械朋克、做旧、真实演员实拍非风格化]). OPPONENTS (consistent design across all panels where they appear): 7 desert raiders, all male, lean and [瘦削缠布沙匪,统一造型].
[逐材质灰阶映射:把彩色色板转译为灰阶层级 — 红→中深灰、黑保深、白保亮,使九格层次到位]
[Panel 01–09 逐格写镜别与动作;首尾镜像:Panel 09 mirror Panel 01 的同机位同姿势,敌从逼近变倒地,光从晨光到暮色,形成叙事闭环]
[暴力降级合规:opponents knocked back by force, not visibly injured; no wounds, no blood — 编排武打过审]
[Kodak Double-X 5222 黑白片基 + anamorphic 宽银幕 + 故意柔化的反AI味结尾 + 长串 Avoid]
```
> ⚠ 摘录说明:gid126 在源文件 line 4026 起,九格逐格动作描述极长,且 PDF 切片处部分行被工具截断为概述([方括号]内为目录核证的内容要点)。**首尾镜像(01↔09 同机位、敌逼近→倒地、晨→暮)、全局锁(主角+7 敌+光向+风向+胶片机型)、逐材质灰阶映射、暴力降级**四点均逐字/逐项见于原文与 gid126 目录条目;若要逐字完整九格清单,读 `万物生问心_提示词全文.md` line 4026–4060 原文。

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid126**(道具类·江流眉沙漠群战九宫格黑白分镜,Neo Image 2/16:9/2K,**吻合度高**):一张 prompt 出整段九宫格 / 3x3 网格 + 细黑边 + 编号 / 跨格主角光向风向一致 / 逐格镜别变化 / 首尾构图呼应 / 全连续灰阶照相级(非 line art/manga)/ 编排武打无血 均落地;逐材质灰阶指令使层次到位 ✓;每格细节(瞳孔倒影敌剪影 / 剑身文字)受单格分辨率限难逐一确认(整体一致性无翻车)✗。

**同源单帧镜像对照(印证首尾镜像手法在单帧上也成立)**
- **gid129 ↔ gid131**(场景开场镜 ↔ 收势镜):`this shot MUST mirror the framing of the opening shot`,同机位 / 同景别,只改人物从侧边移到正中、影子从短变长、敌从逼近到伏地,做"同一序列前后镜"时间推进对照 ✓;两图因镜像刻意做得极相似(预期代价)。九宫格 01↔09 = 这套单帧镜像手法的格内浓缩版。

**反复翻车点(整批教训)**
- 九宫格武戏单格分辨率有限,格内精细叙事点(瞳孔倒影敌剪影、剑身微文字)常不可读——这是单帧极特写图型(瞳孔倒影 gid17/19)在九宫格里的同病放大,属分辨率取舍非手法 bug。
- 暴力降级若不写 `sword meeting sword NOT body / no blood`,武戏易跑成见血,过审风险高。

### 校对清单(出图后逐项对账)
- [ ] 是不是**真 3×3、九格都有编号 01–09、读序对**?
- [ ] **主角九格是同一人吗**?有没有串脸/换装?**敌人数量(7)各格一致**吗?
- [ ] **光向 / 风向 / 胶片质感跨九格一致**吗?(动作戏最易"变天")
- [ ] **01 与 09 首尾镜像成立**吗?同机位同姿势、敌逼近→倒地、光晨→暮、闭环读得出吗?
- [ ] **黑白灰阶层级**清楚吗?(逐材质映射有没有生效,还是糊成一团)
- [ ] 是 PHOTOREAL 灰阶照片,**不是 line art / manga / 速写**吗?暴力降级(无血、刀对刀)守住没?

### 坑 & 调参
- **首尾镜像是闭环的关键句**:`Panel 09 MUST mirror the framing of Panel 01` 不能省,否则九格只是九个散拍、没有叙事弧。
- **逐材质灰阶映射治黑白糊层次**:黑白片别只写"black and white",要给红/黑/白各指定灰阶权重(借彩色色卡转译),否则中间调全糊。
- **全局锁(主角+敌数+光+风+胶片)写在最前**,九格逐格描述写在后——让模型先吃到一致性约束再吃逐格内容。
- 单格精细叙事点(剑身文字/瞳孔倒影)在 2K 九宫格下不可读,是分辨率取舍;真要那个细节单独出极特写帧(图型 08),别指望九宫格里读出。

---

## 图型 12 · 状态批量九宫格(完好→被毁) ✅

### 何时用
已有一张"完好状态"的场景/部落/建筑图,要批量生成它**变化后的多个视角**(被摧毁 / 灾后 / 老化 / 雪覆…)、做灾后镜头或状态对照素材时。它是图型 10 的近亲,但锚点不同:10 锁"同一时刻九机位",12 锁"**同一对象 + 一个状态变化 + 多视图九宫格**"三要素合一——靠参考图提供原始形态,再对它整体施加破坏/变化。极简一句话即可驱动(靠底图承载结构),也可升级成 gid7/26 那样的重型逐格分镜(图型 10)。

### 命门(这种图独有的成败关键)
1. **三要素一句话合一**:`参考图(完好对象)` + `状态变化(被摧毁)` + `多视图九宫格格式`——把这三者压进一句,让模型从参考图读原始部落形态、再统一施加破坏。少任何一个,要么破坏不彻底、要么丢了原对象身份、要么不成九宫格。
2. **靠底图承结构、prompt 只管"变状态"**:与图型 10 重型骨架相反,本图型走轻量路线——结构信息全在参考图里,prompt 不重写场景细节,只下"被摧毁 + 九宫格多视图"。这是状态批量的低成本打法。
3. **状态一致性是弱项,需显式拉齐**:多格"被摧毁程度"易不一致(有的夷平、有的轻损),要补一句统一破坏等级(如"半毁可辨,非夷平"),否则九格灾情深浅不一。
4. **"多视图"≠ 严格定点环绕**:一句话版出来的更像"同一灾后场景的多张景观拼贴",不是精确环绕机位;要严格环绕得升级到重型逐格写机位(图型 10)。

### 专门骨架(填空式)
```
模式:图生图(完好对象参考图[+ 破坏源参考图] → 状态变化九宫格)
size 16:9 / quality 1K-4K(要逐格细节可读则升 4K)
用途:状态批量(同一对象变化后多视角),做灾后/老化/对照素材

【参考图标注】
- 参考图1:<完好状态的对象——锁原始形态/身份>
- 参考图2(可选):<破坏源,如地龙/灾害——锁施加破坏的来源形态>

【PROMPT 正文 — 轻量版(一句话)】
参考重新生成一个新的九宫格场景图,展现被<参考图/破坏源>摧毁的<对象>景象的多视图九宫格。
(英文等价:Regenerate a new 3x3 nine-panel scene grid showing the <对象> after being destroyed by
<破坏源 from reference>, as a multi-view nine-panel grid — preserve the <对象> identity from reference,
apply consistent half-ruined-but-recognizable destruction across all nine views.)

【若要拉齐状态/升级成片】补:统一破坏等级(half-ruined not flattened, still recognizable)+
跨格同光同尘 + 升 4K 让每格细节可读 → 此时即转入图型 10 的重型逐格骨架。
```

### 完整真实 prompt 全文(gid77 逐字 · 场景-009)
```
原始序号:104 / 模型:Neo Image 2 official / 比例:16:9 / 清晰度:1K
参考图:2 张(完好部落 + 地龙峡谷)

参考重新生成一个新的九宫格场景图,展现被参考图摧毁的部落景象的多视图九宫格。
```
> ⚠ 真实 prompt 极简,仅此一句(逐字摘自 line 1393)。它把"参考图(完好部落)+ 状态变化(被摧毁)+ 多视图九宫格"三要素合一,靠两张参考图(完好部落形态 + 地龙作破坏源)承载内容,文字只下指令。这是状态批量九宫格的极简范式——与图型 10 重型 gid7/26(逐格写死 800+ 词)形成"轻量↔重型"两极。

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid77**(场景-009,Neo Image 2 official/16:9/1K,**吻合度中**):三要素同锁——同一部落多视角灾后景象成立,高清重制使每格细节可读 ✓;"多视图"更像多张景观拼贴而非严格定点环绕、各格"被摧毁"程度不一致 ✗。
- ✎ 据原文 p103,参考图实为两张(完好部落 + 地龙峡谷),目录通读笼统称"完好部落参考图";比例从前四条(gid73–76)的 21:9 切回 16:9。

**对照(重型状态批量,同题材升级版)**
- **gid7 / gid26**(图型 10):同样是"部落被地龙毁"的九宫格,但走重型逐格骨架(逐格写机位 + 巨物铁律 + 全局锁 + 约束块),状态一致性、机位精确度、尺度压迫都远强于 gid77 的一句话版。**结论:状态批量要"快"用 gid77 一句话;要"成片/状态齐"必须升级到 gid7/26 重型骨架。**

**反复翻车点(整批教训)**
- 一句话版的两大固定短板:① "多视图"散成景观拼贴而非环绕机位;② 九格破坏程度深浅不一。这是轻量路线用底图承结构的代价。
- 想治这两点,不要在一句话里硬加补丁,直接换图型 10 重型骨架(逐格 Panel + 统一破坏等级 + 跨格一致锁)。

### 校对清单(出图后逐项对账)
- [ ] **原对象身份保住了吗**?灾后还认得出是同一个部落/建筑吗?(参考图有没有锁住原始形态)
- [ ] **状态变化施加到位**吗?"被摧毁"是不是真毁了,还是只轻微改动?
- [ ] **是不是九宫格 / 多视图**?还是退化成几张拼贴?
- [ ] **九格破坏程度一致**吗?(易翻:有的夷平、有的几乎完好)
- [ ] 细节够清吗?(1K 易糊,要逐格读细节升 4K)

### 坑 & 调参
- **三要素缺一不可**:参考图(原对象)+ 状态词(被毁)+ 九宫格格式。漏了状态词→出完好图;漏了参考图→丢身份;漏了九宫格→出单张。
- **轻量↔重型按需切换**:gid77 一句话适合快速拿灾后多视角草稿;状态要齐、机位要准、要成片,直接上图型 10 的重型逐格骨架,别在一句话上打补丁。
- **状态一致性补丁**:若一句话版破坏深浅不一,补"half-ruined but recognizable, consistent destruction level across all views"一句拉齐。
- **细节可读靠分辨率**:1K 九格每格都小,细节糊;要逐格核验(灾情/残骸)升 4K。

---

## 图型 13 · 民族志服装陈列板(3×3 documentary plate) ✅

### 何时用
要为一个族群/部落一次性出**多套服装变体 + 对应头饰 + 地面道具**的**无人体陈列参考板**时——给剧组当服装参考表、世界观设定物料。范式是"博物馆纺织修复板 / 剧组服装参考表":服装挂杆垂直悬挂排成 3×3,每套上方头位摆对应头饰,画布地面 flat-lay 散布道具,三层同框。强调"共享部落语言但逐套差异化 + 每套必有一抹朱砂红 accent"串联。⚠ **数量是这套 prompt 的稳定弱项**(下详),套用时务必把"九套 / 3×3"当头号校对项。

### 命门(这种图独有的成败关键)
1. **平光 + overhead-and-frontal + 无人体**:`flat-lit overhead-and-frontal documentary-style reference plate` + `without any human figures present` + `soft diffuse overhead studio lighting with no directional shadows`——纯物件存档式平铺,反棚拍戏剧光,每件等可读。
2. **三层同框结构**:① 服装挂杆垂直悬挂排 3×3;② 每套头位摆一件对应头饰(小木架上,九件各异);③ 画布地面 flat-lay 散布道具(布样 / 颜料碗 / 绳 / 弯刀 / 骨珠…)。
3. **共享部落语言 + 逐套差异化 + 朱砂红串联**:九套统一部落语言(burgundy/dust-cream/sandstone-ochre/smoke-umber 色域),但逐套在主色比 / 层叠复杂度 / 材质(粗毛呢 vs 细棉 vs 鞣皮)/ 系法 / 金属配件数量上各异;`A single cinnabar red accent appears somewhere on each outfit`(#A82A2A)做唯一高饱和焦点色,九套各放一处串成视觉节奏。
4. **九件头饰逐件点名**:不只说"九件不同头饰",而是逐件描述形态(一件细眉带斜出金属杆 / 一件弯曲金属枝 / 一件锤铜板 / 一件叉状铁片 / 一件叠盘构造…),`tribal/ritualistic/archaic/hand-beaten, never resembling helmets or polished jewelry` 防跑成头盔/精致首饰。

### 专门骨架(填空式)
```
模式:文生图(或轻图生图,参考图只给色板/部落语言)
size 16:9(⚠ 横幅利于平铺道具,但不利严格 3×3,见坑)/ quality 1K+
用途:出服装参考表/设定物料(无人体陈列板)

【PROMPT 正文】
A flat-lit overhead-and-frontal documentary-style reference plate showing NINE complete outfit sets of
<族群>, displayed WITHOUT any human figures present. Each outfit suspended on a weathered wooden
pole / rough hemp cord, hanging vertically as if pinned for ethnographic study, arranged in THREE ROWS
OF THREE (3×3) against a neutral warm-grey canvas backdrop. Each outfit displays the full ensemble top
to bottom: <逐部位:斜挂布 / 半裙开衩 / 系带 / 不对称肩布 / 开衩裤 / 缠足布或皮靴 at base>.
The nine outfits share a unified tribal language but each varies: <主色比 / 层叠 / 材质 / 系法 / 金属件数量>.
A single <朱砂红 #A82A2A> accent appears somewhere on each outfit — small but visually loud across all nine.
Above each outfit, in the head position, rests one hand-forged metal headpiece on a small wooden stand —
NINE distinctly different headpieces: <逐件点名 9 种形态>. All headpieces tribal/ritualistic/archaic,
hand-beaten, never helmets or polished jewelry.
Scattered across the canvas floor: <flat-lay 道具:布样 / 颜料碗 / 绳 / 弯刀 / 骨珠 / 铜片…>,
every prop photographed flat-on, pure object documentation.
Composition: clean ethnographic study layout, neutral warm-grey canvas filling frame, soft diffuse overhead
lighting no directional shadows, no human presence, no environment. References a museum textile
conservation plate / film wardrobe reference sheet. Real photographic quality, 35mm medium format film
stock, soft documentary lighting, analog photochemical grain, shot as a flat archival reference photograph.
```

### 完整真实 prompt 全文(gid23 逐字 · 场景-023)
```
原始序号:094 / 模型:Neo Image 2 official / 比例:16:9 / 清晰度:1K

A flat-lit overhead-and-frontal documentary-style reference plate showing nine complete outfit sets of a desert nomad-trader tribe of mixed Sogdian and Turkic descent, displayed without any human figures present. Each outfit is suspended on a simple weathered wooden pole or rough hemp cord, hanging vertically as if pinned for ethnographic study, arranged in three rows of three across the frame against a neutral warm-grey canvas backdrop with no environmental context. Each outfit displays the full garment ensemble from top to bottom: hanging cross-body cloth wraps, draped half-skirts with high side openings, tied sashes, asymmetric shoulder cloth, slit-side loose trousers, soft wrapped foot bindings or low hide boots placed at the base of each hanging set. The nine outfits share a unified tribal language but each one varies in specifics: differences in dominant color ratio across the burgundy and dust-cream and sandstone-ochre and smoke-umber palette, differences in layering complexity, differences in which fabrics are coarse woven wool versus fine cotton versus tanned hide, differences in how sashes are tied and where openings fall, differences in the quantity and placement of small bronze and iron fittings. Some outfits skew more textile-heavy in the Sogdian merchant manner, others skew more hide-and-cord in the Turkic nomadic-hunter manner, most blend both. A single cinnabar red accent appears somewhere on each outfit — a dyed cord, a strip of crimson wool, a painted band on a sash, a knotted scarlet thread — small but visually loud against the earth palette across all nine sets. Above each suspended outfit, in the position where a head would be, rests one hand-forged metal headpiece displayed on a small wooden stand — nine distinctly different headpieces, each an asymmetric construction of raw hammered bronze and oxidized iron with visible hammer marks and tarnished patina. The headpieces vary: one is a thin brow band with uneven metal rods angling outward, one is a curved metal branch arcing from one side to the back, one is a beaten copper plate with rough curled edges, one is a cluster of small forged shapes bound by leather cord, one is a delicate framework of thin iron wire holding small charms, one is a heavy single forged crescent, one is a beaten bronze cap with hanging metal beads, one is a twin-pronged iron piece, one is a layered stacked-disc construction. All headpieces look tribal, ritualistic, archaic, hand-beaten on an anvil, never resembling helmets or polished jewelry. Scattered across the canvas floor between and around the hanging outfits are reference props arranged in flat-lay documentary fashion: small folded fabric swatches showing the texture range from coarse hand-spun wool to fine loomed cotton to supple tanned hide, raw pigment piles in shallow ceramic bowls displaying the dried-blood burgundy and smoke-charcoal black and sandstone ochre and cinnabar red used for body marks, several lengths of woven cord and braided leather thong, small hand-forged bronze and iron fittings including armbands and belt clasps and threaded charms, a curved utility blade in a tooled sheath, sun-bleached bone beads, fragments of patinated bronze, a small length of hammered copper sheet, a pair of worn hide bindings, a clay vessel holding additional pigment, a stack of folded sashes in different weaves. Every prop is photographed flat-on, no dramatic lighting, no styling, no atmospheric perspective — pure object documentation. Composition: clean ethnographic study layout, neutral warm-grey canvas background filling the entire frame, soft diffuse overhead studio lighting with no directional shadows, every garment and prop equally readable, no human presence, no environmental setting, no narrative scene. Visual language references a museum textile conservation plate or a film production wardrobe reference sheet. Real photographic quality, 35mm medium format film stock, soft documentary lighting, analog photochemical grain, shot on a real camera as a flat reference photograph for archival purposes.
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例(范式成立、数量翻车)**
- **gid23**(场景-023,Neo Image 2 official/16:9/1K,**全文来源·吻合度中**):无人体 / 暖灰底 / 平光纯物件 / 三层同框 / 头饰逐件各异 / 朱砂红 / 弯刀颜料碗皮靴等道具 / 35mm 存档质感 全成立 ✓;**"九套·3×3"未做对:实为两行各 4 套 = 8 套(4+4),非 9 套也非 3×3 网格** ✗。`nine outfits / three rows of three` 两个硬指标双双未满足。

**反例(数量翻车更严重)**
- **gid24**(场景-024,与 gid23 prompt 逐字相同的复刻版,吻合度中):获一版不同头饰变体批次(弯月 / 双叉等),民族志范式 / 暖灰底 / 朱砂红 / 35mm 质感成立 ✓;**数量翻车更严重:仅 5 套且单行排布(比 gid23 还少)** ✗。**连跑两次都少于 9——这条重型 prompt 在 Neo Image 2 official 上数量控制是稳定弱项。**

**同范式对照(数量同样落空)**
- **gid25**(场景-025,Neo Nano Pro/16:9):无人物陈列 plate / 土色系 + 朱砂红 / flat-lay knolling / 暖灰柔散布光 / 胶片低饱和质感落地 ✓;未严格呈现 3×3=九套、头饰逐套对应对不齐,更像松散堆陈 ✗。**16:9 横幅而非方形九宫格,横幅利于平铺道具而非整齐 3×3,是数量法则落空的客观原因。**

### 校对清单(出图后逐项对账)
- [ ] **数到底有没有九套**?(头号风险——gid23 出 8 套、gid24 出 5 套、gid25 松散堆陈,三条全数量翻车)
- [ ] 是不是**真 3×3 三行三列**?还是横排 / 单行 / 松散堆陈?
- [ ] **无人体**吗?有没有冒出人 / 假人模特?
- [ ] **平光无方向阴影**吗?有没有跑成戏剧棚拍光?
- [ ] **每套都有一处朱砂红 accent** 吗?九套是否"统一部落语言但逐套有别"?
- [ ] **九件头饰逐件不同、且 tribal/hand-beaten**(没跑成头盔 / 精致首饰)吗?地面 flat-lay 道具齐不齐?

### 坑 & 调参
- **数量是这套 prompt 的稳定弱项**:gid23/24/25 三条全部没做到九套(8 / 5 / 松散)。`nine outfits` 和 `three rows of three` 要在 prompt 里**重复强调**(给 AI 读的 prompt 适度重复 = 注意力强化),出图后**第一件事数数量**,不够就换种子重跑或升模型。
- **横幅 16:9 是数量翻车的客观推手**:横幅诱导模型横排平铺、放弃 3×3。要严格九宫格,**考虑改用方形(1:1)或显式锁 3×3 网格 + 细分隔线**,横幅则默认会松散。
- **冻结 prompt + 多跑扩批**:gid24 证明同 prompt 复跑能拿不同头饰变体(弯月 / 双叉),适合"锁死 prompt 靠多跑扩充设计选项";但复跑解决的是"变体多样性",**解决不了数量**——数量得靠改画幅 / 强调 / 换模型。
- **朱砂红 = 唯一高饱和焦点**:`small but visually loud against the earth palette` 这句让红在去饱和土色里跳出来串联九套;别给第二种高饱和色,否则焦点散。

---

## 图型 14 · 角色四视图定妆(2×2 turnaround / character sheet) ✅

### 何时用
要给**一个角色锁死"正脸 / 侧脸 / 全身正 / 全身背"四套权威视角**、供后续分镜复刻一致性 + 后期换脸时用。它是 turnaround character sheet(转面定妆表)——**身份特征、视角分工、四格版式正确优先于单格美感**。两种规格:**重型英文版**(gid120/122/123,9:16 不等大四宫格 + 整套族群锚定模板,做主役/精英喽啰)与**轻型中文版**(gid149/159,一两句话把单图扩成 2×2,做次要角色/道具网格扩展)。同系列多角色时靠**格式继承 + 差异化对照表**保证"同部落不撞脸"。

### 命门(这种图独有的成败关键)
1. **四格版式逐格点名指派,且每格显式锁宽高比**:不能只说"出四视图"——要逐格写清内容(`左上正脸特写 / 右上侧脸特写 / 左下脖子以下全身无脸 / 右下背面含后脑勺`)+ 整体画幅(9:16 竖版 / 不等大上小下大,或 `2x2 每格 16:9`)。轻型版翻车点正是**没锁每格比例 → 被压成正方格**(gid149 靠 `每个格子比例都是16:9` 一句锁住)、以及**没锁尺寸权重 → "上小下大"读不出**(gid159 的反例)。
2. **左下"全身无脸"格刻意把脸裁出框 = 换脸存活位**:`BODY FRONT (NO FACE) ... face/head intentionally cropped out at the top of this panel ... zero face involvement so this panel survives any future face replacement edit`。这是把人设图做成 face-replace 工业流水线的关键格。
3. **族群/身份锚定 + 海量 NOT 反向锁**(重型版):AI 默认欧美/韩剧脸 → 用一长段 `ETHNICITY — CRITICAL: Central Asian / Turkic / Sogdian` + `NOT pure Caucasian / NOT K-pop / NOT anime face` 把脸压回设定。
4. **格式继承 + 差异化对照表**(同系列多角色):后续角色用一句中文 `【格式继承】完全同头领/女副手/喽啰A格式` 挂载整套模板免重写;收尾附一张**多维差异化总览表**(性别/年龄/体型/发/胡/服装/双签名装备/主副武器/战利品/气质),把"群像不撞脸"变成可对账的一致性 check 表(gid123 是范本)。

### 专门骨架(填空)
```
模式:文生图 / 图生图(角色 ref → 四视图定妆表)
—— 重型英文版(主役/精英):size 9:16 竖版 / quality 最高 / Neo Image 2
—— 轻型中文版(次要角色/网格扩展):一句话挂模板,显式锁每格比例

【★ 真人COS项目 house 格式(用户标准 · 所有角色定妆都用)】
size 9:16 竖版 / 4K / Neo Image 2 · 写实摄影棚定妆照背景 · 单侧暖光侧逆光
版式:2x2 上小下大 —— 上排两格(~1/3高)=脸特写;下排两格(~2/3高)=脖子以下全身;细灰分割线,四格同背景同暖光侧逆光。
四格:
- 左上 正脸特写:锁骨往上,正对镜头,脸全露。
- 右上 侧脸 profile:纯侧脸朝 camera-right,暖逆光勾发丝与下颌/鼻线。
- 左下 正面脖子以下(无脸无头):锁骨到脚跟全身,正面;头从格顶裁出(零脸参与=供换脸),正面服装全见。
- 右下 背面脖子以下(无脸无头):背面全身,颈到脚跟,头从格顶裁出;发垂背,披风/腰带/腿挂等背侧装备可见。

【重型版 PROMPT 骨架】
A character design reference sheet. **Vertical 9:16 aspect ratio. Maximum resolution output.**
Pure solid neutral light-warm-grey studio backdrop. Single-sided side-rim backlighting from
camera-right at 45° behind subject, no fill / no front light.
【Layout】2x2 grid with UNEQUAL panel heights: top row two SMALLER panels (~1/3 height) = face
close-ups; bottom row two LARGER panels (~2/3 height) = full body.
【4 Panels】
- Top-left FRONT FACE CLOSE-UP:<正脸·眼睛完整·头巾拉到脖子露脸>
- Top-right SIDE FACE (PROFILE):<纯侧脸·背光勾后脑·发型特征>
- Bottom-left BODY FRONT (NO FACE):<脖子以下全身·脸裁出框·签名装备1正面可见>(换脸存活位)
- Bottom-right BACK VIEW (含后脑勺):<背面全身·签名装备2背挂可见>
【Subject】<年龄+体型一句> ETHNICITY — CRITICAL:<族群锚定>. <发/胡/战痕/服装/签名装备×2/战利品等级>
【Pose 同四格】<默认站姿,关系驱动:working laborer/alert pilot/calm veteran,NOT action NOT seductive>
【Critical consistency】SAME individual in all 4 panels — identical face/hair/clothing/signature gear.
【Panel Labels】FRONT FACE / SIDE FACE / BODY FRONT (NO FACE) / BACK + Title
【Constraints】NOT 1:1(must 9:16)/ NOT equal panels(top smaller)/ NOT face in bottom-left /
            <族群 NOT 清单>/ <装备与同系列其他角色的差异化 NOT 清单>

【轻型版 PROMPT 骨架(已有单图→扩四视图)】
出2x2四视图。每个格子比例都是<16:9 / …>。   ← 关键:必须显式锁每格宽高比
（或)2x2四宫格,上小下大,左上正脸特写/右上侧脸特写/左下脖子以下全身不含头/右下背面全身,
    背景写实摄影棚定妆照,单侧侧逆光。

【同系列多角色追加】
- 一句中文挂模板:【格式继承】完全同<已有角色>格式:9:16竖版+4格不等大+正脸/侧脸/脖子以下/背面+single-side rim
- 收尾差异化对照表:|维度|角色A|角色B|角色C| 性别/年龄/体型/发/胡/服装/签名装备×2/主副武器/战利品/气质
```

### 完整真实 prompt 全文(逐字)

**重型版完整模板 — gid120(道具-003 · 钩索手 · 全文来源)**
```
=== GPT-Image-2 Prompt - 万物生第1集 沙猎喽啰A · 钩索手 默认形态四视图人设图 v1 ===
【格式继承】 完全同头领/女副手格式： - 9:16竖版+最高分辨率 - 4宫格不等大（上小下大） - 左上正脸特写+右上侧脸特写+左下脖子以下全身（无脸）+右下背面全身含后脑勺 - 单侧侧逆光+无其他光源+定妆照感 - Central Asian/Turkic/Sogdian Silk Road族群锚定（继承女副手的反欧美脸纠正）
【角色定位】 沙猎部落普通喽啰之一——**钩索手 Lasso**。功能：发射钩索锁定目标（江流飞船的bug-like腿是猎物结构弱点）。在战术单位里负责"锁定"环节，配合B沙艇驾驶手围困+C弓箭手远程支援。 装备等级低于头领/女副手——**没有义肢替换+只有局部叠加机改**（wearable mechanism而非bodily replacement）。战利品挂饰少（新一代+战绩未积累）。
---
【prompt】
A character design reference sheet. **Vertical 9:16 aspect ratio. Maximum resolution output.** Pure solid neutral light-warm-grey studio backdrop. Single-sided side-rim backlighting from camera-right at 45 degrees behind the subject, no fill light, no front light, no other light sources—dramatic cinematic studio lookbook lighting. 【Layout】 **2x2 grid with unequal panel heights**: - Top row: two smaller panels (each approximately 1/3 of total canvas height) — head/face close-ups - Bottom row: two larger panels (each approximately 2/3 of total canvas height) — full body shots - Thin neutral light-grey dividing lines between all four panels - All four panels share the same solid backdrop and same lighting setup 【4 Panels】 **Top-left panel — FRONT FACE CLOSE-UP**: Tight close-up of the male raider's face, framed from approximately collarbone-line up to top of head. Subject facing camera directly. Side-rim backlight catches the right edge of the face/hair (camera's left side of frame), leaving the left side of the face in deeper shadow with subtle ambient bounce. Both eyes intact, sharp focused gaze toward camera. Face fully visible—no headwrap covering nose or mouth. **Top-right panel — SIDE FACE CLOSE-UP (PROFILE)**: Tight close-up of the raider's face in pure side profile, framed from collarbone-line up to top of head. Subject facing camera-right. Side-rim backlight catches the back of the head and silhouettes the profile against the backdrop. Short cropped hair and stubble beard catch the rim light. Face fully visible. **Bottom-left panel — FULL BODY FROM NECK DOWN, FRONT VIEW (NO FACE)**: Full body shot from collarbone-line down to feet, facing camera directly. **The face/head is intentionally cropped out of frame at the top of this panel—only the neck, shoulders, torso, arms, hips, legs, and feet are visible.** Zero face involvement so this panel survives any future face replacement edit. Side-rim backlight catches the right shoulder and right side of body, defining stocky muscular silhouette. **Right forearm clockwork lasso-winch mechanism prominently visible**, large mechanical grappling-hook launcher strapped across upper back/shoulder visible at top edge of frame. **Bottom-right panel — FULL BODY BACK VIEW (INCLUDING BACK OF HEAD)**: Full body shot from head to feet, facing directly away from camera (back of subject toward camera). **Includes back of head, short cropped hair visible, headwrap loose around neck.** **Mechanical lasso-winch hook launcher across upper back fully visible** (the signature equipment of his role), thick coiled rope cable running from launcher down to right forearm winch. Trophy decorations on back of belt visible (sparse—2-3 small trophies only). Side-rim backlight catches right shoulder silhouette. 【Subject — same character across all 4 panels】 A male desert raider, common-rank tribe member specializing in lasso/grappling-hook deployment for hunting parties. **Character Core**: Approximately 28-32 years old, hardened working-rank warrior. **Stocky chunky muscular build—broad shoulders, thick arms with developed forearms (the kind of grip-and-pull strength needed to operate a heavy mechanical hook launcher). Built like a working laborer-fighter, NOT bulky bodybuilder, NOT obese, NOT slender.** **ETHNICITY — CRITICAL**: Central Asian / Turkic / Sogdian Silk Road ethnic features—the historically accurate "杂胡" mixed-tribe peoples of the Sui-Tang frontier desert (突厥+粟特+西域本土+汉流亡者混合). Wide prominent cheekbones, deep-set almond-shaped eyes with monolid or low-fold (NOT round Western double-fold), black or very dark brown eyes, black hair, weathered tan-bronze skin from desert sun, strong jawline, straight or slightly broad nose (NOT thin pointed Western Caucasian), thick natural eyebrows. **Hair**: short cropped black hair, practical working-warrior cut. Short stubble beard, weathered face with sun lines and small windburn marks. **Battle marks**: a few minor scars on cheeks, knuckles, forearms—the marks of a working raider, NOT the dramatic veteran scars of the chieftain or lieutenant. **Headwear**: tribal headwrap of weathered tan-and-rust desert cloth, currently pulled down loose around the neck (face fully uncovered). Wrap can extend down as a hood/scarf around shoulders. **Upper body**: weathered dark leather sleeveless vest, shoulders and forearms exposed showing tribal tattoo markings on shoulders. **CRITICAL EQUIPMENT — Right forearm lasso-winch mechanism**: a wearable bronze clockwork device strapped to the entire right forearm from elbow to wrist (NOT a prosthetic replacement—the underlying arm is intact, this is wearable armor with mechanism). Visible bronze gears, leather strap bindings to the upper arm and wrist, exposed clockwork mechanisms, slight verdigris patina (Mecha Crimson Bronze #7A6845, Aged Gold #846035 accent). A thick rope cable feeds from a winch drum on the forearm device up over the shoulder to the back-mounted launcher. Left forearm wrapped only with thick leather wrist guards (no mechanism on left side). **Back-mounted lasso launcher**: a large primitive mechanical grappling-hook launcher strapped horizontally across the upper back/shoulder blades—roughly the size of a small crossbow, made of bronze and dark wood with a heavy iron grappling hook visible at one end, thick rope cable feeding from the launcher to the forearm winch. War-torn salvage construction with bolts and leather strapping. **Lower body**: loose weathered dark wide-leg leather trousers tucked into knee-high desert boots wrapped with cloth bindings. Multiple belt straps and small pouches around waist (rope spool, hook accessories, small tools). **Trophy decorations**: SPARSE — only 2-3 small bone fragments and one small enemy belt buckle hanging from leather cords on the belt. He's a young raider with limited combat record (markedly less than the chieftain's brutalist trophy mass or the lieutenant's refined woven beads). **Footwear**: rugged desert leather boots wrapped with cloth bindings around the calves. 【Secondary Weapon】 - Single short combat knife at left waist belt (sidearm only)—the lasso/winch system is his primary tool, melee is secondary 【Color Palette】 Desert sand tan, deep burnt umber leather, aged bronze patina (Mecha Crimson Bronze #7A6845 + Aged Gold #846035) on the lasso mechanism, dried-blood-red tribal accent on cloth bindings. ALL materials weathered war-torn dust-coated, NOT clean NOT polished. 【Pose - same across all 4 panels】 Default standing pose with feet shoulder-width apart, weight slightly forward (the stance of someone always ready to brace and pull on a tensioned rope). Right hand near the forearm winch mechanism, left hand resting at side. Subtle laborer-warrior solid presence—NOT aggressive action pose, NOT relaxed civilian, NOT showy. 【Critical consistency】 SAME individual character in all 4 panels—identical face structure (Central Asian/Turkic/Sogdian features), identical hair (short cropped + short stubble), identical clothing items, identical right forearm lasso-winch mechanism, identical back-mounted hook launcher, identical sparse trophy decorations. Same studio backdrop, same single-sided side-rim backlighting setup across all 4 panels. 【Lighting - critical】 **Single-sided side-rim backlighting from camera-right at 45-degrees behind subject. NO fill light. NO front light. NO ambient. NO other light sources.** Strong dramatic edge-light catches the right side of subject silhouette in every panel, leaving the left side of subject in deep falloff shadow with subtle ambient bounce. Cinematic high-end fashion-lookbook studio photography (Peter Lindbergh / Annie Leibovitz portrait style with single rim source). 【Style】 Hyperrealistic photographic character design rendering—shot like a high-end practical costume photographed in a film production studio for a cinematic lookbook reference board. NOT illustration, NOT obvious 3D CGI render. **Reference aesthetics for Central Asian Silk Road ethnic accuracy**: - **《长安十二时辰》(The Longest Day in Chang'an, 2019) 西域狼卫** — Sui-Tang Silk Road frontier desert peoples ethnographic anchor - **Mongol: The Rise of Genghis Khan (2007)** — Central Asian battle-hardened warrior physique and weathered features - **Monster Hunter Wilds desert hunter aesthetic** — for the tribal armor/weathered-leather/bone-trophy DNA Light Kodak Vision3 35mm film grain texture overlay. 【Quality】 Maximum resolution output. 8k ultra clean rendering. Sharp clean edges. Every leather strap, every gear tooth, every bolt on the lasso mechanism clearly defined. Real physical costume cinematic photography aesthetic. 【Panel Labels】 Small clean monospace sans-serif black text below each panel: - Top-left: "FRONT FACE" - Top-right: "SIDE FACE" - Bottom-left: "BODY FRONT (NO FACE)" - Bottom-right: "BACK" Title at top center of canvas (small clean black sans-serif): "SAND HUNTER COMMON RAIDER A · LASSO — DEFAULT FORM CHARACTER SHEET" 【Constraints】 **Ethnic accuracy (CRITICAL)**: NOT pure Caucasian European face, NOT blonde or red or light brown hair, NOT blue or green or grey or hazel eyes, NOT pale fair Northern European skin, NOT thin pointed delicate Western nose, NOT round Western double-fold eyes, NOT pure Han Chinese face, NOT modern K-pop or Chinese drama actor aesthetic. MUST be Central Asian Turkic/Sogdian Silk Road mixed ethnicity. **Body & costume**: NOT bodybuilder bulky muscle (working laborer stocky build only), NOT obese, NOT slender, NOT teen-aged appearance (must be 28-32 working raider). Forearm winch is wearable armor mechanism NOT a prosthetic limb replacement. **Equipment differentiation from leadership**: NOT a prosthetic limb replacement (he has both arms intact, the winch is wearable equipment), NOT heavy quantity of trophy decorations (only 2-3 sparse), NOT heavy multiple weapons (lasso system is primary, single knife is secondary), NOT chieftain-level brutalist trophy mass, NOT lieutenant-level refined woven beads. **Aesthetic**: NOT precision cybernetic, NOT modern, NOT clean (war-torn salvage bronze only), NOT medieval European, NOT Ming-Qing imperial, NOT samurai, NOT cyberpunk neon, NOT obvious CGI 3D render, NOT cartoon, NOT anime, NOT colorful saturated palette. **Layout & lighting**: NOT 1:1 square aspect (must be vertical 9:16), NOT equal-sized 4 panels (top row smaller, bottom row larger), NOT face visible in bottom-left panel (face strictly cropped out at top of panel), NOT face covered by headwrap in face close-up panels, NOT colorful background (solid neutral light-warm-grey only), NOT soft even neutral lighting (must be single-side rim backlight only), NOT front light, NOT fill light, NOT any text other than the four panel labels and the title.
=== END ===
```

**格式继承缩写头 — gid122(道具-005 · 沙艇驾驶手)**:正文与 gid120 同构(只换签名装备:护目镜推额头/高马尾/throwing darts bandolier),挂载头逐字如下:
```
=== GPT-Image-2 Prompt - 万物生第1集 沙猎喽啰B · 沙艇驾驶手 默认形态四视图人设图 v1 ===
【格式继承】 完全同头领/女副手/喽啰A格式： 9:16竖版+4格不等大+正脸特写/侧脸特写/脖子以下/背面+single-side rim backlight。
【角色定位】 沙猎部落普通喽啰之一——**沙艇驾驶手 Skimmer**。…… B设为女性（25岁，最年轻）…… working raider+只是性别不同。
（正文 A character design reference sheet … 同 gid120 结构，签名装备替换为 sand goggles PUSHED UP ON FOREHEAD / high ponytail / throwing-dart bandolier，Title "SAND HUNTER COMMON RAIDER B · SKIMMER"）
```

**差异化对照表收尾 — gid123(道具-006 · 弓箭手)末尾逐字**(本图型的一致性 check 范本):
```
【3个喽啰差异化总览（一致性check）】
| 维度 | A钩索手 | B沙艇驾驶手 | C弓箭手 |
|---|---|---|---|
| 性别 | 男 | 女 | 男 |
| 年龄 | 28-32 | 23-26 | 33-37 |
| 体型 | stocky chunky | lean athletic | lean tall |
| 头发 | 短cropped | 高马尾长 | 长辫至mid-back |
| 胡子 | short stubble | 无 | 长groomed beard |
| 服装 | sleeveless vest | cropped vest | long-sleeved tunic |
| Signature equipment 1 | 右前臂lasso winch（叠加） | 风沙护目镜（额头上） | 左前臂vambrace瞄准器 |
| Signature equipment 2 | 背挂hook launcher | 通讯哨子+throwing darts bandolier | 右手指尖metal claw-caps |
| 主武器 | lasso/grappling hook | throwing darts + javelin | long composite bow |
| 副武器 | 单短刀 | 短矛+短刀 | 短刀 |
| 战利品挂饰量 | 2-3 sparse utilitarian | 3-4 sparse + small bead | sparse but refined chosen |
| 角色气质 | working laborer | alert pilot | calm patient veteran |
```

**轻型中文版 — gid149(角色-006)/ gid159(角色-001)逐字**:
```
gid149（角色-006 / Neo Image 2 / 16:9 / 4K）:
出2x2四视图。每个格子比例都是16:9.

gid159（角色-001 / Neo Image 2 official / 9:16 / 1K）:
2x2四宫格，上面两个格子比较小，下面两个格子比较大，左上角正脸特写，右上角侧脸特写，左下角脖子以下全身不包括头，右下角背面全身，背景是写实摄影棚定妆照的感觉，单侧侧逆光
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid120**(道具-003 · 全文来源 · 吻合度高):格式继承模板生效(9:16 不等大四宫格 / 单侧侧逆光 / 灰底 / panel labels);ETHNICITY 纠正成功(中亚突厥糙汉非欧美/韩剧脸);体型/古铜肤/络腮须/缠布/皮甲纹身/前臂叠加机械/战利品稀疏均体现 ✓。✗ 左下 `BODY FRONT (NO FACE)` 仍露部分头脸,`zero face involvement` 未 100% 干净;背挂钩索发射器 signature 辨识度偏弱。
- **gid122**(道具-005 · 高):中文格式继承一句话挂载模板有效复用;护目镜 PUSHED UP 在额头露眼 / 高马尾 / 女性 working raider 定位均体现,与 A/C 差异化 ✓。❌(无)。
- **gid123**(道具-006 · 高 · 差异化对照表范本):lean tall 高瘦 / 长辫+长须(与 A 短发短 stubble、B 女高马尾区分)/ 左前臂 vambrace 瞄准器 + 背挂长弓 signature / 纯灰背景 rim 光四视图都见效;NOT fantasy elf archer 防跑偏未翻车 ✓。❌(无)。
- **gid149**(角色-006 · 高):2×2 四联生成,每格保持横向宽幅近 16:9,**比例锁定生效** ✓。📌 重要纠正:出图主体是机械法器/装置道具四视图(非角色多视图),该四视图随后成为 gid150 的参考图来源。

**变体技巧(同模板衍生)**
- **格式继承**:gid122/123 用一句中文 `【格式继承】完全同头领/女副手/喽啰A格式` 挂载整套模板,正文只换签名装备与体型谱,免重写。
- **差异化对照表**:gid123 收尾 10 维总览表,把"同部落群像不撞脸"变成可逐项对账的 check 表。

**反例 / 翻车点**
- **gid159**(角色-001 · 吻合度中 · 反例):2×2 版式成立、正/侧/全身视角分工基本到位、摄影棚暗底单侧侧逆光勾边生效 ✓;但 ❌**"上小下大"尺寸差几乎看不出**(四格近等大)、❌**"左下脖子以下不含头"未执行**(全身仍带头盔)——**轻型中文版逐格细颗粒指派还原率偏低**,尺寸权重与裁脸这类细指令易被吞。出图对象是机械重甲武士(非素颜演员)。

### 校对清单(出图后逐项对账)
- [ ] **四格内容对不对**?(正脸 / 侧脸 / 全身无脸 / 背面含后脑勺,逐格核)
- [ ] **每格比例 / 整体画幅锁住了吗**?(轻型版易翻:被压成正方格;`上小下大` 尺寸差读不出 → gid159 教训)
- [ ] **左下"全身无脸"格,脸是否真的裁出框**?(`zero face involvement` 未 100% 干净是 gid120 实测残留;轻型版常直接不执行)
- [ ] **族群 / 身份对不对、有没有跑欧美/韩剧/anime 脸**?(重型版命门)
- [ ] **签名装备 ×2 都可见、和同系列其他角色差异化了吗**?(对照差异化总览表逐维核)
- [ ] **单侧侧逆光 + 纯灰底 + 四格标签 + 标题**到位?

### 坑 & 调参
- **★ 上游第1步:真人脸角色用「半身锁脸」当 ref 再转四宫格**:四宫格的脸一致性高度依赖喂进去的 Image 1;真人/写实脸角色**别拿全身图当上游 ref**(脸占比小、四格易漂),先出一张半身像(腰以上 2:3、最好带背景)把脸焊死,再拿它转四宫格——脸继承半身、四宫格只补全身正/背/侧。详见 `pipeline.md` 阶段2 第1步。
- **轻型版必须显式锁每格宽高比**:只写"出四视图"会被压成正方格;`每个格子比例都是16:9` / `上小下大` 这类话术是必填项,但**尺寸权重与裁脸指令在轻型版还原率偏低**(gid159 反例),要紧的角色用重型英文版做。
- **格式继承省 token**:同系列第 2 个角色起,用 `【格式继承】完全同X格式` 一句挂模板,正文只写差异;但**整套版式/光照/族群锚定的英文正文仍建议保留**(gid122/123 正文实际是完整重写而非纯引用),纯一句话挂载在弱模型上可能丢约束。
- **族群锚定要正向+负向双写**:`MUST be Central Asian Turkic/Sogdian` + 一长串 `NOT Caucasian / NOT K-pop / NOT anime`,缺一面就漂。
- **多角色防撞脸靠对照表**:把性别/年龄/体型/发/胡/装备/武器/战利品/气质做成表,生成前当指令、生成后当 check,是本图型不撞脸的标准工序。

---

## 图型 18 · 载具设计图(vehicle design sheet · 2×2 四视图) ✅

### 何时用
要给一件**载具**出工业级正交设计 sheet(SIDE / FRONT / TOP / 3/4 四视图),供美术/建模/道具组当蓝图。它是 vehicle design reference sheet——**结构、尺度、机制正确优先于美感**。本图型的独门武器是 gid87 附带的**"失败模式→补救句"迭代纠偏 SOP**:把最高风险点(单人载具尺度,极易跑成多人战舰)前置标注,出图后照清单逐项核验追加。

### 命门(这种图独有的成败关键)
1. **2×2 均等四格 + 每格点名视角与朝向**:`Top-left SIDE VIEW(primary broadside)/ Top-right FRONT / Bottom-left TOP-DOWN / Bottom-right 3/4 PERSPECTIVE(hero shot)`,每格写清主体朝向(prow 朝右等)与取景。
2. **尺度是最大风险,用绝对数值 + 跨物种类比 + 海量 NOT 三重压**:`approximately 2.5 meters long, 0.8m wide, 0.6m tall ... land-windsurfer board crossed with a small dugout canoe crossed with a sand sled ... NOT a Viking longship, NOT a Mad Max truck, single-pilot scale only`。
3. **结构借真实参考物,材质/世界观 DNA 自定义**:功能逻辑借现代陆地帆板/独木舟/沙橇,但材质统一锁到部族青铜 patina `#7A6845 / #846035` + 三角 lateen 帆 + 船首小图腾,与角色/兽同 DNA。
4. **附"失败模式→补救句"映射表**:主 prompt 后挂一张表,每种典型跑偏(多人战舰/纯轮车/水船/现代 windsurfer/steampunk/大兽颅图腾/精良战舰)各配一句可直接追加的强约束语 —— 这是本图型把"靠运气"变"靠 SOP"的核心。

### 专门骨架(填空)
```
模式:文生图(载具设计 sheet)
size 16:9 横版 / 最高分辨率 / Neo Image 2

A vehicle design reference sheet. **Horizontal 16:9. Maximum resolution output.**
Pure solid neutral light-warm-grey studio backdrop. Single-sided side-rim backlight camera-right 45°
behind subject, no fill / no front light. Same studio environment as the <同系列角色 sheet>.
【Layout】2x2 equal grid: Top-left SIDE(primary broadside) / Top-right FRONT / Bottom-left TOP-DOWN /
Bottom-right 3/4 PERSPECTIVE(hero shot). Thin grey dividing lines, vehicle centered each panel.
【Subject — same vehicle across all 4 panels】<载具一句定位 + 战术逻辑>.
**Overall form (CRITICAL silhouette and scale)**:<绝对尺寸数值> + <跨物种剪影类比 A crossed with B crossed with C>.
<船体/底盘机制/动力/帆或推进/图腾/操作位/战利品 逐块>. <材质 hex 锁部族 DNA>.
【4 Panels detail】逐格写朝向 + 该格要看清的结构(3/4 格放 hero shot,帆/翼展开)
【Critical consistency】SAME individual vehicle — identical 尺寸/图腾/机制/装饰/底盘配置.
【Lighting / Style / Quality / Panel Labels(SIDE/FRONT/TOP/3-4 VIEW)+ Title】
【Constraints】**Scale & crew**:NOT multi-crew / NOT longship-sized(must single-pilot)/…
            **Form factor**:NOT 水船 / NOT 纯轮车 / …  **Aesthetic**:NOT steampunk / NOT chrome / …

【出图后 SOP — 失败模式→补救句映射表(按风险优先级)】
- 跑成多人战舰(MAX)→ "STRICTLY single-pilot vessel, 2.5m long, NOT multi-crew, NOT longship-sized"
- 跑成纯轮车 → "PRIMARY motion via single central runner/skid, wheels are only auxiliary stabilizers"
- 跑成水船 → "DESERT SAND vehicle riding on top of sand via runner, NOT a water boat"
- …(逐风险一句)
```

### 完整真实 prompt 全文(gid87 逐字 · 道具-010 · 含 SOP)
```
=== GPT-Image-2 Prompt - 万物生第1集 沙猎部落单人沙艇 载具设计图 v1 ===
【格式】 - 16:9横版+最高分辨率 - 4格均等2x2 = SIDE + FRONT + TOP + 3/4 VIEW - 同样的studio backdrop+single-side rim backlight环境（继承沙猎部落photoshoot DNA）
【沙艇定位】 **单人载具**——每个普通沙匪开自己的一艘，多艘从不同方向围猎+各自钩索拉拽="像捕鲸船一样把江流飞船拽停"的战术逻辑。一人独立完成驾驶+发射钩索+战斗。
【关键设计决策】 - **体积小**：约2.5米长（不是Viking longship+不是多人战舰） - **视觉参考**：现代陆地帆板（land windsurfer）+ sand sled + 古代独木沙舟 - **单人操作位**：站立或半坐半站 - **混合动力**：小帆（主）+ 简化青铜机改驱动器（辅） - **滑行机制**：沙橇底+辅助小轮 - **部族DNA**：war-torn salvage青铜机改+和合体外骨骼+人物装备同DNA
---
【prompt】
A vehicle design reference sheet. **Horizontal 16:9 aspect ratio. Maximum resolution output.** Pure solid neutral light-warm-grey studio backdrop. Single-sided side-rim backlighting from camera-right at 45 degrees behind the subject, no fill light, no front light, no other light sources—dramatic cinematic studio lookbook lighting. Same studio environment as the Sand Hunter character sheets—reads as part of the same photoshoot session. 【Layout】 **2x2 equal grid**: - Top-left: SIDE VIEW (full broadside profile, the primary view of the vehicle) - Top-right: FRONT VIEW (head-on, showing prow and frontal silhouette) - Bottom-left: TOP-DOWN VIEW (god's-eye view from directly above showing footprint and rigger layout) - Bottom-right: 3/4 PERSPECTIVE VIEW (three-quarter angle showing depth and dimensionality, hero shot) Thin neutral light-grey dividing lines between all four panels. Vehicle centered in each panel with even space margin. 【Subject — same vehicle across all 4 panels】 A Sand Hunter tribe **single-pilot sand skiff**—a small fast desert hunting vessel designed for one raider to operate alone. Pack hunting tactic: multiple skiffs (5-8 of these) swarm a target from different directions, each pilot launching grappling hooks to anchor the prey from multiple angles like harpoon-boats around a whale. **Overall form (CRITICAL silhouette and scale)**: A compact single-person desert vessel approximately **2.5 meters long, 0.8 meters wide, 0.6 meters tall** (not counting mast and sail). Think the silhouette of a **land-windsurfer board crossed with a small dugout canoe crossed with a sand sled**—a slender pointed hull with a single standing/half-seated position for one pilot. The hull tapers to a sharp prow and a slightly upswept stern. NOT a large multi-crew ship. NOT a Viking longship. NOT a Mad Max truck. Single-pilot scale only. **Hull construction**: Primary hull made of **weathered dark hardwood** carved/hewn into a single dugout-canoe-style shape (one solid piece with shaped interior cavity), reinforced with **bronze rivets and leather lashings** at stress points. War-torn salvage hand-crafted tribal carpentry, NOT factory-precision, NOT clean modern. Patches of mismatched repair wood show old battle damage. Tribal geometric patterns burned into the upper hull edges with branding-iron-style markings (matching the same runic-glyph aesthetic as the rest of the Sand Hunter tribe's bronze equipment). **Bottom — sand-sled mechanism**: The hull rides on **a single central long bronze-shod sand runner/skid** running the full length underneath (think: one large central ski-blade). The bronze runner shows heavy wear, sand-pitting, slight verdigris patina. Flanking the central skid, **2 small outrigger bronze-spoked auxiliary wheels** mounted on simple suspension struts on each side help with directional stability and tight turns. **Salvaged ancient lost-tech drive — small bronze mechanism mid-hull**: Mounted in a small recessed compartment in the rear-third of the hull is a **compact salvaged ancient bronze mechanical drive unit**—looted lost-tech, retrofitted with leather strapping and crude iron bolts. Smaller and simpler than a multi-crew ship's drive: just a single bronze gear-cluster with exposed clockwork, slight verdigris patina (Mecha Crimson Bronze #7A6845 + Aged Gold #846035—same DNA as Sand Hunter combat exoskeletons and prosthetics). Provides auxiliary thrust when wind fails. **Mast and sail**: A **single short slender mast** rising about 2.5 meters above the deck, hand-hewn wood, dark weathered. **Small triangular lateen-style sail** of weathered tan-and-rust desert canvas, hand-stitched, with tribal geometric patterns dyed in dried-blood-red across the sail face. Smaller and more agile than a longship's square sail—designed for single-pilot rigging and quick maneuvering. Rigging of weathered hemp ropes, small bronze pulleys, leather reinforcement. In the SIDE VIEW the sail is partially furled showing structure; in the 3/4 VIEW the sail is fully unfurled in a dramatic billow. **Prow decoration — small tribal totem**: At the upswept prow, a **small tribal totem affixed to the prow tip**: a single curved animal horn (suggestive of a small ram or sand-creature) bound with leather cords, plus 1-2 small bone fragments hanging beneath. NOT a large beast-skull figurehead (that's reserved for chieftain's flagship). Small-scale tribal marking appropriate for a common raider's solo skiff. **Pilot position (single-person operation)**: Located in the **forward-middle of the deck**: a **single standing/half-seated pilot position** with: - A small wooden tiller/steering arm reaching back to the rear (foot-operated or hand-operated) - A leather-padded standing rest or knee-rest (the pilot stands semi-braced against this during fast runs, can lean back into it) - A vertical handhold post or small wooden grip attached to the deck for the off-hand - **A bronze mounting plate just forward of the pilot position** where a portable hook launcher locks in (the pilot can fire the launcher one-handed while steering with the other hand and feet) - Leather grip straps along the gunwales to keep the pilot braced during high-speed turns and combat impacts - A small belt-pouch mount near the pilot's hip for spare grappling hooks/ammo **Trophy decorations on hull**: SPARSE — only 2-3 small bone fragments and one small fragment of defeated enemy equipment (broken belt buckle or weapon shard) tied with leather cords to the stern or upper hull strake. Markedly less than a chieftain's flagship would carry. This is a working raider's solo vessel, not a trophy display. 【Color Palette】 Hull: deep weathered umber wood with sun-bleached lighter patches. Bronze fittings/runners/drive: Mecha Crimson Bronze #7A6845 + Aged Gold #846035 with verdigris patina. Sail and rigging: weathered tan canvas + dried-blood-red tribal markings. Horn totem: aged ivory-yellow bone. Leather lashings: deep umber. Overall palette: muted desert tones, NOT colorful, NOT saturated. 【4 Panels detail】 **Top-left panel — SIDE VIEW**: Pure broadside profile view. Vehicle facing camera-right (prow to the right). Full length visible from horn-totem prow to stern tiller. Single central bronze runner visible underneath the hull with the small outrigger wheels flanking. Mast vertical with sail partially furled showing sail material and rigging. Side hull tribal carvings, sparse trophy decorations, pilot position with mounting plate all visible. Side-rim backlight catches the upper hull edge and mast/sail. **Top-right panel — FRONT VIEW**: Vehicle prow facing camera directly. Small horn totem at top center of frame. Hull tapers visibly to the prow point. Single central bronze runner visible underneath with the two outrigger wheels visible flanking on each side. Mast and partial sail visible rising from behind the prow. **Bottom-left panel — TOP-DOWN VIEW**: God's-eye view from directly overhead looking down at the deck. Shows the slender single-person footprint: mast and sail rigging amidships, single pilot standing position with tiller behind, bronze mounting plate forward of pilot, small drive unit recessed at rear-third. The narrow elongated single-person form factor is clearly readable from above. **Bottom-right panel — 3/4 PERSPECTIVE VIEW**: Three-quarter angle showing depth, approximately 30-45 degrees from front-side, slightly elevated viewpoint. Both side profile and prow visible. Sail FULLY UNFURLED in this view—dramatic billow showing the small triangular lateen sail size and tribal markings. Single central bronze runner catches the rim light underneath. The "hero shot" of the four views. 【Critical consistency】 SAME individual vehicle in all 4 panels—identical hull dimensions and proportions, identical horn totem at prow, identical sail size and markings, identical drive unit position, identical sparse trophy decoration arrangement, identical bronze runner and outrigger wheel configuration, identical pilot position layout. Same studio backdrop, same single-sided side-rim backlighting setup across all 4 panels. 【Lighting - critical】 **Single-sided side-rim backlighting from camera-right at 45-degrees behind subject. NO fill light. NO front light. NO ambient. NO other light sources.** Strong dramatic edge-light catches the right side of the vehicle silhouette, leaving the left side in deep falloff shadow with subtle ambient bounce. (For TOP-DOWN VIEW the rim-light still comes from "camera right" within that panel's compass.) 【Style】 Hyperrealistic photographic vehicle design rendering—shot like a high-end practical prop vehicle photographed in studio for a film production design board. NOT illustration, NOT obvious 3D CGI render. **Reference aesthetics for single-pilot desert craft**: - **Modern land windsurfer / sand sailing board** — for the single-pilot wind-driven desert craft functional logic and slender silhouette - **Indigenous dugout canoe construction** — for the hand-hewn single-piece wooden hull aesthetic - **Mad Max Fury Road war boys minor vehicles (the smaller ones, NOT the big rigs)** — for the war-torn salvage scrap-and-bolt construction style and tribal modification aesthetic - **Studio Ghibli Nausicaä of the Valley of the Wind small tribal vehicles** — for hand-crafted weathered organic-mechanical fusion - **Monster Hunter Wilds nomadic desert culture** — tribal weathered-leather and bone-fragment DNA (consistent with the Sand Hunter character sheets and other equipment) Light Kodak Vision3 35mm film grain texture overlay. 【Quality】 Maximum resolution output. 8k ultra clean rendering. Sharp clean edges. Every wood grain on the hull, every bronze rivet, every gear tooth on the drive unit, every leather lashing knot, every tribal carving clearly defined. Real physical practical-prop cinematic photography aesthetic. 【Panel Labels】 Small clean monospace sans-serif black text below each panel: - Top-left: "SIDE" - Top-right: "FRONT" - Bottom-left: "TOP" - Bottom-right: "3/4 VIEW" Title at top center of canvas (small clean black sans-serif): "SAND HUNTER SOLO SKIFF — VEHICLE DESIGN SHEET" 【Constraints】 **Scale and crew**: NOT multi-crew ship, NOT large vessel, NOT longship-sized (must be small single-pilot 2.5 meters long), NOT 2-person, NOT 3-person, NOT crewed (single pilot only). **Form factor**: NOT a water boat (this is a sand-sled with sail, NOT a water vessel), NOT a wheeled cart/buggy (wheels are auxiliary stabilizers, NOT primary motion—runners are primary), NOT a modern desert dune buggy, NOT a motorcycle, NOT a hovercraft, NOT a flying vehicle. **Aesthetic anchoring**: NOT precision cybernetic, NOT clean modern engineering (war-torn salvage tribal handcraft only), NOT steampunk Victorian aesthetic (this is ancient lost-tech NOT industrial-revolution), NOT shiny new chrome metal (weathered patina only), NOT colorful paint job (muted desert tones only), NOT cyberpunk neon, NOT obvious CGI 3D render, NOT cartoon, NOT anime, NOT fantasy elf-craft elegance. **Decoration restraint**: NOT large beast-skull figurehead (that's chieftain's flagship—use small horn totem only), NOT heavy quantity of trophy decorations (sparse 2-3 only), NOT ornate carvings or jewelry (tribal geometric burns only). **Layout**: NOT 1:1 square aspect (must be horizontal 16:9), NOT 9:16 vertical, NOT colorful background (solid neutral light-warm-grey only), NOT soft even neutral lighting (must be single-side rim backlight only), NOT front light, NOT fill light, NOT any text other than the four panel labels and the title.
=== END ===
【实操注意】 跑歪兜底加强:
- 跑成多人战舰（最大风险）→ "STRICTLY single-pilot vessel, 2.5 meters long, slender single-person craft, NOT a multi-crew ship, NOT longship-sized"
- 跑成纯轮式车 → "PRIMARY motion is via single central bronze runner/skid underneath, wheels are only small auxiliary stabilizers, NOT a wheeled vehicle"
- 跑成water boat → "DESERT SAND vehicle riding on top of sand via runner, NOT a water boat, NOT for water use"
- 跑成现代land windsurfer → "ancient tribal hand-crafted hardwood hull with bronze fittings, NOT modern fiberglass board, NOT modern sport equipment"
- 跑成steampunk → "ancient lost-tech bronze mechanical drive, NOT Victorian industrial steampunk, NOT brass-plumbing aesthetic"
- 跑成大beast-skull figurehead → "small horn totem on prow only, NOT large skull figurehead, decorative restraint appropriate for common raider's solo vessel"
- 跑成精良战舰 → "war-torn salvage tribal handcraft with mismatched repairs, hand-hewn dugout-canoe style hull, NOT factory-precision boat-building"
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid87**(道具-010 · 全文来源 · 吻合度高):**最高风险(单人尺度)成功规避**——细长单人小艇非战舰;2×2 灰底单侧 rim 背光物料风成立;三角 lateen 帆 + 船首图腾 + 中央沙橇 + 辅助轮 + 部族纹 + 青铜 patina 均落地;SOP 无需启用即达标 ✓。
- ✗ **船体偏木船/独木舟**(材质参考没在"沙橇"上压够权重);**沙橇 runner 主导性偏弱、辅助轮反而抢眼**(主滑行机制读成轮式倾向);**TOP 视图辨识一般**。

**变体技巧**
- **"失败模式→补救句"映射表**:把最高风险点前置标注,出图后照表逐项核验追加 —— 本图型独有的迭代纠偏 SOP,可直接搬给其他载具/兽设定图。

**反复翻车点(本图型教训)**
- **尺度是头号风险**:载具极易被画成多人战舰/big rig,绝对尺寸 + 跨物种类比 + 海量 NOT 三重压都未必一次压住,要靠 SOP 追加句。
- **主推进机制易跑偏**:"runner 是主、轮是辅"这种功能优先级,模型容易反过来 → 必须显式写 `runners are primary motion, wheels are stabilizer auxiliary`。

### 校对清单(出图后逐项对账)
- [ ] **尺度对不对**?(头号风险:跑成多人战舰/longship/big rig → 立刻追加 single-pilot 补救句)
- [ ] **主推进机制对不对**?(是 central runner/skid 主 + 轮子辅,不是纯轮车 → 易翻)
- [ ] **不是水船**?(沙橇滑沙,非 water boat)
- [ ] **材质 / 世界观 DNA 一致**?(部族青铜 patina #7A6845/#846035,非现代 fiberglass / 非 steampunk / 非 chrome)
- [ ] **装饰克制**?(船首小 horn totem 非大兽颅、战利品 sparse 2-3)
- [ ] **2×2 四格 + 朝向 + 标签 + 标题**到位,3/4 格是不是 hero shot(帆展开)?

### 坑 & 调参
- **先标最高风险点,再写 SOP**:载具图的标准产能方式不是"写完跑一次",而是"主 prompt + 失败模式→补救句映射表",出图后照表核验逐项追加。
- **功能优先级要显式写死**:凡是"A 是主、B 是辅"的机制(runner vs wheel、帆 vs 驱动器),模型默认会平权甚至反置,必须 `PRIMARY ... auxiliary only`。
- **材质 DNA 跨资产复用**:`#7A6845 + #846035 + verdigris patina + 部族 runic glyph` 是全宇宙机械造物的统一钩子,载具/兽/武器/角色装备共用,直接保证世界观一致。
- **TOP-DOWN 格鸡肋常见**:俯视格辨识度普遍偏弱,可在该格专门强调 footprint 与单人窄长 form factor。

---

## 图型 19 · 机械兽形态设计图(creature war-mount design sheet · 2×2 四视图) ✅

### 何时用
要给一只**机械生物/战兽**出独立形态(standalone / dormant)的 2×2 四视图设定图,供建模与后续"合体外骨骼形态"做参考。它是 creature design reference sheet——本质同图型 18 的载具 sheet 共用版式与光照,但主体是**有明确生物原型的机械兽**(机械赛加羚羊 gid88、机械奔跑鸟 gid89)。**最大特点也是最大坑**:每只兽都有一个**唯一识别特征(标 MAX 风险)**,模型极易把它跑成普通近亲物种 → 这是本图型的高翻车区。

### 命门(这种图独有的成败关键)
1. **唯一识别特征标 MAX + "缺了即设计失败"判据**:把那个最难、最易丢的物种灵魂特征点名为 `mandatory recognition feature, if missing the design fails`(赛加=bulbous proboscis 下垂长鼻;奔跑鸟=lean predatory sprinter silhouette + spear beak with terminal hook)。这是把"主观像不像"变成"客观成/败"的判据。
2. **失败模式 → 补救句映射表(按风险优先级排序)**:同图型 18 的 SOP,但更刚性——MAX 风险特征跑歪时,判据直接是"整图失败重做"。逐风险一句追加语(鼻跑歪/角跑弯/体型跑马/生物机改/看不到 cockpit)。
3. **"纯机械、无生物组织"必须反复压**:`fully mechanical construction with no organic components ... bronze panel armor "fur"/"feathers" NOT real fur/feathers`——极易跑成"毛皮+装甲"的生物机改,要把每处表面都点名为 bronze panel。
4. **背部 cockpit hatch = 世界观钩子,必须在 TOP/3-4 panel 可见**:这是合体外骨骼系统的接口,本张兽形态 hatch CLOSED(dormant),但必须画出。
5. **青铜 patina + cyan 眼 #4FC3D9 同源 DNA**:与角色/载具/小宠物共用,锁世界观一致。

### 专门骨架(填空)
```
模式:文生图(creature design sheet · 兽独立形态 / hatch CLOSED)
size 16:9 横版 / 最高分辨率 / Neo Image 2

A creature design reference sheet. **Horizontal 16:9. Maximum resolution output.**
Pure solid neutral light-warm-grey backdrop. Single-side rim backlight camera-right 45° behind, no fill/front.
Same studio environment as the <同系列角色/载具/兽 sheet>.
【Layout】2x2 equal grid: Top-left SIDE(primary) / Top-right FRONT(把唯一特征怼脸) / Bottom-left TOP-DOWN(看 cockpit) / Bottom-right 3/4(hero, 动态半步).
【Subject — same creature across all 4 panels】<机械兽一句 + 生物原型>.
**SPECIES IDENTIFICATION (CRITICAL)**:<原型物种 + 解剖学特征逐条>.
  —— <唯一识别特征>:the most critical recognition marker — if missing, **the design fails**.
**Construction (CRITICAL)**: Fully mechanical, no biological tissue. bronze armature + bronze panel "fur/feathers"(NOT real). <hex DNA #7A6845/#846035 + verdigris + runic glyph>.
**Eyes**: glowing cyan #4FC3D9(同源科技钩子).
**Cockpit/合体接口**: dorsal hatch human-torso-sized, CLOSED(dormant), MUST be visible in TOP & 3/4.
【4 Panels detail / Critical consistency / Lighting / Style(参考真实物种 wildlife photo)/ Quality / Labels SIDE/FRONT/TOP/3-4 + Title】
【Constraints】**Species accuracy(MOST CRITICAL)**:MUST be <物种>, <唯一特征> mandatory. NOT <近亲物种一串>.
            **Mechanical purity**:NO biological tissue. **Cockpit hatch presence**. **Layout/lighting NOT…**

【出图后 SOP — 失败模式→补救句(按风险优先级,MAX 在前)】
- <唯一特征>跑成普通近亲(MAX)→ 整图失败重做 + "<特征> is mandatory, MUST be visibly <描述>, NOT a normal <近亲>"
- <次特征>跑歪 → "…"  / 跑成生物机改 → "all bronze panels, NO biological tissue"
- 看不到 cockpit → "dorsal hatch clearly visible in TOP-DOWN and 3/4"
```

### 完整真实 prompt 全文(gid88 / gid89 逐字 · 道具-011 / 012)

**gid88 · 机械赛加羚羊(道具-011)** —— 唯一识别特征 = bulbous proboscis 长鼻(MAX):
```
=== GPT-Image-2 Prompt - 万物生第1集 沙猎部落 机械赛加羚羊 兽形态设计图 v1 ===
【格式】 - 16:9横版+最高分辨率 - 4格均等2x2 = SIDE + FRONT + TOP + 3/4 VIEW - 同studio backdrop+single-side rim backlight环境（继承沙猎部落photoshoot DNA）
【兽设定】 精英沙匪搭档——**机械赛加羚羊（Mechanical Saiga）**——独立形态。本张是兽自身的兽形态人设，合体外骨骼形态后续做。 - **种属**：纯机械（古代失落科技遗物+无生物组织+半智能AI） - **战术**：群体冲撞+蹄踏+gallop颠簸 - **signature视觉记忆点**：奇特bulbous长鼻（机械化）+螺旋竖角 - **体型**：肩高1.2米+体长1.5米（真实赛加放大约1.5倍——保留比例不变成马） - **DNA**：和合体外骨骼+人物机改+沙艇全部同青铜patina
---
【prompt】
A creature design reference sheet. **Horizontal 16:9 aspect ratio. Maximum resolution output.** Pure solid neutral light-warm-grey studio backdrop. Single-sided side-rim backlighting from camera-right at 45 degrees behind the subject, no fill light, no front light, no other light sources—dramatic cinematic studio lookbook lighting. Same studio environment as the Sand Hunter character sheets and sand-skiff design sheet—reads as part of the same photoshoot session. 【Layout】 **2x2 equal grid**: - Top-left: SIDE VIEW (full broadside profile, the primary view) - Top-right: FRONT VIEW (head-on, showing facial features prominently—the bulbous nose and horns) - Bottom-left: TOP-DOWN VIEW (god's-eye view from directly above showing footprint and dorsal mechanical layout) - Bottom-right: 3/4 PERSPECTIVE VIEW (three-quarter angle showing depth and dimensionality, hero shot) Thin neutral light-grey dividing lines between all four panels. Creature centered in each panel with even space margin. 【Subject — same creature across all 4 panels】 A **mechanical Saiga antelope**—an ancient lost-technology mechanical war-beast, modeled after the Central Asian Saiga antelope species, retrofitted as a war-mount for the Sand Hunter tribe's elite raiders. NOT a biological creature, NOT a cyborg with biological tissue—**fully mechanical construction with no organic components**, but with semi-sentient AI consciousness reactivated by the tribe (a relic of a long-lost mechanical civilization, now serving new masters). **SPECIES IDENTIFICATION (CRITICAL)**: **Saiga antelope** (Saiga tatarica)—the Central Asian steppe-desert species native to the Sui-Tang frontier territories. Highly specific anatomy: - **Bulbous oversized proboscis-like nose** hanging down past the mouth, soft and drooping in life (in this mechanical version: rendered as a bronze mechanical proboscis with visible air-filtration intake slits and small exhaust ports along its length—the signature feature of the species, the most critical recognition marker—if this nose is missing or replaced with a regular antelope muzzle, the design fails) - **Vertical spiraled horns** on males—straight-up-pointing horns with translucent ringed spirals (in this mechanical version: rendered as bronze mechanical horns with the original spiraled ringed structure, sharpened at the tips for combat use) - **Compact stocky body** with relatively short legs (NOT long-legged like a deer or gazelle, NOT slim like a normal antelope—the Saiga is built like a muscular sheep-antelope hybrid) - NOT a regular antelope, NOT a deer, NOT a gazelle, NOT a goat, NOT a sheep—the Saiga has a unique unmistakable silhouette dominated by the bulbous nose **Scale**: Approximately 1.2 meters at the shoulder, 1.5 meters body length nose-to-tail. Slightly larger than a real Saiga (about 1.5x scale) for war-mount viability, but maintaining authentic Saiga body proportions—NOT scaled up to horse-size (must read as Saiga, not horse-shaped antelope). **Construction (CRITICAL)**: **Fully mechanical, no biological tissue.** The body is constructed of: - **Bronze mechanical bone-and-muscle armature**: visible mechanical "skeleton" of bronze rods, joints, gears, hydraulic-style pistons (clockwork-driven not steam) where the biological skeleton would be—giving the creature its anatomical proportions - **Bronze panel armor "fur"**: the surface is covered in overlapping bronze panel-plates that approximate the silhouette of fur—not actual fur, NOT biological skin—segmented bronze panels with weathered patina, joint-line gaps showing mechanical movement underneath - **Mecha Crimson Bronze #7A6845 + Aged Gold #846035 patina** with verdigris in seam recesses—exactly matching the Sand Hunter tribe's combat exoskeletons, prosthetics, sphere-companion, and skiff drive units (consistent universe DNA) - **Tribal geometric runic glyphs** etched into the larger bronze panels (matching the Qingtong Sphere and tribe equipment glyph aesthetic—abstract pre-civilization mechanical-runic geometry, NOT Chinese decorative motifs, NOT real-culture runes) **Bulbous mechanical nose (CRITICAL signature feature)**: A large pendulous bronze proboscis hanging down past the mouth line, approximately 25cm long, reproducing the iconic Saiga nose silhouette in mechanical form: - Made of segmented bronze rings tapering toward the tip - Visible **slatted air-intake vents** along the upper surface (the Saiga's biological function was filtering desert dust—the mechanical version retains this purpose with mechanical filters) - Small **exhaust ports** at the rear sides emitting faint visible heat-shimmer or steam-trace - Slight downward droop matching biological Saiga posture - Verdigris patina in deep recesses **Horns**: A pair of vertical spiraled mechanical horns mounted on the head, approximately 30cm long, pointing nearly straight up with slight forward angle. Each horn is bronze with the characteristic Saiga ringed-spiral pattern preserved (the ridged twist visible). Sharpened metal tips for combat use. Slight battle-wear visible on the spiral edges. **Eyes**: Small round mechanical eyes with **glowing cyan inner light #4FC3D9** (matching the Qingtong Sphere companion's eye glow—a deliberate visual hint at shared ancient lost-technology origin across all the universe's mechanical creatures). Bronze rim around each eye with thin glass-like lens cover. Eyes appear alert, semi-sentient, watching. **Legs and hooves**: Four mechanical legs with stocky proportions matching biological Saiga (relatively short legs for the body—NOT long-legged like a horse or deer). Each leg has visible bronze joint pivots at hip, knee, and ankle. **Cloven mechanical hooves** at the feet—two-toed bronze hoof shoes designed to grip sand. Visible wear and sand-pitting on the hoof surfaces. Lower legs show fine mechanical detail of the gallop-driving pistons. **Tail**: Short stubby mechanical tail (about 10cm)—matching biological Saiga's small tail. Bronze segmented construction. **Cockpit/合体接口 (CRITICAL — visible in TOP and 3/4 panels)**: On the **dorsal surface (back)** between the shoulder blades, a clearly visible **mechanical cockpit hatch / pilot integration interface**—a roughly human-torso-sized rectangular-oval seam with bronze locking clasps around its perimeter, visible hinges along one edge, and small step-rungs on the side flank for mounting access. This is where the elite raider partner climbs in and integrates with the war-beast. The hatch is currently CLOSED in this character sheet (showing the design but in dormant/standalone configuration). Below the hatch line, faintly visible internal mechanical structure suggests the harness/cradle inside. **Tribal trophy decorations and partner-binding tokens**: Moderate quantity of trophy decorations affixed to the war-beast: - Leather-strap harness around the neck/chest with woven beads, polished bone fragments - A small leather pouch tied to the saddle-area near the cockpit hatch (containing the partner-raider's personal token—a small carved bone amulet visible peeking out) - 3-5 small trophies (defeated enemies' equipment fragments) tied to flanks via leather cords - Tribal pattern dyed-cloth banding around the lower legs and around the base of the horns - Mecha Crimson Bronze + Aged Gold + dried-blood-red color accents **Weathering**: War-torn weathered—heavy verdigris patina in deep recesses, sand-pitting on bronze surfaces, small dents from past combat, mismatched repair patches in slightly different bronze tones (the tribe has maintained this ancient relic for many generations using whatever bronze they could find). NOT clean, NOT polished, NOT factory-new. 【4 Panels detail】 **Top-left panel — SIDE VIEW**: Pure broadside profile view. Beast facing camera-right (head to the right). Full body visible nose-tail. The bulbous mechanical proboscis prominently visible drooping down from the head. Vertical spiraled horns visible. Stocky leg proportions visible. Cockpit hatch on the back visible from this angle. Dorsal trophy decorations visible. Side-rim backlight catches the upper back, horn tops, and rear flank. **Top-right panel — FRONT VIEW**: Beast head facing camera directly. **The bulbous mechanical proboscis nose is the dominant feature in this panel**—centered, drooping, with air-intake vents and exhaust ports visible. Horns visible rising vertically with slight forward angle. Cyan eyes glowing on either side. Front legs visible flanking the chest, cloven hooves on the ground. **Bottom-left panel — TOP-DOWN VIEW**: God's-eye view from directly overhead looking down at the beast. Shows the full footprint and dorsal mechanical layout. **The cockpit hatch on the back between the shoulder blades is most clearly visible in this view**—the rectangular-oval seam with locking clasps. Tribal pattern bronze panels visible in their full layout. Horns visible from above as paired vertical spires. Stocky body proportions clearly readable. **Bottom-right panel — 3/4 PERSPECTIVE VIEW**: Three-quarter angle showing depth, approximately 30-45 degrees from front-side, slightly elevated viewpoint. Side profile + front + slight top all visible. The signature bulbous nose visible at this angle. Dorsal cockpit hatch visible from the elevated angle. Cyan eye glow catches the rim light. The "hero shot" of the four views—dynamic stance with one foreleg slightly raised as if mid-stride. 【Critical consistency】 SAME individual creature in all 4 panels—identical body proportions (stocky Saiga build), identical bulbous proboscis, identical horns, identical cockpit hatch position and design, identical trophy decoration arrangement, identical bronze panel pattern, identical weathering pattern. Same studio backdrop, same single-sided side-rim backlighting setup across all 4 panels. 【Lighting - critical】 **Single-sided side-rim backlighting from camera-right at 45-degrees behind subject. NO fill light. NO front light. NO ambient. NO other light sources.** Strong dramatic edge-light catches the right side of the creature silhouette in every panel, leaving the left side in deep falloff shadow with subtle ambient bounce. Cyan eye glow self-illuminates faintly on bronze panels adjacent to the eyes. 【Style】 Hyperrealistic photographic creature design rendering—shot like a high-end practical animatronic creature photographed in studio for a film production design board. NOT illustration, NOT obvious 3D CGI render. **Reference aesthetics**: - **Real-world Saiga antelope wildlife photography** (for accurate species anatomy—the bulbous nose, vertical spiral horns, stocky proportions are mandatory) - **Studio Ghibli Princess Mononoke spirit-beast aesthetic** (for the ancient mythical-mechanical creature feel) - **Ancient bronze Chinese ceremonial vessels and Han dynasty tomb mechanical figures** (古代青铜机关——for the lost-tech bronze patina and ringed-glyph aesthetic) - **Pacific Rim mecha weathered combat aesthetic** (for the war-torn salvage maintained-by-primitive-hands feel) - **Monster Hunter Wilds / Horizon Zero Dawn mechanical desert beasts** (for the contemporary mechanical-fauna aesthetic reference) Light Kodak Vision3 35mm film grain texture overlay. 【Quality】 Maximum resolution output. 8k ultra clean rendering. Sharp clean edges. Every bronze panel seam, every gear tooth on visible joints, every air-vent slat on the proboscis, every spiral ring on the horns, every leather strap on the trophy decorations clearly defined. Real practical-creature animatronic photography aesthetic. 【Panel Labels】 Small clean monospace sans-serif black text below each panel: - Top-left: "SIDE" - Top-right: "FRONT" - Bottom-left: "TOP" - Bottom-right: "3/4 VIEW" Title at top center of canvas (small clean black sans-serif): "MECHANICAL SAIGA — WAR-MOUNT DESIGN SHEET" 【Constraints】 **Species accuracy (MOST CRITICAL — high failure risk)**: MUST be a Saiga antelope—the bulbous proboscis-like nose is the absolute mandatory recognition feature. NOT a regular antelope, NOT a deer, NOT a gazelle, NOT a goat, NOT a sheep, NOT an ibex, NOT a horse, NOT a cow. Vertical spiraled ringed horns (NOT curved horns, NOT spiral-curved like a kudu, NOT branched like deer antlers). Compact stocky body proportions (NOT long-legged like a horse or deer). **Mechanical purity**: Fully mechanical construction with NO biological tissue—NOT a cyborg, NOT biological-with-armor, NOT fur-and-flesh-with-mechanical-parts. ALL surfaces must be mechanical bronze-and-metal panels and components. NO real fur, NO real skin, NO real muscle, NO real eyes (mechanical eyes with cyan glow only). **Aesthetic anchoring**: NOT precision modern robotics, NOT clean factory-new metal (war-torn weathered patina only), NOT shiny chrome (aged bronze with verdigris only), NOT steampunk Victorian (this is ancient lost-tech NOT industrial-revolution), NOT cyberpunk neon, NOT obvious CGI 3D render, NOT cartoon, NOT anime, NOT fantasy elf-craft elegance, NOT pure militaristic mecha (must retain organic creature silhouette underneath the mechanical surface). **Cockpit hatch presence**: The dorsal cockpit hatch between shoulder blades MUST be visible in TOP-DOWN and 3/4 panels (this is the key story-element of the war-mount system). NOT a fully sealed creature—the partner-integration interface must be readable. **Layout and lighting**: NOT 1:1 square aspect (must be horizontal 16:9), NOT 9:16 vertical, NOT colorful background (solid neutral light-warm-grey only), NOT soft even neutral lighting (must be single-side rim backlight only), NOT front light, NOT fill light, NOT colorful saturated palette (muted desert bronze tones only), NOT any text other than the four panel labels and the title.
=== END ===
【实操注意】跑歪兜底加强（节选）：
- 跑成普通antelope/deer/gazelle → "Saiga tatarica species, distinguished by oversized bulbous proboscis-like nose hanging past mouth (THIS IS MANDATORY), vertical spiral-ringed horns straight up, stocky compact body, NOT a regular antelope/deer/gazelle"
- 跑成生物机改（fur+armor）→ "fully mechanical construction, all bronze panel armor surface in place of fur, NO biological tissue, NO real fur, NO real skin"
- 鼻子跑歪了 → "the bulbous mechanical proboscis is approximately 25cm long, hangs visibly past the mouth line in a soft droop, with slatted air-intake vents along upper surface and small exhaust ports at rear sides"
- 角跑成弯曲 → "vertical straight-up-pointing horns with characteristic spiraled-ringed surface (like the biological Saiga horns), NOT curved horns like kudu or impala, NOT branched antlers like deer"
- 看不到cockpit hatch → "dorsal mechanical cockpit hatch between shoulder blades clearly visible in TOP-DOWN and 3/4 perspective views, rectangular-oval shape with bronze locking clasps and hinges"
```

**gid89 · 机械奔跑鸟(道具-012)** —— 唯一识别特征 = lean predatory sprinter silhouette(MAX,恐鸟×roadrunner×dromaeosaur)+ spear beak with terminal hook;结构同 gid88,差异块逐字:
```
=== GPT-Image-2 Prompt - 万物生第1集 沙猎部落 机械奔跑鸟 兽形态设计图 v1 ===
（格式/光照/Layout/纯机械Construction/cockpit/材质 DNA 段同 gid88 结构，主体替换为：）
**SPECIES IDENTIFICATION (CRITICAL)**: A **hybrid silhouette of a Phorusrhacidae terror-bird crossed with a sprinting roadrunner**—a flightless predatory ground-bird: - From terror-bird: predatory hooked beak, ground-hunting carnivore stance, large powerful neck, scale-skin reptilian leg aesthetics - From roadrunner: lean elongated horizontal body silhouette, long sprint-adapted legs, low-slung horizontal posture, long stabilizing tail - The result is a lean fast predatory ground-bird, NOT a giant ostrich (NOT bulky, NOT plump), NOT a chicken, NOT a vulture, NOT a generic eagle.
**Scale**: ~1.8-2m tall at head when standing alert, 2m total beak-to-tail in horizontal running posture. Lean fast sprinter build.
**Beak (CRITICAL signature feature — predatory weapon)**: long sharp beak ~30-40cm — Primary form: spear-shape tapering to a piercing point; Secondary: subtle hook at the very tip. NOT a flat duckbill, NOT a short chicken beak, NOT a curved fully-hooked vulture beak.
**Eyes**: forward-facing predatory mechanical eyes (raptor-set, NOT side-set), glowing cyan #4FC3D9.
**Wings — vestigial but visible**: NOT capable of flight, NOT removed — vestigial bronze-panel wings ~2/3 functional size, folded in SIDE/FRONT/TOP, one wing partially extended in threat display in 3/4 VIEW.
**Tail (CRITICAL)**: long mechanical horizontal sprint-balance tail ~80cm-1m, 8-12 segmented bronze vertebrae plates, concealed blade-edges underside, held nearly horizontal.
**Cockpit/合体接口**: dorsal hatch between wing roots, CLOSED (dormant), same design language as mechanical Saiga.
Title: "MECHANICAL RUNNER-BIRD — WAR-MOUNT DESIGN SHEET"
【Constraints · Species type accuracy (high failure risk)】NOT a giant ostrich (lean sprinter only), NOT a chicken, NOT an eagle/vulture, NOT a peacock, NOT a generic fantasy bird. MUST read as terror bird × roadrunner × dromaeosaur silhouette.
=== END ===
【实操注意】跑歪兜底加强（节选）：
- 跑成胖鸵鸟 → "lean predatory sprint-bird, NOT bulky NOT plump, hybrid of Phorusrhacidae terror bird and roadrunner sprinter, lean horizontal posture, long sprint-legs"
- 喙跑成普通鸟嘴或纯弯钩 → "long spear-shaped beak 30-40cm with subtle hook only at the very tip, primarily a piercing weapon NOT a tearing weapon"
- 翅膀跑全没了或全flight wings → "vestigial mechanical wings approximately 2/3 functional size, NOT removed entirely, NOT fully functional flight wings, can extend in threat display"
- 尾巴跑短/立起 → "long horizontal mechanical tail 80cm-1m segmented bronze plates, held nearly horizontal in stance for sprint balance, NOT short stub, NOT upright peacock fan"
- 跑成生物羽毛 → "all 'feathers' are bronze metal panel armor in feather-shape arrangements, NOT real biological feathers"
- 跑成鸡或鹰 → "this is a flightless ground predator hybrid, terror bird × roadrunner × dromaeosaur, lean horizontal sprinter silhouette"
（末注：因杂交+机械化+cockpit接口，AI 可能需 2-3 次 iteration 才稳定；优先级修正——先确保 lean sprinter silhouette + 喙形 + 长尾 + 翅膀位置对，其他细节后续微调。）
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**部分成立(工业排版 OK,核心特征翻车)**
- **gid88 · 机械赛加(道具-011 · 吻合度中)**:✓ 纯机械构造兑现(青铜叠片板甲 / 机械骨肌 / 重锈 patina / cyan 眼 / 背部 cockpit 舱盖 / 四格一致 / 灰底 rim 背光),紧凑短腿体型守住。✗ **本片唯一明显特征级翻车**:MAX 风险核心特征 bulbous 下垂长鼻**未出现**(口鼻成分节机械短吻收束偏钝),按 prompt 自身判据 `the design fails`,应触发重跑;"一对竖直螺旋角"也跑歪成一簇尖刺+獠牙。⚠️ 通读时易误把"唯一识别标记"当见效手法,实为翻车信号。

**整体翻车(未收敛)**
- **gid89 · 机械奔跑鸟(道具-012 · 吻合度低 · 反例)**:✓ 设定图工业排版类全见效(2×2 四视图 / 灰底 / 单侧 rim 逆光 / 青铜锈蚀 patina / 同个体一致 / Kodak 颗粒 / panel 标签)。✗ **种属彻底翻车**:MAX 风险的 lean bipedal sprint-bird(恐鸟×roadrunner×dromaeosaur)完全没出来,跑成四足犀象体态巨兽,无鸟喙 / sprint 长腿 / 水平精瘦轮廓 / 长平衡尾;标题文字还误印成 `MECHANICAL SAIGA`。属未收敛的失败迭代。

**变体技巧**
- **唯一识别特征 + "缺了即失败"判据**:把最难特征点名为 mandatory recognition feature,给出客观成败判据,出图即可直接判废重跑。
- **失败模式→补救句映射表**:同图型 18,但 MAX 风险特征的补救动作是"整图重做"。

**反复翻车点(本图型教训)**
- **有生物原型的机械兽,唯一灵魂特征是头号高翻车区**:赛加长鼻、奔跑鸟精瘦剪影都没一次跑对——模型会向最常见近亲物种(普通羚羊 / 犀象)收敛。
- 杂交 + 机械化 + cockpit 三合一的兽,**预期 2-3 次 iteration**,不要一次跑收。

### 校对清单(出图后逐项对账)
- [ ] **唯一识别特征出来了吗**?(赛加=bulbous 长鼻 / 奔跑鸟=精瘦水平剪影+矛喙;**缺了即判失败,直接重跑**)
- [ ] **没向近亲物种收敛**?(赛加跑成普通羚羊/角跑成 kudu 弯角;奔跑鸟跑成胖鸵鸟/鸡/鹰/四足兽)
- [ ] **是纯机械、无生物组织吗**?(板甲"毛/羽"是 bronze panel,不是 fur+armor 生物机改)
- [ ] **背部 cockpit hatch 在 TOP/3-4 panel 可见**?(世界观钩子,CLOSED)
- [ ] **cyan 眼 #4FC3D9 + 青铜 patina 同源 DNA** 一致?
- [ ] **标题文字对不对**?(gid89 教训:误印成上一只兽的标题)

### 坑 & 调参
- **唯一识别特征必须点名 + 给客观判据**:`mandatory recognition feature, if missing the design fails` —— 把"像不像"变成可判废的成/败,出图后照判据直接决定重跑。
- **预期多次 iteration**:这类有生物原型的杂交机械兽,1 次出对的概率低,标准产能是 2-3 刷;优先保大特征(剪影/喙/角/尾/翅位置),细节后调。
- **"纯机械"要把每处表面都点名**:笼统说"机械"会跑成生物机改,必须 `bronze panel armor in place of fur/feathers, NO real fur/skin/feather`。
- **同源 DNA 跨资产复用**:cyan 眼 + 青铜 patina + runic glyph 与角色/载具/小宠物共用,锁世界观一致。
- **标题/标签防串**:同模板连刷多兽,标题文字容易残留上一只的名字,务必逐张核对 Title。

---

## 图型 20 · 武器四视图(借结构换材质 · 2×2 设计表) ✅

### 何时用
要给一件**武器/道具**出博物馆级产品摄影四视图设计表(FULL FRONT / FULL SIDE / VENT DETAIL / GRIP DETAIL),供建模与材质参考。它是 weapon design reference sheet,product photography 路线。本图型的招牌手法是**"结构借母本、材质全改写"**:逐部件 1:1 锁定一个现成设计(如 MHW 灭尽龙大剑)的结构,同时把材质语言系统性翻译成自有世界观(青铜六边形板 + 铜握柄 + cyan 能量缝)——换皮不换骨。

### 命门(这种图独有的成败关键)
1. **2×2 四个具名视角格,每格写清朝向 + 取景距离**:`TOP LEFT PANEL — labeled "FULL FRONT" / TOP RIGHT "FULL SIDE"(engine-side reveal)/ BOTTOM LEFT "VENT DETAIL"(macro)/ BOTTOM RIGHT "GRIP DETAIL"(macro)`。竖版整剑(gid133)与超宽横置整剑(gid139,刀尖向左柄向右)按需选。
2. **逐部件点名母本结构作 1:1 锁定**:`a faithful one-to-one replica of the Wyvern Ignition Greatsword ... the same flared trapezoidal jet-engine venting array ... the same mid-blade information panel module ... the same curving bronze tubing ... the same counterweight sphere`。
3. **材质语言系统翻译,连"对比角色"都映射**:`the material language is the key transformation — instead of the original gunmetal steel and crimson lacquer, every armored surface is densely packed antique bronze hexagonal plates #7A6845/#846035, cyan #4FC3D9 seam lines ... the original crimson lacquer accent areas are translated into darker bronze recessed zones with verdigris, providing the same color contrast role as the original crimson but in bronze-patina language`——原红漆区映射成深铜绿氧化区,保留同样的对比作用。
4. **四格材质一致性是关键命门**:`the consistency of antique bronze hexagonal plate material and warm copper grip material across all four panels is critical` + 真实博物馆产品摄影框架对抗 3D/CG 味。
5. **借参考图时材质全外包给图**:gid139 版本是基于已出的 gid133 当 reference image 复跑,正文反复 `exactly per the reference image, do not redesign, do not stylize`,材质细节交给参考图而非文字。

### 专门骨架(填空)
```
模式:文生图(自描述材质)/ 图生图(武器 ref → 四视图,材质全交参考图)
size 16:9 或 4×16:9 超宽 / 4K(微距可读)/ Neo Image 2

A weapon/character design reference sheet displayed on a clean off-white studio background #F0EDE7
with grid-divided panels, museum-quality product photography, photographic still life of a real physical
handcrafted weapon prop, real material textures through a camera lens, NOT 3D/CG/digital painting,
soft diffused studio lighting from upper left, subtle drop shadow.
Title text at top center reading "<名 — 拼音 — XXX DESIGN SHEET>". Four panels in a 2x2 grid, each
labeled at bottom center.
[TOP LEFT PANEL — "FULL FRONT"] <整件武器朝向 + 一比一锁母本结构逐部件> + <材质改写:母本材质语言 → 自有 hex 材质,连对比角色一并映射>
[TOP RIGHT PANEL — "FULL SIDE"] <侧/引擎侧 reveal,看清厚度与管路>
[BOTTOM LEFT PANEL — "VENT DETAIL"] <macro,喷口阵列,cyan 内辉,no inscriptions>
[BOTTOM RIGHT PANEL — "GRIP DETAIL"] <macro,握柄/配重球,暖铜 vs 冷铜绿对比>
Overall: off-white #F0EDE7, soft upper-left light, subtle film grain, photographic DOF each panel sharp,
**material consistency across all 4 panels is critical**.
（图生图版追加：every detail exactly per the reference image, do not redesign / stylize / add elements not in reference）
```

### 完整真实 prompt 全文(gid133 / gid139 逐字 · 道具-016 / 022)

**gid133 · 机械重剑'渡'四视图(道具-016 · 16:9 / 4K · 文字自描述材质)**:
```
A character design reference sheet displayed on a clean off-white studio background with grid-divided panels, museum-quality product photography aesthetic, photographic still life of a real physical handcrafted weapon prop, real material textures captured through a camera lens, not 3D rendering, not CG, not digital painting, hyperrealistic industrial weapon photography, tactile bronze and copper metalwork, soft diffused studio lighting from upper left, subtle drop shadow on background. Title text at top center reading "渡 — DU — COMPANION-WEAPON DESIGN SHEET" in clean modern sans-serif typography. Four panels arranged in a 2x2 grid, each panel labeled at the bottom center with small capital letters. [TOP LEFT PANEL — labeled "FULL FRONT"] A massive two-handed industrial greatsword displayed vertically, blade pointing up, hilt pointing down, the weapon stands approximately the height of a human adult, the overall silhouette and structure is a faithful one-to-one replica of the Wyvern Ignition Greatsword from Monster Hunter World — the same imposing rectangular slab blade proportions, the same flared trapezoidal jet-engine-style venting array at the blade tip, the same broad rectangular blade body with industrial cutting profile, the same mid-blade information panel module, the same curving bronze tubing system running along both sides of the blade, the same small oval venting holes on the blade body, the same dramatically simple long grip ending in a counterweight sphere. The entire structural design is industrial weapon hard-surface, every edge is angular machined cutting profile, every joint shows visible rivets and structural seams. The material language is the key transformation — instead of the original gunmetal steel and crimson lacquer, every armored surface of this blade is constructed from densely packed antique bronze hexagonal plates, the same hexagonal symbol-relief plate material as found on ancient Chinese bronze ritual artifacts, #7A6845 muted bronze-green base color with #846035 darker bronze recesses, each hexagonal plate cast with raised ancient seal-script and Taoist talisman symbols in the relief pattern, between every plate thin glowing cyan #4FC3D9 seam lines, oxidation patches and verdigris in the deeper crevices, real metal weathering not digital wear, surface scratches showing dull underlying bronze beneath the patina layer. The original crimson lacquer accent areas of the Wyvern Ignition design are translated into darker bronze recessed zones with concentrated verdigris green oxidation, providing the same color contrast role as the original crimson but in bronze-patina language. The top venting structure is the flared trapezoidal array of parallel horizontal grille slots fanning outward from the blade body, six to eight grille slots stacked vertically in the iconic Wyvern Ignition jet-exhaust configuration, each slot framed in cast bronze with chamfered edges and rivet detailing, the slot interiors deep and dark with faint cyan #4FC3D9 glow visible deep inside indicating dormant energy chambers, no inscriptions or text on the vent surfaces, purely structural industrial design with bronze material language. The mid-blade information panel module retains the exact shape and position of the original Wyvern Ignition design — a flat rectangular plate embedded in the blade center, but the original blue-grey panel with pink-purple circuit-pattern etching is here replaced with a darker bronze plate #5A4A35 framed in segmented bronze bezels with rivets, the panel surface is smooth bronze with subtle patina, no inscriptions, no eyes, no symbols added — just the clean dark bronze plate occupying the exact position of the original information module. The curving tubing system that runs along both sides of the blade from the venting array down through the blade body is translated from the original brass hydraulic pipes into segmented antique bronze tubing matching the eye-stalk segment construction of crab-form bronze artifacts, each tube section connected by bronze ring couplings with visible rivets, between couplings small cyan #4FC3D9 glowing joints leak faint light, the tubing follows the exact curving path of the original Wyvern Ignition pipework. Small oval venting holes on the blade body sides retain their original positions and shapes but are now cast in bronze with patina darkening at the edges, faint cyan glow visible deep inside each oval vent. The blade base transitions through a tapered bronze segment into the grip guard — a small curving crescent guard piece in dark bronze with verdigris. The grip retains the exact form of the original Wyvern Ignition handle — a long cylindrical grip with raised spiral ridges along its surface, but the material is reddish-copper #A85530 polished copper with spiral threading clearly visible, the copper shows authentic age patina with warmer red tones, this copper grip provides the warm color accent against the cooler bronze-green of the rest of the weapon, the spiral threading matches the original design exactly. The pommel terminates in a small round copper sphere with a tiny pointed tip, exactly as the original Wyvern Ignition pommel structure, in matching reddish-copper material. The entire weapon shows authentic real-metal handcrafted aging — bronze patina with natural verdigris, copper warm patina, no digital noise patterns, no procedural texturing, only the irregular natural beauty of physical aged metal. [TOP RIGHT PANEL — labeled "FULL SIDE"] The same greatsword viewed in pure profile from the right side, blade still vertical. The side view reveals the weapon's thickness profile — the blade is a thick industrial slab matching the original Wyvern Ignition side profile, showing the depth of the venting cavity at the top, the segmented bronze tubing now visible running prominently along the spine edge of the blade as three-dimensional pipes with bronze ring couplings, cyan #4FC3D9 glow leaking from segment joints. The mid-blade bronze information panel from this side appears as a slight protrusion from the blade body. The top venting structure from this angle reveals the depth of the parallel grille slots extending backward into the blade body like real jet exhaust manifolds, internal cyan glow visible. The reddish-copper spiral grip with the small copper pommel sphere visible at the base. Same hyperrealistic material rendering — antique bronze hexagonal plate work, copper grip, real metal weathering. [BOTTOM LEFT PANEL — labeled "VENT DETAIL"] A close-up macro shot of the top venting structure of the blade, framed tightly so the venting fills most of the panel with a small portion of the upper bronze hexagonal plates visible below for context. The shot reveals fine industrial detail of the bronze jet-exhaust array: each parallel grille slot is a deep clean rectangular cavity framed in cast bronze, the slot edges have chamfered industrial machining with small visible rivets along the structural frame, the bronze surface around the vents shows authentic patina texture with verdigris pooling in the recessed seams, scratches and oxidation showing the dull underlying bronze beneath, no inscriptions or characters anywhere on the venting structure, purely industrial machined bronze surfaces. Deep inside the grille slots cyan glow #4FC3D9 is visible as a soft volumetric haze with faint internal structure suggesting energy chambers, the cyan glow varies in intensity between slots indicating dormant pulsing energy, no particles, no paper fragments. The bronze hexagonal plates below the vent frame are visible showing their characteristic ancient symbol relief casting with cyan glow seam lines between plates. Adjacent to the vent frame: the upper terminus of the segmented bronze tubing system, showing the bronze pipe joining into a flared coupling at the vent base. The entire macro shot emphasizes that this is a real handcrafted bronze weapon prop photographed with a macro lens. [BOTTOM RIGHT PANEL — labeled "GRIP DETAIL"] A close-up macro shot of the grip and pommel region of the weapon, framed to show the lower portion of the bronze blade transitioning down through the bronze guard piece into the reddish-copper spiral grip and ending at the copper pommel sphere. The shot reveals the contrast of materials: the cooler bronze-green hexagonal plates of the blade base meeting the warmer reddish-copper #A85530 of the grip, the spiral threading on the copper grip clearly visible with raised ridges catching the studio key light, the copper surface shows authentic warm patina with subtle darkening in the spiral grooves, real metal oxidation. The small crescent bronze guard piece between blade and grip shows verdigris green patina in its curves. At the very bottom of the grip the small round copper pommel sphere with its tiny pointed tip is fully visible, matching warm copper material with age patina. No inscriptions, no symbols, no characters anywhere — purely material and structural detail. The entire detail shot emphasizes the warm-cool contrast of the two metals and the handcrafted physical material reality. Overall presentation: clean off-white studio background #F0EDE7, soft diffused lighting from upper left creating gentle shadows, subtle film grain across the entire image, neutral color grading emphasizing the bronze and copper tones, photographic depth of field with each panel sharp throughout, no flashy CGI effects, this is a design reference sheet treating an imaginary bronze-and-copper weapon as if it were a real physical museum prop photographed by a product photographer, the consistency of antique bronze hexagonal plate material and warm copper grip material across all four panels is critical.
```

**gid139 · 渡 DU 武器设计参考表 · 4×16:9 超宽(道具-022 · 4K · 图生图,材质全交参考图)**:
```
A weapon design reference sheet in 4x16:9 ultra-wide horizontal canvas format displayed on a clean off-white studio background #F0EDE7 with grid-divided panels, museum-quality product photography aesthetic, photographic still life of a real physical handcrafted weapon prop, real material textures captured through a camera lens, not 3D rendering, not CG, not digital painting, hyperrealistic industrial weapon photography, tactile bronze and copper metalwork, soft diffused studio lighting from upper left, subtle drop shadow on background, subtle film grain. Title text at top center reading "渡 — DU — COMPANION-WEAPON DESIGN SHEET" in clean modern sans-serif typography. Four panels arranged in a 2x2 grid layout across the ultra-wide canvas, each panel itself in horizontal wide proportion to accommodate the horizontal weapon layout, separated by thin grid lines, each panel labeled at the bottom center with small capital letters. The weapon depicted in all four panels is the greatsword shown in the reference image — its silhouette, proportions, structural design, every mechanical detail, the venting array at the blade tip, the blade body construction, the mid-blade module, the tubing system, the grip form, and the pommel must all faithfully match the reference image. Do not redesign, do not stylize, do not add elements not present in the reference. The material language of the weapon also follows the reference image exactly — densely packed antique bronze hexagonal plates with #7A6845 muted bronze-green base color, #846035 darker bronze recesses, ancient seal-script symbol relief casting on each hexagonal plate, thin glowing cyan #4FC3D9 seam lines between plates, oxidation patches and verdigris in deeper crevices, real metal weathering not digital wear, surface scratches showing dull underlying bronze beneath the patina, faint cyan glow inside the venting structure, segmented antique bronze tubing system with bronze ring couplings and cyan glow at joints, reddish-copper #A85530 spiral-threaded grip with warm copper patina, small reddish-copper pommel sphere at the grip base — all consistent with reference image. [TOP LEFT PANEL — labeled "FULL FRONT"] The full weapon shown from the front, displayed horizontally with the blade pointing to the left and the hilt pointing to the right, the entire weapon laid out horizontally across the full width of the panel filling the available horizontal space, blade tip near the left edge of the panel and pommel near the right edge. Front-facing view showing the full width and silhouette of the blade. All structural and material details exactly per the reference image. [TOP RIGHT PANEL — labeled "FULL SIDE"] The same weapon viewed from the side where the jet venting array and the tubing system are exposed — looking at the weapon from the back-of-blade direction so that the full jet exhaust manifold structure is visible head-on at one end, the segmented bronze tubing system running along the back spine of the blade is fully revealed in three-dimensional depth with all the bronze ring couplings and cyan glow joints clearly visible, all the mechanical engine components that face outward from the weapon's back are shown. The weapon is displayed horizontally with the venting end pointing to the left and the hilt pointing to the right, laid out horizontally across the full width of the panel. This is the engine-side reveal view, not the blade-edge profile view. All structural and material details exactly per the reference image. [BOTTOM LEFT PANEL — labeled "VENT DETAIL"] A close-up macro shot of the top venting structure of the blade, framed tightly so the venting fills most of the panel with a small portion of the adjacent hexagonal bronze plates visible for context. Macro lens detail revealing the bronze patina texture, verdigris in seams, faint cyan #4FC3D9 glow visible deep inside the vent slots. All structural and material details exactly per the reference image. [BOTTOM RIGHT PANEL — labeled "GRIP DETAIL"] A close-up macro shot of the grip and pommel region of the weapon, framed to show the lower portion of the bronze blade transitioning through the bronze guard piece into the reddish-copper spiral grip and ending at the copper pommel sphere. Macro lens detail revealing the warm-cool material contrast between the bronze blade base and the reddish-copper grip, the spiral threading on the grip catching the studio key light. All structural and material details exactly per the reference image. Overall presentation: 4x16:9 ultra-wide horizontal canvas with off-white studio background, four panels in 2x2 grid layout, soft diffused lighting from upper left, subtle film grain across the entire image, neutral color grading emphasizing the bronze and copper tones, photographic depth of field with each panel sharp throughout, no flashy CGI effects, this is a design reference sheet treating the weapon as if it were a real physical museum prop photographed by a product photographer, the consistency of antique bronze hexagonal plate material and warm copper grip material across all four panels is critical, the visual identity of the weapon must match the reference image one-to-one.
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid133**(道具-016 · 16:9 / 4K · 吻合度高):**"结构借母本 + 材质全改写"落地**——MHW 母本喷口阵列 / 信息面板 / 厚板剪影 / 握柄配重球结构清晰保留,材质成功翻译成青铜六边形板 + 铜握柄 + 青色能量缝;2×2 四视图 + 标题文字 + 米白底 + 产品摄影打光 + 跨面板材质一致全见效;**4K 让微距可读** ✓。❌(无)。
- **gid139**(道具-022 · 4×16:9 / 4K · 吻合度高):**2×2 四格具名视角全落地且朝向正确**(整剑横置刃左柄右);材质 hex 清单贯穿四格高度一致(青铜六边片 / cyan 缝线 / 红铜握把);off-white 影棚底 + 柔光 + 投影 + 颗粒的"博物馆产品摄影/真实物拍"压住 3D/CG 味;顶部英文标题清晰无乱码;喷口 / 握把 macro 成立 ✓。❌(无)。

**变体技巧(同武器衍生)**
- **gid133 → gid139**:gid133 是文字自描述材质的首版(竖版整剑);gid139 用 gid133 出图当 **reference image**,改成 4×16:9 超宽横置,正文把材质细节全外包给参考图(`exactly per the reference image`),只管视角朝向与取景——首版定材质、复用图扩视角的标准两步走。

**反复翻车点(本图型教训)**
- 目录两条吻合度均为高、均无明显翻车记录;本图型在数据集中是**最稳的设定图类型之一**(产品摄影框架 + 4K + 材质 hex 清单三件套)。需留意的是若降到 1K,微距格(VENT/GRIP DETAIL)的青铜叠片与 cyan 缝细节会糊(参见 gid135 同模型 1K 偏低的微距弱化)。

### 校对清单(出图后逐项对账)
- [ ] **四格视角 + 朝向对不对**?(FULL FRONT / FULL SIDE 引擎侧 reveal / VENT macro / GRIP macro;横置整剑刃左柄右)
- [ ] **母本结构 1:1 保留了吗**?(喷口阵列 / 信息面板 / 管路 / 握柄配重球逐部件核)
- [ ] **材质全改写到位、连对比角色都映射了吗**?(原 gunmetal+crimson → 青铜六边片+铜握柄;原红漆区→深铜绿氧化区)
- [ ] **四格材质一致性**?(本图型头号命门:跨面板 hex 板 + cyan 缝 + 红铜握把必须一致)
- [ ] **顶部标题文字清晰无乱码**?
- [ ] **读作真实博物馆产品摄影、非 3D/CG**?(米白底 #F0EDE7 + 柔光 + 投影 + 颗粒)
- [ ] **够不够清(微距可读)**?(4K 优先;1K 微距格会糊)

### 坑 & 调参
- **借结构换材质 = 两层指令**:一层逐部件 `the same ... as the original`(锁结构),一层 `the material language is the key transformation, instead of X every surface is Y`(改材质);两层必须分开写清,别混成一句。
- **连对比角色一起映射**:母本里起对比作用的材质区(如红漆),要显式翻译成自有体系里承担同样对比作用的区(深铜绿氧化区),否则改完材质会丢掉原设计的视觉层次。
- **首版定材质、复用图扩视角**:gid133 文字自描述材质出首版 → gid139 把首版当参考图、正文 `exactly per the reference image` 复跑扩视角/换画幅,材质一致性最稳。
- **微距格吃分辨率**:VENT/GRIP DETAIL 是 macro,4K 才能读清青铜叠片与 cyan 缝;1K 会糊。
- **四格材质一致性反复强调**:正文结尾一句 `consistency ... across all four panels is critical` 是必留的收束句。

---

## 图型 21 · 比例尺立绘(人剑等高 · 1:1 高度对照) ✅

### 何时用
要给一件**巨型武器/巨物**和持有它的角色出**一张等高比例对照立绘**,让观众/剧组一眼读出"这把剑和人一样高"的尺度关系。它是 full-body character concept art(3:4 竖版,off-white 影棚底,high-fashion costume photography 路线),核心诉求**不是姿态美而是比例可对照**。命门极其反直觉:要让"人剑等高"成立,武器必须**竖立体侧 + 剑尖触地**,而不是斜搭肩(斜搭肩会被透视压缩,等高读不出来)。

### 命门(这种图独有的成败关键)
1. **CRITICAL PROPORTION ANCHOR——给人和武器都标同一绝对身高**:`Danmei is 165cm tall. The weapon she holds is also approximately 165cm tall, almost exactly equal to her own height ... the weapon's full length from tip to pommel must measure the same as Danmei's full height from head to foot`。把抽象巨物尺度转成可对照的 1:1 等高。
2. **武器必须竖立体侧 + 剑尖触地 + 无透视压缩**(等高成立的唯一姿势):`the weapon stands vertically next to her body, parallel to her standing posture, no foreshortening, no perspective compression ... the weapon's lower tip rests on the ground at her right side ... the top of the weapon reaches up to the same height as the top of her head or slightly above`。这是 gid136 相对 gid135 的关键修正——斜搭肩(gid135)读不出等高,改竖立触地(gid136)才成立。
3. **同高度收束句锁画框**:`composed to show both at full height with the top of her head and the top of the weapon reaching the same horizontal level, both feet/tip reaching the bottom ground line at the same horizontal level` —— 把头顶/剑顶、脚底/剑尖各自拉到同一水平线。
4. **武器外形完全外包给参考图,文字只管姿态与比例**:`The weapon must match the design reference image exactly — all structural details, all proportions, all colors, all materials are determined entirely by the reference image and not by this text description`。文字不复述武器细节,只负责"站哪、多高"。
5. **身份锁定 + 体型基调**:`@token` + `face/eye/hair must match base reference with absolute precision` + `slim slender feminine, no athletic musculature, no six-pack`(防把女角色跑成肌肉壮汉)。

### 专门骨架(填空)
```
模式:图生图(身份 ref + 武器设计 ref → 等高比例立绘)
size 3:4 竖版 / 2K(优先,比 1K 清)/ Neo Image 2

A single full-body character concept art illustration in 3:4 vertical portrait, on a clean off-white
studio background #F0EDE7, high-fashion character design photography, real material textures through a
camera lens, NOT 3D/CG/anime, soft key from upper left + warm rim upper right, subtle film grain.
The subject is <角色 @token> in <形态>. <catwalk contrapposto S-curve 姿态> + <身份锁:face/hair/eye must match base reference with absolute precision>. Camera angle slightly low looking up.
CRITICAL PROPORTION ANCHOR: <角色> is <Xcm> tall. The weapon is also approximately <Xcm> tall,
almost exactly equal to her own height — tip-to-pommel = head-to-foot. The weapon stands VERTICALLY
next to her body, parallel to her posture, NO foreshortening, NO perspective compression. Her hand grips
near where blade meets grip, the weapon's lower tip rests on the ground at her side, the top reaches the
same height as the top of her head or slightly above. This is a one-to-one height comparison composition.
The weapon must match the design reference image exactly — all structure/proportion/color/material
determined entirely by the reference image, NOT by this text.
<体型基调:slim slender feminine, NO athletic musculature / NO six-pack>.
Composition: <角色> and the vertical weapon as two parallel vertical anchors of EQUAL height — top of
head and top of weapon at the same horizontal level, both feet/tip at the same bottom ground line.
CHARACTER IDENTITY:unmistakably the same person, only clothing changed.
CRITICAL RENDERING:photorealistic studio fashion photography of a real human model, NOT 3D/CG/anime.
```

### 完整真实 prompt 全文(gid136 逐字 · 道具-019 · 165cm 人剑等高校准版)
```
A single full-body character concept art illustration in 3:4 vertical portrait aspect ratio, displayed on a clean off-white studio background #F0EDE7, high-fashion character design photography aesthetic, hyperrealistic costume photography, real material textures captured through a real camera lens, photographic film still aesthetic, NOT 3D rendering, NOT CG, NOT digital painting, NOT anime illustration, real physical handcrafted costume captured on a physical human model in a photography studio, soft diffused studio lighting from upper left with subtle warm rim light from upper right, subtle drop shadow on background, subtle film grain. The subject is the character Danmei @e4bce3ba2f39a302bd80cfdf4f8cae68 in her awakened battle form. Her face, facial features, eye shape, eye color, hair color, hair style, and entire facial identity must match her base reference image with absolute precision — character identity consistency is critical, this must be unmistakably the same person as in the reference image, only her costume is changed. Full-body standing pose with elegant catwalk-style contrapposto. She stands centered in the frame, weight on her right leg, left leg extended outward and slightly to the side, hips strongly rotated to the screen left forming a dramatic S-curve, shoulders counter-rotated to the screen right, the pose more exaggerated than a typical character portrait — closer to a fashion magazine cover stance with attitude. Her head tilts slightly to the screen right with chin pressed down, gaze directed sideways toward the front of the frame with cold imperious eyes and the faintest hint of a knowing smirk. Camera angle slightly low looking up at her. CRITICAL PROPORTION ANCHOR: Danmei is 165cm tall. The weapon she holds is also approximately 165cm tall, almost exactly equal to her own height. In the composition, the weapon and Danmei must appear at nearly equal height, the weapon's full length from tip to pommel must measure the same as Danmei's full height from head to foot. The weapon stands vertically next to her body, parallel to her standing posture, no foreshortening, no perspective compression of the weapon length. Her right hand grips the weapon near where the blade meets the grip, the weapon's lower tip rests on the ground at her right side, the entire weapon body stands straight up alongside her body, the top of the weapon reaches up to the same height as the top of her head or slightly above. This is a one-to-one height comparison composition. Her short black hair with full straight bangs is preserved exactly as in her base reference. The dark red braided cord pendants hanging at both sides near her ears are preserved exactly. A small bronze segmented hairpin inserted diagonally into her hair on the right side, antique bronze #7A6845 with cyan #4FC3D9 glow joint. Her costume: Top: a heavily modified sleeveless crop version of her original white stand-collar diagonal-button cheongsam-style blouse. The blouse is cut short to end just below her ribs exposing her bare midriff. The blouse is sleeveless on BOTH sides — both left and right shoulders are fully bare to bare skin, both arms emerge from the sleeveless armholes as bare uncovered skin. The original stand-collar and diagonal-button design at the top preserved. The blouse fabric is opaque thick white linen, properly tailored with full structural support underneath so the chest area shows only the smooth outer fabric surface with no visible underlying details — fully covered modest tailored fit at the bust. The crop hem at the bottom of the blouse has a torn-edge fraying effect with several thin strips of white linen fabric trailing downward in irregular lengths, the edge is ragged and uneven rather than clean tailored, the torn edges show frayed loose threads and fabric strips hanging down a few centimeters past the main hem line — the costume looks battle-worn and tattered at this hem. Over the sleeveless cropped blouse, a black short cape draped over her LEFT shoulder only, the right shoulder has no cape over it. The cape is a single asymmetric panel of black matte fabric falling down her left side to her hip, lined on the inside with deep blood-red silk just barely visible at the inner edges, tall popped collar around the back of her neck. The cape drapes over her bare left shoulder skin but does not function as a sleeve — her left arm beneath the cape remains visible as bare skin from shoulder downward. Bare midriff: the strip of bare midriff between the cropped blouse hem and the high-waisted skirt top shows a young woman's natural slim soft abdomen with healthy young pale complexion — flat and softly toned but absolutely no defined abdominal muscle ridges or six-pack lines visible, no athletic musculature, the abdomen reads as natural feminine soft skin only. Bottom: a short black wraparound skirt with deep right-side slit, ending mid-thigh on her left side and fully slit open on her right side. The skirt is wrapped with multiple layered belts at her waist — three to four overlapping belts including a red braided cord sash, a thin black leather belt, and a dark bronze chain belt with small talisman charms. The original bronze talisman pouch is preserved hanging from one belt, alongside two additional smaller pouches and several small bronze bells and a rolled paper talisman tucked into the belts. LEG SILHOUETTE — important: both legs are slim slender feminine youthful legs, the silhouette must read as graceful young woman not as muscular athletic build, no thick calves no muscular thighs, slim graceful slender feminine leg lines throughout, the kind of slim leg proportions seen in fashion editorial photography of young female models, soft tapering line from hip to ankle. Right leg: fully exposed from hip to ankle through the deep skirt slit. The upper thigh wears a thick black leather strap wrapped twice around it with small bronze talisman charms threaded on. From the knee down her right calf is completely bare slim skin to the ankle, no armor, no knee guard, no greave anywhere on this leg. Right foot in a black ankle-high boot with a small heel. The exposed right leg's bare skin is slim slender feminine line. Left leg: under the longer side of the skirt, the left leg wears a black thigh-high stocking with a black leather garter strap at the top, stocking ending in a similar black ankle boot. The stocking-clad left leg silhouette is also slim slender feminine. Arms: both shoulders and upper arms are bare from the sleeveless blouse. Her RIGHT arm wears a black opera-length leather glove starting at her fingertips and extending up her forearm and past her elbow to mid-upper-arm, fitting tightly to her arm — the glove covers from her hand up to roughly two thirds of the way to her right shoulder, leaving the top portion of her right upper arm and her right shoulder as bare skin between the glove top and the sleeveless blouse opening. Over the right wrist sits a slim antique bronze segmented wrist cuff with cyan glow joints, layered on top of the glove at the wrist. Her LEFT arm is completely bare from shoulder to fingertips — no glove, no wrist cuff, no armor, no fabric of any kind, only bare skin from her left shoulder all the way down her left arm to her left fingertips. Asymmetric arm design — right arm has the long glove plus wrist cuff with a bare upper arm strip between glove top and shoulder, left arm completely bare throughout. Neck: a small bronze medallion hangs from a thin braided cord around her neck, sitting in the hollow between her collarbones, coin-sized, bronze with concentric seal-script relief and a tiny cyan #4FC3D9 glowing eye-stone at center. Shoulders: a small antique bronze segmented shoulder ornament hangs from her right shoulder strap of the blouse, palm-sized, three bronze segment links with cyan glow at joints, hanging like a decorative tassel against her bare right upper arm. Her left shoulder has no ornament, only the cape draped over bare skin. Pose with the weapon: her right hand grips the weapon, the weapon stands vertically alongside her right side, the weapon's tip resting on the ground beside her right boot, the weapon body parallel to her standing posture, the top of the weapon reaching up to the level of the top of her head or slightly above, the weapon's full 165cm height visible without foreshortening matching Danmei's 165cm height in a one-to-one proportion comparison. The weapon must match the design reference image of the weapon exactly — all structural details, all proportions, all colors, all materials of the weapon are determined entirely by the reference image and not by this text description. Her left hand hangs relaxed at her left side, the bare ungloved fingers slightly curled, left thumb hooked into one of the belts at her waist near the bronze talisman pouches. Composition: Danmei and the vertical weapon occupy the central two thirds of the vertical frame as two parallel vertical anchors of equal height, the off-white background empty around them with soft shadows beneath her feet and the weapon's tip. The frame is composed to show both at full height with the top of her head and the top of the weapon reaching the same horizontal level, both feet/tip reaching the bottom ground line at the same horizontal level. Lighting: soft diffused key light from upper left, subtle warm rim light from upper right catching edges of bronze accessories, the weapon, and bare skin. Cyan glow joints subtle. Pale bare skin against black cape, black stocking on left leg, black skirt, and white cropped blouse — strong tonal contrast. Bare left shoulder and left arm visible with soft skin tones. CHARACTER IDENTITY: This must be unmistakably the same Danmei as in her base reference image — same face, same eye shape, same nose, same mouth, same hair, same overall facial structure, same young Taoist girl identity, only her clothing has been changed. Her face must not be redesigned or restyled. Her body type must read as a slim slender young woman with feminine silhouette throughout. CRITICAL RENDERING: This is photorealistic studio fashion photography of a real human model wearing a real handcrafted costume, captured through a real camera lens on real film. NOT 3D rendered, NOT CG game character, NOT anime illustration, NOT digital painting. Real human skin with natural soft pore texture and soft complexion, real linen fabric for the cropped blouse with natural wrinkles, real matte wool/cotton for the wrap skirt and cape with real fabric drape, real silk lining inside cape, real black leather for belts and boots, real black silk/nylon for the thigh-high stocking, real handcrafted bronze with authentic patina on the small accessories, real braided cord for hair pendants and waist sash, real paper for the talismans. The entire image must read as a single high-end fashion photography still from a real photoshoot, with photographic depth of field, real lens optical characteristics, real studio lighting falloff, real film grain. Avoid all CG cleanliness, avoid procedural texture patterns, avoid plastic skin shading, avoid stylized anime rendering.
```

> gid135(道具-018 · 1K · 斜搭肩首版)为前置反例:正文同构,但武器是 `sword rests on her right shoulder behind her head, the blade extending diagonally upward to the left across the upper part of the frame`(背扛斜贯),**没有 165cm 等高锚 + 没有竖立触地** —— 这正是 gid136 要修正的点。

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid136**(道具-019 · 3:4 / 2K · 吻合度高 · 全文来源):**PROPORTION ANCHOR 见效**——剑从斜搭肩改竖立体侧、剑尖触地、人剑约等高无透视压缩,"1:1 高度对照"清楚成立(gid135 做不到的等高这里实现);非对称臂部(右臂长手套腕箍 / 左臂全裸)/ 纤细女性腿 / 裸腹无腹肌均落实;身份与 base 一致;**2K 比 1K 更清** ✓。❌(无)。

**反例 / 前置版**
- **gid135**(道具-018 · 3:4 / 1K · 吻合度高但比例诉求未达 · 前置反例):token + PRESERVE 身份锁定见效(脸/短发/红绳坠/发簪);逐部位服装重构全落地(露脐短款/单肩披风+血红内衬/高开衩裙/腰部多层配饰/opera 手套/青铜珠宝级点缀);"绝区零街头潮装×道士 trickster"统一美学成立;巨剑'渡'**背扛对角斜贯**上画面视觉重量到位 ✓。✗ 但**斜搭肩 = 透视压缩,读不出人剑等高**(这是 gid136 要修的核心问题);且 1K 偏低,青铜微距/符纸细节略糊、'渡'剑身六边形板/喷口阵列缩小斜置时细节弱化,精度不及 gid133 四视图。

**变体技巧(gid135 → gid136 的关键迭代)**
- 核心差异可逐一对应验证:**斜搭肩 → 竖立等高**(比例锚生效)/ 增 165cm 双标 + 剑尖触地 / 非对称裸左臂 / 腿型纤细 / **1K → 2K**(微距更清)。这条迭代是"比例尺立绘"成立的范本。

### 校对清单(出图后逐项对账)
- [ ] **武器是竖立体侧 + 剑尖触地吗**?(头号命门:斜搭肩/背扛会被透视压缩,等高读不出 → 必须竖立)
- [ ] **人剑顶端在同一水平线、脚底/剑尖在同一底线吗**?(1:1 等高的判据)
- [ ] **有没有透视压缩武器长度**?(`no foreshortening / no perspective compression` 是否兑现)
- [ ] **武器外形与设计参考图 1:1 一致**?(文字不复述武器,全交参考图)
- [ ] **身份锁住、没串脸**?(`unmistakably the same person, face must not be redesigned`)
- [ ] **体型基调对吗**?(slim slender feminine,没跑成肌肉壮 / 没六块腹肌)
- [ ] **够不够清**?(2K 优先;1K 微距/青铜细节会糊)

### 坑 & 调参
- **"等高"的唯一正确姿势是竖立触地,不是斜搭肩**:这是最反直觉、也是最易翻的点。gid135 背扛斜贯虽然好看,但透视一压,等高彻底读不出;gid136 改竖立体侧 + 剑尖触地才成立。要等高就别让武器斜着。
- **比例锚要给绝对数值 + 双标 + 同高度收束句三件套**:`165cm`(绝对)+ 人和武器都标 165cm(双标)+ `tip-to-pommel = head-to-foot, top of head & top of weapon at same horizontal level`(收束)。缺一面就压不住透视。
- **武器细节全外包给参考图**:`determined entirely by the reference image and not by this text` —— 比例立绘里文字只管"站哪、多高、谁握",武器长什么样交参考图,避免文字描述与参考图打架。
- **体型基调要正向写**:女角色易被默认跑成肌肉/六块腹肌,用 `slim slender feminine, NO athletic musculature, NO six-pack, like fashion editorial young female models` 正反向都压。
- **2K 起步**:比例立绘同时要看清人脸身份 + 武器青铜微距,1K 两头都糊(gid135 教训),优先 2K。

---

## 图型 15 · 生物 creature sheet(多视图设定表) ✅

### 何时用
> ★ **流程位(两步走 · 见 pipeline 阶段2)**:这是**第2步**资产 —— **先有一张怪物的"正常全图"**(图生图锚定 vibe ref 出的单张全身),**再把它当 Image 1 喂进来转四宫格**,且**转不转先问用户**。不要跳过正常全图、直接从零出 sheet(身份没定就摊 4 格,常 4 格不一致)。

要把一只**虚构生物**交付给建模/VFX 团队,需要在**一张图**里同时给出多个正交视图 + 比例参照 + 配色规格时。它是工业级 **creature concept design sheet / turnaround**——一页式交付物,信息完整、可读优先于美感。典型场景:定一只新生物的"官方设定表",或为后续被击倒/特殊姿态镜头预出标准姿态格(gid79 专设两格翻倒露腹视图)。库内 gid79(六视图)、gid84/gid91(四视图 + 人形比例尺 + 五物种比例条 + hex 色板条)。

### 命门(这种图独有的成败关键)
1. **版面分区写成"坐标 + 内容 + caption"三件套**:不是笼统说"多视图",而是逐格点名位置(LEFT HALF / TOP RIGHT / MIDDLE RIGHT / BOTTOM STRIP / BOTTOM RIGHT CORNER)+ 该格画什么 + 格下 caption 文字(`Label text reads "TOP VIEW"`)。模型靠这套坐标把单页排成网格。
2. **比例尺做两层**:主图旁放 1.8m 黑色火柴人剪影(约 1/20 生物高,`HUMAN 1.8M`),底部再来一条五物种横向比例条(人 1.8m / 象 3m / 巴士 12m / 蓝鲸 30m / 生物 35m 黑剪影并排),把"35 米"量化成可对照的尺度。
3. **hex 色板条钉死配色**:角落一条 5 色 swatch,每块标 hex(`pale sand-yellow #C9A876…`),让交付物自带配色规格。
4. **PRESERVE / specifications 跨所有格统一**:`Creature design specifications (applies to all views)` 一段把甲壳/无眼铲头/十八挖掘肢/共生骨珠逐项锁死,再强约束 `Consistent lighting direction across all four views` + `Orthographic projection — no perspective foreshortening` + `float on clean background`(净底浮空、删环境)。
5. **预出特殊姿态格**(gid79 特有):六视图里专设 `TOPPLED — BELLY OUT` / `TOPPLED — HEAD CLOSE` 两格,大段文字描述被掀翻姿态(腿水平外伸悬空、铲头侧瘫),为后续被击倒镜头预备标准设定图。

### 专门骨架(填空式)
```
模式:Edit / 图生图(基于生物参考图 Image1 出多视图设定表)
size 16:9 / quality medium / jpeg / Thinking Mode 开
用途:creature concept design sheet,信息完整可读优先,净底浮空、正交无透视

【参考图标注】
Image 1:<底层物种参考图> —— 锁物种解剖基准,所有格保持同一只

【PROMPT 正文】
This image / a professional creature concept design sheet that may appear slightly soft like a
real studio-photographed model sheet — this softness is intentional. <净底:clean neutral
light-grey background, soft even studio lighting, orthographic concept-art lighting to reveal form>.
Subject: <生物一句:体量 + 体型 + 标志特征>.

Layout structure of the sheet（逐格写"坐标 + 内容 + caption"）:
- LEFT HALF (large): <主侧视图,facing frame-left> + 旁置 1.8m 黑色火柴人剪影做比例(约 1/20),
  caption "HUMAN 1.8M" / "BODY LENGTH 35M"
- TOP RIGHT (medium): <俯视图,显式说看到几节甲/几条肢> caption "TOP VIEW"
- MIDDLE RIGHT (medium): <头部特写,锁标志结构> caption "HEAD DETAIL — …"
- BOTTOM STRIP (full width): 五物种黑剪影比例条 人1.8m/象3m/巴士12m/蓝鲸30m/生物XXm,各带名+尺寸
- BOTTOM RIGHT CORNER: 5 色 hex 色板条 <#xxxxxx 各带英文色名>
（六视图变体:3×2 网格 SIDE/FRONT/TOP/3-4/+ 两格特殊姿态 TOPPLED-BELLY/TOPPLED-HEAD-CLOSE）

Creature design specifications (applies to ALL views): <逐项锁:甲壳质感/无眼铲头/N对肢/共生附着物/腹面>.
Preserve from Image 1 across ALL panels: <物种解剖逐项> — same color palette, same material, same proportions.
Constraints: keep all panels the SAME creature, consistent design and scale; clean light-grey background
(#E8E6E2), thin neutral grey divider lines; sans-serif labels dark grey (#2A2A2A), small but legible & sharp;
35mm film grain, neutral grading; consistent lighting across all views; orthographic — no perspective
foreshortening; no environment (no sand/sky/dust), all views float on clean background; no extra creatures,
no humans other than the scale silhouettes, no vegetation, no riders/equipment.
PHOTOGRAPHIC TONE: real studio-photographed design maquette, slightly soft, not tack-sharp, photographically
captured not 3D-rendered/AI-stylized, colors restrained not oversaturated.
Avoid: oversharpening, artificial sharpness, heavy digital grain, HDR, AI-generated aesthetic, overpolished
studio look, plastic smoothing, oversaturation, glossy highlight blowout, generic AI image quality, default
model aesthetic bias.
```

### 完整真实 prompt 全文(gid84 多视图 v4 逐字 · 可直接改填)
```
盲掘巨足类 · 多视图设定图 · 含人形比例对照 GPT-Image-2 生图 Prompt v4 (Character Sheet / Turnaround)
================================
Scene: A professional creature concept design sheet on a clean, neutral light-grey background. Organized grid layout in the style of official VFX production design reference sheets used in films like Pacific Rim and Dune. Even, soft, consistent lighting across all views with no harsh shadows — orthographic concept art lighting designed to reveal subject form clearly. Subject: A colossal terrestrial isopod-like creature, approximately 35 meters long and 8 meters tall at the highest point of its arched back. The body consists of nine heavily armored dorsal segments forming a continuous arched spine. The creature is presented in four separate views on a single sheet, plus a scale comparison strip and a color palette strip. Important Details: Layout structure of the sheet: LEFT HALF (large panel): Full side-profile orthographic view of the creature, facing frame-left, occupying the left half of the sheet. To the right of the creature within this same panel, place a simple black stick-figure silhouette of a standing adult human (1.8 meters tall) for scale comparison — the human silhouette should appear tiny next to the creature, roughly 1/20th of the creature's height. Small label text below the human silhouette reads "HUMAN 1.8M". Small label text below the creature reads "BODY LENGTH 35M". TOP RIGHT (medium panel): Top-down orthographic view of the creature seen from directly above, clearly showing the nine segmented carapace plates along the spine and the eighteen digging limbs (nine pairs) extending symmetrically from the body sides. Label text reads "TOP VIEW". MIDDLE RIGHT (medium panel): Front-facing close-up view of the head, showing the massive forward-protruding keratin shovel-jaw like a thick iron spade with chipped and notched edges, the horizontal mouth opening beneath, and the complete absence of eyes. Label text reads "HEAD DETAIL — SHOVEL JAW". BOTTOM STRIP (horizontal panel spanning the full width): A scale comparison row showing five black silhouettes lined up left to right with size labels — a human figure (1.8m), an african elephant (3m), a city bus (12m), a blue whale (30m), and the creature itself (35m). Each silhouette labeled with its name and height/length. The creature silhouette is the largest and matches the side-profile shape from the main panel. BOTTOM RIGHT CORNER: A small horizontal color palette strip showing 5 swatches of the creature's surface colors, each labeled with a hex code: pale sand-yellow #C9A876, warm tan #A8855A, weathered brown #7A5D3F, dark earth-brown #4A3826, and shadow membrane grey-brown #2D2218. Creature design specifications (applies to all views): The dorsal carapace is coarse, porous, weathered stone-like in texture, sand-yellow to dark brown in coloration with pale wind-erosion striations across each segment. The 3rd and 6th carapace segments bear small parasitic crustacean growths and dried barnacle-like encrustations clustered along their ridges. Segment joints reveal darker softer-looking membrane tissue in the gaps between armored plates. Each of the nine body segments bears a pair of short, thick, powerful digging limbs ending in broad shovel-shaped digging claws. The head has no eyes; only the massive forward-protruding keratin shovel-jaw with a horizontal mouth opening beneath. The underside is paler and less armored with a row of horizontal vent-like openings along the abdomen. Use Case: Official creature design reference sheet for a science fiction film production. Intended as a single-page deliverable for the production design team and VFX vendor to model the creature accurately, with built-in scale references and color specifications. Must read clearly as a professional concept art production sheet. Constraints: Aspect ratio 16:9. Clean light-grey background (#E8E6E2) across the entire sheet. All view panels separated by thin neutral grey divider lines. All text labels rendered in clean sans-serif typography, dark grey color (#2A2A2A), small but legible — label text must be sharp and readable. Photorealistic creature rendering within each view panel, with 35mm film grain texture. Neutral color grading across all panels. Consistent lighting direction and intensity across all four creature views — no view should appear lit differently from the others. Sharp focus across all creature details. No environmental elements (no sand, no sky, no dust, no atmosphere) — all creature views float on the clean background. No additional creatures, no human figures other than the small black silhouettes specified for scale reference, no vegetation, no decorative elements beyond what is specified in the layout. Orthographic projection for all creature views — no perspective foreshortening.
```

**六视图变体全文(gid79 逐字 · 含两格翻倒姿态,可直接改填)**
```
This image is a creature design reference sheet that may appear slightly soft and imperfect, like a real studio-photographed model sheet — this softness is intentional and desired. Create a clean creature design sheet for the armored beast shown in Image 1, presenting the SAME creature from multiple angles in a six-panel grid layout (3 columns × 2 rows), on a neutral light-gray seamless studio background, evenly lit with soft natural studio lighting. A small caption label sits beneath each panel. The six panels: - Top-left, labeled "SIDE": full side profile of the creature standing on the ground, all legs supporting the body normally, full body in frame. - Top-center, labeled "FRONT": the creature seen head-on from its front (the shovel-shaped snout end), standing, showing the frontal silhouette and the rows of legs. - Top-right, labeled "TOP": the creature seen from directly above, standing, showing the full row of overlapping segmented back-shell plates along the spine. - Bottom-left, labeled "3/4 VIEW": a three-quarter front-side perspective of the creature standing. - Bottom-center, labeled "TOPPLED — BELLY OUT": the creature COMPLETELY TOPPLED OVER and lying on its side on the ground, its whole body axis horizontal, one entire flank pressed flat against the ground, its pale underbelly facing the viewer, the dark segmented back-shell turned away from the viewer toward the far side; the rows of stout legs — which normally point downward to support the body — now stick out HORIZONTALLY toward the viewer, hanging limp in the air and curled, no longer supporting any weight; the shovel-shaped head lolls sideways against the ground. This panel clearly shows a creature knocked onto its side, helpless and overturned, NOT standing. - Bottom-right, labeled "TOPPLED — HEAD CLOSE": a closer view of the same toppled creature's head end lying sideways on the ground, focusing on the shovel-shaped snout and mouth area, the head resting against the sand. Preserve from Image 1 across ALL panels: the creature's exact body design and identity — the overlapping segmented plate-armor back shell (sandy-tan to dark brown, with weathered, lichen-mottled stone-like surface texture), the eyeless shovel-shaped head with its pointed front snout/mouthpart, the many pairs of thick stubby pillar-like legs with hoofed feet, the darker grayish-brown lower body and leg roots, and the small clusters of symbiotic bone-beads / bead-strings attached on the back shell. Same color palette, same material, same proportions in every panel. Constraints: keep all six panels the SAME creature, consistent design and scale; clean neutral studio sheet, no environment, no desert landscape, no sky; no extra creatures; no redesign; no added equipment or riders. PHOTOGRAPHIC TONE: this should look like a real studio-photographed design maquette, slightly soft, with subtle organic texture and natural lens depth of field, not digitally tack-sharp. Soft natural studio lighting with realistic falloff, not punchy HDR. Materials photographically captured, not 3D-rendered or AI-stylized. Colors restrained with slight gray tone, not oversaturated. Avoid: oversharpening, artificial sharpness, heavy digital grain, HDR effect, AI-generated aesthetic, overpolished studio look, plastic smoothing, oversaturation, glossy highlight blowout, generic AI image quality, default model aesthetic bias.
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid84**(v4 全文来源,**本片最完整的一页式交付物**):几乎全要素兑现——四视图 + 人形 1/20 剪影 + 五物种比例条 + hex 色板条 + 标签 + 浅灰底分隔线 ✓;无明显翻车。✗ 仅 1K 下小标签/hex 码可读性偏弱(清晰度限制,非手法失败)。
- **gid91**(v4 同模板复跑):多视图分区 + 人形比例尺 + 九节背甲 + 18 挖掘肢 + 无眼铲颚 + 灰底浮空 + 正交统一布光 + sans-serif 标签都见效 ✓;✗ 底部五连比例条 + 角落 hex 色板条在出图里**未清晰落实**(弱实现)——单人比例尺成功但"量化尺度 strip"打了折。
- **gid79**(六视图 · 含翻倒视图):六视图 + 两格翻倒露腹成功(侧躺、腿水平外伸悬空)✓;PRESERVE 身份一致;灰底净棚去元素到位 ✓。✗ 各格 caption 缩略图不可读;无眼铲头/骨珠细节难核验。

**变体技巧(同 prompt 衍生)**
- **六视图 vs 四视图选型**:要预出特殊姿态(被击倒/露腹)走 gid79 的 3×2 六格、专设 `TOPPLED` 格;只做标准定生物走 gid84 四格 + 双层比例尺 + hex 条。
- **比例尺两层叠加**(gid84):主图旁 1/20 火柴人 + 底部五物种条,缺一层都不够量化。

### 校对清单(出图后逐项对账)
- [ ] 各视图是不是**同一只生物**?(物种解剖/配色/比例每格一致,没跑成不同生物)
- [ ] **正交无透视**了吗?(易翻:跑成带透视的 3/4,失去建模参考价值)
- [ ] **人形比例尺**出来没?约 1/20、带 `HUMAN 1.8M` caption?
- [ ] **底部五物种比例条 + 角落 hex 色板条**清晰落实了吗?(易翻:弱实现/糊掉——gid91 就翻在这)
- [ ] caption 标签**可读**吗?(1K 常糊,要可读得上 2K)
- [ ] 净底浮空、**删光环境**(无沙/天/尘)了吗?
- [ ] (六视图)`TOPPLED` 两格姿态对不对?(腿水平外伸悬空、铲头侧瘫、露腹朝镜头)

### 坑 & 调参
- **比例条/色板条是高翻车区**:文字密集的小 strip 在 1K 下糊掉、甚至不落实(gid91)。要它清晰落实就上 2K + 强调 `small but legible & sharp`;只当参考可接受弱实现。
- **正交易滑向透视**:务必写死 `orthographic projection — no perspective foreshortening` + `consistent lighting across all views`,否则各格光向不一、读不出同一只。
- **caption 缩略不可读**是分辨率限制,非手法失败——核验细节看主图,别指望读 caption。
- **Edit 模式锁物种**:有底层参考图就走 Edit,`Preserve from Image 1 … same proportions`,防多视图之间漂移。

---

## 图型 16 · 生物侧身正交全景 ✅

### 何时用
要给一只**巨型生物**出一张**纯侧视、工程级正视图**供建模时——只要单视图,但要求**绝对正交、无透视压缩、主体居中占满、信息全可读**。区别于图型 15(多视图一页式):这是**单视图正交全景**,把生物完整轮廓 + 全部肢体 + 头部结构在一张图里平铺给 PD/VFX 当建模底图。库内 gid82(纯净沙地正交侧视 v3)、gid92(实景沙漠出土全景版)。

### 命门(这种图独有的成败关键)
1. **把摄影机位写成几何约束**:不是说"侧视",而是 `Camera positioned at low eye-level approximately 80 meters from the creature, perfectly perpendicular to the creature's body axis — pure side view, no perspective foreshortening`。**80m 外 + 垂直身体轴线**这组几何描述,是消除透视收缩、换来近正交纯侧视的关键(gid82/gid92 都靠这句生效)。
2. **精确数值规格当骨架**:`35 meters long / 8 meters tall / nine heavily armored dorsal segments / eighteen limbs total`——用量化规格钉死体量与结构,引导模型走"技术参考"而非"美术插画"路线。
3. **构图锁死**:`fills approximately 85% of the frame width and is centered horizontally and vertically`——主体占 85% 宽、水平垂直居中,保证全身可读、不被裁。
4. **Use Case 明示技术用途**:`Creature concept design sheet for a science fiction film production. Strict orthographic side profile reference intended for the production design team and VFX vendor to model the creature accurately`——写明"供 PD 与 VFX 建模"把模型从棚拍 turnaround 拉向工程正视参考。
5. **去元素 + 全清晰**:`Clean uncluttered background, only flat sand and distant horizon. No text, no logos, no human figures, no other creatures, no vegetation. No dust, no motion, no atmospheric effects obscuring the subject. Sharp focus across the entire creature body`——净背景、无遮挡、全身锐焦。

### 专门骨架(填空式)
```
模式:文生图(单视图正交侧身全景设定图)
size 16:9(注:gid82/92 元信息标 21:9 与正文 16:9 冲突,出图偏宽幅)/ quality / Thinking Mode 开
用途:strict orthographic side profile reference,供 PD/VFX 建模,信息全可读优先

【PROMPT 正文】
<标题 · 设定图 vN>
Scene: <环境一句:vast arid desert / overcast diffused daylight,concept-art 光揭示形体,minimal harsh shadows>.
Subject: A colossal <生物类比> standing fully exposed, photographed in STRICT SIDE PROFILE.
约 <长> meters long and <高> meters tall. Body consists of <N 节装甲段 forming continuous arched spine>.
The head end faces frame-left; the rear faces frame-right. Stationary, all limbs visible and planted.
Important Details: <逐项锁:每节一对肢=共 N 肢 / 铲状口器无眼 / 甲壳石质风化 / 寄生附着物在第几节 / 关节膜组织 / 腹面>.
Use Case: Creature concept design sheet for a sci-fi film. Strict orthographic side profile reference for the
production design team and VFX vendor to model accurately. Must show the complete silhouette, all limbs,
head structure, body proportions clearly.
Constraints: Wide horizontal composition. Camera at low eye-level approximately 80 meters from the creature,
perfectly perpendicular to the creature's body axis — pure side view, no perspective foreshortening. The
creature fills approximately 85% of the frame width, centered horizontally and vertically. Photorealistic,
35mm film grain, neutral color grading. Clean uncluttered background, only flat sand and distant horizon.
No text, no logos, no human figures, no other creatures, no vegetation. No dust, no motion, no atmospheric
effects obscuring the subject. Sharp focus across the entire creature body. No artistic stylization — strict
photoreal creature design reference quality.
```

### 完整真实 prompt 全文(gid82 侧身全景 v3 逐字 · 可直接改填)
```
盲掘巨足类 · 完整出土侧身全景 · 设定图 GPT-Image-2 生图 Prompt v3
================================
Scene: A vast arid desert under overcast diffused daylight. Flat sandy ground extends to the horizon, with low rolling dunes in the distance. Even, soft lighting with minimal harsh shadows — concept art lighting designed to reveal subject form clearly. Subject: A colossal terrestrial isopod-like creature standing fully exposed on the desert surface, photographed in strict side profile. The creature is approximately 35 meters long from head to tail and 8 meters tall at the highest point of its arched back. Its body consists of nine heavily armored dorsal segments forming a continuous arched spine from head to rear. The head end faces frame-left; the rear faces frame-right. The creature is stationary, all limbs visible and planted on the sand. Important Details: Each of the nine body segments bears a pair of short, thick, powerful digging limbs extending from beneath the carapace — eighteen limbs total visible along the body length. Each limb terminates in a broad shovel-shaped digging claw. The head end has no visible eyes; instead, a massive forward-protruding keratin shovel-jaw extends from the front like a thick iron spade, its edges chipped and notched from long use, with a horizontal mouth opening beneath. The dorsal carapace is coarse, porous, weathered stone-like in texture, sand-yellow to dark brown in color, with pale wind-erosion striations across each segment. The 3rd and 6th carapace segments show small parasitic crustacean growths and dried barnacle-like encrustations clustered along their ridges. The segment joints reveal darker, softer-looking membrane tissue in the gaps between armored plates. The underside of the body is paler and less armored, with a row of horizontal vent-like openings along the abdomen. Use Case: Creature concept design sheet for a science fiction film production. Strict orthographic side profile reference intended for the production design team and VFX vendor to model the creature accurately. Must show the complete silhouette, all limbs, head structure, and body proportions clearly. Constraints: Wide horizontal composition, 16:9 aspect ratio. Camera positioned at low eye-level approximately 80 meters from the creature, perfectly perpendicular to the creature's body axis — pure side view, no perspective foreshortening. The creature fills approximately 85% of the frame width and is centered horizontally and vertically. Photorealistic rendering, 35mm film grain, neutral color grading. Clean, uncluttered background with only flat sand and distant horizon. No text, no logos, no human figures, no other creatures, no vegetation in frame. No dust, no motion, no atmospheric effects obscuring the subject. Sharp focus across the entire creature body. No artistic stylization — strict photoreal creature design reference quality.
```
> gid92 与 gid82 同源:复用 gid91/v3 同一物种规格(跨条目一致),把"纯净沙地"换成"实景沙漠出土全景"版本,机位几何约束句一字不变。

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid82**(v3 全文来源):严格正交侧视 + 主体占 85% 居中 + 纯净背景全部到位 ✓;漫射 concept-art 光揭示形体,九节装甲/挖掘肢/铲颚可辨 ✓。✗ 寄生甲壳/藤壶细节 1K 下难确认;比例尺人形本图无(留待 v4);✎ 比例字段冲突:元信息 21:9 vs 正文 16:9 确属实,本图无人形剪影,应视为预告。
- **gid92**(实景沙漠出土全景版):几何约束机位换来**近正交纯侧视** ✓;主体占 85% 居中;复用 gid91 规格保跨条目一致;干净沙漠 + 无文字无人形去元素生效 ✓。✗ 实景版仍带轻微透视/景深(可接受);✎ 比例口径冲突(元信息 21:9 vs 正文 16:9)属实,出图偏宽幅。

**变体技巧**
- **纯净版 vs 实景版**:要绝对干净的工程底图走 gid82(only flat sand and distant horizon);要带环境氛围的"出土全景"走 gid92(实景沙漠),但接受轻微透视/景深。
- **跨条目复用规格**:gid82/91/92 共用同一物种数值规格,改图型不改规格——保证同一只生物在侧视图、多视图、全景之间不漂移。

### 校对清单(出图后逐项对账)
- [ ] 是不是**纯侧视、近正交**?(机位几何约束生效没?有没有透视收缩把头/尾压短)
- [ ] 主体**占 85% 宽、水平垂直居中**了吗?(全身可读、没被裁)
- [ ] **全部肢体可见**吗?(十八肢沿身长一字排开,没被遮/没少画)
- [ ] 头部结构(铲状口器/无眼)清晰?
- [ ] 背景**够不够干净**?(only flat sand + horizon,无文字/人形/植被/尘雾遮挡)
- [ ] **全身锐焦**了吗?(sharp focus across entire body,没有大景深虚化)
- [ ] 比例口径:元信息 vs 正文 aspect ratio 一致吗?(gid82/92 这里有冲突,出图偏宽)

### 坑 & 调参
- **比例字段冲突**:gid82/gid92 元信息标 21:9、正文写 16:9,实际出图偏宽幅。**生成前统一 aspect ratio**,别让元信息和正文打架。
- **实景版的代价**:换实景沙漠会带回轻微透视/景深,牺牲一点正交纯度——要绝对工程正视就用纯净版。
- **细节在低分辨率失真**:寄生甲壳/藤壶等小附着物 1K 难确认,上 2K 再核验。
- **机位几何约束是命门句**:删掉"80m 外 + 垂直身体轴线"就会跑回带透视的近平视,正交参考价值崩。这句务必逐字保留。

---

## 图型 17 · 纪实实景陈列(反棚拍) ✅

### 何时用
要给一只生物出设定页,但**刻意不要棚拍 turnaround 那种"干净灰底悬浮"的工业感**,而要一组**像探险队/剧组在真实外景实拍**的纪实照片摊在一页上时。专治"AI 默认把生物设定图跑成 3D 渲染/CG 模型展示/概念美术"的审美偏置——用"反棚拍"框架强行把它拉回**真实外景照片**质感。库内 gid80(巨龙 DILONG 峡谷晨光纪实照片设定页)。

### 命门(这种图独有的成败关键)
1. **"反 turnaround"框架开宗明义,且把禁项写满**:开头就声明 `documentary-style, on-location PHOTOGRAPHS … as if a film crew or expedition photographed this … out in a real desert-canyon`,紧接 `Every panel is a REAL PHOTOGRAPH … NOT a 3D render, NOT a studio turnaround, NOT a CG model display, NOT concept art, NOT an illustration`。**正向定义 + 负向排除成对出现**,这是反棚拍成败第一关。
2. **实景光替代棚拍光**:`real arid desert canyon in the soft light of early morning, natural directional sunlight, real cast shadows, real bounced environmental light and faint atmospheric dust haze — NOT flat studio lighting, NOT uniform global illumination, NOT a neutral seamless backdrop`。点名实景晨光 + 真实投影 + 环境反弹光 + 尘霾,逐条对冲棚拍布光。
3. **跨照片一致性**:`The same creature stays perfectly consistent across every photograph`——多张实拍照里是同一只。
4. **对比式锁定句精确规避"读错物种"**:对蛇形巨物,模型天然倾向跑成虫/沙虫,所以用 `Its overall read must be unmistakably DRAGON, not worm` + `NOT a smooth limp worm tube` + `the only worm-like trait, hidden inside a dragon's jaws`,用"必须读作 X 不是 Y"句式精确掰回。材质同理:`the skin of a fish that has had every scale torn out … a real living skin surface, NOT exposed muscle, NOT a flayed body … NOT carved stone`——去鳞鱼皮是活体非剥皮、非石雕。
5. **多照片版面 = 一张主环境照 + 多张局部特写**:`MAIN (large)` 宽环境照(用峡谷壁宽度做尺度)+ `JAW & FACE` / `EYE-SOCKET` / `SKIN MACRO` 局部实拍,每张配 caption。
6. **PHOTOGRAPHIC TONE 反复强调"真相机真镜头"**:`every image is a real on-location photograph shot on a real camera with a real lens … slightly soft and imperfect like a real photo`,把"不完美"当目标对抗 AI 过锐。
7. **超长 Avoid 排满 CG/插画 + 错误物种/材质题材级负向**:`3D render, CG model, ZBrush/Blender/octane render, studio lighting, turnaround sheet, VFX reference board, video-game render, unreal-engine look … worm-like body, smooth tube body, sandworm silhouette, blue skin, stone-white, sculpture …`。

### 专门骨架(填空式)
```
模式:文生图(纪实实景多照片设定页 · 反棚拍)
size 16:9 / quality / 2K(细节多,建议上 2K)
用途:on-location documentary photographs 摊一页,反 turnaround/反棚拍,要真实外景照质感

【PROMPT 正文】
Create a sheet of documentary-style, on-location PHOTOGRAPHS of a real <生物名> — as if a film crew or
expedition photographed this enormous real creature out in a real <实景环境> and laid several photographs
on one sheet. Every panel is a REAL PHOTOGRAPH shot on location with natural light — NOT a 3D render,
NOT a studio turnaround, NOT a CG model display, NOT concept art, NOT an illustration. Photographed in a
real <环境> in the soft light of <时段>, with natural directional sunlight, real cast shadows, real bounced
environmental light and faint atmospheric dust haze — NOT flat studio lighting, NOT uniform global
illumination, NOT a neutral seamless backdrop. The same creature stays perfectly consistent across every photograph.
CREATURE — <生物详述;若易读错物种/材质,加"必须读作 X 不是 Y"对比锁定句>.
SKIN/材质 — <活体质感细节 + subsurface scattering,逐条 NOT 排除剥皮/石雕/CG-plastic>.
PHOTOGRAPHS ON THE SHEET:
1. MAIN (large) — wide environmental photograph,<全身在实景,用 canyon walls/环境宽度做尺度>.
2. <局部特写A — 同自然光下怼近拍某结构>.
3. <局部特写B>.
4. <MACRO 材质微距>.
LABELS — short clean English labels under each photograph.
PHOTOGRAPHIC TONE: every image is a real on-location photograph shot on a real camera with a real lens,
natural daylight, real cast shadows and environmental bounce light, natural film grain, realistic lens depth of
field, slightly soft and imperfect like a real photo. <主体读作活体真实材质,逐条 NOT CG/雕塑/剥皮>.
Avoid: 3D render, CG model, ZBrush/Blender/octane render, studio lighting, flat lighting, uniform global
illumination, neutral seamless backdrop, product-shot lighting, turnaround sheet, VFX reference board,
video-game render, unreal-engine look, clean 3D render, illustration, drawing, painting, concept-art, cartoon,
anime, cel-shaded, sketch, <错误物种 silhouette / 错误材质>, oversharpening, HDR effect, plastic smoothing,
oversaturation, default model aesthetic bias.
```

### 完整真实 prompt 全文(gid80 DILONG 纪实照片设定页 逐字 · 可直接改填)
```
Create a sheet of documentary-style, on-location PHOTOGRAPHS of a real colossal creature named "DILONG" — as if a film crew or expedition photographed this enormous real creature out in a real desert-canyon environment, and laid several of the photographs out on one sheet. Every panel is a REAL PHOTOGRAPH shot on location with natural light — NOT a 3D render, NOT a studio turnaround, NOT a CG model display, NOT concept art, NOT an illustration. The creature is photographed in a real arid desert canyon in the soft light of early morning, with natural directional sunlight, real cast shadows, real bounced environmental light and faint atmospheric dust haze — NOT flat studio lighting, NOT uniform global illumination, NOT a neutral seamless backdrop. The same creature stays perfectly consistent across every photograph. CREATURE — DILONG is a colossal, enormously long serpentine dragon, fully photorealistic. It was once a divine eastern dragon; now its godhood has fully eroded and it has become a maddened, eldritch, cosmic-horror thing that cannot die and is not truly alive — only pure chaos and an urge to destroy remain. Its overall read must be unmistakably DRAGON, not worm. The body is a powerful, sinuous, coiling serpentine dragon body with real winding musculature — NOT a smooth limp worm tube — the transverse segmented structure of a dragon's underbelly visible along its underside. Down its back runs a row of degenerated, broken, uneven dorsal spines — the eroded skeletal remnants of a dragon's dorsal crest. The head keeps a strong draconic skull: pronounced brow ridges and an elongated draconic snout. The creature has been stripped of every dragon ornament — completely smooth, limbless, hornless, no claws, no whiskers, no dragon beard, no protrusions other than the broken dorsal spines. SKIN — the body is MOSTLY covered in intact living skin: the skin of a fish that has had every scale torn out — pale, sickly, unhealthy skin with a faint fleshy and tan undertone (a real living skin surface, NOT exposed muscle, NOT a flayed body), mottled and uneven with sallow yellowish and greyish patches, with real skin texture and soft subsurface scattering, lit by the real morning sunlight. This intact sickly skin is the dominant color of the whole creature. Raw pinkish-red flesh shows ONLY in the few broken places, as small accents: deep inside the densely scattered empty scale-sockets (a faint hint of raw pink at the bottom of each pit), where the cheek skin has torn away around the mouth (a little raw flesh, gums and bare teeth), and inside the hollow eye-sockets. No blue tint, not stone-white, not a uniform monochrome. The mouth is built from powerful draconic upper and lower jaws that split open to reveal, deep in the throat, multiple concentric rings of teeth spiraling down into a dark gullet — the only worm-like trait, hidden inside a dragon's jaws. Across the cheeks around the mouth, some skin has torn away, exposing a little raw flesh and bare teeth even when the mouth is shut. Its eyes are gone — hollowed out; in the empty eye-sockets, pink moist granulation tissue has regrown wrong, a bumpy clustered mass cramming and overflowing the sockets. PHOTOGRAPHS ON THE SHEET: 1. MAIN (large) — a wide environmental photograph: the whole Dilong out in the real desert canyon, its long serpentine body rearing and twisting straight upward in one desperate surge with the tail still anchored to the ground, the draconic head and jaws aimed at the sky. The creature is so vast that one stretch of its body fills the entire width of the canyon — the towering canyon walls give the sense of overwhelming scale. Real morning light, real shadows, atmospheric dust. 2. JAW & FACE — a closer on-location photograph of the draconic jaws and cheek in the same natural light; the face covered in pallid sickly skin, some torn patches around the mouth exposing a little raw flesh and bare teeth; jaws splitting open reveal concentric rings of teeth spiraling into a dark throat. 3. EYE-SOCKET — a close-up photograph of an empty eye-socket: the eye gone, pink moist granulation tissue regrown to cram and overflow the socket, set into the surrounding pallid sickly skin, lit by natural light. 4. SKIN MACRO — a macro photograph of the intact scaleless skin in natural light: pale sickly fleshy-tan skin mottled with sallow and greyish patches, real skin texture with subsurface scattering, densely pitted with empty scale-sockets each showing only a faint hint of raw pink deep in the pit. LABELS — short clean English labels under each photograph. PHOTOGRAPHIC TONE: every image is a real on-location photograph shot on a real camera with a real lens, natural morning daylight, real cast shadows and environmental bounce light, natural film grain, realistic lens depth of field, slightly soft and imperfect like a real photo. The creature reads as real sickly living SKIN with subsurface scattering and mottled organic color — NOT exposed muscle over the whole body, NOT a flayed écorché, NOT carved stone, NOT a sculpture, NOT CG-plastic. Avoid: 3D render, CG model, ZBrush render, Blender render, octane render, studio lighting, flat lighting, uniform global illumination, neutral seamless backdrop, product-shot lighting, turnaround sheet, VFX reference board, video-game render, unreal-engine look, clean 3D render, illustration, drawing, painting, hand-painted, concept-art, cartoon, anime, cel-shaded, sketch, fully skinned body, flayed, écorché, all exposed muscle, body covered in raw meat, worm-like body, smooth tube body, sandworm silhouette, blue skin, blue tint, stone-white, sculpture, statue, carved stone, uniform monochrome surface, horns, antlers, claws, limbs, whiskers, dragon beard, multiple extra eyes, cute or friendly look, glowing eyes, oversharpening, artificial sharpness, HDR effect, plastic smoothing, oversaturation, default model aesthetic bias.
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid80**(全文来源):实景反棚拍框架见效——峡谷晨光实拍观感 + 尘霾成立 ✓;峡谷壁做比例尺 ✓;病态苍白去鳞鱼皮材质到位、未滑向蓝皮/石白 ✓。

**反例 / 部分翻车点(同图教训)**
- **gid80**:✗ "必须读作龙不是虫"**偏弱**——蛇形细长光滑躯干仍偏蠕虫/沙虫感,龙形特征不够醒目。**根因**:模型对蛇形巨物有天然虫形倾向,单靠对比锁定句压不住。✎ 补救方向:加强龙形显性特征(brow ridges/draconic snout/dorsal crest 的视觉权重)、把 `sandworm silhouette` 提到 Avoid 最前,或多刷挑最像龙那张。

**变体技巧**
- **"必须读作 X 不是 Y" 对比锁定句**:专治模型对某体型的物种偏置(蛇形→虫、巨物→沙虫)。物种与材质各写一条,正向定义 + 逐条 NOT。
- **实景光逐条对冲棚拍光**:每个棚拍光特征(flat / uniform global illumination / seamless backdrop)都配一个实景反义(directional sunlight / cast shadows / bounced light / dust haze)。

### 校对清单(出图后逐项对账)
- [ ] 整体读起来像**真外景实拍照**吗?(没跑成 CG/turnaround/概念美术/插画)
- [ ] **实景光**到位没?(晨光方向光 + 真实投影 + 环境反弹 + 尘霾,不是平棚光/无缝灰底)
- [ ] 多张照片里是**同一只生物**吗?
- [ ] **物种读对了吗**?(易翻:蛇形被读成虫/沙虫——对比锁定句够不够强)
- [ ] **材质对吗**?(活体皮肤 + subsurface scattering,没滑向剥皮/石雕/CG-plastic)
- [ ] 主环境照有没有**用环境宽度做尺度**(峡谷壁压迫感)?
- [ ] 每张照片配了 caption 吗?

### 坑 & 调参
- **物种偏置压不住是头号坑**:蛇形巨物天然往虫/沙虫跑(gid80 就半翻在这)。加强显性物种特征的视觉权重 + Avoid 前置 `sandworm silhouette` + 多刷挑帧。
- **反棚拍靠"成对句"**:只写正向"实景照"不够,必须配满 `NOT 3D render / NOT turnaround / NOT CG`——少一组模型就回棚拍。
- **细节多 → 上 2K**:多照片 + 局部特写 + 材质微距信息密集,1K 下 eye-socket/skin macro 细节糊。
- **"slightly soft and imperfect" 是目标不是缺陷**:写进 PHOTOGRAPHIC TONE 对抗 AI 过锐塑料感,别被它吓到去加锐化。

---

## 图型 22 · 同物种变体(兽王/精英) ✅

### 何时用
已有一只"普通"生物的设定图,要从它**派生出同物种的兽王/精英/首领个体**——既要**一眼可辨是头领**,又**绝不能跑成完全不同的生物**时。核心矛盾:既要"明显不同"又要"还是同种"。用 Edit 模式基于原版参考图,**PRESERVE 锁底层物种解剖 + 编号差异要点堆叠**两手并用。库内 gid114(从普通甲壳兽派生兽王 Chieftain)。

### 命门(这种图独有的成败关键)
1. **一句话框死核心矛盾**:`SAME SPECIES, but visibly DISTINCT as the king — a viewer must read it as "the same kind of creature, but unmistakably the chieftain, different at a glance."` 把"同种 + 一眼可辨"这对张力写死,后面所有差异点都服务它。
2. **PRESERVE 只锁"底层物种解剖",且明示只锁这些**:`Keep the underlying species anatomy of Image 1 (segmented overlapping plate-armor back shell, eyeless shovel-shaped head with pointed snout, many pairs of thick stubby pillar-like hoofed legs, woodlouse/isopod-like body plan)` + 结尾再复述 `Preserve from Image 1 only the fundamental species body plan … so it stays the same species`。**"only" 是关键**——只锁身体方案,把颜色/角/体量留给差异化,避免 PRESERVE 太宽导致兽王跟原版没区别。
3. **编号差异要点逐条堆叠,且点出 headline difference**:`1. HORNS (the headline difference — it must grow horns)` / `2. COLOR` / `3. SIZE & SILHOUETTE` / `4. BATTLE-WORN ELDER MARKS`。**把最显著差异(角)标成 headline、写 `it must grow horns` / `the common beast has none`**,确保一眼可辨的标志先立住;其余差异(调暗色板/增大体量/老者战损)叠加。
4. **每条差异都"在同一世界里推开"**:如颜色 `shift the palette to set it apart while staying in the same earthy world … still a real weathered mineral/stone material in the same family`——差异化但不脱离原物种的材质家族,防跑成异类。
5. **四视图网格 + 逐格 caption + 净底**:`Four-panel grid (2×2): SIDE / FRONT / 3-4 VIEW / DETAIL — HEAD & HORNS`,`keep all four panels the SAME creature, consistent design and scale`,净棚灰底、`no rider or equipment`、`no environment`。

### 专门骨架(填空式)
```
模式:Edit(基于原版物种参考图,设计同物种变体)
size 21:9 / quality medium / jpeg / Thinking Mode 开
用途:从普通个体派生兽王/精英,要"同种但一眼可辨",净底四视图设定sheet

【参考图标注】
Image 1: the base <物种> — 物种骨架基准。变体须是同物种,但在颜色/外形/头角上要有一眼可辨的明显差异。

【PROMPT 正文】
This is a creature design reference sheet that may appear slightly soft like a real studio-photographed maquette
— this softness is intentional. Design a <CHIEFTAIN/KING/ELITE> individual of the <物种> species shown in
Image 1, presented as a clean creature design sheet on a neutral light-gray seamless studio background, soft
natural studio lighting, a caption label under each panel. Four-panel grid (2×2): top-left "SIDE", top-right
"FRONT", bottom-left "3/4 VIEW", bottom-right "DETAIL — <差异部位>".
SAME SPECIES, but visibly DISTINCT as the <king> — a viewer must read it as "the same kind of creature,
but unmistakably the <chieftain>, different at a glance."
Keep the underlying species anatomy of Image 1 (<逐项列底层解剖:甲壳/头/腿/体型 plan>), but push clear
visual differences in the following ways:
1. <HEADLINE 差异 (the headline difference — it must <grow X>)>: <详述;the common one has none>. <次级差异>.
2. COLOR — shift the palette to set it apart while staying in the same earthy world: <调暗/换色,but still a
   real weathered material in the same family>.
3. SIZE & SILHOUETTE: <更大更高/更具压迫感的轮廓>.
4. <ELDER/精英 标记>: <战损/老者印记/共生附着物堆叠>.
Its bearing reads as <dominant, ancient, imposing>.
Preserve from Image 1 ONLY the fundamental species body plan (<逐项>) so it stays the same species — but
the <差异点 A、B、C> clearly distinguish it as the <king>.
Constraints: keep all four panels the SAME creature, consistent design and scale; clean neutral studio sheet,
no environment, no desert landscape, no sky; no extra creatures; no rider or equipment; keep it a real
biological/mineral creature, not a glossy toy.
PHOTOGRAPHIC TONE: real studio-photographed design maquette, slightly soft, not tack-sharp, photographically
captured not 3D-rendered/AI-stylized, colors restrained not oversaturated.
Avoid: oversharpening, artificial sharpness, heavy digital grain, HDR, AI-generated aesthetic, overpolished
studio look, plastic smoothing, oversaturation, glossy highlight blowout, generic AI image quality, default
model aesthetic bias.
```

### 完整真实 prompt 全文(gid114 兽王 Chieftain v2 逐字 · 可直接改填)
```
GPT-Image-2 兽王个体甲壳兽设定图 Prompt v2 — Chieftain / 兽王（多视图，强化视觉差异）
模式：Edit（基于原版甲壳兽参考图，设计为兽王个体）
quality=medium / output_format=jpeg / size 2K以内 / Thinking Mode 开启
---
【参考图标注】
Image 1: the base 甲壳兽 (armored beast) — 物种骨架基准。兽王须是同物种，但在颜色、外形、头角上要有一眼可辨的明显差异。
---
【PROMPT 正文】
This is a creature design reference sheet that may appear slightly soft and imperfect like a real studio-photographed maquette — this softness is intentional and desired. Design a CHIEFTAIN / KING individual of the armored beast species shown in Image 1, presented as a clean creature design sheet on a neutral light-gray seamless studio background, soft natural studio lighting, a caption label under each panel. Four-panel grid (2×2): top-left "SIDE", top-right "FRONT", bottom-left "3/4 VIEW", bottom-right "DETAIL — HEAD & HORNS". SAME SPECIES, but visibly DISTINCT as the king — a viewer must read it as "the same kind of creature, but unmistakably the chieftain, different at a glance." Keep the underlying species anatomy of Image 1 (segmented overlapping plate-armor back shell, eyeless shovel-shaped head with pointed snout, many pairs of thick stubby pillar-like hoofed legs, woodlouse/isopod-like body plan), but push clear visual differences in the following ways: 1. HORNS (the headline difference — it must grow horns): a pair (or a crown-like cluster) of large, curved, ridged horns sweeping up and back from the top of its head / front shell, like the horns of a great beast — bony, gnarled, battle-chipped, asymmetric from old fights. These horns are the single most recognizable mark of the chieftain; the common beast has none. Add smaller secondary horn-spurs or a ridge of bony spikes running along the crest of its back shell. 2. COLOR — shift the palette to set it apart while staying in the same earthy world: a darker, deeper-toned body — charcoal-brown to near-black weathered shell on the upper plates, with the lower body and leg roots in dark iron-grey, accented by oxidized blue-green / verdigris veins and patina seeping along the plate seams and around the horns, and pale bone-white scarring where old wounds healed. Overall darker and more dramatic than the common beast's sandy-tan, but still a real weathered mineral/stone material in the same family. 3. SIZE & SILHOUETTE: noticeably more massive and taller, heavier domed back-shell plates that sit higher, a more powerful built-up shovel-head with a thick bony ram, a lower and more commanding stance — a mountain-like, imposing silhouette. 4. BATTLE-WORN ELDER MARKS: deep gouges and chipped plate edges, dense clusters of symbiotic bone-beads / bone-strings and barnacle-like encrustations massed along the spine and around the horn bases like a natural crown of seniority, embedded old fragments, verdigris-stained crevices. Its bearing reads as dominant, ancient, and imposing — head held with weight and authority, enormous mass and pressure even standing still. Preserve from Image 1 only the fundamental species body plan (plated shell structure, eyeless shovel head, leg arrangement, woodlouse-like silhouette) so it stays the same species — but the horns, the darker verdigris-accented color, and the greater mass clearly distinguish it as the king. Constraints: keep all four panels the SAME creature, consistent design and scale; clean neutral studio sheet, no environment, no desert landscape, no sky; no extra creatures; no rider or equipment; keep it a real biological/mineral creature, not a glossy toy. PHOTOGRAPHIC TONE: real studio-photographed design maquette, slightly soft, natural lens depth of field, not digitally tack-sharp. Soft natural studio lighting with realistic falloff, not punchy HDR. Materials photographically captured, not 3D-rendered or AI-stylized. Colors restrained, not oversaturated, the verdigris kept muted and earthy. Avoid: oversharpening, artificial sharpness, heavy digital grain, HDR effect, AI-generated aesthetic, overpolished studio look, plastic smoothing, oversaturation, glossy highlight blowout, generic AI image quality, default model aesthetic bias.
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid114**(全文来源,**无明显翻车**):四条差异化全落地(硕大上扫弯角 + 脊背骨刺 / 炭灰近黑 + 铁灰青绿铜锈 + 战疤 / 体量加大 / 老者印记)✓;PRESERVE 物种解剖保持同种 ✓;2×2 四视图 + 逐格 caption(SIDE/FRONT/3-4/DETAIL HEAD&HORNS)完整 ✓;灰底无环境无骑手;与底部原版对照"一眼可辨兽王"成立 ✓。

> 库内仅 gid114 一条同物种变体,无反例对照。可借鉴的"翻车风险"来自同物种、相邻图型的教训:多视图设定图里 caption 缩略易不可读(gid79/gid91)、Edit 派生时若 PRESERVE 写太宽会导致变体跟原版区分不开(gid114 靠 `only` + headline horns 规避了)。

**变体技巧**
- **headline difference 机制**:派生变体时把最显著的那个标志性差异(角/冠/独有部位)单独标成 headline、写 `it must grow X` / `the common one has none`,先立住"一眼可辨";其余差异(色/体量/战损)叠加。这是从"普通个体"派生任何精英变体的通用打法。
- **PRESERVE 用 `only`**:锁底层 body plan 用 `only the fundamental species body plan`,把可变维度(色/角/体量)显式留出,防变体与原版无差异。

### 校对清单(出图后逐项对账)
- [ ] **还是同一物种**吗?(底层 body plan:甲壳/头/腿/体型轮廓没变——没跑成异类生物)
- [ ] **一眼可辨是头领**吗?(headline 差异——角/冠等标志性特征立住没?`the common one has none` 的特征确实长出来了吗)
- [ ] 编号差异**逐条兑现**了吗?(角 / 调暗色板 / 增大体量 / 老者战损,四条都在)
- [ ] 差异化有没有**脱离原物种材质家族**?(色变深但仍是同一类风化矿物/石质,没跑成塑料/异色)
- [ ] 四视图是**同一只**吗?(四格 design & scale 一致,没格间漂移)
- [ ] 净底、无环境/骑手/装备?caption 四格齐?

### 坑 & 调参
- **PRESERVE 写太宽 → 变体跟原版没区别**:务必用 `only the fundamental species body plan`,把色/角/体量显式留作可变,否则锁得太死,兽王跟普通个体一个样。
- **不立 headline → 差异分散、不够"一眼可辨"**:四条差异平铺时模型可能每条都做一点点,合起来不抢眼。把最强标志(角)拎出来标 headline + `must` + `common one has none`。
- **差异化跑成异类**:每条差异都加一句"仍在同一世界/材质家族",防颜色或体型推太远变成另一种生物。
- **caption 缩略可读性**:四视图 + DETAIL 格信息密,2K 下 caption 才稳;1K 易糊(同 gid79/gid91 教训)。

---

---

## 图型 23 · 色卡 color bible(平面 Figma 风) ✅

### 何时用
开拍前要给全片**钉死一套统一配色**、当 production design bible / color management document 用时。**reference-driven(SKILL 总纲第一律):色卡不是文生图,而是图生图 —— 用户给一张电影感场景剧照,本图型从那张剧照里提取主/辅/点缀调色板生成色卡;产出的色卡再作为"电影感色调"参考图喂进全片每条 prompt。** 它不是画面,是**信息图**——给调色、美术、合成各部门发的"色彩字典":N 个色块 + 功能命名 + 精确 HEX,横排或网格,平面矢量风。本片两条实证(EP1 桌面 13 色 gid72、EP2 沙漠日光 13 色 gid161)。**核心反常识:这是全库唯一一种"必须主动反摄影、反电影感"的图型**——其余图型拼命加胶片颗粒,这里要拼命删掉它。

### 命门(这种图独有的成败关键)
1. **反摄影封口是第一命门**:模型默认会把色卡渲染成"摆在桌上的 Pantone 卡照片"(带景深/纸纹/投影/高光)。必须用整段 `OVERALL DESIGN SPECIFICATION` + 超长 Avoid 把它从写实渲染拽回平面设计语言——关键词:`flat 2D vector / Figma or Adobe Illustrator / no depth / no perspective / no lighting / no photographic rendering / no paper texture / clinical / informational`。Avoid 里逐项排掉 `photographic rendering, paper texture, desk surface, depth of field, lens blur, film grain, 3D render, shadows under swatches, glossy finish, mockup of physical object`。
2. **三段式结构化布局**:`ELEMENT 1 = 标题/副标题`、`ELEMENT 2 = 一排/网格色块`、`ELEMENT 3 = 每块下方两行注解(HEX + 功能标签)`。把版式写成"三个元素",模型才不会乱排。
3. **13~22 色 + 功能命名 + 精确 HEX 三件套**:每个色块必须配 `功能命名(hot sunlight cast / hard shadow / cinnabar accent / LED cyan dormant)` + `精确 HEX`。功能命名是色卡的灵魂——它把"这是什么颜色"升级成"这颜色在片里干什么活"。
4. **HEX 以写死的码为准,别回读出图**:1K 分辨率下色块上的 HEX 小字和功能标签**几乎不可读**(gid161 实测翻车点)。出图只用来核对"色相分布对不对",**真实 HEX 永远以 prompt 里写死的码为准**,不要试图从生成图里 OCR 回读——那是糊的。

### 专门骨架(填空式)
```
模式:图生图(输入用户提供的电影感场景剧照 Image 1 → 提取该场景调色板生成色卡;SKILL 总纲第一律,不再纯文生图)
size 16:9 横 / quality 视需要(注:1K 下小字必糊,要逐块核 HEX 请上 2K) / 用途:color bible 物料图 + 后续全片电影感色调输入

【参考图标注】
Image 1(电影感场景参考):仅作为调色板提取来源 —— 从这张剧照提取主色/辅助色/点缀色填进下方色卡;不复制其构图/人物/内容,只提取颜色。

【PROMPT 正文】
A clean digital color palette reference design that EXTRACTS its palette from the provided cinematic scene reference (Image 1), 16:9 horizontal layout, pure flat design aesthetic with NO
photographic elements. Background: solid neutral <off-white #F5F2EC / pure white #FFFFFF>, completely flat,
no texture, no shadow, no paper, no surface.
The composition contains exactly three elements:
ELEMENT 1 — Title (top center): clean sans-serif, solid black <#1A1A1A>, reads "<片名 · EPx · 场景 · PALETTE vN>".
  Subtitle below in smaller gray <#888888>: "<一句调性描述 · N color system>".
ELEMENT 2 — A single horizontal row of <13~22> rectangular color swatches, evenly spaced, identical dimensions,
  sharp clean edges, no gradient, no shadow, no border. The swatches left to right with these exact HEX fills:
  01:<#> 02:<#> … N:<#>
  （可选分组:ROW1 "<PROTAGONIST/主角组>" / ROW2 "<BANDITS/沙匪组>" / ROW3 "<ENVIRONMENT/环境组>"）
ELEMENT 3 — Two lines of small text beneath each swatch: line1 = HEX in monospace <#333333>; line2 = function
  label in smaller sans-serif <#666666>. The N function labels left to right: 01:<hot sunlight cast> 02:<sand
  highlight> … N:<LED cyan dormant>.
OVERALL DESIGN SPECIFICATION: flat 2D digital graphic design layout, the kind produced in Figma or Adobe
Illustrator for a film production design document. No depth, no perspective, no lighting, no photographic
rendering, no paper texture, no physical object. Pure flat vector-style swatches on a flat background with crisp
typography. Production design bible / color management document / design-system documentation. Precise, clinical,
informational, minimal, professional graphic design — not artistic, not painterly, not photographic.
Avoid: photographic rendering, paper texture, desk surface, table surface, depth of field, lens blur, film grain,
photorealistic, 3D render, lighting effects on swatches, shadows under swatches, glossy finish on swatches,
hand-painted look, watercolor, illustration, sketch, mockup of physical object, real-world object simulation.
```

### 完整真实 prompt 全文(gid161 逐字 · 角色-003 / Neo Image 2 official / 16:9 / 1K)
```
A clean digital color palette reference design, 16:9 horizontal layout, pure flat design aesthetic with no photographic elements. The background is a solid neutral off-white #F5F2EC fill, completely flat, no texture, no shadow, no paper, no surface. The composition contains exactly three elements: ELEMENT 1 - Title at the top center: Clean sans-serif typography in solid black #1A1A1A, the text reads: "WANWUSHENG · EP2 DESERT SURVIVAL · DAYLIGHT PALETTE" Below the main title, in smaller lighter gray #888888 sans-serif: "Sun-baked Arrakis tonality · 13 color system" ELEMENT 2 - A single horizontal row of 13 rectangular color swatches, evenly spaced, centered vertically in the frame: Each swatch is a clean flat rectangle of solid color fill, identical dimensions, sharp clean edges, no gradient, no shadow, no border. The 13 swatches from left to right with these exact HEX fills: 01: #F4E6C8 02: #D4B896 03: #A89472 04: #6B5A47 05: #E8E0D2 06: #EAE2D0 07: #2A2620 08: #7A2F2C 09: #D8C9A8 10: #4A332A 11: #A82A2A 12: #6F1F1F 13: #4FC3D9 ELEMENT 3 - Two lines of small text directly beneath each swatch: First line is the HEX code in clean monospace typography, color #333333. Second line is the function label in even smaller clean sans-serif typography, color #666666, describing the color's role. The 13 function labels from left to right: 01: hot sunlight cast 02: sand highlight 03: sand midtone 04: hard shadow 05: bleached sky 06: dust-filmed white 07: heat-bleached black 08: faded burgundy 09: cream linen 10: cracked leather 11: cinnabar accent 12: dark blood 13: LED cyan (dormant) OVERALL DESIGN SPECIFICATION: This is a flat 2D digital graphic design layout, the kind produced in Figma or Adobe Illustrator for a film production design document. No depth, no perspective, no lighting, no photographic rendering, no paper texture, no physical object. Pure flat vector-style color swatches on a flat background with crisp typography. Think production design bible reference sheet, color management document, or design system documentation. The aesthetic is precise, clinical, informational, minimal, professional graphic design — not artistic, not painterly, not photographic. Avoid: photographic rendering, paper texture, desk surface, table surface, depth of field, lens blur, film grain, photorealistic, 3D render, lighting effects on swatches, shadows under swatches, glossy finish on swatches, hand-painted look, watercolor look, illustration, sketch, mockup of physical object, real-world object simulation.
```

> 姊妹版 gid72(场景-004 / Neo Image 2 Lite / 21:9·正文写16:9 / 1K)——同图型另一种写法,**带分组表头**(`ROW1 PROTAGONIST/主角组 4色 → ROW2 BANDITS/沙匪组 3色 → ROW3 ENVIRONMENT/环境组 4色 + TRANSITION/过渡组 2色`),并把风格锚成 `Pantone-style production reference sheet`,顶部标题 `"DESERT DUEL - 15S ACTION SEQUENCE / COLOR PALETTE v1"`、底部 footer `"13 colors / 3 groups / Production Reference"`。两条的精确 HEX 不同(gid72 主角组 Cloak Black #1A1518 / Lining Red #6B1F22 / Skin Tone #D9B89C / Aged Metal #5C544A…),**用哪套以你当前片子的色铁律为准,逐字写死**。

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid161**(角色-003,**本图型最成功样板**·全文来源):ELEMENT 三块结构 + 大段反摄影/反3D规格成功把出图锁在 flat 2D;色块横排、双行注解版式、色相从暖砂→朱红→青色的过渡按 prompt 落地;Avoid 清单见效,**出图无阴影、无纸张、无景深** ✓。
- **gid72**(场景-004):`Pantone-style production reference sheet` + 分组表头(主角/沙匪/环境/过渡)写法成立,把 13 色按叙事职能分了三组,比纯一排更适合发部门 ✓。

**反例 / 打折点**
- **gid161 的可读性翻车**:1K 下色块的 HEX 码与功能标签文字偏小、可读性有限,**精确 HEX 是否逐块严格命中无法在该分辨率核验** ✗。→ 这正是命门 4「HEX 以写死码为准、别回读」的来源:出图的字是糊的,真值在 prompt 里。

### 校对清单(出图后逐项对账)
- [ ] **真的是平面矢量吗?**(最易翻:被渲染成摆在桌上的色卡照片,带景深/纸纹/投影/高光——只要见到任何"实物感"就是反摄影封口没生效,重跑或加重 Avoid)
- [ ] 色块**数量对不对**?(写了 13 就该是 13 块,别多别少)
- [ ] **色相分布**对不对?(暖砂→朱红→青色这种过渡顺序,肉眼能核;这是出图唯一可靠核验的事)
- [ ] 每块下面**有没有功能标签**?(只有 HEX 没功能命名 = 色卡降级成普通色板)
- [ ] HEX 真值**别从图上回读**——以 prompt 写死的码为准(图上小字必糊)
- [ ] 背景是不是**纯平 off-white/white**、无纹理无投影?

### 坑 & 调参
- **要逐块核 HEX,就上 2K**:1K 是 gid161 唯一翻车点(小字糊)。色卡的字比画面密,分辨率换可读性,值得。
- **反摄影是这张图的全部技术含量**:别吝啬 Avoid。`photographic rendering / paper texture / desk surface / depth of field / 3D render / shadows under swatches / mockup of physical object` 一个都别省——少一个,模型就可能滑回"实物色卡照"。
- **功能命名要写"在片里干什么"**,不要写"什么颜色"。`hot sunlight cast / hard shadow / cinnabar accent / LED cyan (dormant)` 这种才有用——它让调色师知道这色块对应画面里哪块光。
- **继承前片色系**:EP2 色卡可以把 EP1 色卡当 ELEMENT 锚喂进去保持系统延续(gid72→gid161 就是 EP1 桌面色系到 EP2 沙漠日光色系的演进),但 HEX 该改还得改,别照抄。
- **分组 vs 一排**:色多(>13)、跨多个叙事单元时用 gid72 的分组表头(主角/反派/环境);色少、单场景用 gid161 的单排。

---

## 图型 24 · 灰底物料抠图 ✅

### 何时用
要把**已有成图/角色图里的某个局部道具**单独抠出来,做成干净的中性灰底物料图(给后期当贴图/参考/资产)时。典型:从"角色全身图"里只要"她腰上挂的那个包"。本片实证是丹眉腰间挂包,**同一句 prompt 复用了三次**(gid147/150/151),靠换参考图批量出料。这是全库**最短、最省**的物料图型——一句中文搞定。

### 命门(这种图独有的成败关键)
1. **指代法定位主体,不描述外观**:不写"一个深褐色抽绳布袋",而写**"人物腰间挂着的那个包"**——用"在哪个位置、挂在谁身上"的**指代**让模型从参考图里自己定位并抠出。外观交给参考图,prompt 只负责"指哪个"。这是抠图的核心写法:你不知道那包长啥样,但你能指出它在哪。
2. **灰底 = 物料图的封口词**:`灰底`一句把背景洗成中性,产出可直接复用、不带原场景污染的资产图。
3. **负向锁细节**:本例 `不要有简体字`——道家符箓必须是篆体/符文样式。物料是什么材质/纹样,就在这里加一句负向把最易翻的项钉死。
4. **同句换参考图批量**:prompt 一字不动,**只换喂进去的参考图 + 节点**,就能批量出不同物料(或同物料刷一致性)。gid147/150/151 三条文案完全相同,是标准化物料模板的典型工作流。

### 专门骨架(填空式)
```
模式:图生图(喂含该道具的角色图/成图当参考 → 抠出局部成独立物料图)
size 1:1(物料图常用方图,便于当资产) / quality 视需要 / 用途:物料图 / 设定图,抠局部道具

【PROMPT 正文 — 一句中文即可】
生成灰底物料图,内容为<指代法定位:人物腰间挂着的那个包 / 角色手里那把刀 / 桌上那只青铜罗盘>。
<道具关键特征一句:包上贴着两个米色道家符箓>,<负向锁最易翻项:不要有简体字 / 不要现代材质>。

（批量:prompt 一字不动,换参考图 + 换节点反复出料即可)
```

### 完整真实 prompt 全文(gid147 逐字 · 角色-004 / Neo Image 2 official / 1:1 / 1K)
```
生成灰底物料图，内容为人物腰间挂着的那个包。包上贴着两个米色道家符箓，不要有简体字。
```

> gid150(角色-007)、gid151(角色-008)**与上文逐字完全相同**——同一句模板的第二、第三次复用批次,仅参考图与节点不同。这正是本图型的标准产能方式。

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid147**(角色-004,全文来源):成功从角色图里抠出挂包成独立物料图;灰底干净;两张米色道家符箓如约出现;符箓用篆体/符文样式、**无简体字——负向约束生效** ✓。
- **gid150**(角色-007,**复用批次**):同款模板复用成功,再次产出干净灰底挂包物料图;米色符箓 + 无简体字均兑现,与 gid147 一致,**证明模板可批量复刻** ✓。
- **gid151**(角色-008,**第三次复用**):标准化模板第三次复用成功,成果与前两条高度一致;米色符箓、篆体、灰底稳定复现,**验证模板稳定性** ✓。

**坑(来自目录的版面教训,非出图翻车)**
- **gid150 的版面残留**:出图上方"参考图1"显示的是机械法器(承接前一条 gid149 的四视图),与实际输出的"包"非同一物体——属批次串接时的版面残留,**不影响成果**,但提醒:批量复用时参考图位容易串接残留,核成果别核版面缩略。

### 校对清单(出图后逐项对账)
- [ ] **抠对了吗**?(指代的那个道具被单独抠出,没把旁边的东西也带出来)
- [ ] **背景是不是干净中性灰**?(没有残留原场景的元素/光污染)
- [ ] **道具特征对不对**?(本例:两个米色符箓在不在、贴的位置对不对)
- [ ] **负向项守住没**?(本例:有没有冒出简体字;符箓是不是篆体/符文样式)
- [ ] 批量复用时,**核的是成果不是版面**(参考图位的串接残留可忽略)

### 坑 & 调参
- **指代要唯一**:"腰间挂着的那个包"之所以work,是因为画面里腰间只有一个包。若画面有多个同类物,指代要更精确("右腰那个""带流苏的那个"),否则模型抠错件。
- **prompt 冻结 + 换参考图 = 批量产线**:这是本图型省到极致的产能方式。要出一整套道具物料,就把这句话存成模板,逐件换参考图跑——别每件重写文案。
- **负向锁最易翻的那一项**:符箓最易被跑成简体字,所以 `不要有简体字`。换别的道具,就锁它最容易被 AI"现代化/简化"的那个点(如"不要现代拉链""不要塑料感")。
- **方图便于当资产**:1:1 输出物料图最通用,后期当贴图/图标都好用。

---

## 图型 25 · knolling 桌面陈列 ✅

### 何时用
要把**一组道具/物件按"整理收纳学(knolling)"摊平在桌面、90° 正俯拍**成一张平面色块感极强的陈列图时(给美术当道具清单 / 当 Wes Anderson 式氛围物料 / 当后期合成的资产总览)。本片实证是丹眉的占卜法器摊在部落桌面(场景-004,原始序号007)。它的难点不在"摆得齐",而在**让模型把桌子读成一个有厚度的三维实物、从正上方拍**——而不是把物件糊成一张平贴的图。

### 命门(这种图独有的成败关键)
1. **90° 正俯 + 桌体三维厚度,双重声明**:开头 `A perpendicular overhead 90-degree top-down photograph … viewed from directly above`,且**专门用一整句强调桌子是有厚度的实物**:`The table is a real three-dimensional physical object with measurable thickness — the wooden tabletop sits raised above the carpet floor on hidden legs … a narrow strip of the wooden side-thickness is visible as a darker band along each of the four edges`,再加 `The raised tabletop casts a soft narrow shadow onto the carpet floor along each edge`。**桌缘的厚度带 + 桌缘投影 = 让"俯拍"读出"桌子浮在地面上"而非"一张平图"的关键。**
2. **逐物 hex + 逐物对齐**:每个物件给精确 hex(`tanned-hide brown #8C6F4A 桌布 / cinnabar red #A82A2A 朱砂符 / ochre yellow #A8744A / indigo #3A4A5C / 青铜罗盘 / 笔 / 墨石 / 朱砂碟 / 铜钱列 / 铜铃 / 卷轴`),并要求 `every object aligns to invisible parallel and perpendicular axes`(knolling 的定义:全部对齐到隐形的平行/垂直轴)+ `deliberate generous empty spacing between item groups`(组间留白)。
3. **Mondrian 计数法做色块平衡**:色块大小**靠数量而非单件尺寸**实现——`the color-block sizing is achieved purely through the quantity and grouping of uniformly-sized strips rather than through any variation in single-strip size`。即:朱砂符全是标准尺寸,5~6 张挤一起 = 大色块,2~3 张 = 中色块,1 张孤蓝 = 最小色块,形成 `asymmetric Mondrian-style balance through quantity`。这是 knolling 出"平面色块画"观感的灵魂。
4. **Avoid 排 fisheye / 透视畸变**:90° 俯拍最易被模型加鱼眼/广角畸变。要把 `fisheye, wide-angle distortion, perspective convergence, tilted angle` 排进负向(本片正文用几何约束 + 桌缘平行来反畸变;补本图型模板时建议显式加 fisheye 负词)。

### 专门骨架(填空式)
```
模式:文生图 / 图生图(喂一张"桌面物品布局参考"锚定 layout、材质、色彩、knolling 排列)
size 21:9 超宽(便于一桌横陈) / quality 视需要 / 用途:桌面陈列物料图

【PROMPT 正文】
A perpendicular overhead 90-degree top-down photograph of a single low wide horizontal <桌/台> viewed from
directly above, the complete table including all four edges fully visible within the 21:9 ultrawide frame, sized to
fill most of the frame against a narrow border of the <floor/底面> beneath.
The table is a real three-dimensional physical object with measurable thickness — the tabletop sits raised above
the floor on hidden legs, and around the perimeter a narrow strip of the side-thickness is visible as a darker band
along each of the four edges, distinguishing the raised top from the floor below. The raised top casts a soft narrow
shadow onto the floor along each edge, the shadow lines defining the elevation. The table is the absolute subject.
<参考图 作为桌面物品布局、材质、色彩、knolling排列方式的视觉锚定参考。>
Every object on the table — <逐物 + 逐 hex:桌布 #_, 朱砂符×5-6 #_, 赭黄符×2-3 #_, 孤蓝符×1 #_, 青铜罗盘,
笔×2, 墨石, 朱砂碟, 铜钱横列, 铜铃, 卷轴, 空布袋> — strictly matches the reference in shape, color, material,
QUANTITY, individual size, and knolling-style alignment positions, each object aligned to invisible parallel and
perpendicular axes with deliberate generous empty spacing between groups.
Mondrian 计数法:color-block sizing achieved purely through QUANTITY and grouping of uniformly-sized strips,
NOT through varied single-strip size — the largest red block = a cluster of 5-6 identical strips, medium ochre block
= 2-3 strips, smallest = 1 lone indigo strip; asymmetric Mondrian balance through quantity.
Lighting: warm soft pool of a single <oil lamp #E87838→#A8401C> from above-behind, deep warm-brown shadows
#4A3E32 in the recesses, narrow cast shadow along each table edge.
35mm Kodak Vision3 500T, Greig Fraser cinematography, Dune 2021 firelit interior aesthetic, skip-bleach LUT,
analog grain, shot as a flat overhead reference photograph at 21:9.
Avoid: fisheye, wide-angle distortion, perspective convergence, tilted angle, <题材级负向>.
```

### 完整真实 prompt 全文(场景-004 逐字 · 原始序号007 / Neo Image 2 official / 16:9·正文写21:9 / 1K)
```
A perpendicular overhead 90-degree top-down photograph of a single low wide horizontal wooden table viewed from directly above, the complete table including all four edges fully visible within the 21:9 ultrawide cinematic frame, the table sized to fill most of the frame with all four wooden table edges clearly visible against a narrow surrounding border of the carpet floor beneath. The table is a real three-dimensional physical object with measurable thickness — the wooden tabletop sits raised above the carpet floor on hidden legs underneath, and around the perimeter of the tabletop a narrow strip of the wooden side-thickness of the table is visible as a darker band along each of the four edges, clearly distinguishing the raised tabletop from the floor below. The raised tabletop casts a soft narrow shadow onto the carpet floor along each of its four edges where the table edge interrupts the lamp light, the shadow lines visibly defining the elevation of the table above the floor. The table itself is the absolute subject of the composition. 参考图 作为桌面物品布局、材质、色彩、knolling排列方式的视觉锚定参考。 Every object on the table — the tanned-hide brown #8C6F4A textile table covering with its faint hand-stitched geometric grid lines and rectangular partition motifs, the cluster of five to six identical cinnabar red #A82A2A Taoist talisman strips knolled together on the left forming the largest color-block, the two to three identical ochre yellow #A8744A talisman strips in parallel alignment forming the medium color-block, the single solitary indigo deep blue #3A4A5C talisman strip forming the smallest color-block, the polished bronze compass with magnetic needle, the pair of parallel brushes, the small ink stone, the small dish of cinnabar pigment, the line of bronze divination coins in equal-spaced horizontal row, the small bronze bell, the folded scroll tied with cord, and the flat-laid emptied drawstring cloth pouch — strictly matches the room reference image in shape, color, material, quantity, individual size, and knolling-style alignment positions. The Wes Anderson tabletop tableau composition, the asymmetric Mondrian-style color-block balance through quantity rather than varied sizes, and the deliberate generous empty negative spacing between item groups all remain identical to the reference. Lighting: the table is lit by the warm soft pool of a single ceremonial oil lamp glow #E87838 falling to #A8401C from above and slightly behind the back edge, the lighting matching the firelit interior dimness of the reference room, with deep warm-brown shadows #4A3E32 in the recesses between items, and a narrow band of cast shadow along each of the four table edges where the raised tabletop edge cuts off light from the carpet floor below. 35mm Kodak Vision3 500T film stock, Greig Fraser cinematography, Dune 2021 firelit interior aesthetic, skip-bleach negative LUT, analog photochemical grain, shot on a real camera as a flat overhead reference photograph at 21:9 ultrawide aspect ratio.
```

> **前置母图(俯视整个房间版,原始序号约011 / p13)**:同一套桌面 knolling 被**嵌进"90° 俯视整个圆形洞窟卧室"**的更大场景里——桌子居中,四周是层叠地毯、睡窝、开盖木箱、墙挂草药。它把桌面 knolling 当卧室的视觉核心,并显式写出 `the dominant 60% color zone = 桌布暖棕 / supporting 30% = 青铜与黑色法器 / 10% hero accent = 两块抢眼色平面`——即在 knolling 里又叠了一层 60-30-10。需要"道具+环境一起出"时用这条母图;只要桌面时用上面的场景-004。

### 范例 gid 谱系(正例 + 反例)
> ⚠ **成败点目录覆盖的是 gid78–176(道具/角色),不含本图型所在的早期"场景类"编号**——线索给的 gid4/10 在两个目录里**查无明细**,故本图型的逐条出图成败点**目录里读不到,如实标注**。以下据 prompt 文本结构自身证据评估:

**正例(prompt 结构成立点)**
- **场景-004**(原始序号007,全文来源):三大命门写法俱全——90° + 桌体厚度双声明、逐物 hex、Mondrian 计数法(`quantity rather than varied sizes`)。是本图型最完整的桌面陈列骨架。
- **俯视整卧室母图**(原始序号约011):在 knolling 外再叠 60-30-10 色区,把道具陈列升级成"带环境的整间俯瞰",证明该骨架可向上嵌套。

**待核(无目录成败点)**
- 两条的**实际出图吻合度、桌面是否被读出三维厚度、是否出现 fisheye 畸变**——均**无目录校准记录**,需回原 PDF 出图页人工核验后补录。

### 校对清单(出图后逐项对账)
- [ ] **是不是真·90° 正俯**?(易翻:被拍成斜俯 3/4,桌面物件就不再是 knolling 平面色块)
- [ ] **桌子有没有读出三维厚度**?(看四条桌缘有没有"厚度暗带 + 落在地面的窄投影";没有 = 糊成一张平图,失败)
- [ ] **物件数量对不对**?(朱砂符 5-6、赭黄 2-3、孤蓝 1——Mondrian 计数法靠数量,数错色块就失衡)
- [ ] **对齐了吗**?(每件是否对齐到隐形平行/垂直轴;组间是否有留白)
- [ ] **有没有鱼眼/广角畸变**?(90° 俯拍模型常加 fisheye,桌缘弯了就重跑或加负词)
- [ ] 逐物 hex 与材质对不对(青铜是不是青铜、符是不是篆体)

### 坑 & 调参
- **桌体厚度那句别删**:整条 prompt 最关键的不是 knolling 排列,而是"让桌子是个浮在地上的三维实物"那一大段。删了,出图就塌成一张贴在地上的平面图,失去陈列感。
- **Mondrian 靠数量不靠尺寸**:所有符纸**同尺寸**,大色块=5-6 张挤一起、中=2-3 张、小=1 张孤的。如果让模型"画一个大红块",它会画一张大符纸——错。要写"5-6 张标准尺寸的符纸聚成大色块"。
- **90° 俯拍是模型阻力区**:和图型01的"真高空鸟瞰"同病——模型对极端正俯有阻力,易滑成斜俯 + 鱼眼。要 `directly above / straight down / 90-degree` 反复说,并把 `fisheye / wide-angle distortion` 排进 Avoid。
- **喂一张布局参考最稳**:正文已写 `参考图 作为桌面物品布局…的视觉锚定参考`。有参考图,模型对"摆哪、几件、什么材质"就不靠脑补,knolling 对齐和数量更准。
- **本图型成败点目录暂缺**:补完后请回原 PDF 核出图,把"实际是否 90°、桌体厚度是否兑现、是否畸变"补进⑤,再校准本条权重。

---

## 图型 26 · 杂志风介绍卡(60-30-10) ✅

### 何时用
要为**单个角色出一张高级时尚杂志风的"人物介绍页"**(i-D / Dazed / AnOther 风),角色当主体大图 + 周围拼贴编辑元素(标题块、宝丽来、便签、符纸、印章、涂黑条),并用 **60-30-10 配色**做版面结构时。本片实证:女主丹眉 gid130(道具-013)、男主江流 gid128(道具-011),两张刻意做成**冷暖双联**(warm/cool diptych)——同一套 60-30-10 结构系统,按各角色服装色反向校准背景冷暖。复跑版 gid137(道具-020)。

### 命门(这种图独有的成败关键)
1. **60-30-10 量化配色,逐档给 hex + 给职能**:`60% DOMINANT = 背景主色`、`30% SECONDARY = 一个大矩形色块(装标题与资料,risograph/offset 粗边)`、`10% ACCENT = 强调色,精确出现在 exactly four places(角色眼睛发光点 / 耳坠 / 一枚印章 / 一处笔触标签),NO other anywhere else`。三档都写死 hex 范围,且 10% 强调**严格只许四处**——这是版面"高级感"不糊的关键。
2. **冷暖双联 = 按角色服装色反向校准背景**:本片最硬的手法。丹眉(白/黑/红服)→ **暖基调**:`foggy warm beige #C9B89A 60% + charcoal-green #2D3530 30% + crimson red #A8202C 10%`;江流(酒红/奶白/棕皮服)→ **冷基调**:`deep stone blue-grey #4A5A5C 60% + smoked earth-brown #5A3D2D 30% + teal-green #4DD4C4 10%`。规则:**背景选与角色服装相反的冷暖**,让人物从背景里跳出来(figure-ground separation)。prompt 里要显式写 `SERIES DESIGN SYSTEM NOTE` 交代两卡如何成对。
3. **figure-ground 临界校准**:背景中明度必须**卡在"比角色暗部亮、比角色亮部暗"之间**——`mid-tone beige must be brighter than her black skirt AND darker than her white tunic`。这一句保证黑裙读暗、白衣读亮,剪影瞬间可辨。
4. **拼贴元素清单逐项点名 + 反对称**:`MAIN TITLE BLOCK(中文名大字 sans-serif modernist + 罗马音)/ DATA FIELDS(资料栏,可全填"?"做悬念)/ KICKER 手写大标 / POLAROID 宝丽来 / 符纸 or 涂黑条 REDACTION BARS / 印章 seal stamp / 归档号 Vol.0x`,排版 `asymmetric — NOT a rigid grid, NOT a centered column`。反对称、反网格是 editorial 的命。
5. **双重反走样**:既要 `STYLE LOCK: i-D / Dazed / AnOther` 锚住时尚杂志语言,又要 `PHOTOGRAPHIC TONE: real printed magazine spread photographed in good light + real paper texture + real ink-on-paper + 宝丽来与印章的真实投影`——让它像"被拍下来的真实印刷页",而非数字海报。Avoid 排掉 `anime cel-shading / video game UI / anime intro card / progress bars / 古风卷轴纸 / brush calligraphy for main title`。

### 专门骨架(填空式)
```
模式:图生图(Ref1 = 角色身份锁脸/服装;可选 Ref2 = 只借姿势 body pose,不借身份/脸/衣/背景)
size 16:9 横 / quality 2K / 用途:角色介绍卡物料图

【PROMPT 正文】
REFERENCE IMAGE(S): Ref1 — preserve identity/face/hair/clothing exactly. (可选 Ref2 — use ONLY body pose &
wind energy, NOT its identity/face/clothing/background.)
INSTRUCTION: 16:9 editorial magazine spread, contemporary high-fashion editorial (i-D / Dazed / AnOther). A
character introduction page; this is card N in a series — companion to card N-1.
COMPOSITION: <角色> stands center-LEFT, ~35-40% canvas width, full body head-to-feet, <pose 一句>. Right
55-60% = editorial collage, arranged asymmetrically — NOT a rigid grid, NOT a centered column.
COLOR PALETTE (60-30-10):
  60% DOMINANT — <背景主色 + hex 范围>(按角色服装反向选冷/暖;NOT <易跑偏的近似色逐个排除>).
  30% SECONDARY — <大矩形色块 + hex>,占右上 25-30%,装 main title + data,light cream type,risograph 粗边.
  10% ACCENT — <强调色 + hex>,EXACTLY four places:(1)<眼/光点>(2)<耳坠/饰>(3)一枚印章(4)一处笔触标签.
    NO other <强调色> anywhere.
SERIES DESIGN SYSTEM NOTE: card N-1 用了<暖基调三色>;本卡用<冷基调三色>,二者成 warm/cool diptych,同一
  60-30-10 结构、按角色服装色各自校准.
FIGURE-GROUND:背景中明度必须 brighter than <角色暗部> AND darker than <角色亮部>,剪影 instantly readable.
EDITORIAL COLLAGE:1 标题块(中文名大字 modernist sans-serif + 罗马音)/2 资料栏(姓名/年龄/身份/能力/性格/
  携带物,可全填"?")/3 KICKER 手写大标"目前可以公开的情报"/4 宝丽来(白边微倾、投影)/5 符纸 or REDACTION
  涂黑条/6 印章(seal-script "壹号/档案壹")/7 归档号 "Vol.0x / 万物生 / 人物志".
PRESERVE / CHANGE / CONSTRAINTS / STYLE LOCK (i-D/Dazed/AnOther) / PHOTOGRAPHIC TONE (real printed
  magazine spread, paper texture, ink-on-paper, real polaroid & stamp shadows).
Avoid: anime cel-shading, manga, 3D render, video game UI, anime intro card, progress bars, brush calligraphy for
  main title, antique scroll paper, bamboo/desert/mecha/school background, garbled Chinese, >four accent points,
  symmetrical grid, centered column.
```

### 完整真实 prompt 全文(gid130 逐字 · 道具-013 / Neo Image 2 official / 16:9 / 2K · 女主丹眉「暖联」)
```
REFERENCE IMAGES: 参考图 — Reference 1: the young woman. Preserve her identity, face, hair, hair accessories, and clothing exactly from this image. 参考图 — Reference 2: the body pose. Use ONLY the body posture and the wind-blown energy from this image. Do NOT use this image's character identity, face, clothing, eye color, or background setting. INSTRUCTION: Generate a 16:9 aspect ratio editorial magazine spread, in the visual language of contemporary high-fashion editorial design (think i-D Magazine, Dazed & Confused, AnOther Magazine cover spreads) — a character introduction page laid out as a magazine editorial with the character as the dominant photographic subject and a curated collage of editorial elements (text blocks, polaroids, sticky notes, talisman strips, stamps) arranged around her. This is NOT a generic anime character card. The aesthetic is high-end print magazine, not video game UI, not anime intro card, not Chinese antique scroll. COMPOSITION (16:9 landscape): The frame is divided by visual weight rather than rigid grid. The young woman from Reference 1 stands in the center-LEFT portion of the frame, occupying roughly 35-40 percent of the canvas width, positioned from the lower edge of the frame upward to the upper edge. Her full body is visible (head to feet). She is in the exact dynamic pose from Reference 2 — torso arched, right arm raised overhead with elbow bent and forearm crossing forehead in shielding gesture, left hand at hip, face angled upward, hair and clothing being blown by strong upward wind. Her crimson red glowing eyes (#A8202C to #C42435) and her vivid crimson red waist sash ribbons trailing across the frame are preserved from her established design. The right 55-60 percent of the canvas is the editorial collage area, with elements arranged asymmetrically — NOT a rigid grid, NOT a centered column. The layout follows magazine editorial principles: asymmetric balance, white space, varied scale, intentional irregularity. COLOR PALETTE (60-30-10 RULE): 60% DOMINANT — Foggy Warm Beige Background: The dominant background color filling most of the canvas is a soft, matte, slightly desaturated warm beige (#C9B89A to #B8A88A range) — think aged museum wall, premium magazine paper, or a foggy desert dawn. NOT bright cream, NOT yellow, NOT brown — it sits in the mid-tone range with a slight gray undertone. The surface has subtle paper-grain texture, slightly weathered, with very faint variation in tone across the canvas to avoid feeling flat. This mid-tone beige is critical: it must be brighter than the woman's black skirt (so the skirt reads dark against it) AND darker than her white tunic (so the tunic reads bright against it). 30% SECONDARY — Charcoal Dark Color Block: A large rectangular charcoal-dark color block (#2D3530 to #3A3530 range — a deep charcoal with a faint green-grey undertone, NOT pure black) occupies the upper-right portion of the canvas, roughly 25-30 percent of the canvas area. This dark block serves as the container for the main editorial title and the introductory paragraph text, which is set in light cream/white type on the dark block. The block has clean rectangular edges but with a slight rough/printed quality at the edges (like risograph or offset print), not a sharp digital edge. 10% ACCENT — Crimson Red Highlights: The crimson red (#A8202C to #B91C2A range) appears in exactly four places: (1) the woman's glowing eyes, (2) her waist sash ribbons trailing through the frame, (3) one round vermillion red ink stamp pressed onto the editorial area, (4) one small red label or red brushstroke accent on one of the collage elements. These four red points form a visual rhythm across the canvas. NO other red anywhere else in the image. EDITORIAL COLLAGE ELEMENTS (arranged asymmetrically in the right 55-60% of canvas): 1. MAIN TITLE BLOCK (top right, inside the charcoal dark block): At the top of the charcoal block, the character name "丹眉" rendered in two large bold contemporary Chinese typeface characters (sans-serif modernist style, NOT brush calligraphy, NOT old-fashioned — think contemporary fashion magazine title typography), in cream-white color (#F0E8D8) on the charcoal background. Below the Chinese name, the romanization "DANMEI" in a smaller weight, set in a clean sans-serif Latin typeface, also in cream-white. 2. INTRODUCTORY PARAGRAPH (below the title, still inside the charcoal block): Below "丹眉 / DANMEI", a short paragraph of cream-white Chinese body text in a clean serif typeface (like a modern Chinese typeface — Source Han Serif style), reading exactly: 姓名:丹眉 年龄:21岁 身份:现代道士 / 二流演员 道术:不明 性格:喜欢摆烂 携带物:随身布袋, 内有神秘小道具 The text is set with comfortable line spacing, reading top-to-bottom in horizontal lines. The text size is small but legible. 3. EDITORIAL HEADLINE / KICKER (placed prominently outside the charcoal block, somewhere on the beige background): A handwritten-style stroke of text in deep ink-black, reading "目前可以公开的情报" — set as if hand-brushed onto the canvas, slightly imperfect, with a small splatter or dry-brush quality. Position: floating in the beige area, perhaps near the upper edge of the canvas spanning toward the figure, like a magazine cover line. 4. POLAROID PHOTO (lower right area of beige background): A small polaroid-style photo, white-bordered, slightly tilted at an angle, casting a soft drop shadow on the beige background as if it's been physically placed on the page. Inside the polaroid frame: a small close-up image of the young woman in a different moment (her face in shadow, eyes closed, head tilted — a quieter contemplative moment in contrast to her dynamic main pose). Below the photo, handwritten in pencil or fine-tip pen: "丹眉 · 二〇二六". 5. TALISMAN PAPER STRIPS (scattered): Two or three small yellow-cream paper talisman strips (the kind that the character carries in her satchel), each with brushed red Chinese characters drawn on them in a calligraphic seal-script style. These are tucked into the page at slight angles, some with their edges curling, some partially overlapping other elements. They add red accent flecks scattered across the layout. 6. VERMILLION SEAL STAMP (one prominent location): A round vermillion red ink seal stamp (#A8202C), placed somewhere on the editorial area as if hand-pressed onto the page. The stamp contains seal-script Chinese characters like "壹号" or "档案壹". The stamp impression is slightly imperfect — uneven ink density, slight smearing at the edges, like a real hand-pressed stamp. 7. SMALL EDITORIAL DETAILS (subtle, sparingly placed): - A small bar code or filing-number element printed in tiny type somewhere in a corner (e.g., "Vol. 01 / 万物生 / 人物志") - A thin horizontal hairline rule or two breaking up the layout - A small page number or issue number marker in a corner LIGHTING ON THE FIGURE: The young woman is lit with warm side-light from camera-left, exactly as in Reference 1, with her white tunic catching warm highlight and her right side falling into cool shadow. She reads as a photographed model standing in front of the editorial backdrop. Her edges have clean separation from the beige background — the dark skirt reads dark against the mid-tone beige, the white tunic reads light against the mid-tone beige. CRITICAL FIGURE-GROUND RULE: The mid-tone beige background must be calibrated so that BOTH the woman's white tunic AND her black skirt have clear tonal separation against it. The tunic should appear bright/highlighted against the beige; the skirt should appear deeply dark against the beige. Her silhouette must read instantly. PRESERVE FROM REFERENCES: - Reference 1: complete face identity, hairstyle, hair accessories, full clothing design, satchel, all details - Reference 2: ONLY the body pose and wind-blown dynamic energy CHANGE FROM REFERENCES: - Reference 1's eyes → glowing crimson red supernatural eyes - Reference 1's static studio pose → dynamic pose from Reference 2 - Reference 2's character → entirely replaced by Reference 1's woman - Reference 2's clothing → entirely replaced by Reference 1's clothing - Reference 2's school background → entirely replaced by the magazine editorial layout described above CONSTRAINTS: Do not add any other characters besides the woman (the polaroid photo can show her in a different moment, but no other people). Do not add weapons. Do not include English text other than "DANMEI" and possibly small filing-number Latin characters. Do not let the beige background turn yellow, brown, or cream — it must remain in the foggy mid-tone beige range. Do not let the dark color block turn pure black — it must be the charcoal-green-grey tone specified. Do not add more than four crimson red points to the image — strict 10% accent rule. Do not use brush calligraphy for the main "丹眉 / DANMEI" title — it must be contemporary modernist typography. Do not use anime cel-shading on the figure — preserve the painterly cinematic rendering. Do not include school uniform elements, school setting, cherry blossoms, bamboo slip walls, desert, or mecha. Do not let the layout feel symmetrical or grid-aligned — the asymmetric editorial irregularity is the point. Do not add UI elements like progress bars, icons, digital glyphs, or video-game-style frames. Do not use brush calligraphy or scroll-paper textures as the dominant background — this is a contemporary editorial spread, NOT an antique scroll. STYLE LOCK: Contemporary high-fashion editorial magazine aesthetic — i-D Magazine, Dazed, AnOther Magazine reference. Painterly cinematic figure photography of the woman, set within a curated asymmetric editorial layout with multiple typographic and material elements (polaroid, talisman strips, ink stamp, dark text block). Fine organic film grain throughout. Medium contrast with clear figure-ground separation. Color palette strictly: foggy warm beige (#C9B89A) at 60%, charcoal-grey-green (#2D3530) at 30%, crimson red (#A8202C) at 10% accent, plus the woman's natural colors (skin, white tunic, black skirt, brown satchel) which sit in the mid-tones. PHOTOGRAPHIC TONE: This image should appear like a real printed magazine spread photographed in good light — slightly soft, organic film grain, real paper texture on the background, real shadows cast by the polaroid and stamp elements as if physically placed on the page. No HDR, no plastic smoothing, no oversharpening, no over-polished digital look. Natural skin texture on the woman with visible pores. Real ink-on-paper rendering of all text — slight bleed, slight unevenness in ink density. Real polaroid white-border slightly yellowed with age. Real vermillion stamp ink unevenly absorbed into paper fiber. Avoid: oversharpening, HDR effect, beauty-filter skin, plastic smoothing, oversaturation of non-red elements, anime cel-shading, manga style, digital painting style, 3D rendered look, doll-like skin, neon glowing eyes that look cyberpunk, video game UI, anime intro card style, progress bars, technology icons, digital glyphs, garbled Chinese characters, fake calligraphy that doesn't form real characters, brush calligraphy for main title, antique scroll paper texture, bamboo background, desert background, mecha, school setting, school uniform, cherry blossoms, additional human characters, weapons, light yellow background, dark brown background, generic anime poster, oversaturated colors, symmetrical grid layout, centered column.
```

> **冷联(男主江流 gid128 / 道具-011)关键差异**——同结构反色校准:`60% deep stone blue-grey #4A5A5C→#3D5560 + 30% smoked earth-brown #5A3D2D→#4A3525 + 10% teal-green #4DD4C4→#6BE0CC(同他眼睛光点/耳坠的青绿)`;姿势改成 `extreme JoJo Hirohiko Araki backward-arch pose`(脊柱反弓、LED 面板朝天、一手扪自己机械颈);资料栏全填 `?`(姓名/年龄/身份/能力/性格/携带物);accent 仍严格四处;`SERIES DESIGN SYSTEM NOTE` 明写"第一张卡用暖米底+炭绿块+绯红 accent,本卡用冷石蓝底+烟棕块+青绿 accent,二者成 warm/cool diptych"。gid137(道具-020)是男卡复跑版。

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid130**(道具-013,女主丹眉「暖联」·全文来源):60-30-10 三档色块、figure-ground 临界校准、拼贴元素清单、i-D/Dazed style lock 俱全。资料栏中文照填(`身份:现代道士/二流演员 性格:喜欢摆烂`),双参考分工(Ref1 锁身份 + Ref2 只借姿势)成立。
- **gid128**(道具-011,男主江流「冷联」):**冷暖双联的另一半**——成功用冷石蓝背景对比角色暖色服装、teal-green 严格四处、JoJo 反弓姿势 + "身体在嘶吼、面板无表情"的核心张力写入 prompt;`SERIES DESIGN SYSTEM NOTE` 让两卡成对的系统设计是本图型最聪明的一招。
- **gid137**(道具-020):男卡复跑版,印证重型 editorial prompt 靠多 run 筛帧。

**反例 / 打折点(来自目录校准)**
- **gid162**(角色-004,**同系的片头标题卡**,非介绍卡但同 60-30-10/精确 hex 家族):荧光绿空画框留负空间(预埋绿幕)、logo、副标、底部"我是谁?"三处文字均到位 ✓;但**四角中国结的"珠宝级精工/金珠/红流苏"在缩略图层级看不清是否真做到精工,很可能被简化** ✗——**重型 prompt 中最易打折的恰是"精工细节"那一项**。介绍卡里对应的高危项就是:符纸上的篆体红字、印章 seal-script、宝丽来里的小脸,缩略图下都可能糊。

> ⚠ gid128/130 的**逐张出图吻合度在道具目录明细里未单列校准行**(目录手法索引把它们归入"60-30-10配色系统/系列双联设计系统/版式编排物料",gid128/130/137 三条),**其"figure-ground 是否达标、四处 accent 是否被多画、中文是否乱码"等逐项出图核验,目录未给明细,需回原 PDF 出图页核**。同系 gid162 的"精工细节打折"是目录里**唯一明确记录**的本家族翻车点,据此推断介绍卡的同类高危项。

### 校对清单(出图后逐项对账)
- [ ] **60-30-10 三档色块都在吗、比例对吗**?(背景主色占大头、30% 大矩形块装标题、10% 强调色点睛)
- [ ] **10% 强调色是不是严格只有四处**?(最易翻:模型多画绿/红点,版面就乱——超过四处即超标)
- [ ] **figure-ground:角色从背景跳出来了吗**?(黑裙读暗、白衣读亮;背景明度卡在两者之间没有)
- [ ] **冷暖双联:这张的背景冷暖是不是和角色服装相反**?(暖服配冷底 / 冷服配暖底)
- [ ] **版面反对称吗**?(易翻:跑成居中列/规整网格,就丢了 editorial 味)
- [ ] **中文有没有乱码**?(标题大字、资料栏、印章 seal-script、符纸红字——逐处看是不是真字)
- [ ] **像"被拍下来的印刷页"吗**?(宝丽来/印章有没有真实投影、纸纹;不是数字海报)
- [ ] **高危精工项**:符纸篆体字、印章、宝丽来小脸是否糊成一团(同 gid162 中国结打折点)

### 坑 & 调参
- **10% accent 必须写死"exactly four places + NO other anywhere"**:不写死,模型会到处撒强调色,版面立刻廉价。逐一点名那四处(眼/饰/印章/标签),并在 Avoid 里加 `more than four accent points`。
- **冷暖双联是系列感的来源**:出一组角色卡时,**先定每个角色服装的冷暖,再给背景配相反的冷暖**,并把 `SERIES DESIGN SYSTEM NOTE` 写进每张 prompt 交代它和前一张如何成对。这样整组卡既统一(同 60-30-10 结构)又有别(各自 accent 色),是本图型最值钱的一招。
- **figure-ground 临界句别省**:`背景明度 brighter than 暗部 AND darker than 亮部` 这句直接决定剪影能不能瞬间读出。角色有黑白对比强的服装时尤其要写。
- **重型 prompt 靠多 run 筛帧**:gid137 就是 gid128 的复跑。这种 1500+ 词的 editorial prompt 一次难全对(中文易乱码、accent 易超数、精工易糊),冻结文案多 run 挑最好那张。
- **最易打折的是"精工细节"**:符纸篆体、印章 seal-script、宝丽来里的小脸——分辨率不够就糊。要么上 2K+,要么接受这些细节在缩略层级看不清(同 gid162 中国结教训)。
- **反走样双保险**:`STYLE LOCK(i-D/Dazed/AnOther)` 锚时尚杂志语言 + `PHOTOGRAPHIC TONE(real printed magazine spread)` 锚真实印刷质感,缺一不可——只锁 style 会出数字海报味,只锁 tone 会丢 editorial 排版。

---

---

## 图型 27 · EVA 风人物海报(借姿势不借人) ✅

### 何时用
要把**一个已有角色重组进平面图形海报**——身份保留、但换一套更有张力的姿势 + 改个别特征(如发光赤瞳)、配满版文字底纹背景、落片名——做角色物料 / 关键视觉 / 片名海报时。版式语言是 **EVA(新世纪福音战士)式平面海报**:单人主体压满画面、背后是密集的文字图案墙。它**不是写实成片**,是 flat graphic-design poster。本片用它出丹眉海报(gid138 竖版 9:16 / gid140 横版 4:3,同一段 prompt 只换画幅)。

### 命门(这种图独有的成败关键)
1. **双参考图职责切分,且逐项显式禁用**:这是全图型的命根。Ref1 只给身份(`Preserve her identity, face, hair, hair accessories, and entire clothing exactly`),Ref2 只给姿势 + 风动能(`Use ONLY the body posture and the wind-blown energy of hair and clothing`)。然后**一句不留地禁用 Ref2 的脸 / 服 / 眼色 / 背景**:`Do NOT use this image's character identity, face, clothing, eye color, or background setting`。"借姿势不借人"是高频翻车点,靠这套切分 + 末尾 CHANGE 块二次复述(`Reference 2's character → entirely replaced by the woman from Reference 1`、`school uniform → entirely replaced`、`school background → entirely replaced by bamboo wall`)彻底锁死。
2. **红是全图唯一高饱和(THE CONTRAST PRINCIPLE)**:发光赤瞳是**全图最高饱和单点**(`the single highest-saturation point`),红腰带 + 红发穗是仅有的另两处饱和红;**其余一切压成低饱和深色**。背景文字墙刻意做暗(`Do not lighten the bamboo background`)、永不与人物抢亮度(`background brightness competing with figure` 进 Avoid)。视觉层级靠"亮人物 vs 深文字墙 + 三处红"建立。
3. **背景是平面文字墙、零透视**:`flat backdrop with NO perspective depth, NO three-dimensional space` + `purely a wall of text at the same depth`。文字必须是**正经成形的篆隶字**(`properly-formed seal-script / clerical-script, not garbled glyphs`),且塞进项目主题关键词(万物生・超度・道生一・三生万物…)。
4. **片名是版面上最大的字、与底纹小字明确分层**:`万物生` 三字墨笔篆书竖排右侧,`clearly distinct from the small bamboo-slip text`,`No other large text`。
5. **模板写死、只换画幅批量产出**:gid140 相对 gid138 正文一字不动,仅改 aspect ratio 再跑一次成套物料。

### 专门骨架(填空式)
```
模式:图生图(双参考图 → 合成平面海报)
size 9:16 或 4:3(同 prompt 换画幅即可成套)/ quality medium / Neo Image 2 official
用途:角色物料/片名海报,EVA 式平面图形海报,非写实成片

REFERENCE IMAGES:
- Reference 1: <角色>。Preserve identity, face, hair, hair accessories, and entire clothing EXACTLY.
- Reference 2: the body pose。Use ONLY body posture + wind-blown energy of hair/clothing.
  Do NOT use this image's character identity, face, clothing, eye color, or background.

INSTRUCTION: Generate a <画幅> Chinese cinematic film poster combining these two references,
in the visual language of a flat graphic-design poster — single character over a patterned
typographic background — like a Neon Genesis Evangelion character poster, figure dominating
against a dense text-pattern backdrop.

COMPOSITION: <角色> from Ref1 fills ~75-80% of canvas vertically, full body, centered, in the
EXACT dynamic pose from Ref2 with hair/sleeves/<布料> wind-blown. Eyes are the ONLY modification
from Ref1: <发光赤瞳 hex,supernatural luminous like lit coals, irises bright红 / whites natural>.
Everything else preserved exactly from Ref1.

BACKGROUND — <满版文字墙>:flat wall-like pattern edge-to-edge,<材质做旧深色 hex>,竖排篆隶字
top-to-bottom right-to-left,塞入主题关键词<…>,NO perspective / NO 3D / flat at same depth,做旧裂纹尘патина。

COLOR & TONE / THE CONTRAST PRINCIPLE:背景深低饱和坐阴影;人物中亮调站前;<红 hex>(眼/腰带/穗)是
全图唯一全饱和、视觉层级峰值;非红元素一律 slight gray tone, NOT oversaturated。

TITLE TYPOGRAPHY:片名 <万物生> 大墨笔篆书竖排<位置>,与小字底纹明确分层,版面最大字,无其他大字。

PRESERVE FROM REFERENCES / CHANGE FROM REFERENCES:(逐条复述身份保留项 vs 改动项)
CONSTRAINTS:不加其他角色/机甲/武器/手持物;不留 Ref2 的校服/校园/天空/樱花;背景不加透视;无 logo/水印;
            无英文;篆隶字不可乱码;背景不可提亮。

STYLE LOCK:Flat graphic-design poster(EVA 时代日式动画海报传统)+ 中式神话符号;painterly 人物 + flat 文字底纹;
           细胶片颗粒;<色板 hex 全清单>。
PHOTOGRAPHIC TONE:像真实印刷海报、略软不锐(此软是刻意);真人皮肤毛孔瑕疵,无塑料感。
Avoid:oversharpening, HDR, beauty-filter, AI aesthetic, anime cel-shading, 3D, 校服/校园/樱花/天空,
       额外角色, 手持武器, 背景透视, 乱码汉字, 英文, watermark, 提亮背景, background brightness competing with figure,
       neon-glowing eyes that look digital/cyberpunk。
```

### 完整真实 prompt 全文(gid138 / 道具-021 逐字 · gid140 仅换画幅复用)
```
REFERENCE IMAGES: 参考图 — Reference 1: the young woman. Preserve her identity, face, hair, hair accessories, and entire clothing from this image exactly. 参考图 — Reference 2: the body pose. Use ONLY the body posture and the wind-blown energy of hair and clothing from this image. Do NOT use this image's character identity, face, clothing, eye color, or background setting. INSTRUCTION: Generate a 4:3 aspect ratio Chinese cinematic film poster combining these two references into a single new composition, in the visual language of a flat graphic-design poster with a single character figure over a patterned typographic background — similar in structural approach to a Neon Genesis Evangelion character poster where the character dominates the frame against a dense text-pattern backdrop. COMPOSITION: The young woman from Reference 1 is the dominant subject filling almost the entire frame. She occupies roughly the central 75-80 percent of the canvas vertically — from below her feet at the lower edge up to near the top of her raised hand at the upper edge of the frame. Her full body is visible (head to feet), centered horizontally. She is in the exact dynamic pose from Reference 2, with her hair, sleeves, sash ends, and talisman papers being blown by a strong upward wind. Her eyes are the only modification from Reference 1: they now glow a vivid blood-crimson red (#C41E2E to #D32436), supernatural and luminous like lit coals, with subtle internal glow — the irises bright red while the whites of the eyes remain natural. Everything else in her appearance — face, hairstyle, hair tassels, hairpin, full clothing, satchel — is preserved exactly from Reference 1. BACKGROUND — DEEP-TONED VERTICAL BAMBOO SLIP TEXT WALL: The entire background behind the woman is a dense, flat, wall-like pattern of ancient Chinese vertical bamboo slip strips arranged side by side, completely filling the canvas from edge to edge. Each bamboo slip is a long vertical strip of weathered DEEP AGED bamboo, rendered in dark caramel-brown tones (#6B4F30 to #4A3520 range) — like ancient bamboo slips that have been buried for centuries, dust-coated, shadowed, and aged. The bamboo is significantly darker than fresh tan-beige bamboo, sitting closer to dark mahogany and aged leather tones. The slips are bound by faint horizontal cord lines, with vertical columns of Chinese seal-script (篆书) and clerical-script (隶书) characters brushed in deep ink-black down each strip, reading top-to-bottom, right-to-left in traditional Chinese book layout. The text content on the bamboo slips is a dense mixture of project-thematic keywords, Daoist scripture fragments, and Shan Hai Jing (Classic of Mountains and Seas) excerpts, with the following keywords appearing prominently and repeatedly across the bamboo slip field, in legible large characters: 万物生・超度・机甲尸骨・盘古既死・九州破碎・道生一・一生二・二生三・三生万物・山海有兽・神兽既亡・关羽・玉门关・西出阳关・符箓・往生・尘归尘・土归土・血肉沉沙・钢骨为山・天地不仁・以万物为刍狗 Additional smaller bamboo slips between these keywords contain longer columns of unreadable but properly-formed seal-script and clerical-script Chinese characters resembling classical Daoist text and Shan Hai Jing-style ancient prose, creating a dense textural pattern of language. The bamboo wall has heavy weathering and age — some slips lightly cracked, some characters faded, a faint patina of dust. It is rendered as a flat backdrop with NO perspective depth, NO three-dimensional space behind the woman — purely a wall of text-bamboo at the same depth across the canvas. Subtle warm side-light from camera-left gives the bamboo a gentle low-key gradient from slightly less-dark on the left to deeper-dark on the right, but the overall tone remains deep and shadowed throughout. The bamboo wall should read as a dark, moody, weathered backdrop — not as a bright surface competing with the figure. COLOR & TONE STRATEGY: The bamboo slip background is rendered in DEEP low-saturation aged earth tones — dark caramel, aged mahogany, dust-shadowed brown, with deep ink-black characters. It is the BACKGROUND PATTERN, deliberately muted and sitting in shadow. The young woman is rendered with cinematic presence: her white tunic catches warm side-light from camera-left and stands out as a bright element against the dark background, her black skirt sits in cool shadow on its right side, her skin reads in natural mid-tone warm light. Her crimson red sash and red braided hair tassels are intensified to vivid, luminous crimson red (#A8202C to #C42435) — bold and saturated, reading as bright red brushstrokes against the dark bamboo. Her crimson red glowing eyes (#C41E2E to #D32436) are the single highest-saturation point in the entire image, with a subtle supernatural luminosity. The waist sash ribbons trailing through the center of the frame cut bold red lines across the dark background, leading the viewer's eye upward toward her face and eyes. THE CONTRAST PRINCIPLE: A mid-to-bright tone figure (white tunic + warm skin + vivid red accents) stands forward against a DEEP dark text wall. The woman's silhouette must read instantly against the bamboo pattern, never blending. The red accents (eyes, sash, tassel) are the only fully saturated colors in the entire image — they pop as the visual hierarchy peak. TITLE TYPOGRAPHY: The Chinese film title "万物生" rendered in three large bold weathered ink-brushed seal-script characters, placed prominently — suggested position: vertically arranged down the right side of the frame (right margin), three characters stacked top-to-bottom, in deep ink-black with slight dry-brush edge texture, large enough to read instantly. The title sits on top of the bamboo slip background but is clearly distinct from the small bamboo-slip text — it is the dominant typographic element on the canvas. No other large text on the poster. PRESERVE FROM REFERENCES: - Reference 1: complete face identity, hairstyle, hair accessories, full clothing design and materials, satchel - Reference 2: ONLY the body pose and the wind-blown dynamic energy of hair and fabric CHANGE FROM REFERENCES: - Reference 1's eyes → glowing vivid crimson red supernatural eyes - Reference 1's static studio pose → dynamic pose from Reference 2 with wind-blown hair and clothing - Reference 2's character → entirely replaced by the woman from Reference 1 - Reference 2's school uniform → entirely replaced by Reference 1's clothing - Reference 2's school courtyard background → entirely replaced by the deep-toned bamboo slip text wall described above CONSTRAINTS: Do not add any other characters, mechs, or figures besides the woman. Do not add weapons in her hands. Do not include any school uniform elements, school buildings, cherry blossoms, sky, clouds, or any environmental setting from Reference 2 — the background is ONLY the flat bamboo slip text wall. Do not let Reference 2's original character identity or face appear. Do not add three-dimensional depth or perspective to the background — the bamboo slips form a flat wall. Do not add logos or watermarks. Do not include English text anywhere. The bamboo slip characters must be properly formed traditional Chinese seal-script or clerical-script, not garbled glyphs. Do not lighten the bamboo background — it must read as deep and shadowed. Do not boost saturation on any element except the specified red accents (eyes, sash, hair tassel). STYLE LOCK: Flat graphic-design poster aesthetic in the tradition of Japanese anime film posters (Evangelion-era) but with Chinese mythology iconography. Painterly cinematic figure rendering of the woman, set against a flat textural typographic background. Fine organic film grain. Medium contrast with deep shadows in the background and brighter mid-tones on the figure. Color palette: deep aged bamboo (#6B4F30 to #4A3520), ink-black text (#1A1410), woman's white tunic (#E8DFD0), woman's warm skin tones, woman's black skirt (#1C1814), vivid crimson sash and tassel (#A8202C to #C42435), glowing crimson eyes (#C41E2E to #D32436) as the sole highest-saturation accent. Slight gray tone overall on non-red elements, NOT oversaturated except for the three specified red elements. PHOTOGRAPHIC TONE: This image is a film poster that should appear slightly soft and imperfect, like a real printed poster rather than a sharp digital render — this softness is intentional and desired. Soft natural lighting on the figure with realistic falloff, not punchy HDR. Subtle organic film grain only, not heavy digital noise overlay. Natural lens depth of field on the figure. Natural human skin texture on the woman with visible pores and tiny realistic imperfections, no plastic smoothing, no beauty filter, no airbrushed retouching. Colors with realistic restraint on non-red elements; the red accents are the only saturated color in the image. Avoid: oversharpening, artificial sharpness, heavy digital grain, HDR effect, beauty-filter skin, AI-generated aesthetic, overpolished studio look, plastic smoothing, oversaturation of non-red elements, glossy highlight blowout, generic AI image quality, default model aesthetic bias, anime cel-shading style, manga drawing style, digital painting style, 3D rendered look, doll-like skin, porcelain skin, makeup-perfect face, fashion magazine retouching, school uniform, school setting, school buildings, cherry blossoms, sky, clouds, desert, mecha, additional characters, weapons in hands, three-dimensional perspective in background, garbled or fake Chinese characters, English text, watermark, logo, bright sunlit bamboo background, light-toned background, background brightness competing with figure, neon-glowing eyes that look digital or cyberpunk.
```
> 注:gid140(道具-023,4:3)正文与上文**逐字相同**,仅 INSTRUCTION 里 aspect ratio 不同 + 跑第二次,验证"模板写死、只换画幅"批量产出。

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid138**(道具-021,9:16,全文来源):双参考图"借姿势不借人"完整落地(身份是丹眉、姿势取自另一参考、校服 / 校园背景完全换成竹简墙)✓;"红为全图唯一高饱和"肉眼可验 ✓;竹简文字墙做旧深色 + 篆隶字密集底纹 ✓;EVA 单人压满 + 片名"万物生"落字 ✓。**唯一打折**:赤瞳在该缩放下脸偏小、不易确认是否明显发光,发光强度可能弱于"像点燃煤炭(lit coals)"级 ✗。
- **gid140**(道具-023,4:3 子批次):**同模板换画幅复用成立**——身份 / 双参考图分工 / 竹简墙 / 红唯一高饱和在 4:3 版同样兑现 ✓;"万物生"竖排墨笔大标题在右侧清晰醒目渲染出来 ✓。〔复检订正 2026-06-17:早先曾误判"4:3 吞掉标题、文字版式不稳",放大复核后标题清晰存在,该翻车不成立,原"换画幅文字版式不稳"教训作废。〕

**变体技巧(同模板衍生)**
- **gid116**(道具,21:9,基于该海报底图换元素):一句"把画面四个中国结替换成 4 张参考图",4 换 4 数量对齐 + 对象指认精确生效,四角全替换为丹眉头像红穗挂坠、位置仍在四角,且绿框 / 万物生字样 / 副标版式未受影响——证明该海报版式可作底图二次定向换素材。

**反复翻车点**
- "借姿势不借人"若不逐项禁用 Ref2 的脸 / 眼 / 服 / 背景,极易串成 Ref2 的人 → 必须 CHANGE 块二次复述每一项替换。
- 发光赤瞳是全片最高饱和单点,但**全身海报里脸小**,赤瞳发光在缩略图层级难确认到位 → 想强化得把眼部 luminosity 写更狠或单出脸部特写校验。

### 校对清单(出图后逐项对账)
- [ ] 身份是 Ref1 的人吗?**脸 / 发型 / 服装 / 配饰有没有串成 Ref2**?
- [ ] 姿势 + 风动取自 Ref2 了吗?Ref2 的**校服 / 校园 / 天空 / 樱花有没有漏进来**?
- [ ] 背景是**平面文字墙、零透视**吗?汉字是**成形篆隶、没乱码**吗?
- [ ] **红(眼 / 腰带 / 穗)是不是全图唯一高饱和**?其余有没有被提饱和、背景有没有被提亮抢人物?
- [ ] 赤瞳**明显发光吗**(像点燃煤炭)?(全身图脸小,易打折,重点核验)
- [ ] 片名"万物生"是**版面最大字、与底纹小字分层**吗?有没有混进底纹?
- [ ] 换画幅版(4:3/9:16)各元素自适应了吗?标题有没有被画幅吃掉?

### 坑 & 调参
- **双参考图必须显式标注职责 + 末尾 CHANGE 块二次复述**,这是本图型最高频翻车点的唯一解,别省。
- "红为唯一高饱和"是控视觉层级的对比哲学,要在三处分别写明(`single highest-saturation point` / `the only fully saturated colors`)+ 在 Avoid 里压 `oversaturation of non-red elements`,双向夹。
- 背景文字墙要主动压暗 + 进 Avoid 写 `background brightness competing with figure`,否则文字墙会抢人物。
- **模板写死、只换 aspect ratio 批量跑**是本图型的成套产能方式(gid138/140),正文一字别动。
- 想要赤瞳"煤炭级"发光在全身图里成立较难——若海报脸太小,接受打折或单独再出脸特写校眼。

---

## 图型 28 · 片头标题卡(复古动漫·空画框版) ✅

### 何时用
要做**片头 / 标题卡 / 章节卡**:版面要有片名 logo + 副标 + 一句主题文案,且**人物位置留空(后期再合成)**时。本片用的是**复古动漫片头版式**——1990 年代日式赛璐珞(cel)电视画风、平涂水粉质感、复古片头 logo,左侧挂一个**完全空的画框**(`COMPLETELY EMPTY`)做后期抠像位。gid162(角色-004,21:9)是范本。它是**纯平面美术稿、非写实、非 3D**。

### 命门(这种图独有的成败关键)
1. **空画框 = 后期合成位,且必须"完全空"**:画框内是一块纯色荧光绿面板,`COMPLETELY EMPTY — no silhouette, no figure, no object, just a clean blank glowing green surface, leaving negative space`。这一句把"留负空间给后期"说死(同时这块绿就是预埋绿幕,见图型 29)。
2. **大量精确 hex 锁复古赛璐珞配色**:背景平涂蓝灰 `#5f7689`、画框白边 `#ece9df`、绿面板 / logo 荧光绿 `#5cb946`、中国结红 `#c4262c`、金珠 `#f0c419`——把复古片头的色彩规范钉死,保证赛璐珞调性。
3. **反向强调精工细节防被简化**:四角中国结(páncháng 盘长结)写明编织过户、金珠、红流苏,并用 `NOT flat, NOT cartoonish, NOT simplified` 反向夹住,因为重型 prompt 里这类精工最容易被模型省掉。
4. **三处文字各就各位**:lower-right 片名 logo `万物生`(荧光绿笔刷 + 深绿描边)、其下拉丁副标 `WAN WU SHENG`、bottom-center 主题文案 `我是谁?`。
5. **整体反摄影 / 反 3D**:`flat colors, no photographic realism, no 3D rendering, no glossy plastic look` —— 锁在平面赛璐珞语言。

### 专门骨架(填空式)
```
模式:文生图(纯描述,无参考图)/ 也可作底图后续换元素(见 gid116)
size 21:9(或所需画幅)/ quality medium / Neo Image 2
用途:片头/标题卡物料,复古动漫赛璐珞风,空画框留后期合成位

A <画幅> retro anime title-card illustration in the style of a 1990s Japanese cel-animation
TV screen, flat hand-painted gouache texture, slightly aged with subtle film grain.
Background: a flat muted <蓝灰 hex> field, evenly painted, calm/uncluttered, faint cel-paint texture.

<位置> a vintage SQUARE picture frame (1:1) mounted on the wall。Frame: clean off-white(<hex>)
painted wooden border, soft rounded corners. Inside: flat solid fluorescent <绿 hex> panel,
COMPLETELY EMPTY — no silhouette, no figure, no object, just blank glowing green, leaving negative space.

At each of the four corners of the frame hangs a 中国结(páncháng endless knot)woven from glossy
deep-red(<hex>)silk cord, visible over-under braiding + layered loops; gold(<hex>)bead at center;
red silk tassel below。NOT flat, NOT cartoonish, NOT simplified —— jewelry-quality craftwork.

Lower-right: bold stylized title logo <片名> in thick fluorescent <绿 hex> brush-style lettering
with darker green outline, playful/iconic like a retro anime show logo。Below: thin spaced latin
subtitle <拉丁副标> in small light-cream letters。Bottom-center: small cream-white text <主题文案>。

Overall mood: nostalgic, iconic, clean composition, flat colors, no photographic realism,
no 3D rendering, no glossy plastic look。
```

### 完整真实 prompt 全文(gid162 / 角色-004 逐字)
```
A 1:1 to 21:9 widescreen retro anime title-card illustration in the visual style of a 1990s Japanese cel-animation TV screen, flat hand-painted gouache texture, slightly aged with subtle film grain. Overall canvas aspect ratio 21:9. Background: a flat muted slate blue-grey field (#5f7689), evenly painted, calm and uncluttered, faint cel-paint texture. Left side of the frame: a vintage SQUARE picture frame (1:1 aspect ratio) mounted on the wall, positioned in the left portion of the canvas. The frame has a clean off-white (#ece9df) painted wooden border with soft rounded corners. The inside of the square frame is filled with a flat solid fluorescent spring-green (#5cb946) panel, COMPLETELY EMPTY — no silhouette, no figure, no object, just a clean blank glowing green surface, leaving negative space. At each of the four corners of the white square frame hangs a beautifully crafted traditional Chinese decorative knot (中国结), replacing ornamental pins. Each knot is an intricate, symmetric páncháng (endless) knot woven from glossy deep-red (#c4262c) silk cord, with clearly visible over-under braided weaving and dimensional layered loops, like a genuine handcrafted silk ornament. A small polished gold (#f0c419) bead sits at the center of each knot, and an elegant red silk tassel with fine combed strands hangs neatly below each one. The knots are exquisite, refined, finely detailed jewelry-quality craftwork — NOT flat, NOT cartoonish, NOT simplified. Lower-right area: a bold stylized title logo reading the three Chinese characters "万物生", rendered in thick fluorescent green (#5cb946) brush-style lettering with a darker green outline, playful and iconic like a retro anime show logo. Below the title, a thin spaced-out latin subtitle "WAN WU SHENG" in small light-cream letters. Bottom-center: small light cream-white text reading "我是谁？". Overall mood: nostalgic, iconic, clean composition, flat colors, no photographic realism, no 3D rendering, no glossy plastic look.
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid162**(角色-004,21:9,全文来源,吻合度中):**荧光绿空画框留负空间(预埋绿幕)成功**,框内确为空 ✓;荧光绿笔刷 logo + 拉丁副标 `WAN WU SHENG` + 底部 `我是谁?` 三处文字均到位 ✓;蓝灰平涂背景 + 复古赛璐珞调性命中 ✓;21:9 成立 ✓。**打折**:四角中国结的"珠宝级精工 / 金珠 / 红流苏"在缩略图层级看不清是否真做到精工,**很可能被简化**——重型 prompt 里最易打折的项 ✗。

**变体技巧(以本卡为底图)**
- **gid116**(道具,21:9):以本标题卡为底图,一句"把四个中国结替换成 4 张参考图",4 换 4 精确替换为丹眉头像红穗挂坠、位置仍在四角,**绿框 / 万物生字样 / 副标版式不受影响**——证明标题卡是稳定可二次换素材的底图。

**反例 / 反复翻车点**
- 精工细节(中国结盘长结编织 / 金珠 / 流苏)是重型 prompt 里最容易被模型省成"卡通简化"的项,即便写了 `NOT simplified` 仍可能打折(gid162 即如此)——细节越多越要单独放大核验。

### 校对清单(出图后逐项对账)
- [ ] 画框内**真的完全空**吗(纯荧光绿、无人 / 无影 / 无物)?这是后期合成的命门。
- [ ] 三处文字**都在且对吗**:片名 logo `万物生`(荧光绿笔刷 + 深绿描边)/ 拉丁副标 `WAN WU SHENG` / 底部主题文案 `我是谁?`?
- [ ] 配色 hex 对吗:蓝灰背景 `#5f7689` / 荧光绿 `#5cb946` / 白框 `#ece9df` / 红结 `#c4262c` / 金珠 `#f0c419`?
- [ ] 四角中国结**有没有被简化成卡通**?(放大看盘长结编织 / 金珠 / 红流苏是否成立)
- [ ] 整体是**平涂赛璐珞、非写实、非 3D、无塑料光泽**吗?
- [ ] 画幅(21:9)成立吗?

### 坑 & 调参
- 空画框是后期合成位,**`COMPLETELY EMPTY` + 列举 no silhouette/figure/object** 一定要写全,否则模型会"好心"往框里塞个人影,合成位就废了。
- 这块荧光绿空面板**同时就是预埋绿幕**——与图型 29 共用同一手法,后期可直接抠入角色。
- 精工细节(中国结)用"正面描述 + `NOT flat/cartoonish/simplified` 反向夹"双管,但仍是最易打折项,接受打折或后期单独补。
- 这是**纯文生图**(无参考图),靠精确 hex 把复古赛璐珞色彩规范钉死;想成套出多张片头卡,固定 hex 清单 + 只改文案 / 画幅。

---

## 图型 29 · 绿幕 / 动捕占位图(为后期合成预留) ✅

### 何时用
要为**后期动捕 / 绿幕合成预留视觉锚点**时,两条路:
- **(A) 给角色加动捕标记点**:在已有角色物料上叠加"绿幕动捕黑色点状外穿设备",做成 mocap suit 前置素材(gid160,一句中文轻型改图)。
- **(B) 把人物位留成绿幕空框**:在标题卡 / 版式里把人物位置做成"完全空的荧光绿面板",生图阶段预埋绿幕供后期抠入角色(gid162,见图型 28,此处复用)。
两者都不是成片,是**给合成 / 动捕流程当前置占位素材**。

### 命门(这种图独有的成败关键)
1. **(A) 黑点要"很多 + 遍布全身"像真 mocap suit**:`在他身上加很多用于绿幕捕捉的黑色点状外穿设备`——关键词是"很多""点状""外穿设备",让黑点像真实动捕标记点遍布全身,而非零星几点。一句话轻型改图即可一次到位。
2. **(B) 绿幕位必须"完全空"**:`COMPLETELY EMPTY — no silhouette, no figure, no object, just a clean blank glowing green surface`。预埋的是 fluorescent spring-green `#5cb946`,标准抠像绿。空了后期才能抠入。
3. **占位优先于美感**:这类图的成功标准是"后期能不能用"——动捕点够不够多够标准、绿幕够不够纯够空,而不是好不好看。

### 专门骨架(填空式)
```
【路 A · 给角色加动捕点 — 图生图轻型改图】
模式:图生图(角色物料图 → 叠加动捕设备)/ Neo Nano 2 / 中文一句
在他身上加很多用于绿幕捕捉的黑色点状外穿设备
  （要点:很多 + 点状 + 外穿设备 + 遍布全身,像真实 mocap suit 标记点）

【路 B · 留绿幕空框 — 见图型 28 标题卡】
... Inside the frame: flat solid fluorescent spring-green (#5cb946) panel,
COMPLETELY EMPTY — no silhouette, no figure, no object, just blank glowing green, leaving negative space.
  （这块绿即预埋绿幕,后期抠入角色）
```

### 完整真实 prompt 全文
**路 A · gid160 / 角色-002(逐字,中文轻型改图)**
```
在他身上加很多用于绿幕捕捉的黑色点状外穿设备
```
**路 B · gid162 / 角色-004(绿幕空框句 · 逐字摘自标题卡全文,完整全文见图型 28)**
```
The inside of the square frame is filled with a flat solid fluorescent spring-green (#5cb946) panel, COMPLETELY EMPTY — no silhouette, no figure, no object, just a clean blank glowing green surface, leaving negative space.
```

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid160**(角色-002,Neo Nano 2 / 9:16 / 2K,中文轻型微调,吻合度高):`加很多黑色点状动捕外穿设备`**精准命中**——黑点遍布全身、像真实 mocap suit 标记点,**一次到位可直接作动捕 / 绿幕前置物料** ✓。
- **gid162**(角色-004,21:9,吻合度中):**荧光绿空画框留负空间(预埋绿幕)成功,框内确为空** ✓——绿幕位作为后期合成占位有效(标题卡其余打折项见图型 28)。

**标签命名提醒**
- gid160 的 technique_tag 标了"白点定位",但实际出图是**黑点**(黑色标记点)——标签命名略偏,实际要的是黑点。

**反复翻车点 / 取舍**
- 这类图本质是流程占位素材,**别用美感标准评判**——评判它的是"动捕点够不够标准、绿幕够不够空够纯",后期能用即合格。

### 校对清单(出图后逐项对账)
- [ ] (A) 黑点是**"很多 + 遍布全身"**吗?像真 mocap suit 标记点,而非零星几点?
- [ ] (A) 黑点是**点状外穿设备**(贴在身上 / 衣外),而非画进皮肤 / 衣纹?
- [ ] (B) 绿幕位**真的完全空**吗(无人 / 无影 / 无物)?绿够不够纯(`#5cb946`)?
- [ ] 角色身份 / 其余元素**有没有被改动**(轻型改图只该加点,别串脸 / 改服)?
- [ ] 这张**后期能直接用吗**(动捕 / 抠像流程视角,而非美感视角)?

### 坑 & 调参
- 路 A 是**中文一句话轻型改图**(Neo Nano 2),刻意不写英文重型骨架——目标单纯(加点),越简单越准。
- "很多 / 点状 / 外穿设备"三词缺一不可:不写"很多"会零星几点,不写"外穿设备"会被画成衣服纹样而非贴附标记点。
- 路 B 的绿幕空框与**图型 28 标题卡是同一手法**(`COMPLETELY EMPTY`),`#5cb946` 既是赛璐珞 logo 色也是标准抠像绿,一举两用。
- 标签命名史:gid160 标"白点定位"但出图为黑点,以**实际黑点**为准。

---

## 图型 30 · 质感后缀模块(挂载件,非独立图) ✅

### 何时用
**它不是一张图,没有主体**——是一串**纯光学 / 质感关键词**,挂到**任意主体 prompt 的末尾**,统一注入"模拟胶片柔焦 + 去 AI 数字锐化味 + 统一材质语言"的画风。当你已有一条内容 prompt、只想**整体改质感 / 改调性 / 去 AI 味**而不动内容时,把这串词追加上去即可。本质是可复用的**画风挂件 / 后缀模块**(gid164,角色-006)。

### 命门(这种图独有的成败关键)
1. **只写质感、不写内容**:整串没有任何主体 / 场景 / 构图描述,纯是光学与材质关键词——所以能挂到任何主体后面而不干涉画面内容,只改"看起来的质感"。
2. **主动注入胶片柔焦 + 反数字锐化**:核心三组——`halation on highlights`(高光光晕)、`photochemical softness` / `analog edge bloom`(化学胶片柔)、`no digital sharpening`(去数字锐化)——把模型默认的数字锐利味压成模拟胶片柔感。
3. **配"做减法"的画面语言**:`large color blocks, negative space, graphic simplicity, single focal point, unified material, subdued micro-detail`——大色块 + 留白 + 单焦点 + 统一材质 + 收敛微观细节,与柔焦质感配套,整体往"克制、统一、不噪"推。
4. **它治的是 AI 味,不是治糊**:柔焦 ≠ 糊;它是有控制的边缘柔化 + 高光晕染,不是降清晰度。

### 专门骨架(填空式)
```
【挂载方式】把下面整串词追加到任意主体 prompt 的末尾,统一画风,主体内容不动。
【模块本体 — 纯关键词串,无主体】
soft focus edges, gentle edge falloff, film-like softness, halation on highlights,
photochemical softness, analog edge bloom, no digital sharpening, restrained detail,
minimalist texture, large color blocks, negative space, graphic simplicity, hierarchy of focus,
single focal point, unified material, smooth surfaces, clean rendering, matte finish,
cohesive texture language, subdued micro-detail
```

### 完整真实 prompt 全文(gid164 / 角色-006 逐字 · 即模块本体纯词串)
```
soft focus edges, gentle edge falloff, film-like softness, halation on highlights, photochemical softness, analog edge bloom, no digital sharpening, restrained detail, minimalist texture, large color blocks, negative space, graphic simplicity, hierarchy of focus, single focal point, unified material, smooth surfaces, clean rendering, matte finish, cohesive texture language, subdued micro-detail
```
> 原文即为上面这一段纯关键词串(Neo Nano 2 / 16:9 / 4K),无 INSTRUCTION、无主体描述、无 Avoid——整条 prompt 就是这串后缀本身,照搬挂载即可。

### 范例 gid 谱系(正例 + 反例,各带成败点)
**正例**
- **gid164**(角色-006,Neo Nano 2 / 16:9 / 4K,吻合度高):纯质感关键词串**确实见效**——边缘柔焦、高光 halation 光晕、去数字锐化的柔和感、大色块 + 负空间(沙地留白)、单一焦点层级、统一材质语言**均成立**,证明该后缀模块**作为通用质感挂件有效**(实测样张是沙地俯卧人物)✓。

**反例 / 没有**
- 目录中该条无记录的失败点(`❌` 为空)。它是挂件、不独立成图,翻车风险主要取决于挂载的主体 prompt 本身,而非这串后缀。

### 校对清单(挂载后逐项对账)
- [ ] 边缘**柔焦 / 高光 halation 光晕**出来了吗?(模块见效的最直接信号)
- [ ] 数字锐化味**压下去了吗**?画面是模拟胶片柔感、不是数字锐利?
- [ ] 柔焦**有没有过头变成糊**?(柔 ≠ 糊,应是有控制的边缘柔化,主体仍清晰)
- [ ] 大色块 / 负空间 / 单焦点 / 统一材质**有没有兑现**?(整体往克制统一推)
- [ ] 主体内容**没被这串后缀干扰 / 篡改**吧?(它只该改质感,不改画面内容)

### 坑 & 调参
- **它没有主体,单独跑没意义**——必须挂到一条已有内容 prompt 后面才生效;单独喂这串词模型不知道画什么。
- 柔焦 ≠ 治糊也 ≠ 制糊:它注入的是**有控制的边缘柔化 + 高光晕染**,主体焦点仍清晰;若整图发糊,问题在主体 prompt 或分辨率,别赖这串后缀。
- 这是 neoimage 反 AI 味 / 电影感签名体系的**轻量统一挂件**——多张图想要一致画风,把同一串词挂到每张末尾即可批量统一。
- 与重型 prompt 的 `PHOTOGRAPHIC TONE` / `Avoid` 段功能重叠但更轻:不想写整段电影感签名时,这串后缀是速配替代。

---

## 图型 31 · 正反打双人对话关系板(shot/reverse-shot dialogue coverage board · 180°轴线)✅

### 何时用
**一个空间内两个角色面对面说话(对话戏)、要在拆单帧之前先锁死"谁在轴线哪一侧、谁看哪个方向、正反打怎么覆盖"时。** 它是 **per-scene 的「人物关系交代板」**——一张 6 格 contact sheet,把一场双人对话的过肩/近景/中近景正反打覆盖一次性铺出来,**当全场对话镜头的轴线/视线真源**。和 图型01(俯视 god's-eye、≥3 人、空间站位)互补:01 交代"谁站哪"(俯视),31 交代"谁看谁、怎么打"(平视)。技术上是 图型10(九宫格同场景多机位,实证 gid7/26/70 证明"同时刻多机位 grid"可靠)的**对话特化变体**——砍到 6 格 + 加一条 01/10 都没有的命门:**180°轴线锁**。**换新场景就出一张,是对话戏进入逐帧前的标准前置(pipeline 阶段2.5 场景关系锚)。**

### 命门(这种图独有的成败关键)
1. **180°轴线锁 = 本图型的灵魂(图型10 没有的那条)**:把轴线落成**屏幕方向恒定**——`A 恒在 screen-LEFT 且视线恒朝 RIGHT;B 恒在 screen-RIGHT 且视线恒朝 LEFT;镜头绝不跨过 A—B 连线`。这条要在正文开头声明一次、在 CONSTRAINTS 再复述一次(和 图型01 的 depth-order 复述、图型02 的 #约束 复述同理:重复=注意力强化)。**漏了它,6 格视线各自为政,跨轴/视线不接。**
2. **版面即轴线:2列×3行,左列恒A、右列恒B**:不要 3列×2行(把正反打对子拆到不同行)。用 **2 列(左=A 的覆盖、右=B 的覆盖)× 3 行(过肩对 / 近景对 / 中近对)**,奇数格 1/3/5=A、偶数格 2/4/6=B。**左右列直接把轴线两端做成版面**,读板时左右就是轴线,最防跨轴。编号 1–6 仍从左到右、再从上到下,右下角白色加粗。
3. **继承 图型10 的全局锁**:`同一房间、同一主光、同一戏服、同一时刻 —— 6 格是一个时刻的 6 个机位`。少了这句,6 格漂成 6 个不同时刻/不同光。
4. **过肩肩属 + 虚化前景方位写死**:格1 偏 A(A 的脸,B 的肩在**右**前景虚化);格2 偏 B(B 的脸,A 的肩在**左**前景虚化);格5 A 中近、B 作**右**边缘虚化前景;格6 B 中近、A 作**左**边缘虚化前景。方位错了轴线就崩。
5. **双角色定妆参考图分工 + 串脸 MAX**:6 格 ×2 人脸一致是最大风险,逐张参考图排他声明(Image1 只锁 A、Image2 只锁 B)+ Avoid 写 `faces swapped or merged`。第三人(随从/旁观)只作背景暗影、近景格剔除。

### 专门骨架(填空式)
```
模式:图生图(A 定妆 Image1 + B 定妆 Image2 + 场景 Image3 → 6 格正反打关系板)
size ~6:5 近方形(容 2列×3行的 16:9 格)/ quality 4K / Thinking Mode 开
用途:关系交代板 / 轴线·视线真源,blocking 级(位置/朝向/轴线正确优先于单格美感)

【参考图标注】
- Image1(角色A 定妆):只锁 A 的脸/发/戏服。
- Image2(角色B 定妆):只锁 B 的脸/发/戏服。
- Image3(场景锚):只锁环境与光。

【180°轴线 — 最高优先,6 格全适用】
A 恒在 screen-LEFT、视线恒朝 RIGHT;B 恒在 screen-RIGHT、视线恒朝 LEFT;镜头绝不跨 A—B 连线。
<A 位置一句:斜倚/坐/立 + 在左>;<B 位置一句:立/坐 + 在右>;<第三人:隐于 B 身后阴影>。
同一房间、同一主光、同一戏服、同一时刻。

【6 格(2列×3行,左A右B)】
格1(行1-左)过肩中景偏A:A 的脸与上半身在左,越过右前景虚化的 B 肩;A 开口、视线朝右。
格2(行1-右)反打过肩中景偏B:B 的脸与上半身在右,越过左前景虚化的 A 肩;B 开口、视线朝左<;第三人暗影在其身后>。
格3(行2-左)A 单人近景,平视,无前景:脸占满,视线朝右,说话微表情。
格4(行2-右)B 单人近景,平视,无前景:脸占满,视线朝左,说话微表情。
格5(行3-左)A 中近景单人,平视,B 作右边缘虚化前景;A 恒左、视线朝右。
格6(行3-右)B 中近景单人,平视,A 作左边缘虚化前景;B 恒右、视线朝左。

【PRESERVE】A(Image1)、B(Image2)脸与戏服 6 格完全一致,不串脸/不合脸;场景(Image3)与主光跨格一致 = 一个时刻六机位。
【CONSTRAINTS — 复述轴线】每格:A 左·朝右,B 右·朝左,镜头不跨轴,跨格视线相接;第三人只作背景暗影、近景 3/4 剔除;恰好两个说话角色;全图唯一文字是右下角白色加粗格号 1–6,无字幕/水印/logo;每格细白边分隔。
【PHOTOGRAPHIC TONE】真实电影定格,<基调一句:暖烛光/冷蓝/日光>,35mm 胶片感,细微 grain,柔和景深,3–6 格平视镜头,克制不过饱和不塑料。
【Avoid】跨 180°轴线、视线翻转(A 朝左或 B 朝右)、faces swapped or merged、跨格服装/光不一致、过锐、HDR、磨皮、卡通、CGI 游戏感、anime、除 1–6 外任何文字。
```

### 完整真实 prompt 全文(首版示例 · 姜音/林北辰/阿九 · 可直接改填)
```
模式:图生图 / Neo Image 2 / Thinking Mode 开 / size ~6:5 近方形 / 4K
参考图:Image1 姜音定妆 + Image2 林北辰定妆 + Image3 暗纹软榻场景

A single film storyboard contact sheet for a shot/reverse-shot dialogue: 6 cinematic panels in a 2-column × 3-row grid, each panel framed 16:9, separated by thin clean white borders, a BOLD WHITE number in the bottom-right corner of each panel, numbered 1 to 6 left-to-right then top-to-bottom. All 6 panels are ONE continuous two-character scene from 6 camera setups.
【Reference images】Image 1 (姜音 / Jiang Yin — identity & wardrobe anchor): her face / hair / costume only. Image 2 (林北辰 / Lin Beichen — identity & wardrobe anchor): his face / hair / costume only. Image 3 (scene anchor): the dark-patterned soft couch chamber; environment & light only.
【THE 180° AXIS — the single most important rule, applies to ALL 6 panels】The action line runs between 姜音 and 林北辰; the camera NEVER crosses it. In EVERY panel: 姜音 is screen-LEFT and always looks toward screen-RIGHT; 林北辰 is screen-RIGHT and always looks toward screen-LEFT; their eyelines meet across the cut. 姜音 reclines against the dark-patterned soft couch (screen-left); 林北辰 stands three steps away facing her (screen-right); 阿九, a silent attendant, lurks half-hidden in the shadow behind 林北辰. Same room, same warm candlelit key, same wardrobe, same moment.
【The 6 panels】Panel 1 (row1-left): OVER-THE-SHOULDER medium favoring 姜音 — her face and reclining upper body screen-left, seen past 林北辰's shoulder soft in the RIGHT foreground; mid-speech, looking screen-right toward him. Panel 2 (row1-right): reverse OVER-THE-SHOULDER medium favoring 林北辰 — his face and standing upper body screen-right, seen past 姜音's shoulder soft in the LEFT foreground; mid-speech, looking screen-left toward her; 阿九 dim in the shadow behind him. Panel 3 (row2-left): 姜音 single CLOSE-UP, eye-level, no foreground — her face fills the frame, looking screen-right, a subtle speaking micro-expression. Panel 4 (row2-right): 林北辰 single CLOSE-UP, eye-level, no foreground — his face fills the frame, looking screen-left, a subtle speaking micro-expression. Panel 5 (row3-left): 姜音 medium-close single, eye-level, with 林北辰 as a soft out-of-focus foreground element on the RIGHT edge; she stays screen-left, looking right. Panel 6 (row3-right): 林北辰 medium-close single, eye-level, with 姜音 as a soft out-of-focus foreground element on the LEFT edge; he stays screen-right, looking left.
【PRESERVE】faces & wardrobe of 姜音 from Image 1 and 林北辰 from Image 2 — identical across all 6 panels, do NOT swap or merge their faces. Preserve from Image 3 the dark-patterned couch chamber and warm candlelit tone. Keep all 6 panels visually consistent (same light, same color, same wardrobe) — one moment, six setups.
【CONSTRAINTS — restate the axis】In EVERY panel: 姜音 screen-LEFT looking RIGHT, 林北辰 screen-RIGHT looking LEFT, camera never crosses the line, eyelines match across panels. 阿九 appears ONLY as a dim background shadow behind 林北辰 (omit him entirely from the tight close-ups, panels 3 & 4). Exactly two speaking characters, no extra crowd. The ONLY text in the whole image is the bold white panel numbers 1–6 — no captions, no subtitles, no watermark, no logo.
【PHOTOGRAPHIC TONE】real photographed film stills, warm candlelit interior, 35mm film look, subtle organic grain, soft natural depth of field, eye-level lenses for panels 3–6, restrained warm palette, not oversaturated, not plastic.
Avoid: crossing the 180° line, flipped eyelines (姜音 looking left or 林北辰 looking right), faces swapped or merged, inconsistent wardrobe / light between panels, oversharpening, HDR, beauty-filter skin, cartoon, CGI game render, anime, any text other than the numbers 1–6.
```

### 范例 gid 谱系(正例 + 反例)
**新增图型 · 待实证**
- 本图型为体系新增(2026-06,蒸馏自一次双人对话正反打需求 + 图型10 的同场景多机位实证)。**首版骨架见上(姜音/林北辰/阿九)**,暂无生产 gid;跑出后回填正例/反例与命中点。
- **技术依据**:图型10(gid7/26/70)已证明"同一场景、同一时刻、多格多机位 grid"是 Neo Image 2 可靠用法;31 在其上只新增"180°轴线锁 + 正反打 shot grammar",故骨架可信,主要待验证项 = 6 格脸一致与视线跨格不漂(见命门 5 / 校对清单)。

### 校对清单(出图后逐项对账)
- [ ] 真 6 格 2列×3行、细白边、右下角白色加粗 1–6?
- [ ] **轴线没跨**:6 格里 A 恒左望右、B 恒右望左?
- [ ] **视线接得上**:格1/2 过肩视线相对、格3/4 近景方向相反?
- [ ] 过肩肩属对:格1 前景是 B 肩(右)、格2 前景是 A 肩(左)?
- [ ] **6 格脸一致、没串脸**(串脸 MAX)?服装/光跨格一致(读成一个时刻)?
- [ ] 格5/6 虚化前景是对方、且不抢焦、方位对(B 在右缘 / A 在左缘)?
- [ ] 第三人只在背景阴影、近景 3/4 没乱入?
- [ ] 除 1–6 外零文字/水印?

### 坑 & 调参
- **定位是 blocking/关系交代级,不是成片**:像 图型01/10 一样**位置/朝向/轴线优先于单格美感**;要 hero 成片帧,把某格当机位、喂"本板 + 该角色定妆"用 **图型02 单帧重生成**(板锁轴、02 锁脸锁美感)。这是 Tier1 关系板 → Tier2 成片帧 的两层用法。
- **冻结 prompt + 多种子筛**:6 格×2人脸一致 + 视线精确比 图型10 的"同光同尘"更难,**建议刷 6–8 版**挑轴线/脸最齐那张(图型10 标准产能方式)。
- **2列×3行别写成 3列×2行**:后者把正反打对子拆到不同行、且左右列不再恒 A/恒 B,丢掉"版面即轴线"的防跨轴红利。
- **轴线锁要正向(A左朝右/B右朝左)+ 负向(Avoid 视线翻转)双写**,缺一面就漂(同 图型14 族群锚定的双写逻辑)。
- **第三人只作暗影**:多一个清晰的人会抢正反打的二人关系,近景格必剔除。
- **资产收敛链落点**:它是"色卡→定妆→**关系板**→关键帧"里的轴线/视线真源,出在地基资产之后、该场景关键帧之前(pipeline 阶段2.5)。

---

---

> 全 31 种图型模板已建齐。SKILL.md 第 ② 步分类路由 → 命中图型 → 来此取「专门骨架/完整 prompt 全文」→ 第 ④ 步填空生成 → 第 ⑤ 步用该图型「校对清单」逐项对账。
