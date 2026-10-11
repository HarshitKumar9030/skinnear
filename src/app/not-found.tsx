import Link from "next/link";
export default function NotFound() {
  return (
    <main className="shell error-page">
      <h1>This page wandered off.</h1>
      <Link className="button button-primary" href="/">
        Back to SkinNear
      </Link>
    </main>
  );
}
