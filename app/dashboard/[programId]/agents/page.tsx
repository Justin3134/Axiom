import { redirect } from "next/navigation"

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ programId: string }>
}) {
  const { programId } = await params
  redirect(`/dashboard/${programId}`)
}
