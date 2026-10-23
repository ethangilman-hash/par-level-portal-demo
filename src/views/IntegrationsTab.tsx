// Integrations tab (both roles): provider status, functions using each provider, field mapping and recent sync log.
import { Section, Table, Status, Segmented, Callout, Text, useState } from "../kit";
import { useStyles, localStamp } from "../ui";
import { PROVIDERS, PROVIDER_ORDER, PROXY_URL_ENV, useSyncLog, type ProviderId } from "../integrations";
import { FIELD_MAP, USED_BY } from "../integrations/mapping";

export function IntegrationsTab(props: { role: "vendor" | "retailer" }) {
  const { t, small, strong, row } = useStyles();
  const log = useSyncLog();
  const [sel, setSel] = useState<ProviderId>("dutchie");
  const [logFilter, setLogFilter] = useState<"all" | ProviderId>("all");
  const shown = log.filter((e) => logFilter === "all" || e.provider === logFilter).slice(0, 25);
  return (
    <>
      <Callout tone="info" lead="Demo mode.">
        Every action in this demo runs through the adapter layer in src/integrations. All four providers use mock adapters backed by sample data; no network calls are made.
        One switch, VITE_INTEGRATIONS_MODE=mock|live (per-provider overrides like VITE_DUTCHIE_MODE), selects live adapters, which would call a server-side proxy ({PROXY_URL_ENV}) that holds the keys.
      </Callout>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {PROVIDER_ORDER.map((id) => {
          const p = PROVIDERS[id];
          const last = log.find((e) => e.provider === id);
          const calls = log.filter((e) => e.provider === id).length;
          return (
            <div key={id} style={{ border: `1px solid ${sel === id ? t.border.focus : t.border.subtle}`, borderRadius: t.radius.lg, background: t.bg.elevated, padding: 14, display: "flex", flexDirection: "column", gap: 8, cursor: "pointer" }}
              onClick={() => setSel(id)}>
              <div style={{ ...row, justifyContent: "space-between" }}>
                <span style={strong}>{p.name}</span>
                {p.mode === "mock" ? <Status tone="accent">Demo mode · sample data</Status> : <Status tone="danger">Live · not connected</Status>}
              </div>
              <span style={small}>{p.role}</span>
              <span style={small}>Base URL: {p.baseUrl}</span>
              <span style={small}>Auth: {p.auth}</span>
              <span style={small}>Key placeholders: {p.envVars.join(", ")}</span>
              <span style={small}>{calls} calls this session{last ? ` · last ${localStamp(last.at)}` : ""}</span>
            </div>
          );
        })}
      </div>
      <Section heading={`${PROVIDERS[sel].name}: functions and field mapping`} caption={`Viewing as ${props.role}. Names follow the provider's public API docs; "(to confirm)" marks names that could not be verified. Full notes in docs/INTEGRATIONS.md.`}
        actions={<Segmented<ProviderId> value={sel} onChange={setSel} options={PROVIDER_ORDER.map((id) => ({ value: id, label: PROVIDERS[id].name }))} />}>
        <Table columns={["Demo function", "Adapter method"]} rows={USED_BY[sel].map((u) => [u.fn, u.adapter])} />
        <Table columns={["Our field", "Provider object", "Provider field", "Direction", "Sync trigger"]}
          rows={FIELD_MAP[sel].map((m) => [m.ours, m.object, m.field, { text: m.direction, tone: m.direction === "Push" ? "warning" : "success" }, m.trigger])} />
      </Section>
      <Section heading="Recent sync log" caption="Adapter calls in this browser session, newest first. Times are your local time. Mock calls are simulated."
        actions={<Segmented<"all" | ProviderId> value={logFilter} onChange={setLogFilter} options={[{ value: "all", label: "All" }, ...PROVIDER_ORDER.map((id) => ({ value: id, label: PROVIDERS[id].name, count: log.filter((e) => e.provider === id).length || undefined }))]} />}>
        {shown.length ? (
          <Table columns={["Time", "Provider", "Operation", "Endpoint", "Reference", "Result"]}
            rows={shown.map((e) => [localStamp(e.at), `${PROVIDERS[e.provider].name}${e.mode === "mock" ? " (mock)" : ""}`, `${e.direction === "push" ? "→" : "←"} ${e.operation}`, e.endpoint, e.ref,
              { text: `${e.ok ? "OK" : "Failed"}: ${e.summary}`, tone: e.ok ? "success" : "danger" }])} />
        ) : <Text>No sync activity yet.</Text>}
      </Section>
    </>
  );
}
