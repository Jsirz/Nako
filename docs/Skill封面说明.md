# Skill 主题封面

随应用分发的预设与内置业务 Skill 在自己的目录保存 `cover.webp` 和 `COVER-SOURCE.md`。用户库封面由 `metadata.json` 的 `coverFile` 指定，新导入或初始化时识别 `cover.webp`；本文不记录开发机用户库内容或路径。

预设源位于 `modules/agent/server/agent/builtin/presets`，已有用户正文不因应用更新被覆盖。目录、授权来源和运行读取逻辑以存储适配器及附带声明为准。

### 安装版与开发版的封面来源

开发版使用 `.desktop-dev/data/users/<用户>/private/agent-skills`；Windows 安装版默认使用 `%LOCALAPPDATA%/Nako/data/users/<用户>/private/agent-skills`。两者是独立用户库，更新开发版副本不会更新安装版副本。

封面读取优先使用用户元数据 `coverFile`。已初始化的预设若未设置该字段，则由存储适配器按 `presetId` 读取应用内 `modules/agent/server/agent/builtin/presets/<presetId>/cover.webp`，仍通过 `/api/agent-skills/:slug/cover` 提供给首页、管理页和详情。中文预设目录也适用；无对应图片时使用统一占位图。普通导入技能不会仅凭同名套用预设封面。

此读取逻辑不重写用户正文、元数据或初始化记录，不恢复已删除技能。安装包包含图片也不意味着已有用户副本会重新初始化；部署本修复需重新打包并安装。用户自行上传的封面继续优先显示。

| Skill | 图片主题 | 来源与授权 |
| --- | --- | --- |
| skill-c79a261b | 沙漠场景资产 | [来源](https://commons.wikimedia.org/wiki/File:Namib-Naukluft_Sand_Dunes_(2011).jpg) · CC BY-SA 3.0 |
| deepwhite-image-prompt-builder | 静态图像与绘画提示词 | [来源](https://commons.wikimedia.org/wiki/File:Painting_brushes.jpg) · CC BY-SA 4.0 |
| deepwhite-screenwriting-v1 | 编剧写作工作台 | [来源](https://commons.wikimedia.org/wiki/File:Charmian_London%27s_typewriter_desk.jpg) · CC BY-SA 3.0 |
| deepwhite-shotlist-builder-zh-user | 手绘分镜拆解 | [来源](https://commons.wikimedia.org/wiki/File:Decoupage1.jpg) · CC0 |
| hook-opening-master-dev | 舞台开幕与剧情钩子 | [来源](https://commons.wikimedia.org/wiki/File:Savoy_Theatre_Monmouth_Curtain_and_Pillar.jpg) · CC BY-SA 3.0 |
| minimax-drama-prompt-2 | 文戏拍摄现场 | [来源](https://commons.wikimedia.org/wiki/File:Cinematography.jpg) · CC BY-SA 4.0 |
| minimaxh3-prompt-integrated | 多镜头视频胶片 | [来源](https://commons.wikimedia.org/wiki/File:8_mm_Kodak_safety_film_reel_06.jpg) · CC BY-SA 3.0 |
| mj-asset-prompt-builder | 视觉资产创作工具 | [来源](https://commons.wikimedia.org/wiki/File:Brushes_2.jpg) · CC BY-SA 3.0 |
| neoimage-prompt-engine | 霓虹城市与电影视觉 | [来源](https://commons.wikimedia.org/wiki/File:Kabukicho_red_gate_and_colorful_neon_street_signs_at_night,_Shinjuku,_Tokyo,_Japan.jpg) · CC BY-SA 4.0 |
| screenplay-master | 剧本写作与打字机 | [来源](https://commons.wikimedia.org/wiki/File:Bletchley_Park_Desk_and_Typewriter_(21598716801).jpg) · CC BY 2.0 |
| script-director-shooting-v3-7 | 导演拍摄与场记板 | [来源](https://commons.wikimedia.org/wiki/File:Clapperboard,_O2_film,_September_2008.jpg) · CC BY 2.0 |
| script-to-drama-prompt-dev | 剧本到拍摄提示 | [来源](https://commons.wikimedia.org/wiki/File:1992-04-24_Filmklappe_Filmschindel_Gedanken_2.jpg) · CC BY-SA 4.0 |
| script-to-shotlist-package | 分镜制作包与影片 | [来源](https://commons.wikimedia.org/wiki/File:16_mm_Film_Reel_(With_Film).jpg) · CC0 |
| seedance-25-storyboard-pipeline-v2 | 视频流水线与剪辑工作台 | [来源](https://commons.wikimedia.org/wiki/File:Film_editing_workstation.jpg) · CC BY-SA 2.0 |
| seedance-video-prompt-router | 故事板与镜头设计 | [来源](https://commons.wikimedia.org/wiki/File:Storyboard.jpg) · Public domain |
| 1 | 多模态视频提示词 | [来源](https://commons.wikimedia.org/wiki/File:16_mm_Film_Reel_(With_Film).jpg) · CC0 |
| papercraft-stop-motion-explainer | 纸艺与定格动画 | [来源](https://commons.wikimedia.org/wiki/File:%E6%8A%98%E9%B6%B4_WUXGA.jpg) · Public domain |
| music-video-subtitle-generator | 音乐视频与演出舞台 | [来源](https://commons.wikimedia.org/wiki/File:A_large_crowd_enjoys_a_music_concert_illuminated_by_colorful_lights_and_a_stunning_stage_display.jpg) · CC BY 2.0 |
| h3-prompt-writing | 视频提示词与电影胶片 | [来源](https://commons.wikimedia.org/wiki/File:8_mm_Kodak_safety_film_reel_06.jpg) · CC BY-SA 3.0 |
| minimax-drama-prompt | 剧本文戏与舞台 | [来源](https://commons.wikimedia.org/wiki/File:Savoy_Theatre_Monmouth_Curtain_and_Pillar.jpg) · CC BY-SA 3.0 |
| minimax-drama-high | 高配文戏拍摄 | [来源](https://commons.wikimedia.org/wiki/File:Clapperboard,_O2_film,_September_2008.jpg) · CC BY 2.0 |
| minimax-fight-assets | 武术动作与武戏资产 | [来源](https://commons.wikimedia.org/wiki/File:Shaolin_Kung_Fu_In_Iran-_Photo_By_2007-Mostafa_meraji_12.jpg) · CC0 |

完整作者、授权链接和图片处理说明见 [图片声明](../public/notices/skill-covers.txt)。运行时只读取本地图片，不访问图片来源网站。
