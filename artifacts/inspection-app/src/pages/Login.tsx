import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin, useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { refetch } = useGetCurrentUser({
    query: {
      queryKey: getGetCurrentUserQueryKey(),
      enabled: false,
    }
  });

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async () => {
        await refetch();
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        toast({ title: "Welcome back" });
      },
      onError: (error) => {
        toast({
          title: "Sign in failed",
          description: error.error || "Please check your credentials",
          variant: "destructive",
        });
      },
    }
  });

  // Redirect if already logged in
  if (user) {
    if (user.role === "admin") setLocation("/admin");
    else setLocation("/inspector");
    return null;
  }

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate({ data: values });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
            <ShieldAlert size={24} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Digital Inspector</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t bg-muted/50 p-6">
            <div className="text-sm font-medium text-muted-foreground w-full text-center">Demo Accounts</div>
            <div className="grid grid-cols-2 gap-4 w-full">
              <Button 
                variant="outline" 
                className="w-full text-xs flex flex-col h-auto py-2 items-start"
                onClick={() => {
                  form.setValue("email", "admin@demo.local");
                  form.setValue("password", "admin123");
                }}
              >
                <span className="font-semibold">Admin</span>
                <span className="text-muted-foreground font-normal">admin@demo.local</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full text-xs flex flex-col h-auto py-2 items-start"
                onClick={() => {
                  form.setValue("email", "inspector@demo.local");
                  form.setValue("password", "inspector123");
                }}
              >
                <span className="font-semibold">Inspector</span>
                <span className="text-muted-foreground font-normal">inspector@demo.local</span>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
