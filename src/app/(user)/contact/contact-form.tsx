"use client";

import { useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { submitContactForm } from "./actions";
import { MAX_CONTACT_NAME_LENGTH, MAX_CONTACT_PHONE_LENGTH, MAX_CONTACT_QUESTION_LENGTH } from "./limits";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateName(value: string): string | null {
  if (!value.trim()) return "Name is required.";
  if (value.length > MAX_CONTACT_NAME_LENGTH) return `Name must be ${MAX_CONTACT_NAME_LENGTH} characters or fewer.`;
  return null;
}

function validatePhone(value: string): string | null {
  if (!value.trim()) return "Mobile phone is required.";
  if (value.length > MAX_CONTACT_PHONE_LENGTH) {
    return `Mobile phone must be ${MAX_CONTACT_PHONE_LENGTH} characters or fewer.`;
  }
  return null;
}

function validateEmail(value: string): string | null {
  if (!value.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(value.trim())) return "Enter a valid email address.";
  return null;
}

function validateQuestion(value: string): string | null {
  if (!value.trim()) return "Please enter your question.";
  if (value.length > MAX_CONTACT_QUESTION_LENGTH) {
    return `Question must be ${MAX_CONTACT_QUESTION_LENGTH} characters or fewer.`;
  }
  return null;
}

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");

  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setMessage(null);

    const nameValidation = validateName(name);
    const phoneValidation = validatePhone(phone);
    const emailValidation = validateEmail(email);
    const questionValidation = validateQuestion(question);

    setNameError(nameValidation);
    setPhoneError(phoneValidation);
    setEmailError(emailValidation);
    setQuestionError(questionValidation);

    if (nameValidation || phoneValidation || emailValidation || questionValidation) return;

    startTransition(async () => {
      const result = await submitContactForm(formData);
      if (!result.success) {
        setMessage({ type: "error", text: result.error.message });
        return;
      }

      setMessage({ type: "success", text: "Thank you — we'll get back to you as soon as possible." });
      setName("");
      setPhone("");
      setEmail("");
      setQuestion("");
      formRef.current?.reset();
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-name">Name</Label>
          <Input
            id="contact-name"
            name="name"
            value={name}
            maxLength={MAX_CONTACT_NAME_LENGTH}
            aria-invalid={nameError ? true : undefined}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setNameError(validateName(name))}
          />
          {nameError && <p className="text-destructive text-xs">{nameError}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-phone">Mobile Phone</Label>
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            value={phone}
            maxLength={MAX_CONTACT_PHONE_LENGTH}
            aria-invalid={phoneError ? true : undefined}
            onChange={(event) => setPhone(event.target.value)}
            onBlur={() => setPhoneError(validatePhone(phone))}
          />
          {phoneError && <p className="text-destructive text-xs">{phoneError}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          value={email}
          aria-invalid={emailError ? true : undefined}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => setEmailError(validateEmail(email))}
        />
        {emailError && <p className="text-destructive text-xs">{emailError}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-question">Question</Label>
        <Textarea
          id="contact-question"
          name="question"
          rows={5}
          value={question}
          maxLength={MAX_CONTACT_QUESTION_LENGTH}
          aria-invalid={questionError ? true : undefined}
          onChange={(event) => setQuestion(event.target.value)}
          onBlur={() => setQuestionError(validateQuestion(question))}
        />
        <div className="flex items-center justify-between gap-2">
          {questionError ? <p className="text-destructive text-xs">{questionError}</p> : <span />}
          <p className="text-muted-foreground shrink-0 text-xs">
            {question.length}/{MAX_CONTACT_QUESTION_LENGTH}
          </p>
        </div>
      </div>

      {message && (
        <p className={message.type === "error" ? "text-destructive text-sm" : "text-emerald-600 text-sm"}>
          {message.text}
        </p>
      )}

      <div>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Sending..." : "Send Message"}
        </Button>
      </div>
    </form>
  );
}
