export function CosmicBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-[#09090b]">
      {/* Precision micro-dot grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />
      {/* Minimal neutral top vignette */}
      <div
        className="absolute top-0 inset-x-0 h-[360px] pointer-events-none opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255, 255, 255, 0.04) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
