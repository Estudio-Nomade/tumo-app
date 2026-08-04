type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function PublicLoyaltyPage({ params }: PageProps) {
  const { slug } = await params
  return <div>Tarjeta de fidelización — {slug}</div>
}
