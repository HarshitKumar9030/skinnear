import { SkinNearApp } from "@/components/SkinNearApp";

export const dynamic = "force-dynamic";
export default function Home() {
  return (
    <SkinNearApp
      liveEnabled={Boolean(process.env.YOUCAM_API_KEY)}
      saveEnabled={Boolean(process.env.MONGODB_URI)}
    />
  );
}
