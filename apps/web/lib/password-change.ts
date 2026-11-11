import { passwordSchema } from "@freshphones/contracts";
import { tsRequest } from "./ts-api";

export type PasswordChangeFields = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type PasswordChangeErrors = Partial<
  Record<keyof PasswordChangeFields, string>
>;

export const emptyPasswordFields = (): PasswordChangeFields => {
  return { currentPassword: "", newPassword: "", confirmPassword: "" };
};

export function passwordChangeErrors(
  fields: PasswordChangeFields,
): PasswordChangeErrors {
  const errors: PasswordChangeErrors = {};

  if (!fields.currentPassword) {
    errors.currentPassword = "Enter your current password.";
  } else if (fields.currentPassword.length > 128) {
    errors.currentPassword =
      "Your current password must be 128 characters or fewer.";
  }

  const next = passwordSchema.safeParse(fields.newPassword);

  if (!next.success) {
    errors.newPassword =
      fields.newPassword.length > 128
        ? "Use 128 characters or fewer."
        : (next.error.issues[0]?.message ?? "Check your new password.");
  } else if (fields.currentPassword === fields.newPassword) {
    errors.newPassword = "Choose a different new password.";
  }

  if (!fields.confirmPassword) {
    errors.confirmPassword = "Confirm your new password.";
  } else if (fields.confirmPassword !== fields.newPassword) {
    errors.confirmPassword = "New passwords do not match.";
  }

  return errors;
}

export async function changeOwnPassword(fields: PasswordChangeFields) {
  if (Object.keys(passwordChangeErrors(fields)).length) {
    throw new Error("Check the password fields and try again.");
  }

  const result = await tsRequest<{ ok: boolean }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      currentPassword: fields.currentPassword,
      newPassword: fields.newPassword,
    }),
  });

  if (result?.ok !== true) {
    throw new Error(
      "Could not confirm the password update. Please try signing in again if needed.",
    );
  }
}
