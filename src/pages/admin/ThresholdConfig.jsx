import { useState, useEffect, useMemo } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { LOCATIONS, METRICS } from "../../lib/data.js";
import { cn } from "../../lib/utils.js";
import { Card, CardHeader, CardContent } from "../../components/ui/card.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Input } from "../../components/ui/input.jsx";
import { Label } from "../../components/ui/label.jsx";
import { Segmented } from "../../components/ui/segmented.jsx";

const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * Validation rules for a threshold band.
 *
 * Catching an inverted or overlapping band before it is saved is cheaper than
 * explaining afterwards why alerts stopped firing — Shneiderman's fifth rule,
 * error prevention over error messages.
 */
function validateBand(band) {
  const errors = {};
  if (band.warn_min === "" || band.warn_max === "" || band.crit_min === "" || band.crit_max === "") {
    errors.empty = "All four values are required.";
    return errors;
  }
  if (band.warn_min > band.warn_max) errors.warn = "The warning minimum must not exceed the maximum.";
  if (band.crit_min > band.crit_max) errors.crit = "The critical minimum must not exceed the maximum.";
  if (band.crit_min > band.warn_min) errors.crit = "The critical minimum must sit at or below the warning minimum.";
  if (band.crit_max < band.warn_max) errors.crit = "The critical maximum must sit at or above the warning maximum.";
  return errors;
}

/** FR5 — configure the alert bands that drive the state model (A1 Figure 8). */
export default function ThresholdConfig({ thresholds, setThresholds, toast }) {
  const [scope, setScope] = useState(LOCATIONS[0].location_id);
  const [draft, setDraft] = useState(() => clone(thresholds[LOCATIONS[0].location_id]));

  useEffect(() => { setDraft(clone(thresholds[scope])); }, [scope, thresholds]);

  const errors = useMemo(
    () => Object.fromEntries(Object.keys(METRICS).map((k) => [k, validateBand(draft[k])])),
    [draft]
  );
  const hasErrors = Object.values(errors).some((e) => Object.keys(e).length > 0);
  const dirty = JSON.stringify(draft) !== JSON.stringify(thresholds[scope]);

  // Values live in a draft until saved, so a half-typed number never becomes
  // the live alerting band.
  const update = (metric, field, value) =>
    setDraft((d) => ({ ...d, [metric]: { ...d[metric], [field]: value === "" ? "" : Number(value) } }));

  const save = () => {
    const previous = clone(thresholds[scope]);
    const scopeId = scope;
    setThresholds((t) => ({ ...t, [scopeId]: clone(draft) }));

    toast({
      tone: "good",
      title: "Thresholds saved",
      description: `New bands for ${LOCATIONS.find((l) => l.location_id === Number(scopeId)).name} take effect on the next reading.`,
      undo: () => {
        setThresholds((t) => ({ ...t, [scopeId]: previous }));
        toast({ tone: "info", title: "Thresholds restored", description: "The previous bands are active again." });
      },
    });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-page">Threshold configuration</h1>
          <p className="mt-1.5 text-sm text-ink-secondary">
            Define the warning and critical bands that drive the alert state model.
          </p>
        </div>
        {/* Scope sits beside the heading so it is never ambiguous which
            location is being edited (A1 section 4.5). */}
        <Segmented
          value={scope}
          onValueChange={(v) => setScope(Number(v))}
          ariaLabel="Select the location being configured"
          options={LOCATIONS.map((l) => ({ value: l.location_id, label: l.name }))}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {Object.values(METRICS).map((m) => {
          const band = draft[m.key];
          const error = errors[m.key];
          const invalid = Object.keys(error).length > 0;

          return (
            <Card key={m.key} accent={m.accent}>
              <CardHeader>
                <div>
                  <h2 className="text-section">{m.label}</h2>
                  <p className="mt-0.5 text-xs text-ink-secondary">Measured in {m.unit}</p>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-state-warning">
                    Warning band
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`${m.key}-warn-min`}>Minimum</Label>
                      <Input id={`${m.key}-warn-min`} type="number" value={band.warn_min}
                             invalid={Boolean(error.warn)}
                             onChange={(e) => update(m.key, "warn_min", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`${m.key}-warn-max`}>Maximum</Label>
                      <Input id={`${m.key}-warn-max`} type="number" value={band.warn_max}
                             invalid={Boolean(error.warn)}
                             onChange={(e) => update(m.key, "warn_max", e.target.value)} />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="space-y-2">
                  <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-state-critical">
                    Critical band
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`${m.key}-crit-min`}>Minimum</Label>
                      <Input id={`${m.key}-crit-min`} type="number" value={band.crit_min}
                             invalid={Boolean(error.crit)}
                             onChange={(e) => update(m.key, "crit_min", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`${m.key}-crit-max`}>Maximum</Label>
                      <Input id={`${m.key}-crit-max`} type="number" value={band.crit_max}
                             invalid={Boolean(error.crit)}
                             onChange={(e) => update(m.key, "crit_max", e.target.value)} />
                    </div>
                  </div>
                </fieldset>

                {invalid && (
                  <p role="alert" className="flex gap-2 text-xs text-state-critical">
                    <AlertCircle size={13} className="mt-px shrink-0" />
                    {error.empty || error.warn || error.crit}
                  </p>
                )}

                {/* Live preview of the resulting state model, so the effect of
                    the numbers is visible before they are committed. */}
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-secondary">
                    Resulting states
                  </p>
                  <div className="flex overflow-hidden rounded-lg border border-line" aria-hidden="true">
                    {[
                      { cls: "bg-state-critical/20 text-state-critical", label: `<${band.crit_min}` },
                      { cls: "bg-state-warning/20 text-state-warning", label: `${band.crit_min}–${band.warn_min}` },
                      { cls: "bg-state-good/20 text-state-good", label: `${band.warn_min}–${band.warn_max}` },
                      { cls: "bg-state-warning/20 text-state-warning", label: `${band.warn_max}–${band.crit_max}` },
                      { cls: "bg-state-critical/20 text-state-critical", label: `>${band.crit_max}` },
                    ].map((seg, i) => (
                      <span key={i} className={cn("flex-1 px-1 py-2 text-center text-[10px] font-semibold", seg.cls)}>
                        {seg.label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-ink-secondary">
                    Critical · Warning · Normal · Warning · Critical
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* A sticky action bar means the save control is never scrolled away
          from the fields it applies to. */}
      <div
        className={cn(
          "sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-line px-5 py-4 backdrop-blur transition-colors",
          dirty ? "bg-surface-raised/95" : "bg-surface-card/80"
        )}
      >
        <Button onClick={save} disabled={!dirty || hasErrors}>Save changes</Button>
        <Button variant="secondary" disabled={!dirty} onClick={() => setDraft(clone(thresholds[scope]))}>
          <RotateCcw size={14} />
          Discard
        </Button>
        <p className="text-xs text-ink-secondary">
          {hasErrors
            ? "Correct the highlighted values before saving."
            : dirty
              ? "Unsaved changes — the current bands stay active until you save."
              : "All changes saved."}
        </p>
      </div>
    </div>
  );
}
