"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps extends Omit<React.ComponentProps<typeof Button>, "type" | "disabled"> {
  pendingText?: string;
}

export function SubmitButton({ children, pendingText, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (pendingText ?? children) : children}
    </Button>
  );
}
