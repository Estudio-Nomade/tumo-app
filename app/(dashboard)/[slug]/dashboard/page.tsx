type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function DashboardHomePage({ params }: PageProps) {
  const { slug } = await params
  return <div>Dashboard — {slug}</div>
}
