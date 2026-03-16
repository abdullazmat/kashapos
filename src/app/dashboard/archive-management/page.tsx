import { redirect } from "next/navigation";

export default function ArchiveManagementPage() {
  redirect("/dashboard/fiscal-years?tab=archive");
}
