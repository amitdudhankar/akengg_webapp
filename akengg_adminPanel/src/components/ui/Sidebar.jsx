import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  X,
  LogOut,
  LayoutDashboard,
  Newspaper,
  Wrench,
  FolderKanban,
  BarChart3,
  MessageSquareQuote,
  UsersRound,
  Inbox,
  Mail,
  Settings,
  FileText,
  Building2,
  Package,
  Store,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Navigation grouped by domain: website-facing content vs the GST document
// builder vs system administration. Each group renders under a small label so
// the two control surfaces are visually separated.
const navSections = [
  {
    items: [{ name: "Dashboard", path: "/", icon: LayoutDashboard }],
  },
  {
    label: "Website Control",
    items: [
      { name: "Blogs", path: "/blogs", icon: Newspaper },
      { name: "Services", path: "/services", icon: Wrench },
      { name: "Projects", path: "/projects", icon: FolderKanban },
      { name: "Industry Stats", path: "/industry-stats", icon: BarChart3 },
      { name: "Testimonials", path: "/testimonials", icon: MessageSquareQuote },
      { name: "Team", path: "/team", icon: UsersRound },
      { name: "Contact Leads", path: "/contact-leads", icon: Inbox },
      { name: "Newsletter", path: "/newsletter", icon: Mail },
      { name: "Site Settings", path: "/settings", icon: Settings },
    ],
  },
  {
    label: "Document Control",
    items: [
      { name: "Documents", path: "/documents", icon: FileText },
      { name: "Parties", path: "/parties", icon: Building2 },
      { name: "Item Catalog", path: "/catalog", icon: Package },
      { name: "Seller Profile", path: "/seller-profile", icon: Store },
    ],
  },
  {
    label: "Administration",
    items: [{ name: "Users", path: "/users", icon: ShieldCheck }],
  },
];

function Sidebar({ isOpen = false, onClose = () => {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    onClose();
    navigate("/login");
  };

  // Active when the path matches exactly, or (for non-root entries) when the
  // current route is nested beneath it — so /documents/invoice/new keeps
  // "Documents" highlighted and /parties/edit/3 keeps "Parties" highlighted.
  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const displayName = user?.name || user?.fullName || user?.email || "Admin";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-300 shadow-xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 font-bold text-white shadow-md">
              AK
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">
                AK Engineering
              </div>
              <div className="text-xs text-slate-400">Admin Panel</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="rounded-md p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5 [scrollbar-width:thin]">
          {navSections.map((section, index) => (
            <div key={section.label || `group-${index}`}>
              {section.label && (
                <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {section.label}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 ${
                          active
                            ? "text-white"
                            : "text-slate-400 group-hover:text-white"
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User + logout */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-300">
              {avatarInitial}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-medium text-white">
                {displayName}
              </div>
              {user?.role && (
                <div className="truncate text-xs capitalize text-slate-400">
                  {user.role}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
