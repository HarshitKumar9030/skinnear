import { useId } from "react";

export type FeatureScene = "scan" | "budget" | "shopping" | "upload";

function ScanScene({ clipId }: { clipId: string }) {
  return <>
    <defs><clipPath id={clipId}><rect x="108" y="20" width="104" height="124" rx="48" /></clipPath></defs>
    <circle cx="160" cy="83" r="67" fill="#eee7f8" />
    <path d="M127 130c-22-18-23-74-11-93 13-23 71-25 87 2 10 19 7 73-10 91" fill="#c5b1e5" />
    <path d="M123 55c0-28 74-28 74 0v34c0 25-18 45-37 45s-37-20-37-45z" fill="#f8ebe7" />
    <path d="M143 77h6m22 0h6m-20 4-3 15h8m-12 14q10 7 20 0" fill="none" stroke="#846287" strokeWidth="2.5" strokeLinecap="round" />
    <g data-scan-marks fill="#9b78cd"><circle cx="138" cy="95" r="3"/><circle cx="181" cy="96" r="3"/><circle cx="160" cy="60" r="3"/></g>
    <g data-scan-mesh stroke="#b28cd3" strokeWidth="1" opacity=".35"><path d="M138 95l22-35 21 36-21 17zM138 95h43m-21-35v53"/><circle cx="160" cy="113" r="2.5" fill="#b28cd3"/></g>
    <g clipPath={`url(#${clipId})`}><g data-scan-beam><rect x="108" y="48" width="104" height="17" fill="#ad8fe2" opacity=".2"/><path d="M108 65h104" stroke="#8e62cf" strokeWidth="2"/></g></g>
    <g stroke="#9872cd" strokeWidth="2.5" fill="none" strokeLinecap="round"><path d="M100 46V29h17m86 0h17v17M100 118v17h17m86 0h17v-17" /></g>
    <g data-scan-result><rect x="222" y="51" width="73" height="42" rx="12" fill="white"/><circle cx="237" cy="65" r="4" fill="#91b3a0"/><path d="M247 65h33m-44 14h34" stroke="#bcaad5" strokeWidth="4" strokeLinecap="round"/></g>
    <g data-scan-result><rect x="24" y="88" width="74" height="40" rx="12" fill="white"/><path d="M38 109l7 6 13-15" stroke="#91b3a0" strokeWidth="3" fill="none" strokeLinecap="round"/><path d="M68 106h17m-17 8h12" stroke="#bcaad5" strokeWidth="3" strokeLinecap="round"/></g>
  </>;
}

function BudgetScene() {
  return <>
    <circle cx="162" cy="84" r="67" fill="#e4eee6" />
    <g data-budget-wallet><rect x="91" y="55" width="137" height="88" rx="20" fill="#a9c5b2"/><path d="M96 67h122" stroke="#d5e5d9" strokeWidth="3" strokeLinecap="round"/><rect x="195" y="82" width="47" height="34" rx="10" fill="#6d9580"/><circle cx="208" cy="99" r="4" fill="#edf4ee"/></g>
    <g data-budget-coin><circle cx="130" cy="36" r="17" fill="#ebd9a0"/><path d="M125 36l4 4 7-9" fill="none" stroke="#a58b49" strokeWidth="2.5" strokeLinecap="round"/></g>
    <g data-budget-coin><circle cx="170" cy="25" r="13" fill="#f0dfaf"/><path d="M167 25l3 3 5-6" fill="none" stroke="#a58b49" strokeWidth="2" strokeLinecap="round"/></g>
    <g data-budget-coin><circle cx="205" cy="42" r="15" fill="#ebd9a0"/><path d="M201 42l3 3 6-7" fill="none" stroke="#a58b49" strokeWidth="2" strokeLinecap="round"/></g>
    <rect x="30" y="91" width="99" height="49" rx="13" fill="white"/><path d="M43 104h42" stroke="#b4c8bb" strokeWidth="4" strokeLinecap="round"/><rect x="43" y="115" width="70" height="8" rx="4" fill="#e5eee7"/><rect data-budget-meter x="43" y="115" width="49" height="8" rx="4" fill="#739b82"/>
    <g data-budget-check><circle cx="257" cy="64" r="21" fill="white"/><path data-budget-check-path d="M247 64l7 7 13-15" stroke="#739b82" strokeWidth="3" strokeLinecap="round" fill="none"/></g>
  </>;
}

function ShoppingScene() {
  return <>
    <rect x="35" y="23" width="248" height="120" rx="28" fill="#f4e7e7"/>
    <g fill="none" stroke="#fffaf9" strokeWidth="13"><path d="M89 23v120m91-120v120M35 65h248M35 114h248"/></g>
    <path data-shopping-route d="M73 118h55q13 0 13-13V81q0-13 13-13h70" fill="none" stroke="#bc818b" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 6"/>
    <circle data-shopping-delivery cx="73" cy="118" r="5" fill="#9c6571"/>
    <g data-shopping-store><rect x="213" y="55" width="39" height="34" rx="7" fill="#fff"/><path d="M209 57l6-15h35l6 15" fill="#c38b95"/><path d="M218 46v11m10-11v11m10-11v11m10-11v11" stroke="#f8dce0" strokeWidth="4"/><rect x="228" y="69" width="10" height="20" rx="2" fill="#dec0c5"/></g>
    <g data-shopping-pin><path d="M73 124s-20-23-20-37a20 20 0 0 1 40 0c0 14-20 37-20 37z" fill="#b57482"/><circle cx="73" cy="87" r="7" fill="#fae9ec"/></g>
    <g data-shopping-pulse fill="none" stroke="#bd8590" strokeWidth="2"><circle cx="73" cy="124" r="12"/></g>
    <g data-shopping-bag><rect x="145" y="93" width="31" height="35" rx="8" fill="#fff"/><path d="M153 96v-5a7 7 0 0 1 14 0v5" fill="none" stroke="#bd8590" strokeWidth="2.5"/><path d="M153 111l5 5 10-11" stroke="#91ad9a" strokeWidth="2.5" fill="none" strokeLinecap="round"/></g>
  </>;
}

function UploadScene() {
  return <>
    <ellipse cx="158" cy="143" rx="87" ry="8" fill="#efe9f7"/>
    <rect x="70" y="44" width="175" height="92" rx="25" fill="#e8def5"/>
    <path d="M117 44l10-16h58l11 16" fill="#cdb6e7"/>
    <circle cx="158" cy="90" r="35" fill="#c4a9e3"/><circle cx="158" cy="90" r="25" fill="#f8f4fc"/>
    <circle data-upload-lens cx="158" cy="90" r="16" fill="#b597d7"/>
    <circle data-upload-ring cx="158" cy="90" r="30" fill="none" stroke="#9871c7" strokeWidth="2"/>
    <rect x="211" y="59" width="16" height="8" rx="4" fill="#b597d7"/>
    <g data-upload-photo><rect x="34" y="70" width="48" height="57" rx="9" fill="white"/><rect x="40" y="76" width="36" height="36" rx="6" fill="#eadff5"/><circle cx="58" cy="88" r="7" fill="#c2a8df"/><path d="M46 106q1-14 12-14t12 14" fill="#c2a8df"/></g>
    <g data-upload-spark stroke="#a584ca" strokeWidth="2" strokeLinecap="round"><path d="M262 83v14m-7-7h14M88 22v10m-5-5h10"/></g>
  </>;
}

export function FeatureIllustration({ scene }: { scene: FeatureScene }) {
  const clipId = `scan-${useId().replace(/:/g, "")}`;
  return <svg className="feature-illustration" data-feature-scene={scene} viewBox="0 0 320 164" fill="none" aria-hidden="true" focusable="false">
    {scene === "scan" ? <ScanScene clipId={clipId} /> : scene === "budget" ? <BudgetScene /> : scene === "shopping" ? <ShoppingScene /> : <UploadScene />}
  </svg>;
}
