type UnauthorizedPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function UnauthorizedPage({ searchParams }: UnauthorizedPageProps) {
  const { email } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10 sm:px-6">
      <section className="w-full rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-clay">
          Private app
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-ink">
          This Google account cannot open My Weekly List.
        </h1>
        <p className="mt-3 leading-7 text-stone-700">
          {email
            ? `${email} is signed in, but this app is limited to the one configured account.`
            : "You are signed in, but this app is limited to the one configured account."}
        </p>
        <p className="mt-3 leading-7 text-stone-700">
          Sign out and use the allowed Google account when you are ready.
        </p>
        <form action="/auth/sign-out" method="post" className="mt-6">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow focus:ring-offset-2 focus:ring-offset-white"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
