import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft" | "lovable",
      opts?: SignInOptions,
    ) => {
      try {
        const targetProvider = provider === "lovable" ? "google" : provider;
        const redirectUrl =
          opts?.redirect_uri ||
          (typeof window !== "undefined" ? `${window.location.origin}/bikes` : undefined);

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: targetProvider,
          options: {
            redirectTo: redirectUrl,
            queryParams: opts?.extraParams,
          },
        });

        if (error) {
          return { error };
        }

        if (data?.url && typeof window !== "undefined") {
          window.location.href = data.url;
          return { redirected: true };
        }

        return { redirected: false };
      } catch (e) {
        return { error: e instanceof Error ? e : new Error(String(e)) };
      }
    },
  },
};
