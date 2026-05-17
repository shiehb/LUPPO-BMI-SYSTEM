import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <p className="text-5xl font-bold text-gray-200">404</p>
        <h1 className="text-2xl font-semibold text-gray-900">Page Not Found</h1>
        <p className="max-w-sm text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/login">Return to Login</Link>
      </Button>
    </div>
  );
}
