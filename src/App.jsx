import { useState, useCallback, useEffect } from "react";
import { LayoutDashboard, TrendingUp, Columns3, Table2, Users, SlidersHorizontal, Radio, LogOut } from "lucide-react";
import { TooltipProvider } from "./components/ui/tooltip.jsx";
import { ToastProvider, useToast } from "./components/ui/toast.jsx";
import { CommandPalette } from "./components/CommandPalette.jsx";
import { AppShell } from "./components/AppShell.jsx";
import { visibleLocations, clock } from "./lib/data.js";
import { api } from "./lib/api.js";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Trends from "./pages/Trends.jsx";
import Comparison from "./pages/Comparison.jsx";
import Readings from "./pages/Readings.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";

function Application() {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [route, setRoute] = useState("dashboard");
  const [adminSection, setAdminSection] = useState("users");
  const [thresholds, setThresholds] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(1);
  const [commandOpen, setCommandOpen] = useState(false);

  /* Ctrl+K / Cmd+K opens the command palette from anywhere in the application. */
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /**
   * Toasts are transient client notifications. The durable alert records are
   * created by the back end when a stored reading breaches its band, and are
   * polled from GET /api/alerts below.
   */
  // eslint-disable-next-line no-unused-vars
  const notify = useCallback(({ severity, metric, location, ...rest }) => toast(rest), [toast]);

  const refreshAlerts = useCallback(() => {
    api.getAlerts().then(setAlerts).catch(() => {});
  }, []);

  /* Load the account's thresholds once signed in, then poll open alerts every five seconds. */
  useEffect(() => {
    if (!user) return undefined;
    api.getThresholds().then(setThresholds).catch((err) =>
      toast({ tone: "critical", title: "Could not load thresholds", description: err.message })
    );
    refreshAlerts();
    const id = setInterval(refreshAlerts, 5000);
    return () => clearInterval(id);
  }, [user, refreshAlerts, toast]);

  /** POST /api/alerts/:id/acknowledge writes an alert_acknowledgements row: who cleared it, and when. */
  const acknowledge = async (alertId) => {
    try {
      await api.acknowledgeAlert(alertId);
      refreshAlerts();
      toast({
        tone: "good",
        title: "Alert acknowledged",
        description: `Recorded against ${user.full_name} at ${clock(Date.now())}.`,
      });
    } catch (err) {
      toast({ tone: "critical", title: "Could not acknowledge alert", description: err.message });
    }
  };

  const signIn = (account) => {
    setUser(account);
    setRoute("dashboard");
    setSelectedLocation(visibleLocations(account)[0].location_id);
    toast({
      tone: "good",
      title: `Welcome back, ${account.full_name.split(" ")[0]}`,
      description:
        account.role === "Administrator"
          ? "Signed in as an administrator with access to every location."
          : `Signed in with access to ${account.locations}.`,
    });
  };

  const signOut = () => {
    api.logout();
    setUser(null);
    setThresholds(null);
    setAlerts([]);
    setRoute("dashboard");
  };

  if (!user) return <Login onLogin={signIn} />;
  if (!thresholds) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-secondary">
        Loading your locations…
      </div>
    );
  }

  const isAdmin = user.role === "Administrator";

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "trends", label: "Trends" },
    { id: "comparison", label: "Comparison" },
    { id: "readings", label: "Readings" },
    ...(isAdmin ? [{ id: "admin", label: "Admin" }] : []),
  ];

  const goAdmin = (section) => { setRoute("admin"); setAdminSection(section); };

  const commands = [
    { id: "dashboard", group: "Navigate", label: "Live dashboard", icon: LayoutDashboard, run: () => setRoute("dashboard") },
    { id: "trends", group: "Navigate", label: "Historical trends", icon: TrendingUp, run: () => setRoute("trends") },
    { id: "comparison", group: "Navigate", label: "Location comparison", icon: Columns3, run: () => setRoute("comparison") },
    { id: "readings", group: "Navigate", label: "All sensor readings", icon: Table2, keywords: "table export csv", run: () => setRoute("readings") },
    ...(isAdmin
      ? [
          { id: "users", group: "Administration", label: "User management", icon: Users, keywords: "accounts roles", run: () => goAdmin("users") },
          { id: "thresholds", group: "Administration", label: "Threshold configuration", icon: SlidersHorizontal, keywords: "alerts bands limits", run: () => goAdmin("thresholds") },
          { id: "sources", group: "Administration", label: "Data source management", icon: Radio, keywords: "sensors api", run: () => goAdmin("sources") },
        ]
      : []),
    { id: "signout", group: "Session", label: "Sign out", icon: LogOut, run: signOut },
  ];

  const unacknowledged = alerts.filter((a) => !a.acknowledged).length;

  return (
    <>
      <AppShell
        user={user}
        route={route}
        tabs={tabs}
        onNavigate={setRoute}
        onSignOut={signOut}
        onOpenCommand={() => setCommandOpen(true)}
        unreadAlerts={unacknowledged}
      >
        {route === "dashboard" && (
          <Dashboard
            user={user}
            thresholds={thresholds}
            alerts={alerts}
            onAcknowledge={acknowledge}
            toast={notify}
            selected={selectedLocation}
            setSelected={setSelectedLocation}
          />
        )}
        {route === "trends" && (
          <Trends user={user} selected={selectedLocation} setSelected={setSelectedLocation} />
        )}
        {route === "comparison" && <Comparison user={user} thresholds={thresholds} />}
        {route === "readings" && <Readings user={user} thresholds={thresholds} toast={toast} />}
        {route === "admin" && isAdmin && (
          <AdminLayout
            section={adminSection}
            setSection={setAdminSection}
            thresholds={thresholds}
            setThresholds={setThresholds}
            toast={toast}
          />
        )}
      </AppShell>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} commands={commands} />
    </>
  );
}

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <ToastProvider>
        <Application />
      </ToastProvider>
    </TooltipProvider>
  );
}
