"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AddPhonePage() {
  const [phone, setPhone] = useState("");

  const handleSave = async () => {
    if (!phone.trim()) {
      toast.error("Введите номер телефона");
      return;
    }

    const res = await fetch("/api/users/phone", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    if (res.ok) {
      toast.success("Телефон сохранён");
      window.location.href = "/"; // редиректим на главную
    } else {
      toast.error("Ошибка сохранения");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">Введите номер телефона для пользования сайтом</h1>
      <Input
        placeholder="+375..."
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-3/4"
      />
      <Button onClick={handleSave}>Сохранить</Button>
    </div>
  );
}
