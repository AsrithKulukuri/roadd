"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shared/logo";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate auth
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Account created successfully!");
      router.push("/");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4 pt-24 pb-12">
      <div className="w-full max-w-md bg-bg-card border border-border-default rounded-3xl p-8 shadow-elevated">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" className="mb-6" />
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Create an Account
          </h1>
          <p className="text-text-secondary text-center mt-2">
            Join ROAD FACING to save your favorite properties
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input 
              required 
              type="text" 
              placeholder="Full Name" 
              className="bg-bg-primary/50 border-border-default/50 h-12 rounded-xl" 
            />
          </div>
          <div>
            <Input 
              required 
              type="email" 
              placeholder="Email Address" 
              className="bg-bg-primary/50 border-border-default/50 h-12 rounded-xl" 
            />
          </div>
          <div>
            <Input 
              required 
              type="password" 
              placeholder="Password" 
              className="bg-bg-primary/50 border-border-default/50 h-12 rounded-xl" 
            />
          </div>

          <Button 
            type="submit" 
            variant="amber" 
            className="w-full h-12 rounded-xl text-base shadow-amber-glow mt-4"
            disabled={isLoading}
          >
            {isLoading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="text-amber-primary font-medium hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
