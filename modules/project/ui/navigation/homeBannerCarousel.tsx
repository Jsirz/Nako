import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './homeBannerCarousel.css';

// Only enumerate filenames: public assets stay at /homepage/ rather than entering JS bundles.
const banners = Object.keys(import.meta.glob(
  '/public/homepage/*.{png,jpg,jpeg,webp,gif,avif,svg,PNG,JPG,JPEG,WEBP,GIF,AVIF,SVG}',
)).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true })).map(file => {
  const name = file.slice(file.lastIndexOf('/') + 1);
  return { url: '/homepage/' + encodeURIComponent(name), title: name.replace(/\.[^.]+$/, '') };
});

export function HomeBannerCarousel({ fallback }: { fallback: React.ReactNode }) {
  const root = React.useRef<HTMLElement>(null);
  const [failed, setFailed] = React.useState<string[]>([]);
  const [active, setActive] = React.useState(0);
  const [hovered, setHovered] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const images = React.useMemo(() => banners.filter(image => !failed.includes(image.url)), [failed]);
  const count = images.length;
  const current = count ? active % count : 0;
  const change = (offset: number) => setActive((current + offset + count) % count);

  React.useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  React.useEffect(() => {
    if (count < 2 || hovered || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden && !root.current?.contains(document.activeElement))
        setActive(value => (value + 1) % count);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [active, count, hovered, reducedMotion]);

  if (!count) return <>{fallback}</>;
  const slots = count === 1 ? [{ index: current, position: 'active' }]
    : count === 2 ? [{ index: current, position: 'active' }, { index: (current + 1) % count, position: 'next' }]
      : [{ index: (current + count - 1) % count, position: 'previous' },
        { index: current, position: 'active' }, { index: (current + 1) % count, position: 'next' }];
  return (
    <section ref={root} className="nako-home-banners" aria-label="首页推荐" aria-roledescription="轮播图"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onKeyDown={event => {
        if (count > 1 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
          event.preventDefault();
          change(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}>
      <div className="nako-home-banner-stage" data-count={Math.min(count, 3)}>
        {slots.map(({ index, position }) => {
          const image = images[index];
          return (
            <div key={image.url} className="nako-home-banner-slide" data-position={position}
              role="group" aria-roledescription="幻灯片" aria-label={`${index + 1} / ${count}：${image.title}`}
              aria-hidden={position !== 'active'}>
              <img src={image.url} alt={image.title} draggable={false} decoding="async"
                onError={() => setFailed(value => value.includes(image.url) ? value : [...value, image.url])} />
              {position !== 'active' && <button type="button" tabIndex={-1}
                className="nako-home-banner-select" aria-label={`查看${image.title}`}
                onClick={() => setActive(index)} />}
            </div>
          );
        })}
      </div>
      {count > 1 && <>
        <button type="button" className="nako-home-banner-arrow nako-home-banner-prev"
          aria-label="上一张推荐" onClick={() => change(-1)}><ChevronLeft size={19} /></button>
        <button type="button" className="nako-home-banner-arrow nako-home-banner-next"
          aria-label="下一张推荐" onClick={() => change(1)}><ChevronRight size={19} /></button>
        <div className="nako-home-banner-dots" aria-label="选择推荐图片">
          {images.map((image, index) => <button key={image.url} type="button"
            aria-label={`第 ${index + 1} 张：${image.title}`} aria-current={index === current ? 'true' : undefined}
            onClick={() => setActive(index)} />)}
        </div>
      </>}
    </section>
  );
}
