"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface PinCodeModalProps {
  open: boolean
  onSuccess: () => void
}

export function PinCodeModal({ open, onSuccess }: PinCodeModalProps) {
  const [buffer, setBuffer] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      setBuffer("")
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  async function submitPin(pin: string) {
    try {
      const res = await fetch('/api/security/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()

      if (data.success) {
        onSuccess()
      } else if (data.type === 'locked') {
        window.location.reload()
      } else {
        setBuffer("")
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    } catch {
      setBuffer("")
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!/^\d$/.test(e.key)) return
    const next = buffer + e.key
    if (next.length === 4) {
      setBuffer("")
      submitPin(next)
    } else {
      setBuffer(next)
    }
  }

  return (
    <DialogPrimitive.Root open={open}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.focus()}
          className={cn(
            "bg-background fixed top-[50%] left-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-lg border p-6 shadow-lg"
          )}
        >
          <DialogPrimitive.Title className="text-lg font-semibold text-center">
            Возникла проблема соединения
          </DialogPrimitive.Title>
          <input
            ref={inputRef}
            onKeyDown={handleKeyDown}
            readOnly
            value=""
            className="absolute opacity-0 pointer-events-none w-0 h-0"
            aria-hidden="true"
            tabIndex={-1}
          />
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  )
}
