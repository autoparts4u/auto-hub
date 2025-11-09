"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  segments.shift();

  return (
    <nav className="text-sm text-muted-foreground mb-6">
      <ol className="flex items-center space-x-2">
        <li>
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = "/" + segments.slice(0, index + 1).join("/");

          return (
            <li key={href} className="flex items-center space-x-2">
              <span>/</span>
              <Link href={`/dashboard/${href}`} className="hover:underline capitalize">
                {segment.replace("-", " ")}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
