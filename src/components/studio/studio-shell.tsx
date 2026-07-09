import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  LayoutDashboard,
  Link2,
  LogOut,
  PenSquare,
  Rocket,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

const NAV = [
  { href: "/studio", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio/start", label: "Primeiro post", icon: Rocket },
  { href: "/studio/compose", label: "Compositor", icon: PenSquare },
  { href: "/studio/calendar", label: "Calendário", icon: Calendar },
  { href: "/studio/accounts", label: "Contas", icon: Link2 },
];

export function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#0D0D1A] text-zinc-100 flex">
      <aside className="hidden md:flex w-56 flex-col border-r border-white/5 bg-[#12121F]">
        <div className="p-5 border-b border-white/5">
          <Link href="/" className="font-bold text-lg tracking-tight">
            Social <span className="text-violet-400">Pulse</span>
          </Link>
          <p className="text-xs text-zinc-500 mt-1 truncate">{profile?.email}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/studio" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-violet-500/15 text-violet-300"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => signOut()}
          className="m-3 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/5"
        >
          <LogOut size={18} />
          Sair
        </button>
      </aside>
      <main className="flex-1 min-h-screen overflow-auto">{children}</main>
    </div>
  );
}
