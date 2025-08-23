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
  Settings2,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import clsx from "clsx";

const navItems = [
  { label: "Главная", href: "/dashboard", icon: House },
  { label: "Заказы", href: "/dashboard/orders", icon: Inbox },
  { label: "Детали", href: "/dashboard/autoparts", icon: Cog },
  { label: "Клиенты", href: "/dashboard/clients", icon: Users },
  { label: "Общие", href: "/dashboard/general", icon: Settings2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Prevent body scroll when menu is open on mobile
  useEffect(() => {
    document.body.style.overflow = open && isMobile ? "hidden" : "";
  }, [open, isMobile]);

  const renderNavItem = (item: (typeof navItems)[number]) => {
    const isActive = pathname === item.href;
    return (
      <Link key={item.href} href={item.href}>
        <Button
          variant={isActive ? "default" : "ghost"}
          className={clsx(
            "w-full justify-start gap-2",
            collapsed && "justify-center"
          )}
        >
          <item.icon className="h-5 w-5" />
          {!collapsed && <span>{item.label}</span>}
        </Button>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile topbar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-white z-40 relative">
        <span className="font-semibold">Admin Panel</span>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Menu />
        </Button>
      </div>

      {/* Overlay for mobile */}
      {open && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "bg-white z-50 border-r transition-all duration-300 flex flex-col",
          // мобилка: фиксированное выезжающее меню
          "fixed inset-y-0 left-0 h-dvh md:sticky md:top-0 md:h-screen",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-16" : "w-64",
          "md:translate-x-0 md:static"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {!collapsed && <span className="font-semibold">Admin Panel</span>}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (isMobile) {
                setOpen(false);
              } else {
                setCollapsed((prev) => !prev);
              }
            }}
            className={clsx(collapsed && "mx-auto")}
          >
            {isMobile ? <X /> : <Menu />}
          </Button>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1 px-2 py-4">{navItems.map(renderNavItem)}</nav>

        {/* Footer */}
        <div className="mt-auto p-4">
          <Separator className="my-4" />
          <Button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            variant="destructive"
            className={clsx("w-full gap-2", collapsed && "justify-center")}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Выйти"}
          </Button>
        </div>
      </aside>
    </>
  );
}
