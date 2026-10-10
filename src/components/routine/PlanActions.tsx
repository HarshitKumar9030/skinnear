"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Download, Share2, X, Check } from "lucide-react";
import type { Product } from "@/domain/schemas";
import {
  PortableRoutineService,
  type PortableRoutine,
} from "@/services/PortableRoutineService";
import { downloadPlan } from "@/lib/plan-download";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";

const portable = new PortableRoutineService();
export function PlanActions({
  snapshot,
  products,
}: {
  snapshot: PortableRoutine;
  products: readonly Product[];
}) {
  const linkId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [approved, setApproved] = useState(false);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const node = dialog.current;
    return () => node?.close();
  }, []);
  function preview() {
    setApproved(false);
    setMessage("");
    setUrl(portable.shareUrl(snapshot, window.location.origin));
    dialog.current?.showModal();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied. Share it wherever you choose.");
    } catch {
      setMessage("Clipboard is unavailable. Select and copy the link below.");
    }
  }
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => downloadPlan(snapshot, products)}
      >
        <Download size={16} /> Download interactive{" "}
        {snapshot.kind === "list" ? "list" : "plan"}
      </Button>
      <Button variant="secondary" onClick={preview}>
        <Share2 size={16} /> Share{" "}
        {snapshot.kind === "list" ? "list" : "routine"}
      </Button>
      <dialog
        ref={dialog}
        className="seller-dialog share-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="dialog-top">
          <strong>
            Preview your shared {snapshot.kind === "list" ? "list" : "routine"}
          </strong>
          <button
            aria-label="Close share preview"
            onClick={() => dialog.current?.close()}
          >
            <X size={21} />
          </button>
        </div>
        <h2>A useful plan. Yours to share.</h2>
        <p>
          The link includes these products, planning prices, currency
          {snapshot.budget ? " and budget" : ""}. Your selfie, skin scores,
          health answers and location are excluded.
        </p>
        <ul className="share-product-preview">
          {snapshot.items.map((item) => (
            <li key={item.id}>
              <Check size={14} />
              {products.find((product) => product.id === item.id)?.name ||
                item.id}
            </li>
          ))}
        </ul>
        <p>
          Anyone with the link can view and copy it. Editing or deleting your
          private routine does not change a shared snapshot.
        </p>
        <Checkbox
          checked={approved}
          onChange={(event) => setApproved(event.target.checked)}
        >
          I agree to share this product snapshot with anyone who receives the
          link.
        </Checkbox>
        {approved ? (
          <>
            <label className="field-label" htmlFor={linkId}>
              Share link
            </label>
            <input
              id={linkId}
              className="share-url"
              readOnly
              value={url}
              onFocus={(event) => event.target.select()}
            />
            <Button onClick={copy}>
              Copy share link <Share2 size={16} />
            </Button>
          </>
        ) : null}
        {url.startsWith("http://127.0.0.1") ||
        url.startsWith("http://localhost") ? (
          <p className="field-note">
            This is a local preview link. Deploy SkinNear so other devices can
            open your shared plans.
          </p>
        ) : null}
        {message ? <p role="status">{message}</p> : null}
      </dialog>
    </>
  );
}
