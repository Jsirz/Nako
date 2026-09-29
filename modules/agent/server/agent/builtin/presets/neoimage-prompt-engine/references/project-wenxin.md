# 项目档案 · 万物生 / 问心

> **双轨说明**:本档案 = 《万物生·问心》沙漠 Dune 调;另有 `project-wanwusheng.md` = 《大逃杀》废墟清爽调。**出图前先按片子选对档案加载,别混。** 两片世界观、基调、配色、Avoid 全部相反——问心是低饱和暖沙苍茫,大逃杀是清爽明亮蓝天。
>
> 出该项目的图前加载本档案,把"色卡/角色/基调/Avoid/形态锁"喂进六段式。换项目就复制本文件改写,引擎不动。

## 世界观 & 基调
- **世界**:丝绸之路沙漠奇幻。隋唐西域边陲,荒漠峡谷、蜂窝崖居聚落、机械沙猎游牧部落、巨型机械造物与失落青铜科技。核心生物含巨龙地龙 DILONG、机械赛加羚羊、机械奔跑鸟、盲掘巨足甲壳兽、单人沙艇。
- **基调(定死)**:**Dune 压抑苍茫**。低饱和暖沙调(sun-baked Arrakis tonality)+ skip-bleach LUT 硬调显影 + 35mm Kodak Vision3(500T 等)胶片颗粒 + 沙尘 haze 大气 + 黄金时刻低角侧光拉长影。质感"苍茫不浪漫"。
- **⚠ 与《大逃杀》的清爽明亮蓝天调正好相反**:那片要淡蓝天+白云+通透日光+干净锐利无噪点、明令排掉沙尘压抑/Dune 末世调;本片反过来——**要**暖灰低饱和、沙尘霾、长硬影、skip-bleach 苍茫,**排掉**高饱和、明媚蓝天、清爽通透。两片的色调铁律互为对方的负向词,务必认准当前是哪片。
- DP 调性锚点:Greig Fraser / Denis Villeneuve 沙漠片(Dune)调性引用 + Kodak Vision3 35mm + skip-bleach LUT 三件套,是全片"苍茫不浪漫"的灵魂签名,跨帧复用。
- 标准:站位/分镜多走 `21:9`(超宽承载巨物横陈与纵深站位);设定图/物料多走 `16:9`;角色定妆/竖构图走 `9:16`。

## 🎨 配色铁律(全片锁死,不许漂)

> 角色身份锚由参考图扛;此表锁"颜色 + 形态/质地",每行配一句话铁律。逐字源自原文 prompt。

| 角色/能力 | 颜色 | 形态/质地 | 一句话 |
|---|---|---|---|
| **江流(Jiangliu)** | **纯黑哑光 + 双青绿(teal-green)眼点 + 青绿管耳坠 + 暗红(burgundy/wine-red)破布衣** | 脸=黑色光面矩形 LED 屏(matte black rectangular LED panel),双 teal-green 光点作眼;乱黑发披在屏外;机械分段颈;teal-green 水晶/管状耳坠 | **机器人,非人类**。屏脸自身不发表情,靠两个青绿点示意。Body screams, face says nothing。 |
| **丹眉(Danmei)** | **黑短发 + 红发饰(red hair ornament/红流苏) + 米白立领湿衣(white wet stand-collar top)** | 真人写实女演员脸;黑短发(波波头/公主切变体);中式白立领上衣 + 黑红下装;湿身时衣贴皮肤滴水 | 身份锚靠多视图,五官/发型逐特征点名才锁得住表情(单写"复刻表情"无效)。 |
| **地龙(DILONG)** | **病态苍白去鳞鱼皮**(pale sickly fleshy-tan skin)+ 破洞处少量生肉粉红 | 巨物。曾为东方神龙、godhood 全蚀的 eldritch/cosmic-horror 不死之物;粗壮蜿蜒蛇形龙躯有真实肌理 + 退化破损背脊;龙颌内藏同心牙环 | **必须读作龙,不是虫**(must read as a DRAGON, not worm)。蛇形巨物 AI 天然滑向沙虫,需强压。 |
| **机械赛加(Saiga)** | **青铜叠片甲(Mecha Crimson Bronze #7A6845 + Aged Gold #846035 patina)+ 蓝/青眼(#4FC3D9)** | 犀象体态(rhino-elephant body)+ 双塔状螺旋角(twin pagoda-spire / vertical spiraled horns)+ 下垂长鼻状机械鼻(bulbous mechanical proboscis)+ 背部驾驶舱盖 | 紧凑短腿犀象体型;**长鼻 + 竖直螺旋角是命门特征,缺了即设计失败**。 |
| **琉璃(Liuli)** | **黑金华服(black-and-gold robe)+ 兜帽(hooded)+ 金臂环(gold arm-cuffs)** | 兜帽华服女性;低头怀抱昏迷者姿态多见 | 黑金兜帽 + 金臂环。 |
| **刘回(Liuhui)** | **独眼老者(one-eyed old man)+ 布缠 + 机械义肢(prosthetic)** | 多为昏迷/被抱姿态,眼闭、肢体瘫软 | 独眼 + 布缠 + 机械义肢。 |
| **螃蟹(Crab)** | **巴掌大青铜甲(small bronze crab)+ 蓝眼柄(blue eye-stalks)** | 巴掌大青铜机械蟹,常蹲在江流头顶活泼挥螯;蓝眼柄竖起 | 青铜甲 + 蓝眼柄,作江流冷淡的喜剧反差(此分辨率下站位图里常看不见,是稳定盲区)。 |

**反 AI 偏置硬约束(高频翻车点)**:江流屏脸最易被画成人脸(必须重申"非人类/黑 LED 屏");地龙最易滑成沙虫(必须重申"读作龙不是虫");赛加最易丢长鼻+螺旋角(MAX 风险,必须前置标注 + 出图逐项对账)。世界观 DNA 钩子:所有机械造物共用 #7A6845/#846035 青铜锈金 + #4FC3D9 cyan 眼。

## 13 色 color bible(EP2 沙漠生存日光调 · 逐字取自 gid161)

> 源:`万物生问心_提示词全文.md` p279 gid161,标题 `WANWUSHENG · EP2 DESERT SURVIVAL · DAYLIGHT PALETTE`,副标 `Sun-baked Arrakis tonality · 13 color system`。背景填充 `#F5F2EC`(neutral off-white)。下表 HEX + 功能命名逐字。

| # | HEX | 功能命名(function label) |
|---|---|---|
| 01 | `#F4E6C8` | hot sunlight cast(炽热阳光铸色) |
| 02 | `#D4B896` | sand highlight(沙地高光) |
| 03 | `#A89472` | sand midtone(沙地中间调) |
| 04 | `#6B5A47` | hard shadow(硬阴影) |
| 05 | `#E8E0D2` | bleached sky(漂白天空) |
| 06 | `#EAE2D0` | dust-filmed white(蒙尘白) |
| 07 | `#2A2620` | heat-bleached black(热褪黑) |
| 08 | `#7A2F2C` | faded burgundy(褪色酒红) |
| 09 | `#D8C9A8` | cream linen(奶白亚麻) |
| 10 | `#4A332A` | cracked leather(龟裂皮革) |
| 11 | `#A82A2A` | cinnabar accent(朱砂强调色) |
| 12 | `#6F1F1F` | dark blood(暗血) |
| 13 | `#4FC3D9` | LED cyan (dormant)(LED 青·休眠态) |

> 用法:整图去饱和暖沙基底里,#A82A2A 朱砂红做唯一饱和焦点色(部落每套服装必带一抹);#4FC3D9 是江流/机械造物的 cyan 眼专用,世界观 DNA。色卡物料图本身要 flat 2D vector(Figma/Illustrator 风),Avoid 任何摄影/3D/纸纹/景深/阴影(见 gid161 原文 Avoid 段)。

## 形态锁清单(CONSTRAINTS 句式 · 跨帧复用)

> 写进重型 prompt 的 CONSTRAINTS 区块,描述层/禁令层/Avoid 层各重申一遍才落地。逐字源自原文。

- **江流 = 黑 LED 脸机器人**:
  `His face is a matte black rectangular LED panel with two glowing teal-green light points serving as eyes; messy black human hair falls over the panel; mechanical segmented neck; teal-green crystal earrings. The face is and must remain a black glossy screen. Do not render as human.`
- **地龙 DILONG = 龙非虫**:
  `Its overall read must be unmistakably DRAGON, not worm. Sinuous coiling serpentine dragon body with real winding musculature — NOT a smooth limp worm tube. Skin = a fish that has had every scale torn out, pale sickly fleshy-tan. The concentric rings of teeth are the only worm-like trait, hidden inside a dragon's jaws.`
  Avoid 必带:`worm-like body, smooth tube body, sandworm silhouette, blue skin`.
- **机械赛加 = 双塔角 + 下垂长鼻**(MAX 风险,前置标注):
  `MUST be a Saiga antelope — twin pagoda-spire / vertical spiraled ringed horns + a drooping bulbous mechanical proboscis nose hanging past the mouth line. If this nose is missing or the horns are wrong, the design fails.`
  跑歪兜底句:`Saiga tatarica, distinguished by oversized bulbous proboscis-like nose (MANDATORY) + vertical spiral-ringed horns straight up + stocky compact body. NOT a regular antelope/deer/gazelle.`(命中即追加并**真重跑**,狠话≠约束。)
- **巨物尺度**(地龙/甲壳兽):`so large it never fits in one frame, only fragments visible, forever flattening the village to dust`;设定图用 1/20 人形剪影(HUMAN 1.8M)+ 五物种比例条(人/象/巴士/蓝鲸/怪物)把"多大"降维成图内可对照量。

## 角色 ref 说明
- **丹眉** = 多视图四宫格/2x2 定妆图 ×10 批做身份锚(正/侧/全身/背面 + 侧逆光),五官/发型/红发绳逐特征点名;改一处锁其余(发型/裙长/衣领/丝袜单独迭代)。
- **江流** = LED 面板参考图(黑哑光屏 + 双青绿眼点 + 青绿管耳坠 + 机械分段颈),作身份锚;表情靠屏上两点改写('=.=' 等),不靠人脸肌肉。
- **地龙 DILONG** = 纪实风多照片设定页(峡谷晨光实拍框架,靠崖壁宽度做尺度尺);当生物参考。
- **机械赛加** = 兽形态四视图设定图(SIDE/FRONT/TOP/3-4),长鼻+螺旋角逐 panel 重申;当生物参考。
- **螃蟹/琉璃/刘回** = 站位图里逐角色文字锁外观 + 关键帧参考图分工,防串脸。

## 题材级负向(本片 Avoid 必带)
```
no modern desert resort aerial, no romantic desert wedding, no Burning Man aesthetic,
no modern military bivouac / camp,
worm-like body / smooth tube body / sandworm silhouette (地龙必带),
Jiangliu rendered as a human face (江流必带),
saiga without proboscis / without spiral horns (赛加必带),
bright saturated sky / clean clear daylight / cheerful明媚 (题材调性反向,别滑向《大逃杀》清爽调),
plastic skin, CGI/game render, cartoon, anime cel-shaded,
text, watermark, logo, extra characters
```
> 题材级负向(度假村/婚礼/Burning Man/现代军营)对抗模型对"沙漠"的审美偏置——AI 默认把沙漠场景跑成现代航拍/节庆,必须显式排掉。

## 关键交付物索引(常用图型 → shot-types.md)

> 本片高频图型与对应交付物模板编号(指向 `shot-types.md`):

| 本片图型 | 交付物 | shot-types.md 编号 |
|---|---|---|
| 群像站位图(blocking diagram,depth order 逐层 + 长投影做站位读取器) | 站位图 | 图型 01 |
| 生物设定表(地龙/甲壳兽 一页式 creature sheet + 比例尺) | creature sheet | 15 |
| 角色四视图定妆(赛加兽形态 / 部落首领) | 四视图 | 14 |
| 13 色 color bible 物料(flat 2D vector 色卡) | 色卡 | 23 |
| 角色档案卡(60-30-10 配色 + 拼贴) | EVA 海报 | 27 |
| 巨物摧毁村落同时刻多机位 | 九宫格分镜 | 10 / 11 |
| 人机双头出沙 · 极光夜空双角色帧(白点定位钉左右两头) | 双头极光帧 | 05 |

---

*数据源:`分析/README.md`、`分析/目录_角色.md`、`分析/目录_道具.md`、`分析/目录_场景.md`;13 色 HEX + 角色锁定句逐字取自 `万物生问心_提示词全文.md`(gid161 色板 p279、江流 p383/4246、地龙 DILONG p1504、赛加 p1903/1947、群像角色 p1630)。真实性第一,未编造;此分辨率下螃蟹站位常不可见为已知盲区。*
