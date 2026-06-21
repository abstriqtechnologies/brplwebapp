"use client";
import Link from "next/link";
import { forwardRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps {
  to: string;
  href?: string;
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  end?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, href, children, onClick, end, ...props }, ref) => {
    const pathname = usePathname();
    const dest = href ?? to;
    const isActive = end ? pathname === dest : pathname === dest || pathname?.startsWith(`${dest}/`);

    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={dest}
        onClick={onClick}
        className={cn(className, isActive && activeClassName)}
        {...props}
      >
        {children}
      </Link>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
