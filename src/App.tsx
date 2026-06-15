import * as React from "react";
import { AppShell, type NavKey } from "./components/AppShell";
import { Dashboard } from "./components/Dashboard";
import { ScenarioPicker } from "./components/ScenarioPicker";
import { Wizard } from "./components/Wizard";
import { JobsList } from "./components/JobsList";
import { JobDetail } from "./components/JobDetail";
import { Settings } from "./components/Settings";
import { TemplatesView } from "./components/TemplatesView";
import type { JobRequest, SavedTemplate } from "./lib/api";

const BREADCRUMBS: Record<NavKey, string> = {
  dashboard: "Dashboard",
  new: "New job",
  jobs: "Jobs",
  templates: "Templates",
  settings: "Settings",
};

export default function App() {
  const [nav, setNav] = React.useState<NavKey>("dashboard");
  const [scenario, setScenario] = React.useState<string | null>(null);
  const [openJobId, setOpenJobId] = React.useState<string | null>(null);
  const [wizardInit, setWizardInit] = React.useState<JobRequest | null>(null);

  function navigate(key: NavKey) {
    setNav(key);
    setScenario(null);
    setOpenJobId(null);
    setWizardInit(null);
  }

  function startScenario(type: string) {
    setScenario(type);
    setWizardInit(null);
    setNav("new");
    setOpenJobId(null);
  }

  function openJob(id: string) {
    setOpenJobId(id);
    setScenario(null);
    setWizardInit(null);
    setNav("jobs");
  }

  function editJob(req: JobRequest) {
    setWizardInit({ ...req, output_path: `${req.output_path}_copy` });
    setScenario(req.scenario ?? "raw_config");
    setOpenJobId(null);
    setNav("new");
  }

  function useTemplate(t: SavedTemplate) {
    setWizardInit({
      input_path: t.input_path ?? "dicoms/sample_petct",
      output_path: `outputs/${t.name}`,
      name: t.name,
      scenario: t.scenario ?? undefined,
      config_path: t.config_path ?? undefined,
      mutation_sets: t.mutation_sets ?? undefined,
      scenario_spec: t.scenario_spec ?? undefined,
    });
    setScenario(t.scenario ?? "raw_config");
    setOpenJobId(null);
    setNav("new");
  }

  const breadcrumb =
    nav === "new" && scenario
      ? `New job / ${scenario}`
      : nav === "jobs" && openJobId
        ? `Jobs / ${openJobId.slice(0, 12)}`
        : BREADCRUMBS[nav];

  return (
    <AppShell active={nav} onNavigate={navigate} breadcrumb={breadcrumb}>
      {nav === "dashboard" && <Dashboard onNew={() => navigate("new")} onOpenJob={openJob} />}

      {nav === "new" &&
        (scenario ? (
          <Wizard
            scenario={scenario}
            initial={wizardInit ?? undefined}
            onCancel={() => {
              setScenario(null);
              setWizardInit(null);
            }}
            onSubmit={openJob}
          />
        ) : (
          <ScenarioPicker onPick={setScenario} />
        ))}

      {nav === "jobs" &&
        (openJobId ? (
          <JobDetail jobId={openJobId} onBack={() => setOpenJobId(null)} onOpenJob={openJob} onEdit={editJob} />
        ) : (
          <JobsList onOpen={(j) => setOpenJobId(j.id)} />
        ))}

      {nav === "templates" && <TemplatesView onUseScenario={startScenario} onUseSaved={useTemplate} />}

      {nav === "settings" && <Settings />}
    </AppShell>
  );
}
