import React from "react";
import { useUser } from "@clerk/clerk-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

export function Profile() {
  const { user, isLoaded } = useUser();
  const name = user?.fullName ?? user?.firstName ?? "Operator";
  const email = user?.primaryEmailAddress?.emailAddress ?? "—";
  const initials =
    ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase() ||
    "O";

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
            {isLoaded && user?.imageUrl ? <AvatarImage src={user.imageUrl} alt={name} /> : null}
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <p className="font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-dashed max-w-md">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Roles and per-operator permissions will appear here once role metadata is
          persisted server-side (the DB evaluation's I6 item).
        </CardContent>
      </Card>
    </div>
  );
}
