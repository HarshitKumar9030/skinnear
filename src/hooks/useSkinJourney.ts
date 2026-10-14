"use client";

import { useEffect, useRef, useState } from "react";
import type { Preferences, Routine, RoutineRequest, SkinAnalysis } from "@/domain/schemas";
import { SAMPLE_ANALYSIS } from "@/domain/sample";
import type { BudgetScenario } from "@/domain/budget-lab";
import { PhotoUploadService } from "@/services/PhotoUploadService";
import { SkinNearApi } from "@/lib/client-api";

const api = new SkinNearApi();
export const DEFAULT_PREFERENCES: Preferences = {
  budget: 50,
  country: "",
  currency: "",
  city: "",
  pincode: "",
  sensitive: false,
  fragranceFree: true,
  exclusions: [],
  ownedCategories: [],
};
type Stage = "scan" | "preferences" | "routine";

function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      signal.removeEventListener("abort", abort);
      resolve();
    };
    const timer = setTimeout(done, ms);
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(new DOMException("Cancelled", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}

export function useSkinJourney() {
  const [stage, setStage] = useState<Stage>("scan");
  const [analysis, setAnalysis] = useState<SkinAnalysis | null>(null);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [excludedProductIds, setExcludedProductIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [stage]);

  function sample() {
    controller.current?.abort();
    setBusy(false);
    setError("");
    setNotice("");
    setAnalysis(SAMPLE_ANALYSIS);
    setRoutine(null);
    setExcludedProductIds([]);
    setSavedId(null);
    setStage("preferences");
  }

  async function scan(file: File) {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    setNotice("Uploading your photo securely…");
    try {
      const form = new FormData();
      const photo = await new PhotoUploadService().prepare(file);
      if (abort.signal.aborted) return;
      setNotice("Uploading your photo securely�");
      form.set("photo", photo);
      form.set("consent", "true");
      const { token } = await api.request<{ token: string }>("/api/analysis", {
        method: "POST",
        body: form,
        signal: abort.signal,
      });
      setNotice("YouCam is reading your skin. This can take a little time…");
      for (let attempt = 0; attempt < 24; attempt++) {
        await pause(10000, abort.signal);
        const result = await api.post<{ status: string; analysis?: SkinAnalysis }>(
          "/api/analysis/status",
          { token },
          abort.signal,
        );
        if (result.status === "success" && result.analysis) {
          setAnalysis(result.analysis);
          setRoutine(null);
          setSavedId(null);
          setExcludedProductIds([]);
          setStage("preferences");
          setNotice("");
          return;
        }
      }
      throw new Error("The scan is taking longer than expected. Please try again later.");
    } catch (err) {
      if (!abort.signal.aborted) {
        setError(err instanceof Error ? err.message : "Your photo could not be analyzed.");
        setNotice("");
      }
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  }

  async function build(
    nextPreferences: Preferences,
    excluded: string[] = [],
    selected: string[] = [],
  ) {
    if (!analysis) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const input: RoutineRequest = {
        analysis,
        preferences: nextPreferences,
        excludedProductIds: excluded,
        selectedProductIds: selected,
      };
      const nextRoutine = await api.post<Routine>("/api/routine", input);
      setPreferences(nextPreferences);
      setRoutine(nextRoutine);
      setExcludedProductIds(excluded);
      setSavedId(null);
      setStage("routine");
      setSelectedProductIds(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build your routine.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!analysis || !routine) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.post<{ id: string }>("/api/routines", {
        analysis,
        preferences,
        excludedProductIds,
        selectedProductIds,
      });
      setSavedId(result.id);
      localStorage.setItem("skinnear:saved:v1", result.id);
      setNotice("Saved for 30 days in this browser. Your photo is not saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your routine.");
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    const id = localStorage.getItem("skinnear:saved:v1");
    if (!id) {
      if (routine) setStage("routine");
      else {
        setNotice("Start with a selfie or sample scan to create your routine.");
        setStage("scan");
      }
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api.request<{ request: RoutineRequest; routine: Routine }>(
        `/api/routines/${encodeURIComponent(id)}`,
      );
      setAnalysis(result.request.analysis);
      setPreferences(result.request.preferences);
      setExcludedProductIds(result.request.excludedProductIds);
      setRoutine(result.routine);
      setSavedId(id);
      setStage("routine");
      setNotice(
        "Your saved routine. Prices are planning estimates; check current seller listings.",
      );
      setSelectedProductIds(result.request.selectedProductIds ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the saved routine.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSaved() {
    if (!savedId) return;
    setBusy(true);
    setError("");
    try {
      await api.request(`/api/routines/${savedId}`, { method: "DELETE" });
      localStorage.removeItem("skinnear:saved:v1");
      setSavedId(null);
      setNotice("Saved copy deleted. You can still view this session's routine.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the saved copy.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    controller.current?.abort();
    setBusy(false);
    setStage("scan");
    setAnalysis(null);
    setRoutine(null);
    setError("");
    setNotice("");
    setSavedId(null);
  }
  function cancelScan() {
    controller.current?.abort();
    setBusy(false);
    setNotice("Scan stopped here. A task already submitted to YouCam may still finish.");
  }

  return {
    stage,
    analysis,
    preferences,
    routine,
    busy,
    error,
    notice,
    savedId,
    sample,
    scan,
    build,
    save,
    restore,
    removeSaved,
    reset,
    cancelScan,
    dismissMessage: () => {
      setError("");
      setNotice("");
    },
    edit: () => {
      setStage("preferences");
      setError("");
      setNotice("");
    },
    swap: (id: string) =>
      build(
        preferences,
        [...excludedProductIds, id],
        selectedProductIds.filter((selected) => selected !== id),
      ),
    choose: (id: string) => {
      const alternative = routine?.items
        .flatMap((item) => item.alternatives)
        .find((product) => product.id === id);
      if (!alternative || !routine) return Promise.resolve();
      const selected = [
        ...routine.items
          .filter((item) => item.product.category !== alternative.category)
          .map((item) => item.product.id),
        id,
      ];
      return build(
        preferences,
        excludedProductIds.filter((excluded) => excluded !== id),
        selected,
      );
    },
    excludedProductIds,
    applyBudgetScenario: (scenario: BudgetScenario) =>
      build(
        { ...preferences, budget: scenario.routine.budget, treatments: scenario.treatments },
        excludedProductIds,
        scenario.routine.items.map((item) => item.product.id),
      ),
    resetChoices: () => build(preferences),
  };
}
