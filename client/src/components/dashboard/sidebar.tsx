import { FC } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, BarChart3, GitGraph, FileText, FileCheck, ClipboardList, Settings, Database, ShieldAlert } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/auth-context";

interface SidebarProps {
  className?: string;
}

const Sidebar: FC<SidebarProps> = ({ className }) => {
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems = [
    {
      heading: "Monitoring",
      items: [
        { href: "/", label: "Dashboard", icon: <BarChart3 className="mr-3 h-5 w-5" /> },
        { href: "/alerts", label: "Alerts", icon: <AlertTriangle className="mr-3 h-5 w-5" /> },
        { href: "/risk-analysis", label: "Risk Analysis", icon: <BarChart3 className="mr-3 h-5 w-5" /> },
        { href: "/entity-network", label: "Entity Network", icon: <GitGraph className="mr-3 h-5 w-5" /> },
      ],
    },
    {
      heading: "Case Management",
      items: [
        { href: "/cases", label: "Cases", icon: <FileText className="mr-3 h-5 w-5" /> },
        { href: "/investigations", label: "Investigations", icon: <FileCheck className="mr-3 h-5 w-5" /> },
        { href: "/reports", label: "Reports", icon: <ClipboardList className="mr-3 h-5 w-5" /> },
      ],
    },
    {
      heading: "System",
      items: [
        { href: "/settings", label: "Settings", icon: <Settings className="mr-3 h-5 w-5" /> },
        { href: "/ml-models", label: "ML Models", icon: <Database className="mr-3 h-5 w-5" /> },
        { href: "/admin", label: "Admin", icon: <ShieldAlert className="mr-3 h-5 w-5" /> },
      ],
    },
  ];

  return (
    <aside className={cn("w-64 bg-white shadow-md flex-shrink-0 h-full flex flex-col border-r border-neutral-100", className)}>
      <div className="p-4 border-b border-neutral-100 flex items-center">
        <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary text-white">
          <Shield className="h-5 w-5" />
        </div>
        <h1 className="ml-3 font-medium text-lg text-neutral-900">AML Guardian</h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((section, i) => (
          <div key={i} className="mb-6">
            <div className="px-4 mb-2 text-xs font-medium text-neutral-400 uppercase tracking-wider">
              {section.heading}
            </div>
            {section.items.map((item, j) => (
              <Link
                key={j}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 text-neutral-600 hover:bg-neutral-50",
                  location === item.href &&
                    "text-primary bg-blue-50 border-l-4 border-primary"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-neutral-100">
        <div className="flex items-center">
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://ui-avatars.com/api/?name=${user?.name || 'Admin User'}&background=1565C0&color=fff`} alt={user?.name || 'User'} />
            <AvatarFallback className="bg-primary text-white">{user?.name?.charAt(0) || 'A'}</AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="text-sm font-medium text-neutral-800">{user?.name || 'Admin User'}</p>
            <p className="text-xs text-neutral-500">{user?.role || 'System Administrator'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
