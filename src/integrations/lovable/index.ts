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

        const oauthOptions: {
          redirectTo?: string;
          queryParams?: Record<string, string>;
        } = {};
        if (redirectUrl) oauthOptions.redirectTo = redirectUrl;
        if (opts?.extraParams) oauthOptions.queryParams = opts.extraParams;

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: (targetProvider === "microsoft" ? "azure" : targetProvider) as any,
          options: oauthOptions,
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
