import { Outlet, NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Resume", icon: "📄" },
  { to: "/jobs", label: "Jobs", icon: "💼" },
  { to: "/logs", label: "Logs", icon: "📋" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
] as const;

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-yellow-400 border-b-2 border-black px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h1 className="text-lg tracking-tight">AGENTIC SPACE</h1>
            <p className="text-[10px] font-display font-bold opacity-70">JOB HUNTING AGENT</p>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-24">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black z-50">
        <div className="max-w-lg mx-auto flex justify-around">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
            >
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
