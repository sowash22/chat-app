import { CredentialsForm } from "@/components/auth/credentials-form";

export default function LoginPage() {
  return (
    <main
      className="grid min-h-dvh place-items-center bg-neutral-100 px-4 py-10 text-neutral-950"
      style={{ colorScheme: "light" }}
    >
      <CredentialsForm mode="sign-in" />
    </main>
  );
}
