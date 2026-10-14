import { AppHeader } from "@/components/shell/app-header";
import { Library } from "@/components/documents/library";
import { requirePageUser } from "@/server/auth";
import { listDocuments } from "@/server/documents";

export const dynamic = "force-dynamic";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const user = await requirePageUser();
  const documents = await listDocuments(user.id);

  return (
    <>
      <AppHeader name={user.name} email={user.email} />
      <main>
        <Library owned={documents.owned} shared={documents.shared} />
      </main>
    </>
  );
}
