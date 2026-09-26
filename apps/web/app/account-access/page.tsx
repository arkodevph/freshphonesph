import Link from "next/link";

export default function AccountAccessPage() {
  return <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16 text-[#24235d]">
    <Link href="/login" className="mb-8 text-sm font-bold text-[#6240bf]">← Back to sign in</Link>
    <p className="text-xs font-black uppercase tracking-widest text-[#6944cb]">Customer access</p>
    <h1 className="mt-3 text-4xl font-black">Need your account details?</h1>
    <p className="mt-4 text-base leading-7 text-[#5b6684]">Fresh Phones PH sets up your customer portal account after your membership is linked to your record. Your account details come from the team handling your membership.</p>
    <ol className="mt-8 grid gap-3 rounded-3xl border border-[#e4def6] bg-white p-6 text-sm leading-6 shadow-sm">
      <li><strong>1. Ask for access.</strong> Contact Fresh Phones PH in Messenger and give the name used on your membership. Do not send your password or ID in a public comment.</li>
      <li><strong>2. Check your account email.</strong> Use the email address the team registered for you when signing in.</li>
      <li><strong>3. Already have access?</strong> If you forgot your password, request a reset link instead.</li>
    </ol>
    <div className="mt-8 flex flex-wrap gap-3"><a href="https://m.me/FreshPhonesPh" target="_blank" rel="noopener noreferrer" className="rounded-xl bg-[#5439c9] px-5 py-3 text-sm font-bold text-white">Contact Fresh Phones PH</a><Link href="/forgot-password" className="rounded-xl border border-[#dcd4f3] px-5 py-3 text-sm font-bold text-[#5439c9]">Reset password</Link></div>
  </main>;
}
