"use client";

import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-accent-light text-[#10142a] hover:brightness-95",
  secondary: "bg-panel-raised text-text hover:brightness-110",
  danger: "bg-danger text-[#10142a] hover:brightness-95",
};

export default function Button({
  variant = "primary",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`w-full rounded-2xl px-6 py-4 text-base font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
    />
  );
}
