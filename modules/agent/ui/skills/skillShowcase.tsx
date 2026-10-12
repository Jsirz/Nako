import * as React from 'react';
import { ArrowUpRight, Sparkles, X } from 'lucide-react';
import { CARD_PLACEHOLDER_IMAGE } from '../../../contracts/presentationAssets.js';
import { SKILL_CATALOG_CHANGED, SKILL_PREVIEW_EVENT, SKILL_NEW_CANVAS_EVENT } from '../../../contracts/skillCatalog.js';
import type { AgentSkill } from '../../../contracts/skillCatalog.js';
import { browserHost } from '../../../kernel/browser';
import { activateModal } from '../../../canvas-ui/api/ui/design/modalFocus';
import { createAgentSkillClient } from './skillClient';
import './skillShowcase.css';

function SkillDetail({ skill, onClose }: { skill: AgentSkill; onClose(): void }) {
  const root = React.useRef<HTMLDivElement>(null);
  const used = React.useRef(false);
  const useSkill = () => {
    if (used.current) return;
    used.current = true;
    onClose();
    browserHost.events.emit(SKILL_NEW_CANVAS_EVENT, { slug: skill.slug });
  };
  React.useEffect(
    () => (root.current ? activateModal(root.current, onClose) : undefined),
    [onClose],
  );
  return (
    <div
      className="nako-skill-preview-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={root}
        role="dialog"
        aria-modal="true"
        aria-label={skill.name}
        className="nako-skill-preview"
      >
        <div className="nako-skill-preview-image">
          <img
            src={skill.coverUrl ? `${skill.coverUrl}?v=${encodeURIComponent(skill.updatedAt || '')}` : CARD_PLACEHOLDER_IMAGE}
            alt=""
            onError={(event) => {
              event.currentTarget.src = CARD_PLACEHOLDER_IMAGE;
            }}
          />
          <button aria-label="关闭技能详情" className="nako-skill-preview-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="nako-skill-preview-body">
          <span className="nako-showcase-category">{skill.category || '其他'}</span>
          <h2>{skill.name}</h2>
          <div className="nako-skill-preview-sections">
            <section>
              <h3>简介</h3>
              <p>{skill.description || '暂无简介'}</p>
            </section>
          </div>
          <div className="nako-skill-preview-actions">
            <button type="button" onClick={useSkill}>
              <Sparkles size={16} />
              使用技能
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
function useSkillShowcase() {
  const client = React.useMemo(() => createAgentSkillClient(), []);
  const [skills, setSkills] = React.useState<AgentSkill[]>([]);
  const [category, setCategory] = React.useState(''),
    [selected, setSelected] = React.useState<AgentSkill | null>(null);
  const [loading, setLoading] = React.useState(true),
    [error, setError] = React.useState(''),
    [retry, setRetry] = React.useState(0);
  const close = React.useCallback(() => setSelected(null), []);
  React.useEffect(() => {
    let alive = true,
      revision = 0;
    const load = async () => {
      const current = ++revision;
      setLoading(true);
      setError('');
      try {
        const next = (await client.list()).filter(skill => skill.source === 'official');
        if (alive && current === revision) {
          setSkills(next);
          setSelected((value) => next.find((item) => item.slug === value?.slug) || null);
          setCategory((value) =>
            next.some((item) => (item.category || '其他') === value) ? value : '',
          );
        }
      } catch (cause) {
        if (alive && current === revision)
          setError(cause instanceof Error ? cause.message : '技能读取失败');
      } finally {
        if (alive && current === revision) setLoading(false);
      }
    };
    const refresh = () => void load();
    const preview = (event: Event) => {
      const skill = (event as CustomEvent<AgentSkill>).detail;
      if (skill?.source === 'official') setSelected(skill);
    };
    refresh();
    window.addEventListener(SKILL_CATALOG_CHANGED, refresh);
    window.addEventListener(SKILL_PREVIEW_EVENT, preview);
    return () => {
      alive = false;
      window.removeEventListener(SKILL_CATALOG_CHANGED, refresh);
      window.removeEventListener(SKILL_PREVIEW_EVENT, preview);
    };
  }, [client, retry]);
  return { skills, category, setCategory, selected, setSelected, loading, error, setRetry, close };
}
export function SkillShowcase() {
  const { skills, category, setCategory, selected, setSelected, loading, error, setRetry, close } =
    useSkillShowcase();
  const categories = [...new Set(skills.map((skill) => skill.category || '其他'))];
  const visible = skills.filter((skill) => !category || (skill.category || '其他') === category);
  return (
    <section className="nako-skill-showcase" aria-labelledby="nako-skill-showcase-title">
      <div className="nako-showcase-head">
        <div>
          <h2 id="nako-skill-showcase-title">
            <Sparkles size={18} />
            技能灵感库
          </h2>
          <p>为你的下一次创作，找到合适的技能。</p>
        </div>
      </div>
      <div className="nako-showcase-filters" role="group" aria-label="首页技能分类">
        {['', ...categories].map((value) => (
          <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>
            {value || '全部技能'}
          </button>
        ))}
      </div>
      {error ? (
        <div className="nako-showcase-empty" role="alert">
          {error}
          <button onClick={() => setRetry((value) => value + 1)}>重新加载</button>
        </div>
      ) : loading ? (
        <div className="nako-showcase-empty" role="status">
          正在读取技能…
        </div>
      ) : !visible.length ? (
        <div className="nako-showcase-empty">
          暂无官方预设技能。
        </div>
      ) : (
        <div className="nako-showcase-grid">
          {visible.map((skill) => (
            <button
              key={skill.slug}
              className="nako-showcase-card"
              onClick={() => setSelected(skill)}
            >
              <span className="nako-showcase-cover">
                <img
                  src={skill.coverUrl ? `${skill.coverUrl}?v=${encodeURIComponent(skill.updatedAt || '')}` : CARD_PLACEHOLDER_IMAGE}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.src = CARD_PLACEHOLDER_IMAGE;
                  }}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
                <span className="nako-showcase-cover-tag">{skill.category || '其他'}</span>
                <span className="nako-showcase-open">
                  <ArrowUpRight size={17} />
                </span>
              </span>
              <span className="nako-showcase-copy">
                <strong>{skill.name}</strong>
                <span>{skill.description || '为 Agent 提供专属创作指引'}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {selected && <SkillDetail key={selected.slug} skill={selected} onClose={close} />}
    </section>
  );
}
