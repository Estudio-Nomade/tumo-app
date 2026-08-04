type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoginPage({ params }: PageProps) {
  const { slug } = await params
  return <div>Login — {slug}</div>
}
