import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Users, Settings } from "lucide-react";

const actions = [
  { label: "Audit Logs", href: "/configuration/audit", icon: ClipboardList },
  { label: "Users", href: "/configuration/users", icon: Users },
  { label: "System Settings", href: "/configuration/system", icon: Settings },
];

/**
 * Quick actions widget. Reference implementation for an action/navigation widget.
 */
export function QuickActionsWidget() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {actions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Button
              variant="ghost"
              className="w-full justify-start min-h-[44px]"
            >
              <action.icon className="mr-2 h-4 w-4 shrink-0" />
              {action.label}
            </Button>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
