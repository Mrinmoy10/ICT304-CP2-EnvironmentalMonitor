import { useState, useCallback, useEffect } from "react";
import { LayoutDashboard, TrendingUp, Columns3, Table2, Users, SlidersHorizontal, Radio, LogOut } from "lucide-react";
import { TooltipProvider } from "./components/ui/tooltip.jsx";
import { ToastProvider, useToast } from "./components/ui/toast.jsx";
import { CommandPalette } from "./components/CommandPalette.jsx";
import { AppShell } from "./components/AppShell.jsx";
import { defaultThresholds, visibleLocations, clock } from "./lib/data.js";
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
  const [thresholds, setThresholds] = useState(defaultThresholds);
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
   * A notification carrying a severity also creates an alert record: the
   * toast is transient, the alert is not. This mirrors the separation
   * between a client notification and the alerts table in the schema.
   */
  const notify = useCallback(
    ({ severity, metric, location, ...rest }) => {
      toast(rest);
      if (severity) {
        setAlerts((list) => [
          ...list,
          {
            alert_id: `${Date.now()}-${Math.random()}`,
            severity,
            metric,
            location,
            created_at: Date.now(),
            acknowledged: false,
          },
        ]);
      }
    },
    [toast]
  );

  /** Writes an alert_acknowledgements row: who cleared the alert, and when. */
  const acknowledge = (alertId) => {
    setAlerts((list) =>
      list.map((a) =>
        a.alert_id === alertId
          ? { ...a, acknowledged: true, acknowledged_by: user.full_name, acknowledged_at: Date.now() }
          : a
      )
    );
    toast({
      tone: "good",
      title: "Alert acknowledged",
      description: `Recorded against ${user.full_name} at ${clock(Date.now())}.`,
    });
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
    setUser(null);
    setAlerts([]);
    setRoute("dashboard");
  };

  if (!user) return <Login onLogin={signIn} />;

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
