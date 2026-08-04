type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function DashboardLoyaltyPage({ params }: PageProps) {
  const { slug } = await params
  return <div>Panel fidelización — {slug}</div>
}
