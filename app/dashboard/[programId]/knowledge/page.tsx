import { redirect } from "next/navigation"

export default async function KnowledgePage({
  params,
}: {
  params: Promise<{ programId: string }>
}) {
  const { programId } = await params
  redirect(`/dashboard/${programId}`)
}
