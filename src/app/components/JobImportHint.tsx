import Link from "next/link";

export default function JobImportHint() {
  return <p className="my-2 text-xs leading-5 text-fg-subtle">Free includes 5 successful job-link imports per month, shared across tools. Pro includes unlimited imports. You can always paste a description manually. <Link href="/dashboard" className="underline underline-offset-2">View your usage</Link></p>;
}
