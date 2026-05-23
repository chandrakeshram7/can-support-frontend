import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";

import {
  useState,
  type FormEvent,
} from "react";

import { useAuth }
  from "@/lib/auth-context";

import { Button }
  from "@/components/ui/button";

import { Input }
  from "@/components/ui/input";

import { Label }
  from "@/components/ui/label";

export const Route =
  createFileRoute("/login")({
    component: LoginPage,
  });

function LoginPage() {

  const { login } =
    useAuth();

  const navigate =
    useNavigate();

  const [username,
    setUsername] =
      useState("");

  const [password,
    setPassword] =
      useState("");

  const [error,
    setError] =
      useState<string | null>(
        null
      );

  const [submitting,
    setSubmitting] =
      useState(false);

  const onSubmit =
    async (
      e: FormEvent
    ) => {

      e.preventDefault();

      setError(null);

      setSubmitting(true);

      try {

        await login({
          username,
          password,
        });

        navigate({
          to: "/dashboard",
        });

      } catch (err) {

        setError(
          err instanceof Error
            ? err.message
            : "Login failed"
        );

      } finally {

        setSubmitting(false);
      }
    };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">

      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border p-6"
      >

        <div>

          <h1 className="text-2xl font-bold">
            Sign in
          </h1>

          <p className="text-sm text-muted-foreground">
            Service desk console
          </p>

        </div>

        <div className="space-y-2">

          <Label htmlFor="username">
            Username
          </Label>

          <Input
            id="username"
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value
              )
            }
            required
          />
        </div>

        <div className="space-y-2">

          <Label htmlFor="password">
            Password
          </Label>

          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            required
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={submitting}
        >

          {submitting
            ? "Signing in..."
            : "Sign in"}

        </Button>

        <p className="text-center text-sm text-muted-foreground">

          No account?{" "}

          <Link
            to="/signup"
            className="underline"
          >
            Sign up
          </Link>

        </p>

      </form>

    </div>
  );
}