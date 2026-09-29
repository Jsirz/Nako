/** Startup reflects pending work; it never delays a ready session for an animation. */
export function StartupStatus({ message }: { message: string }) {
  return (
    <section className="startup-status" role="status" aria-live="polite" aria-busy="true">
      <img src="/nako-logo.png" alt="Nako" />
      <p>{message}</p>
      <span className="startup-progress" aria-hidden="true">
        <span />
      </span>
    </section>
  );
}
