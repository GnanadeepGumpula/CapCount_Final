import React from "react";

export default function DeveloperBadge() {
  const [dismissed, setDismissed] = React.useState(true); // Default to true to prevent hydration mismatch flashes

  React.useEffect(() => {
    const stored = window.localStorage.getItem("developer-badge-dismissed");
    setDismissed(stored === "1");
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents clicking the close button from triggering page actions behind it
    window.localStorage.setItem("developer-badge-dismissed", "1");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2 rounded-full border border-ink-200 bg-white p-2 pr-3 shadow-pop transition-all hover:-translate-y-0.5 pointer-events-auto animate-fade-in font-sans text-xs font-semibold text-ink-900">
      <a
        href="https://gnanadeepstudio.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 text-inherit no-underline"
      >
        <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-ink-100 shadow-inner">
          <img 
            src="/gnanadeep.jpeg" 
            alt="Gnanadeep Gumpula" 
            className="h-full w-full object-cover"
            onError={(e) => {
              // Standard fallback avatar indicator if your photo asset isn't matched yet
              e.currentTarget.src = "https://api.dicebear.com/7.x/bottts/svg?seed=gnanadeep";
            }}
          />
        </div>
        <span className="whitespace-nowrap pr-1 text-ink-700 hover:text-brand-700 transition-colors">
          Build by Gnanadeep Gumpula
        </span>
      </a>
      
      <button
        type="button"
        onClick={handleDismiss}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-ink-50 p-0 text-sm font-bold text-ink-400 border-none cursor-pointer transition-colors hover:bg-danger-50 hover:text-danger-600 line-none"
        aria-label="Dismiss developer badge"
      >
        ×
      </button>
    </div>
  );
}