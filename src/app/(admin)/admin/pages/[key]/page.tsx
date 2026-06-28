import PageEditorClient from "@/components/admin/page-editor/PageEditorClient";

export const dynamic = "force-dynamic";

export default async function AdminPageEditor({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return <PageEditorClient pageKey={key.toLowerCase()} />;
}
