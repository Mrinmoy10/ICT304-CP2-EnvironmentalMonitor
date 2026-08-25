import { useState } from "react";
import {
  Leaf,
  Eye,
  EyeOff,
  AlertCircle,
  Activity,
  BellRing,
  LineChart as LineIcon,
} from "lucide-react";
import { api } from "../lib/api.js";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Label } from "../components/ui/label.jsx";

const HIGHLIGHTS = [
  {
    icon: Activity,
    color: "text-metric-temperature",
    text: "Live readings refreshed every five seconds",
  },
  {
    icon: BellRing,
    color: "text-metric-humidity",
    text: "Threshold alerts per room, per metric",
  },
  {
    icon: LineIcon,
    color: "text-metric-air",
    text: "Historical trends and location comparison",
  },
];

/** FR7 — user authentication and secure login (A1 Figure 6). */
export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({});

  // Error prevention (Shneiderman's fifth rule): the field is validated as the
  // user leaves it, so a malformed address is caught before submission rather
  // than being reported by the server afterwards.
  const emailInvalid =
    touched.email &&
    email.length > 0 &&
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const canSubmit = email.length > 0 && password.length > 0 && !emailInvalid;

  const submit = async () => {
    if (!canSubmit) return;
    setError("");
    setBusy(true);
    try {
      onLogin(await api.login(email, password));
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const fill = (address) => {
    setEmail(address);
    setPassword("demo1234");
    setError("");
    setTouched({});
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel: context for who this system is for and what it does */}
      <div className="relative hidden flex-col justify-center overflow-hidden border-r border-line bg-surface-card px-14 py-20 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--ink-secondary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--ink-secondary)) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          aria-hidden="true"
        />

        <div className="relative">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-metric-humidity to-brand text-surface-base">
              <Leaf size={17} />
            </span>
            <span className="font-semibold tracking-tight">
              Environmental Monitor
            </span>
          </div>

          <h1 className="mt-8 max-w-[13ch] text-[42px] font-bold leading-[1.08] tracking-[-0.03em]">
            Room-level environmental awareness.
          </h1>

          <p className="mt-5 max-w-[42ch] leading-relaxed text-ink-secondary">
            Live temperature, humidity and air-quality readings for every space
            your organisation manages — not a city-wide average.
          </p>

          <ul className="mt-10 space-y-4">
            {HIGHLIGHTS.map((h) => (
              <li
                key={h.text}
                className="flex items-center gap-3.5 text-sm text-ink-secondary"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface-raised ${h.color}`}
                >
                  <h.icon size={15} />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form column constrained to 400px to keep the reading path short (A1 4.5) */}
      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-[400px]">
          <div className="mb-9 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-metric-humidity to-brand text-surface-base">
              <Leaf size={17} />
            </span>
            <span className="font-semibold tracking-tight">
              Environmental Monitor
            </span>
          </div>

          <h2 className="text-page">Sign in</h2>
          <p className="mt-1.5 text-sm text-ink-secondary">
            Use the account issued by your organisation.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex gap-2.5 rounded-lg border border-state-critical/40 bg-state-critical/10 px-3.5 py-3 text-[13px] text-state-critical"
            >
              <AlertCircle size={15} className="mt-px shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-7 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                invalid={emailInvalid}
                aria-describedby={emailInvalid ? "email-error" : undefined}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="name@organisation.edu.au"
              />
              {emailInvalid && (
                <p id="email-error" className="text-xs text-state-critical">
                  Enter a complete email address, for example
                  name@organisation.edu.au
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  className="pr-12"
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-metric-humidity"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-secondary">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--brand))]"
                />
                Keep me signed in
              </label>
              <Button
                variant="link"
                size="sm"
                onClick={() =>
                  setError(
                    "Password resets are issued by an administrator in this release.",
                  )
                }
              >
                Forgot password?
              </Button>
            </div>

            <Button
              className="w-full"
              onClick={submit}
              disabled={busy || !canSubmit}
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </div>

          {/* No self-registration: accounts are provisioned by an Administrator (A1 4.5) */}
          <p className="mt-5 text-center text-xs text-ink-secondary">
            Accounts are provisioned by an administrator.
          </p>

          <div className="mt-9 rounded-lg border border-dashed border-line p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-secondary">
              Prototype accounts
            </p>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => fill("saadebnrashid10@gmail.com")}
                className="flex w-full items-center justify-between rounded-md border border-line bg-surface-card px-3 py-2 text-left text-xs transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-metric-humidity"
              >
                <span className="text-ink-primary">
                  saadebnrashid10@gmail.com
                </span>
                <span className="text-ink-secondary">Administrator</span>
              </button>
              <button
                onClick={() => fill("miankhizer86@gmail.com")}
                className="flex w-full items-center justify-between rounded-md border border-line bg-surface-card px-3 py-2 text-left text-xs transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-metric-humidity"
              >
                <span className="text-ink-primary">
                  miankhizer86@gmail.com
                </span>
                <span className="text-ink-secondary">End User</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
