/** Startup reflects pending work; it never delays a ready session for an animation. */
export function StartupStatus({ message }: { message: string }) {
  return (
    <section className="startup-status" role="status" aria-live="polite" aria-busy="true">
      <img src="/nako-logo.png" alt="NAKO Agent 纳科画布智能体" />
      <p>{message}</p>
      <span className="startup-progress" aria-hidden="true">
        <span />
      </span>
    </section>
  );
}
