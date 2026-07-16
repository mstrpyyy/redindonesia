"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { redirect } from "next/navigation";

type LoginState = { error: string };

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const account = await prisma.adminAccount.findUnique({
    where: { username },
  });

  if (!account) {
    return { error: "Invalid username or password." };
  }

  const isValid = await bcrypt.compare(password, account.passwordHash);
  if (!isValid) {
    return { error: "Invalid username or password." };
  }

  await createSession(account.username);
  redirect("/admin");
} 