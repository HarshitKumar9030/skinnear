import type { Metadata } from "next";
import { SharedRoutineView } from "@/components/routine/SharedRoutineView";
export const metadata: Metadata = {
  title: "Shared plan · SkinNear",
  robots: { index: false, follow: false },
};
export default function SharedPage() {
  return <SharedRoutineView />;
}
