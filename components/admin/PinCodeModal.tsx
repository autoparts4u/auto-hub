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
  const bufferRef = React.useRef("")
  const submittingRef = React.useRef(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const tapCountRef = React.useRef(0)
  const tapTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const isTouchDevice = () =>
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches

  React.useEffect(() => {
    if (open) {
      bufferRef.current = ""
      submittingRef.current = false
      tapCountRef.current = 0
      if (!isTouchDevice()) {
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }
  }, [open])

  function handleTitleTap() {
    if (!isTouchDevice()) return
    if (document.activeElement === inputRef.current) return

    tapCountRef.current += 1

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0
      inputRef.current?.focus()
      return
    }

    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0
    }, 800)
  }

  async function submitPin(pin: string) {
    if (submittingRef.current) return
    submittingRef.current = true
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
        bufferRef.current = ""
        submittingRef.current = false
        if (!isTouchDevice()) {
          setTimeout(() => inputRef.current?.focus(), 50)
        }
      }
    } catch {
      bufferRef.current = ""
      submittingRef.current = false
      if (!isTouchDevice()) {
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (isTouchDevice()) return
    if (!/^\d$/.test(e.key)) return
    bufferRef.current += e.key
    if (bufferRef.current.length === 4) {
      const pin = bufferRef.current
      bufferRef.current = ""
      submitPin(pin)
    }
  }

  function handleInput(e: React.FormEvent<HTMLInputElement>) {
    if (!isTouchDevice()) return
    const digit = (e.nativeEvent as InputEvent).data?.replace(/\D/g, "")
    ;(e.target as HTMLInputElement).value = ""
    if (!digit) return

    bufferRef.current += digit
    if (bufferRef.current.length === 4) {
      const pin = bufferRef.current
      bufferRef.current = ""
      submitPin(pin)
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
          className={cn(
            "bg-background fixed top-[50%] left-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-lg border p-6 shadow-lg"
          )}
        >
          <DialogPrimitive.Title
            className="text-lg font-semibold text-center select-none"
            onClick={handleTitleTap}
            style={{ touchAction: 'manipulation' }}
          >
            Возникла проблема соединения
          </DialogPrimitive.Title>
          <input
            ref={inputRef}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            type="tel"
            inputMode="numeric"
            className="absolute opacity-0 pointer-events-none w-0 h-0"
            aria-hidden="true"
            tabIndex={-1}
          />
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  )
}
