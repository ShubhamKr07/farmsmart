import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "lucide-react";

export function Profile() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="bg-muted p-2.5 rounded-lg">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operator Profile</h1>
          <p className="text-sm text-muted-foreground">The account currently using this dashboard.</p>
        </div>
      </div>

      <Card className="shadow-sm max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/10 text-primary">
              <User className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <p className="font-semibold">Operator</p>
            <p className="text-xs text-muted-foreground">Shared facility login</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-dashed max-w-md">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Signed-in identity (name, email, role) and per-operator actions will appear here
          once web-client auth is wired. Today the dashboard runs on a shared operator login.
        </CardContent>
      </Card>
    </div>
  );
}
