"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronDown, ScanFace, Check } from "lucide-react";
import type { SkinAnalysis, SkinZone } from "@/domain/schemas";
import { REGION_LABELS, REGION_AREAS, zoneCareNote } from "@/domain/skin-zones";

export function SkinZoneMap({ analysis }: { analysis: SkinAnalysis }) {
  const zones = analysis.skinProfile ?? [];
  const [region, setRegion] = useState<SkinZone["region"]>(
    zones.some((zone) => zone.region === "t_zone") ? "t_zone" : (zones[0]?.region ?? "whole"),
  );
  const [failed, setFailed] = useState<string[]>([]);
  const current = zones.find((zone) => zone.region === region) ?? zones[0];
  if (!current) return null;
  const regionalZones = zones.filter((zone) => zone.region !== "whole");
  const overlay = current.maskUrl && !failed.includes(current.maskUrl) ? current.maskUrl : null;

  return (
    <details className="skin-zone-map">
      <summary>
        <div>
          <span className="zone-eyebrow">
            <ScanFace size={15} /> CARE BY AREA
          </span>
          <strong>
            {regionalZones.length ? "One face. Different needs." : "Your skin-type observation."}
          </strong>
          <span className="zone-summary-types">
            {(regionalZones.length ? regionalZones : zones).map((zone) => (
              <span key={zone.region}>
                {REGION_LABELS[zone.region]} · {zone.skinType}
              </span>
            ))}
          </span>
        </div>
        <ChevronDown size={20} className="zone-disclosure-arrow" aria-hidden="true" />
      </summary>
      <div className="zone-content">
        <div className="zone-visual">
          <div className="zone-image" data-region={current.region}>
            {overlay ? (
              <Image
                src={overlay}
                alt={`YouCam ${REGION_LABELS[current.region]} classification overlay`}
                fill
                sizes="220px"
                unoptimized
                referrerPolicy="no-referrer"
                onError={() => setFailed((previous) => [...previous, overlay])}
              />
            ) : (
              <svg viewBox="0 0 200 230" fill="none" aria-hidden="true">
                <path
                  d="M100 14c-41 0-65 30-65 76 0 66 31 116 65 125 34-9 65-59 65-125 0-46-24-76-65-76Z"
                  fill="#e4e8e2"
                />
                <path
                  className="zone-t-shape"
                  d="M49 66q51-26 102 0l-6 31-30-4-2 53h-26l-2-53-30 4Z"
                />
                <path
                  className="zone-u-shape"
                  d="M47 108q-1 48 24 70l29 18 29-18q25-22 24-70l-27 4-2 42-24 13-24-13-2-42Z"
                />
                <path
                  d="M65 92h13m44 0h13M89 166q11 6 22 0"
                  stroke="#6c7c70"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
          <span>
            {overlay
              ? "YouCam zone overlay"
              : analysis.mode === "demo"
                ? "Illustrative region guide"
                : "Region guide · overlay unavailable"}
          </span>
        </div>
        <div className="zone-insight">
          <div className="zone-tabs" aria-label="Choose a facial region">
            {zones.map((zone) => (
              <button
                type="button"
                key={zone.region}
                aria-pressed={current.region === zone.region}
                onClick={() => setRegion(zone.region)}
              >
                {REGION_LABELS[zone.region]}
              </button>
            ))}
          </div>
          <div className="zone-story" key={current.region} aria-live="polite">
            <span>{REGION_AREAS[current.region]}</span>
            <h3>
              {current.skinType}
              <small>
                {analysis.mode === "demo" ? "Sample classification" : "YouCam observation"}
              </small>
            </h3>
            <p>{zoneCareNote(current.skinType)}</p>
          </div>
          <span className="zone-budget-note">
            <Check size={14} /> Use your planned essentials. No extra products added.
          </span>
          <p className="zone-observation-note">
            A photo-based observation can vary with lighting and skin comfort. It does not change
            your treatment consent or budget.
          </p>
        </div>
      </div>
    </details>
  );
}
