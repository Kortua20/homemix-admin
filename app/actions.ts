"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/server";

export type LoginState = {
  email?: string;
  errors?: {
    email?: string;
    password?: string;
  };
  message?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email = typeof emailValue === "string" ? emailValue.trim() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";

  const errors: LoginState["errors"] = {};

  if (!email) {
    errors.email = "ელფოსტის მისამართი აუცილებელია.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "შეიყვანეთ ელფოსტის სწორი მისამართი.";
  }

  if (!password) {
    errors.password = "პაროლი აუცილებელია.";
  }

  if (errors.email || errors.password) {
    return { email, errors };
  }

  let authError:
    | {
        code?: string;
        message: string;
        name: string;
        status?: number;
      }
    | null = null;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    authError = error;
  } catch (error) {
    console.error("Unexpected Supabase sign-in failure", error);

    return {
      email,
      message: "შესვლა ვერ მოხერხდა. გთხოვთ, ხელახლა სცადოთ.",
    };
  }

  if (authError) {
    console.error("Supabase sign-in failed", authError);

    switch (authError.code) {
      case "invalid_credentials":
        return {
          email,
          message: "ელფოსტა ან პაროლი არასწორია.",
        };
      case "email_not_confirmed":
        return {
          email,
          message: "ეს ელფოსტა დადასტურებული არ არის.",
        };
      case "user_banned":
        return {
          email,
          message: "ეს ანგარიში ამჟამად მიუწვდომელია.",
        };
      case "over_request_rate_limit":
        return {
          email,
          message:
            "შესვლის ძალიან ბევრი მცდელობა. გთხოვთ, დაელოდოთ და ხელახლა სცადოთ.",
        };
      default:
        return {
          email,
          message: "შესვლა ვერ მოხერხდა. გთხოვთ, ხელახლა სცადოთ.",
        };
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
