"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LogOut,
  Menu,
  Inbox,
  House,
  Cog,
  Users,
  // Warehouse,
  Settings2
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { label: "Главная", href: "/dashboard", icon: House },
  { label: "Заказы", href: "/dashboard/orders", icon: Inbox },
  { label: "Запчасти", href: "/dashboard/autoparts", icon: Cog },
  { label: "Клиенты", href: "/dashboard/clients", icon: Users },
  // { label: "Склады", href: "/dashboard/warehouses", icon: Warehouse },
  { label: "Общие", href: "/dashboard/general", icon: Settings2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile menu toggle */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-white">
        <span className="font-semibold">Admin Panel</span>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
          <Menu />
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed md:static top-0 left-0 h-full w-64 bg-white border-r z-50 transform transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:flex md:flex-col md:justify-between p-4 min-h-screen`}
      >
        <div>
          <h2 className="text-lg font-semibold mb-4 hidden md:block">
            Admin Panel
          </h2>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className="w-full justify-start gap-2 cursor-pointer"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <Separator className="my-4" />
          <Button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            variant="destructive"
            className="w-full justify-start gap-2"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
        </div>
      </aside>
    </>
  );
}
