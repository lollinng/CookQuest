'use client';

import { useAuth } from '@/lib/auth-context';
import { useAdminUsers, useToggleUserAllowed } from '@/hooks/use-admin';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldIcon, Loader2Icon } from 'lucide-react';

export default function AdminPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { data: users, isLoading } = useAdminUsers();
  const toggleAllowed = useToggleUserAllowed();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2Icon className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <ShieldIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need admin privileges to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldIcon className="h-5 w-5 text-orange-600" />
            Admin Panel — User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>@{user.username}</TableCell>
                    <TableCell>
                      {user.is_allowed ? (
                        <Badge variant="default" className="bg-green-600">Allowed</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      {user.is_admin && (
                        <Badge variant="outline" className="ml-1 border-orange-400 text-orange-600">Admin</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={user.is_allowed}
                        onCheckedChange={(checked) =>
                          toggleAllowed.mutate({ userId: user.id, isAllowed: checked })
                        }
                        disabled={toggleAllowed.isPending}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {users?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
