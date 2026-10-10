"use client";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="shell error-page"><h1>A little pause.</h1><p>We couldn&apos;t load this page. Please try again.</p><Button onClick={reset}>Try again</Button></main>;
}
