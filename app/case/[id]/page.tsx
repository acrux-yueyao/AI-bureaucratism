import { redirect } from "next/navigation";

export default async function CasePreviewPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  redirect(`/case/${id}/network${q ? `?q=${encodeURIComponent(q)}` : ""}`);
}
