"use client"

import * as React from "react"
import { PinCodeModal } from "./PinCodeModal"

const PIN_INTERVAL_MS = 5 * 60 * 1000
const STORAGE_KEY = "pinLastVerified"

export function PinProvider({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = React.useState(false)

  function checkPin() {
    const lastVerified = localStorage.getItem(STORAGE_KEY)
    if (!lastVerified || Date.now() - Number(lastVerified) >= PIN_INTERVAL_MS) {
      setShowModal(true)
    }
  }

  React.useEffect(() => {
    checkPin()

    const interval = setInterval(checkPin, 60 * 1000)

    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        checkPin()
      }
    }
    window.addEventListener("storage", handleStorage)

    return () => {
      clearInterval(interval)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  function handleSuccess() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    setShowModal(false)
  }

  return (
    <>
      {children}
      <PinCodeModal open={showModal} onSuccess={handleSuccess} />
    </>
  )
}
