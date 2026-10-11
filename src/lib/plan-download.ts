import type { Product } from "@/domain/schemas";
import { PortableRoutineService, type PortableRoutine } from "@/services/PortableRoutineService";

export function downloadPlan(snapshot: PortableRoutine, catalog: readonly Product[]) {
  const html = new PortableRoutineService().html(snapshot, catalog);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = snapshot.kind === "routine" ? "skinnear-routine.html" : "skinnear-products.html";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
