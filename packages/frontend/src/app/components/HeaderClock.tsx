import { useEffect, useState } from "react";

// Live date/time shown at the top right of every dashboard page header.
export function HeaderClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-right shrink-0">
      <p className="font-tele text-2xl font-bold text-slate-800 leading-none">
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
      </p>
      <p className="font-tele text-[10px] tracking-widest text-slate-500 mt-1 uppercase">
        {now.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" })}
      </p>
    </div>
  );
}
