import { redirect } from "next/navigation"

export default async function TreePage({
  params,
}: {
  params: Promise<{ programId: string }>
}) {
  const { programId } = await params
  redirect(`/dashboard/${programId}`)
}
