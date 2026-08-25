import { useState } from "react";
import { Search, Plus, UserX } from "lucide-react";
import { USERS } from "../../lib/data.js";
import { StatusBadge, Badge } from "../../components/ui/badge.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Input } from "../../components/ui/input.jsx";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../components/ui/select.jsx";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../../components/ui/dialog.jsx";
import { EmptyState } from "../../components/ui/empty-state.jsx";

/** FR8 — administrators manage users and system configuration (A1 Figure 7). */
export default function UserManagement({ toast }) {
  const [users, setUsers] = useState(USERS);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirming, setConfirming] = useState(null);

  const filtered = users
    .filter((u) => `${u.full_name} ${u.email}`.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((u) => roleFilter === "all" || u.role === roleFilter)
    .filter((u) => statusFilter === "all" || (statusFilter === "active" ? u.is_active : !u.is_active));

  const setActive = (userId, value) =>
    setUsers((list) => list.map((u) => (u.user_id === userId ? { ...u, is_active: value } : u)));

  /**
   * Disabling an account is reversible from the confirmation toast, so a
   * mis-click costs one click to recover rather than a support request
   * (Shneiderman's sixth rule).
   */
  const toggleAccount = (user) => {
    const wasActive = user.is_active;
    setActive(user.user_id, !wasActive);
    setConfirming(null);

    toast({
      tone: wasActive ? "warning" : "good",
      title: wasActive ? "Account disabled" : "Account re-enabled",
      description: wasActive
        ? `${user.full_name} can no longer sign in. Their readings and acknowledgements are retained.`
        : `${user.full_name} can sign in again with their existing role and locations.`,
      undo: () => {
        setActive(user.user_id, wasActive);
        toast({ tone: "info", title: "Change reverted", description: `${user.full_name} is ${wasActive ? "active" : "disabled"} again.` });
      },
    });
  };

  const pending = (feature) =>
    toast({
      tone: "info",
      title: "Available in the next release",
      description: `${feature} writes to the database, which is delivered with the back-end in Assessment 3.`,
    });

  const resetFilters = () => { setQuery(""); setRoleFilter("all"); setStatusFilter("all"); };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-page">User management</h1>
          <p className="mt-1.5 text-sm text-ink-secondary">
            Create accounts, assign roles and control which locations each user can monitor.
          </p>
        </div>
        <Button onClick={() => pending("Creating an account")}>
          <Plus size={15} />
          Add user
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[15rem] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <Input
            className="pl-10"
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search users"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40" aria-label="Filter by role"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="Administrator">Administrator</SelectItem>
            <SelectItem value="End User">End User</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
          </SelectContent>
        </Select>

        <span className="ml-auto text-xs text-ink-secondary">
          {filtered.length} of {users.length} users
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface-card">
        {filtered.length === 0 ? (
          <EmptyState
            icon={UserX}
            title="No accounts match those filters"
            description="Nobody in the directory matches that search combined with the role and status filters."
            actionLabel="Clear filters"
            onAction={resetFilters}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[52rem]">
              <caption className="sr-only">User accounts</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Locations</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last active</th>
                  <th scope="col" className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.user_id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-raised text-[11px] font-semibold">
                          {u.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.full_name}</p>
                          <p className="truncate text-xs text-ink-secondary">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><Badge tone="neutral">{u.role}</Badge></td>
                    <td className="text-ink-secondary">{u.locations}</td>
                    <td>
                      {/* Filled dot for Active, outlined for Invited: never colour alone */}
                      <StatusBadge status={u.is_active ? "good" : "neutral"} outline={!u.is_active}>
                        {u.is_active ? "Active" : "Invited"}
                      </StatusBadge>
                    </td>
                    <td className="whitespace-nowrap text-ink-secondary">{u.last_active}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => pending("Editing an account")}>Edit</Button>
                        {/* The destructive control reads Disable, not Delete */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={u.is_active ? "text-state-critical hover:text-state-critical" : "text-state-good hover:text-state-good"}
                          onClick={() => setConfirming(u)}
                        >
                          {u.is_active ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={Boolean(confirming)} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          {confirming && (
            <>
              <DialogTitle>
                {confirming.is_active ? "Disable" : "Enable"} {confirming.full_name}?
              </DialogTitle>
              <DialogDescription>
                {confirming.is_active
                  ? "The account is disabled, not deleted. Readings, alerts and acknowledgements stay linked to it so the audit trail is preserved. You can re-enable it at any time."
                  : "The account will be able to sign in again with its existing role and assigned locations."}
              </DialogDescription>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">Cancel</Button>
                </DialogClose>
                <Button
                  variant={confirming.is_active ? "danger" : "primary"}
                  onClick={() => toggleAccount(confirming)}
                >
                  {confirming.is_active ? "Disable account" : "Enable account"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
