import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AuthLoading } from "@/components/AuthLoading";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MotoLog" },
      {
        name: "description",
        content: "Sign in to your MotoLog garage to log services, fuel and running costs.",
      },
      { property: "og:title", content: "Sign in — MotoLog" },
      {
        property: "og:description",
        content: "Access your motorcycle maintenance logbook and cost dashboard.",
      },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        void navigate({ to: "/bikes" });
      } else {
        setCheckingSession(false);
      }
    });
  }, [navigate]);

  async function signIn() {
    const parsed = credentials.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    void navigate({ to: "/bikes" });
  }

  async function resetPassword() {
    if (!email || !email.includes("@")) {
      toast.error("Please enter your email address to receive a password reset link");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset link sent! Check your email inbox.");
  }

  async function signUp() {
    const parsed = credentials.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      ...parsed.data,
      options: {
        emailRedirectTo: `${window.location.origin}/bikes`,
        data: { display_name: name.trim().slice(0, 80) || null },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created — you're in.");
    void navigate({ to: "/bikes" });
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/bikes" });
  }

  if (checkingSession) {
    return <AuthLoading />;
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-12 pt-[env(safe-area-inset-top)] -webkit-overflow-scrolling-touch">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-6 flex items-center justify-center gap-2">
            <Wrench className="size-5 text-primary" aria-hidden />
            <span className="text-display text-3xl">MotoLog</span>
          </Link>

          <div className="panel p-6">
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-5 space-y-4">
                <Field id="email" label="Email" value={email} onChange={setEmail} type="email" />
                <Field
                  id="password"
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  type="password"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={resetPassword}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <Button className="w-full font-bold" disabled={busy} onClick={signIn}>
                  Sign in
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="mt-5 space-y-4">
                <Field id="name" label="Your name" value={name} onChange={setName} />
                <Field id="email-up" label="Email" value={email} onChange={setEmail} type="email" />
                <Field
                  id="password-up"
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  type="password"
                />
                <Button className="w-full" disabled={busy} onClick={signUp}>
                  Create account
                </Button>
              </TabsContent>
            </Tabs>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="label-caps">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="secondary" className="w-full" disabled={busy} onClick={google}>
              Continue with Google
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        maxLength={255}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
