#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
剧本质量校验脚本 (Script Quality Validator)

本脚本用于对短剧/网络剧本进行自动化质量检查，支持以下10项校验功能：
1. 台词长度检查（单句<=15字）
2. 钩子密度检测（极速模式每10秒1个，弧光/长剧每15秒1个）
3. 场景数量统计（<=3个/集）
4. 情绪曲线可视化（波形图，matplotlib生成PNG）
5. 付费卡点位置验证（卡一8-16/卡二25-30/卡三45-55）
6. OOC检测（对比人物卡关键词）
7. 字数统计与标准对比
8. 悬念链连贯性检查
9. 爽感密度分布分析
10. Fountain格式验证

使用方式：
    python validate_script.py --file 剧本文件.md [--character 人设卡.json] [--mode 极速|弧光|长剧] [--episode 集数]
"""

import argparse
import json
import os
import re
import sys
import textwrap
import traceback
from collections import Counter, OrderedDict
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import matplotlib
matplotlib.use("Agg")  # 使用无GUI后端，适合服务器环境
import matplotlib.pyplot as plt
import numpy as np

# 配置中文字体支持（尝试多个常见中文字体）
_fonts_set = False
for _font_name in ["WenQuanYi Zen Hei", "Noto Sans CJK SC", "Noto Sans Mono CJK SC",
                    "SimHei", "Microsoft YaHei", "SimSun", "DejaVu Sans"]:
    try:
        plt.rcParams["font.family"] = ["sans-serif"]
        plt.rcParams["font.sans-serif"] = [_font_name, "DejaVu Sans"]
        plt.rcParams["axes.unicode_minus"] = False  # 正确显示负号
        _fonts_set = True
        break
    except Exception:
        continue


# =============================================================================
# 常量配置
# =============================================================================

# 对话最大长度（字）
MAX_DIALOGUE_LENGTH = 15

# 场景数量上限
MAX_SCENES = 3

# 钩子模式配置（按秒数/个）
HOOK_CONFIG = {
    "极速": {"interval": 10, "description": "每10秒至少1个钩子"},
    "弧光": {"interval": 15, "description": "每15秒至少1个钩子"},
    "长剧": {"interval": 15, "description": "每15秒至少1个钩子"},
}

# 付费卡点位置要求（秒数范围）
PAYMENT_CARDS = {
    "卡一": {"min": 8, "max": 16},
    "卡二": {"min": 25, "max": 30},
    "卡三": {"min": 45, "max": 55},
}

# 每集时长假设（秒）
DEFAULT_EPISODE_DURATION = 90  # 默认90秒/集

# 字数标准：时长 x 10 ~ 12
WORD_RATE_MIN = 10.0
WORD_RATE_MAX = 12.0

# 情绪关键词字典（用于情绪曲线分析）
EMOTION_KEYWORDS = {
    "愤怒": ["恨", "杀", "滚", "死", "竟敢", "找死", "该死", "混蛋", "无耻", "岂有此理"],
    "悲伤": ["哭", "泪", "痛", "伤", "难过", "伤心", "绝望", "惨", "命苦", "不甘"],
    "喜悦": ["笑", "开心", "高兴", "太好了", "终于", "哈哈", "喜欢", "爱", "幸福", "满意"],
    "恐惧": ["怕", "恐怖", "吓", "不敢", "逃", "救命", "别过来", "不要", "惊慌", "冷汗"],
    "紧张": ["糟了", "不好", "怎么办", "完了", "危险", "小心", "快", "赶紧", "来不及了"],
    "惊讶": ["什么", "怎么可能", "竟然", "怎么会", "天啊", "不可思议", "震惊", "意外"],
    "爽感": ["打脸", "逆袭", "翻车了", "跪下", "后悔", "震惊", "真面目", "拆穿", "报应", "收拾"],
}

# 钩子关键词模式
HOOK_KEYWORDS = [
    r"悬念", r"竟然", r"没想到", r"原来", r"真相", r"秘密", r"身份",
    r"到底是谁", r"究竟", r"然而", r"谁知", r"不料", r"却", r"莫非",
    r"难道是", r"等等", r"不.{0,2}!", r"怎么会", r"不可能",
]

# 爽点关键词
SATISFACTION_KEYWORDS = [
    "打脸", "逆袭", "翻车", "跪下", "后悔", "震惊", "拆穿", "报应",
    "收拾", "曝光", "真面目", "实力", "碾压", "反转", "绝地", "反杀",
    "求饶", "认错", "赔偿", "磕头", "曝光", "打脸", "跪下求",
]

# 悬念标记
SUSPENSE_MARKERS = ["悬念", "伏笔", "铺垫", "???", "? ? ?", "待续", "未完", "且听", "究竟", "真相"]

# 支持的有效模式
VALID_MODES = ["极速", "弧光", "长剧"]


# =============================================================================
# 工具函数
# =============================================================================

def parse_args() -> argparse.Namespace:
    """解析命令行参数"""
    parser = argparse.ArgumentParser(
        description="剧本质量校验工具 - 检查剧本的10项质量指标",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""
        使用示例:
          python validate_script.py --file 剧本.md
          python validate_script.py --file 剧本.md --mode 极速 --episode 1
          python validate_script.py --file 剧本.md --character 人设卡.json --mode 弧光
        """),
    )
    parser.add_argument(
        "--file", "-f",
        required=True,
        help="剧本文件路径（支持.md或.fountain格式）",
    )
    parser.add_argument(
        "--character", "-c",
        default=None,
        help="人设卡JSON文件路径（用于OOC检测）",
    )
    parser.add_argument(
        "--mode", "-m",
        default="极速",
        choices=VALID_MODES,
        help="剧本模式：极速、弧光或长剧（默认：极速）",
    )
    parser.add_argument(
        "--episode", "-e",
        type=int,
        default=1,
        help="当前集数（用于悬念链检查，默认1）",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=DEFAULT_EPISODE_DURATION,
        help=f"每集时长（秒，默认{DEFAULT_EPISODE_DURATION}秒）",
    )
    parser.add_argument(
        "--output-chart",
        default=None,
        help="情绪曲线图输出路径（默认自动生成）",
    )
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="静默模式，仅输出JSON结果",
    )
    return parser.parse_args()


def read_file(filepath: str) -> str:
    """读取文件内容"""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"文件不存在: {filepath}")
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        raise IOError(f"读取文件失败 [{filepath}]: {e}")


def load_json(filepath: str) -> dict:
    """加载JSON文件"""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON解析失败 [{filepath}]: {e}")
    except Exception as e:
        raise IOError(f"读取JSON文件失败 [{filepath}]: {e}")


def count_chinese_chars(text: str) -> int:
    """统计中文字符数量"""
    return len(re.findall(r"[\u4e00-\u9fff]", text))


def count_words(text: str) -> int:
    """统计总字数（中文字符+英文单词）"""
    chinese = count_chinese_chars(text)
    english = len(re.findall(r"[a-zA-Z]+", text))
    return chinese + english


def estimate_reading_time(word_count: int) -> float:
    """估算阅读时间（秒），中文约11字/秒"""
    return word_count / 11.0


def split_lines(text: str) -> List[str]:
    """将文本按行分割"""
    return [line.strip() for line in text.splitlines() if line.strip()]


# =============================================================================
# 解析器：从剧本文本中提取结构化信息
# =============================================================================

class ScriptParser:
    """剧本内容解析器，支持Fountain格式和Markdown格式"""

    def __init__(self, text: str):
        self.text = text
        self.lines = split_lines(text)
        # 场景标题正则（Fountain: INT./EXT. 开头；Markdown: # 场景 或 ## 场景）
        self.scene_pattern = re.compile(
            r"^((?:INT|EXT|内景|外景|场景)[\./\s].+|^#{1,2}\s*.*场景.*|^\[.*场景.*\])",
            re.MULTILINE | re.IGNORECASE,
        )
        # 台词格式：角色名后跟对话内容
        # Fountain格式: 角色名（大写）\n对话内容
        # Markdown格式: **角色名**: 对话 或 角色名：对话
        self.dialogue_patterns = [
            # Fountain: 大写角色名 + 换行 + 对话
            re.compile(r"^([A-Z\u4e00-\u9fff]{1,10})\s*\n\s*([^\n#*_\[\]【】]{5,100})", re.MULTILINE),
            # Markdown: **角色名**：台词
            re.compile(r"\*\*([^*]+)\*\*\s*[:：]\s*([^\n*#【\[]+)", re.MULTILINE),
            # 角色名：台词
            re.compile(r"^([\u4e00-\u9fff]{1,6})[：:]\s*([^\n*#【\[]{5,100})", re.MULTILINE),
        ]

    def extract_scenes(self) -> List[str]:
        """提取场景列表"""
        scenes = []
        for line in self.lines:
            if self.scene_pattern.match(line):
                scenes.append(line)
        # 如果没有找到场景标记，尝试从标题推断
        if not scenes:
            heading_pattern = re.compile(r"^#{1,2}\s+(.+)", re.MULTILINE)
            scenes = heading_pattern.findall(self.text)
        return scenes

    def extract_dialogues(self) -> List[Dict[str, str]]:
        """提取台词列表，返回 [{character, text, line_no}]"""
        dialogues = []
        for i, line in enumerate(self.lines):
            # 尝试匹配各种台词格式
            for pattern in self.dialogue_patterns:
                match = pattern.match(line)
                if match:
                    character = match.group(1).strip()
                    text = match.group(2).strip()
                    dialogues.append({
                        "character": character,
                        "text": text,
                        "line_no": i + 1,
                    })
                    break
            else:
                # 未匹配到标准格式，尝试从行中提取可能的台词
                # 寻找引号内的对话
                quote_match = re.search(r"[\"\"\"']([^\"\"\"']{5,60})[\"\"\"']", line)
                if quote_match:
                    dialogues.append({
                        "character": "未知",
                        "text": quote_match.group(1).strip(),
                        "line_no": i + 1,
                    })
        return dialogues

    def extract_actions(self) -> List[str]:
        """提取动作/场景描述文本"""
        actions = []
        for line in self.lines:
            # 排除场景标题、台词、注释
            if (not self.scene_pattern.match(line) and
                not re.match(r"^[A-Z\u4e00-\u9fff]{1,10}\s*[:：]", line) and
                not line.startswith("#") and
                not line.startswith("//") and
                not line.startswith("/*") and
                len(line) > 5):
                actions.append(line)
        return actions

    def extract_sections(self) -> List[Dict[str, Any]]:
        """提取带时间估算的内容分段"""
        sections = []
        current_section = {"type": "unknown", "content": "", "time_estimate": 0}
        total_words = 0

        for line in self.lines:
            line_words = count_words(line)
            line_time = estimate_reading_time(line_words)

            if self.scene_pattern.match(line):
                if current_section["content"]:
                    sections.append(current_section)
                current_section = {
                    "type": "scene",
                    "content": line,
                    "time_estimate": line_time,
                }
            elif re.match(r"^([\u4e00-\u9fff]{1,6})[：:]", line):
                if current_section["content"]:
                    sections.append(current_section)
                current_section = {
                    "type": "dialogue",
                    "content": line,
                    "time_estimate": line_time,
                }
            else:
                if current_section["type"] == "unknown":
                    current_section["content"] += " " + line
                    current_section["time_estimate"] += line_time
                else:
                    if current_section["content"]:
                        sections.append(current_section)
                    current_section = {
                        "type": "action",
                        "content": line,
                        "time_estimate": line_time,
                    }

        if current_section["content"]:
            sections.append(current_section)

        return sections

    def get_cumulative_time_points(self) -> List[float]:
        """获取每个分段的累计时间戳（秒）"""
        sections = self.extract_sections()
        times = []
        cumulative = 0.0
        for sec in sections:
            times.append(cumulative)
            cumulative += sec.get("time_estimate", 0)
        return times


# =============================================================================
# 第1项检查：台词长度检查
# =============================================================================

def check_dialogue_length(parser: ScriptParser) -> Dict[str, Any]:
    """
    检查台词长度：单句台词应<=15字
    返回检查结果字典
    """
    dialogues = parser.extract_dialogues()
    violations = []

    for d in dialogues:
        word_count = count_words(d["text"])
        if word_count > MAX_DIALOGUE_LENGTH:
            violations.append({
                "line": d["line_no"],
                "character": d["character"],
                "text": d["text"][:50] + "..." if len(d["text"]) > 50 else d["text"],
                "word_count": word_count,
                "max_allowed": MAX_DIALOGUE_LENGTH,
                "issue": f"台词长度为{word_count}字，超过最大限制{MAX_DIALOGUE_LENGTH}字",
            })

    pass_check = len(violations) == 0
    return {
        "pass": pass_check,
        "details": violations,
        "message": (f"台词长度检查通过，共检查{len(dialogues)}句台词"
                    if pass_check else
                    f"发现{len(violations)}句台词超过{MAX_DIALOGUE_LENGTH}字限制（共检查{len(dialogues)}句）"),
    }


# =============================================================================
# 第2项检查：钩子密度检测
# =============================================================================

def check_hook_density(parser: ScriptParser, mode: str, duration: int) -> Dict[str, Any]:
    """
    钩子密度检测：
    - 极速模式：每10秒至少1个钩子
    - 弧光/长剧模式：每15秒至少1个钩子
    """
    if mode not in HOOK_CONFIG:
        return {
            "pass": False,
            "details": [f"无效模式: {mode}，应为极速/弧光/长剧"],
            "message": f"模式配置错误: {mode}",
        }

    interval = HOOK_CONFIG[mode]["interval"]
    text = parser.text

    # 搜索所有钩子关键词出现的位置
    hooks_found = []
    for pattern in HOOK_KEYWORDS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            # 计算大致时间位置
            pos_ratio = match.start() / max(len(text), 1)
            estimated_time = pos_ratio * duration
            hooks_found.append({
                "keyword": match.group(),
                "position": match.start(),
                "estimated_time": round(estimated_time, 1),
                "context": text[max(0, match.start()-10):match.end()+10],
            })

    # 去重（相同关键词在同一位置）
    seen = set()
    unique_hooks = []
    for h in hooks_found:
        key = (h["position"], h["keyword"])
        if key not in seen:
            seen.add(key)
            unique_hooks.append(h)

    hook_count = len(unique_hooks)
    expected_min = max(1, duration // interval)

    pass_check = hook_count >= expected_min

    details = {
        "mode": mode,
        "interval_required": interval,
        "duration": duration,
        "hook_count": hook_count,
        "expected_minimum": expected_min,
        "hooks": unique_hooks[:20],  # 最多列出20个
    }

    return {
        "pass": pass_check,
        "details": details,
        "message": (f"钩子密度检查通过：共{hook_count}个钩子，要求至少{expected_min}个（{mode}模式每{interval}秒1个）"
                    if pass_check else
                    f"钩子密度不足：共{hook_count}个钩子，要求至少{expected_min}个（{mode}模式每{interval}秒1个）"),
    }


# =============================================================================
# 第3项检查：场景数量统计
# =============================================================================

def check_scene_count(parser: ScriptParser) -> Dict[str, Any]:
    """统计独立场景数，超过3个则警告"""
    scenes = parser.extract_scenes()
    scene_count = len(scenes)
    pass_check = scene_count <= MAX_SCENES

    scene_list = [s[:80] for s in scenes[:10]]  # 最多列出前10个

    return {
        "pass": pass_check,
        "details": {
            "scene_count": scene_count,
            "max_allowed": MAX_SCENES,
            "scenes": scene_list,
        },
        "message": (f"场景数量检查通过：共{scene_count}个场景（上限{MAX_SCENES}个）"
                    if pass_check else
                    f"场景数量超标：共{scene_count}个场景，超过上限{MAX_SCENES}个。建议精简场景"),
    }


# =============================================================================
# 第4项检查：情绪曲线可视化
# =============================================================================

def check_emotion_curve(parser: ScriptParser, output_path: Optional[str] = None, duration: int = DEFAULT_EPISODE_DURATION) -> Dict[str, Any]:
    """
    情绪曲线可视化：分析文本中情绪关键词的分布，生成波形图
    返回检查结果，包含图表保存路径
    """
    text = parser.text
    lines = parser.lines
    
    if not lines:
        return {
            "pass": True,
            "details": {"chart_path": None, "error": "文本为空，无法生成情绪曲线"},
            "message": "文本为空，跳过情绪曲线分析",
        }

    # 逐行分析情绪
    line_count = len(lines)
    emotion_scores = OrderedDict()
    for emotion in EMOTION_KEYWORDS:
        emotion_scores[emotion] = np.zeros(line_count)

    for i, line in enumerate(lines):
        for emotion, keywords in EMOTION_KEYWORDS.items():
            score = 0
            for kw in keywords:
                score += len(re.findall(kw, line))
            emotion_scores[emotion][i] = min(score, 5)  # 封顶5分

    # 生成时间轴（模拟秒数）
    time_axis = np.linspace(0, duration, line_count)

    # 计算综合情绪指数（加权平均）
    weights = {
        "愤怒": 0.8,
        "悲伤": 0.6,
        "喜悦": 1.0,
        "恐惧": 0.9,
        "紧张": 1.0,
        "惊讶": 0.9,
        "爽感": 1.2,
    }
    composite = np.zeros(line_count)
    for emotion, scores in emotion_scores.items():
        composite += scores * weights.get(emotion, 1.0)

    # 平滑处理（移动平均）
    window = max(3, line_count // 20)
    if window % 2 == 0:
        window += 1
    composite_smooth = np.convolve(composite, np.ones(window)/window, mode='same')

    # 生成图表
    try:
        fig, axes = plt.subplots(2, 1, figsize=(12, 8), gridspec_kw={"height_ratios": [3, 1]})

        # 主图：各情绪曲线
        ax1 = axes[0]
        colors = {
            "愤怒": "red",
            "悲伤": "blue",
            "喜悦": "orange",
            "恐惧": "purple",
            "紧张": "brown",
            "惊讶": "green",
            "爽感": "gold",
        }
        for emotion, scores in emotion_scores.items():
            ax1.plot(time_axis, scores, label=emotion, color=colors.get(emotion, "gray"), alpha=0.7)

        ax1.plot(time_axis, composite_smooth, 'k--', linewidth=2, label='综合情绪（平滑）')
        ax1.set_xlabel("时间（秒）", fontsize=12)
        ax1.set_ylabel("情绪强度", fontsize=12)
        ax1.set_title("剧本情绪曲线分析", fontsize=14, fontweight='bold')
        ax1.legend(loc='upper right', fontsize=8)
        ax1.grid(True, alpha=0.3)
        ax1.set_xlim(0, duration)

        # 子图：综合情绪区域图
        ax2 = axes[1]
        ax2.fill_between(time_axis, composite_smooth, alpha=0.5, color='steelblue')
        ax2.plot(time_axis, composite_smooth, color='navy', linewidth=1.5)
        ax2.set_xlabel("时间（秒）", fontsize=12)
        ax2.set_ylabel("综合强度", fontsize=12)
        ax2.set_title("综合情绪分布", fontsize=12)
        ax2.grid(True, alpha=0.3)
        ax2.set_xlim(0, duration)

        plt.tight_layout()

        # 保存图表
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"emotion_curve_{timestamp}.png"

        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close(fig)

        # 分析情绪波动
        peak_idx = np.argmax(composite_smooth)
        trough_idx = np.argmin(composite_smooth)
        variance = np.var(composite_smooth)

        return {
            "pass": True,
            "details": {
                "chart_path": os.path.abspath(output_path),
                "emotion_peak_time": round(float(time_axis[peak_idx]), 1),
                "emotion_trough_time": round(float(time_axis[trough_idx]), 1),
                "emotion_variance": round(float(variance), 2),
                "line_count": line_count,
            },
            "message": f"情绪曲线图已生成: {os.path.abspath(output_path)}，情绪方差={variance:.2f}，峰值在{time_axis[peak_idx]:.1f}秒",
        }

    except Exception as e:
        return {
            "pass": False,
            "details": {"chart_path": None, "error": str(e)},
            "message": f"情绪曲线图生成失败: {e}",
        }


# =============================================================================
# 第5项检查：付费卡点位置验证
# =============================================================================

def check_payment_cards(parser: ScriptParser, duration: int = DEFAULT_EPISODE_DURATION) -> Dict[str, Any]:
    """
    付费卡点位置验证：
    - 卡一：第8-16秒
    - 卡二：第25-30秒
    - 卡三：第45-55秒
    
    通过检测钩子/悬念标记在文本中的分布位置来验证
    """
    text = parser.text
    text_length = len(text)
    cards_check = {}
    all_pass = True

    # 搜索所有可能的卡点标记（悬念词、钩子词等）
    card_markers = []
    for pattern in HOOK_KEYWORDS + [r"付费", r"卡点", r"悬念", r"高潮"]:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            pos_ratio = match.start() / max(text_length, 1)
            estimated_time = pos_ratio * duration
            card_markers.append(estimated_time)

    # 另外查找特殊标记如 【卡一】、【卡点1】等
    special_markers = {
        "卡一": re.findall(r"卡[一1]|第一.*卡|卡点[一1]", text),
        "卡二": re.findall(r"卡[二2]|第二.*卡|卡点[二2]", text),
        "卡三": re.findall(r"卡[三3]|第三.*卡|卡点[三3]", text),
    }

    for card_name, config in PAYMENT_CARDS.items():
        card_min, card_max = config["min"], config["max"]
        # 查找该时间范围内的卡点标记
        markers_in_range = [t for t in card_markers if card_min <= t <= card_max]
        has_special = len(special_markers.get(card_name, [])) > 0

        card_pass = len(markers_in_range) > 0 or has_special
        if not card_pass:
            all_pass = False

        cards_check[card_name] = {
            "required_range": f"{card_min}-{card_max}秒",
            "markers_found": len(markers_in_range),
            "special_markers": len(special_markers.get(card_name, [])),
            "pass": card_pass,
            "times": [round(t, 1) for t in markers_in_range[:5]],
        }

    return {
        "pass": all_pass,
        "details": cards_check,
        "message": ("付费卡点位置验证通过，所有卡点位置正确"
                    if all_pass else
                    "付费卡点位置验证未通过，部分卡点不在指定范围内"),
    }


# =============================================================================
# 第6项检查：OOC检测（Out Of Character）
# =============================================================================

def check_ooc(parser: ScriptParser, character_file: Optional[str]) -> Dict[str, Any]:
    """
    OOC检测：对比人设卡JSON，检查台词是否含有人物不应说的关键词
    
    人设卡JSON格式示例：
    {
        "角色名": {
            "keywords": ["关键词1", "关键词2"],
            "forbidden_words": ["不应说的词1", "不应说的词2"],
            "personality": "性格描述"
        }
    }
    """
    if character_file is None:
        return {
            "pass": True,
            "details": {"skipped": True, "reason": "未提供人设卡文件"},
            "message": "OOC检测已跳过（未提供人设卡）",
        }

    try:
        character_cards = load_json(character_file)
    except Exception as e:
        return {
            "pass": False,
            "details": {"skipped": True, "reason": f"加载人设卡失败: {e}"},
            "message": f"OOC检测异常: {e}",
        }

    dialogues = parser.extract_dialogues()
    violations = []

    for d in dialogues:
        character = d["character"]
        text = d["text"]

        # 查找对应人设
        matched_card = None
        for card_name, card_data in character_cards.items():
            if character in card_name or card_name in character:
                matched_card = card_data
                break

        if matched_card is None:
            continue

        # 检查禁忌词汇
        forbidden = matched_card.get("forbidden_words", [])
        for fw in forbidden:
            if fw in text:
                violations.append({
                    "line": d["line_no"],
                    "character": character,
                    "text": text[:50],
                    "forbidden_word": fw,
                    "issue": f"角色'{character}'的台词中含有禁忌词'{fw}'",
                })

        # 检查是否符合角色关键词
        expected_keywords = matched_card.get("keywords", [])
        has_keyword = any(kw in text for kw in expected_keywords)

        # 检查性格特征匹配（简单版本：检查是否有明显冲突）
        personality = matched_card.get("personality", "")
        if "温柔" in personality and any(w in text for w in ["滚", "杀", "死"]):
            violations.append({
                "line": d["line_no"],
                "character": character,
                "text": text[:50],
                "issue": f"角色'{character}'性格为温柔，但台词含有粗鲁用语",
            })
        if "高冷" in personality and any(w in text for w in ["哈哈", "嘿嘿", "好开心"]):
            violations.append({
                "line": d["line_no"],
                "character": character,
                "text": text[:50],
                "issue": f"角色'{character}'性格为高冷，但台词过于活泼",
            })

    pass_check = len(violations) == 0
    return {
        "pass": pass_check,
        "details": {
            "violations": violations,
            "checked_characters": list(character_cards.keys()),
            "checked_dialogues": len(dialogues),
        },
        "message": (f"OOC检测通过，共检查{len(dialogues)}句台词"
                    if pass_check else
                    f"OOC检测发现{len(violations)}处违规（共检查{len(dialogues)}句台词）"),
    }


# =============================================================================
# 第7项检查：字数统计与标准对比
# =============================================================================

def check_word_count(parser: ScriptParser, duration: int = DEFAULT_EPISODE_DURATION) -> Dict[str, Any]:
    """
    字数统计与标准对比：
    标准字数 = 时长 x 10 ~ 时长 x 12
    """
    text = parser.text
    total_words = count_words(text)
    expected_min = int(duration * WORD_RATE_MIN)
    expected_max = int(duration * WORD_RATE_MAX)
    expected_range = f"{expected_min}-{expected_max}"

    within_range = expected_min <= total_words <= expected_max

    details = {
        "total_words": total_words,
        "chinese_chars": count_chinese_chars(text),
        "duration": duration,
        "expected_range": expected_range,
        "expected_min": expected_min,
        "expected_max": expected_max,
        "actual_rate": round(total_words / max(duration, 1), 2),
        "recommended_rate": f"{WORD_RATE_MIN}-{WORD_RATE_MAX}",
    }

    # 字数在标准范围内或偏差不超过20%都算通过
    deviation = 0
    if total_words < expected_min:
        deviation = (expected_min - total_words) / max(expected_min, 1)
    elif total_words > expected_max:
        deviation = (total_words - expected_max) / max(expected_max, 1)

    pass_check = within_range or deviation <= 0.2

    return {
        "pass": pass_check,
        "details": details,
        "message": (f"字数统计通过：共{total_words}字，标准范围{expected_range}字（{duration}秒 x {WORD_RATE_MIN}-{WORD_RATE_MAX}）"
                    if pass_check else
                    f"字数偏差较大：共{total_words}字，标准范围{expected_range}字，偏差{deviation*100:.0f}%"),
    }


# =============================================================================
# 第8项检查：悬念链连贯性检查
# =============================================================================

def check_suspense_chain(parser: ScriptParser, episode: int) -> Dict[str, Any]:
    """
    悬念链连贯性检查：检查上集结尾→本集开头的衔接
    
    检测要点：
    - 第一集不需要前情衔接
    - 检查本集开头是否有前情回顾/承接标记
    - 检查本集结尾是否留下悬念/伏笔
    """
    text = parser.text
    lines = parser.lines
    issues = []

    # 检查本集开头的衔接标记
    first_lines = " ".join(lines[:5]) if lines else ""
    has_recap = any(marker in first_lines for marker in ["上集", "前文", "前情", "接着", "画面"] + SUSPENSE_MARKERS)

    # 检查本集结尾的悬念/收尾
    last_lines = " ".join(lines[-5:]) if lines else ""
    has_cliffhanger = any(marker in last_lines for marker in ["待续", "未完", "悬念", "且听", "下集"] + SUSPENSE_MARKERS)

    if episode > 1 and not has_recap:
        issues.append(f"第{episode}集开头缺少对上集结尾的衔接/回顾（建议添加前情提示）")

    if not has_cliffhanger:
        issues.append("本集结尾缺少悬念或伏笔（建议设置悬念引导续看）")

    # 检查悬念链是否完整（是否有【悬念】标记）
    suspense_markers_found = []
    for i, line in enumerate(lines):
        for marker in SUSPENSE_MARKERS:
            if marker in line:
                suspense_markers_found.append({
                    "line": i + 1,
                    "marker": marker,
                    "context": line[:60],
                })

    pass_check = len(issues) == 0

    return {
        "pass": pass_check,
        "details": {
            "episode": episode,
            "has_recap": has_recap,
            "has_cliffhanger": has_cliffhanger,
            "suspense_markers_found": len(suspense_markers_found),
            "suspense_list": suspense_markers_found[:10],
            "issues": issues,
        },
        "message": ("悬念链连贯性检查通过"
                    if pass_check else
                    f"悬念链存在{len(issues)}个问题: " + "; ".join(issues)),
    }


# =============================================================================
# 第9项检查：爽感密度分布分析
# =============================================================================

def check_satisfaction_density(parser: ScriptParser, duration: int = DEFAULT_EPISODE_DURATION) -> Dict[str, Any]:
    """
    爽感密度分布分析：统计爽点事件数量，分析分布均匀性
    
    爽点：打脸、逆袭、反转等让读者感到痛快的情节
    """
    text = parser.text
    lines = parser.lines

    # 收集所有爽点事件及其位置
    events = []
    for i, line in enumerate(lines):
        for kw in SATISFACTION_KEYWORDS:
            if kw in line:
                pos_ratio = i / max(len(lines), 1)
                estimated_time = pos_ratio * duration
                events.append({
                    "keyword": kw,
                    "line": i + 1,
                    "estimated_time": round(estimated_time, 1),
                    "context": line[:60],
                })
                break  # 每行只计一次

    event_count = len(events)

    # 分析分布均匀性：计算爽点之间的时间间隔方差
    if event_count >= 2:
        times = sorted(e["estimated_time"] for e in events)
        intervals = [times[i+1] - times[i] for i in range(len(times)-1)]
        interval_variance = np.var(intervals) if intervals else 0
        interval_mean = np.mean(intervals) if intervals else 0
    else:
        intervals = []
        interval_variance = 0
        interval_mean = 0

    # 评价：至少有1个爽点，且分布不太集中
    pass_check = event_count >= 1 and (event_count < 2 or interval_variance <= 400)

    return {
        "pass": pass_check,
        "details": {
            "event_count": event_count,
            "events": events[:15],
            "interval_mean": round(float(interval_mean), 1),
            "interval_variance": round(float(interval_variance), 1),
            "distribution_comment": "均匀" if interval_variance < 100 else "一般" if interval_variance < 400 else "不均匀",
        },
        "message": (f"爽感密度检查通过：共{event_count}个爽点事件，分布{'均匀' if interval_variance < 100 else '一般' if interval_variance < 400 else '较集中'}"
                    if pass_check else
                    f"爽感密度不足：仅{event_count}个爽点事件，建议增加打脸/逆袭/反转情节"),
    }


# =============================================================================
# 第10项检查：Fountain格式验证
# =============================================================================

def check_fountain_format(parser: ScriptParser) -> Dict[str, Any]:
    """
    Fountain格式验证：检查Fountain标记是否正确
    
    Fountain基本语法规则：
    - 场景标题：INT./EXT. 开头
    - 角色名：全大写
    - 对话：角色名下方的文本
    - 括号补充：(全大写)
    - 转场：TO/FADE/CUT 结尾的右对齐文字
    """
    text = parser.text
    lines = parser.lines
    errors = []
    warnings = []

    # 检查场景标题格式
    scene_headings = re.findall(r"^(INT|EXT|内景|外景)[\.\s]", text, re.MULTILINE | re.IGNORECASE)
    
    # 检查角色名是否全大写（Fountain标准）
    dialogue_lines = []
    for i, line in enumerate(lines):
        # 检测可能的角色名（上一行全大写，当前行是对话）
        if i > 0 and re.match(r"^[A-Z\s]{2,10}$", lines[i-1]) and len(line) > 5:
            dialogue_lines.append({"character": lines[i-1], "text": line, "line_no": i})
            # 检查角色名是否过大写
            if not lines[i-1].isupper():
                warnings.append(f"第{i}行: 角色名'{lines[i-1]}'建议全大写")

    # 检查转场标记
    transitions = re.findall(r"^\s*(FADE\s+(?:IN|OUT)|CUT\s+TO|DISSOLVE\s+TO|>.*TO)\s*$", text, re.MULTILINE | re.IGNORECASE)
    
    # 检查标题页标记
    has_title_page = bool(re.search(r"^Title:\s*", text, re.MULTILINE | re.IGNORECASE))
    
    # 检查是否有未闭合的注释
    open_comments = text.count("/*") - text.count("*/")
    if open_comments != 0:
        errors.append(f"注释未正确闭合: /* 数量与 */ 不匹配（差值: {open_comments}）")

    # 检查是否有未闭合的双括号注释
    open_boneyard = text.count("[[") - text.count("]]")
    if open_boneyard != 0:
        errors.append(f"笔记注释未正确闭合: [[ 与 ]] 不匹配（差值: {open_boneyard}）")

    # 检查基本结构
    has_scene = len(scene_headings) > 0
    has_dialogue = len(dialogue_lines) > 0
    
    if not has_scene and not has_dialogue:
        # 可能不是Fountain格式，检查Markdown格式
        md_headers = len(re.findall(r"^#{1,3}\s+", text, re.MULTILINE))
        if md_headers > 0:
            return {
                "pass": True,
                "details": {
                    "format_detected": "Markdown",
                    "scene_headings": len(scene_headings),
                    "dialogue_count": len(dialogue_lines),
                    "title_page": has_title_page,
                },
                "message": "检测到Markdown格式剧本，非Fountain格式，跳过Fountain语法检查",
            }
        else:
            warnings.append("未检测到Fountain场景标题或Markdown标题标记")

    all_issues = errors + warnings
    pass_check = len(errors) == 0

    return {
        "pass": pass_check,
        "details": {
            "format_detected": "Fountain" if has_scene else "Unknown",
            "errors": errors,
            "warnings": warnings,
            "scene_headings": len(scene_headings),
            "dialogue_count": len(dialogue_lines),
            "transitions": len(transitions),
            "title_page": has_title_page,
        },
        "message": ("Fountain格式验证通过"
                    if pass_check else
                    f"Fountain格式存在{len(errors)}个错误，{len(warnings)}个警告"),
    }


# =============================================================================
# 主执行逻辑
# =============================================================================

def run_validation(args: argparse.Namespace) -> Dict[str, Any]:
    """执行所有检查并返回完整结果"""

    # 读取剧本文件
    try:
        script_text = read_file(args.file)
    except Exception as e:
        return {
            "file": args.file,
            "overall_pass": False,
            "error": f"读取剧本文件失败: {e}",
            "checks": {},
            "summary": {},
        }

    # 解析剧本
    parser = ScriptParser(script_text)

    # 确定图表输出路径
    chart_path = args.output_chart
    if chart_path is None:
        base = os.path.splitext(os.path.basename(args.file))[0]
        chart_path = os.path.join(os.path.dirname(args.file) or ".", f"{base}_emotion.png")

    # 执行10项检查
    results = OrderedDict()

    # 1. 台词长度检查
    try:
        results["dialogue_length"] = check_dialogue_length(parser)
    except Exception as e:
        results["dialogue_length"] = {"pass": False, "details": {}, "message": f"检查异常: {e}"}

    # 2. 钩子密度检测
    try:
        results["hook_density"] = check_hook_density(parser, args.mode, args.duration)
    except Exception as e:
        results["hook_density"] = {"pass": False, "details": {}, "message": f"检查异常: {e}"}

    # 3. 场景数量统计
    try:
        results["scene_count"] = check_scene_count(parser)
    except Exception as e:
        results["scene_count"] = {"pass": False, "details": {}, "message": f"检查异常: {e}"}

    # 4. 情绪曲线可视化
    try:
        results["emotion_curve"] = check_emotion_curve(parser, chart_path, args.duration)
    except Exception as e:
        results["emotion_curve"] = {"pass": False, "details": {}, "message": f"检查异常: {e}"}

    # 5. 付费卡点位置验证
    try:
        results["payment_cards"] = check_payment_cards(parser, args.duration)
    except Exception as e:
        results["payment_cards"] = {"pass": False, "details": {}, "message": f"检查异常: {e}"}

    # 6. OOC检测
    try:
        results["ooc_check"] = check_ooc(parser, args.character)
    except Exception as e:
        results["ooc_check"] = {"pass": False, "details": {}, "message": f"检查异常: {e}"}

    # 7. 字数统计与标准对比
    try:
        results["word_count"] = check_word_count(parser, args.duration)
    except Exception as e:
        results["word_count"] = {"pass": False, "details": {}, "message": f"检查异常: {e}"}

    # 8. 悬念链连贯性检查
    try:
        results["suspense_chain"] = check_suspense_chain(parser, args.episode)
    except Exception as e:
        results["suspense_chain"] = {"pass": False, "details": {}, "message": f"检查异常: {e}"}

    # 9. 爽感密度分布分析
    try:
        results["satisfaction_density"] = check_satisfaction_density(parser, args.duration)
    except Exception as e:
        results["satisfaction_density"] = {"pass": False, "details": {}, "message": f"检查异常: {e}"}

    # 10. Fountain格式验证
    try:
        results["fountain_format"] = check_fountain_format(parser)
    except Exception as e:
        results["fountain_format"] = {"pass": False, "details": {}, "message": f"检查异常: {e}"}

    # 综合判断
    overall_pass = all(r.get("pass", False) for r in results.values())

    # 汇总信息
    summary = {
        "total_scenes": results.get("scene_count", {}).get("details", {}).get("scene_count", 0),
        "total_words": results.get("word_count", {}).get("details", {}).get("total_words", 0),
        "expected_words": results.get("word_count", {}).get("details", {}).get("expected_range", ""),
        "hook_count": results.get("hook_density", {}).get("details", {}).get("hook_count", 0),
        "satisfaction_events": results.get("satisfaction_density", {}).get("details", {}).get("event_count", 0),
        "episode": args.episode,
        "mode": args.mode,
        "duration": args.duration,
    }

    return {
        "file": args.file,
        "overall_pass": overall_pass,
        "checks": results,
        "summary": summary,
    }


def main():
    """主入口函数"""
    args = parse_args()

    # 执行校验
    result = run_validation(args)

    # 输出JSON结果（自定义序列化器处理numpy类型）
    def _serialize(obj):
        if isinstance(obj, np.bool_):
            return bool(obj)
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

    json_output = json.dumps(result, ensure_ascii=False, indent=2, default=_serialize)
    print(json_output)

    # 非静默模式下输出简要摘要
    if not args.quiet and "error" not in result:
        print("\n" + "="*60, file=sys.stderr)
        print("  剧本质量校验报告", file=sys.stderr)
        print("="*60, file=sys.stderr)
        print(f"  文件: {result['file']}", file=sys.stderr)
        print(f"  综合结果: {'通过' if result['overall_pass'] else '未通过'}", file=sys.stderr)
        print(f"  总场景数: {result['summary'].get('total_scenes', 0)}", file=sys.stderr)
        print(f"  总字数: {result['summary'].get('total_words', 0)}", file=sys.stderr)
        print(f"  标准字数: {result['summary'].get('expected_words', '')}", file=sys.stderr)
        print(f"  钩子数: {result['summary'].get('hook_count', 0)}", file=sys.stderr)
        print(f"  爽点事件: {result['summary'].get('satisfaction_events', 0)}", file=sys.stderr)
        print("-"*60, file=sys.stderr)
        for check_name, check_result in result["checks"].items():
            status = "通过" if check_result.get("pass") else "未通过"
            icon = "✓" if check_result.get("pass") else "✗"
            print(f"  {icon} {check_name}: {status} - {check_result.get('message', '')}", file=sys.stderr)
        print("="*60, file=sys.stderr)

    # 根据综合结果设置退出码
    sys.exit(0 if result["overall_pass"] else 1)


if __name__ == "__main__":
    main()
