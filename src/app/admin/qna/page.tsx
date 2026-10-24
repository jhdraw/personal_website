import QnaManager from "@/components/admin/QnaManager";

export const dynamic = "force-dynamic";

export default function AdminQnaPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl">Q&amp;A</h1>
      <QnaManager />
    </div>
  );
}
