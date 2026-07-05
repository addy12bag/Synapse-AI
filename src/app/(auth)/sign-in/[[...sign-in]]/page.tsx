import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="glass p-8 rounded-2xl flex flex-col items-center gap-6 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
        
        <div className="text-center z-10 mb-2">
          <h1 className="text-3xl font-bold text-glow tracking-tight text-white mb-2">StudyAI</h1>
          <p className="text-muted-foreground text-sm">Welcome back to your intelligent study companion.</p>
        </div>
        
        <div className="z-10 w-full flex justify-center">
          <SignIn fallbackRedirectUrl="/dashboard" signUpUrl="/sign-up" appearance={{
            elements: {
              formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
              card: "bg-transparent shadow-none max-w-sm",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
            }
          }} />
        </div>
      </div>
    </div>
  );
}
