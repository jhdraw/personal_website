import AlbumEditor from "@/components/admin/AlbumEditor";

export const dynamic = "force-dynamic";

export default async function EditAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AlbumEditor id={id} />;
}
