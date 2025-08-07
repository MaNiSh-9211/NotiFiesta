import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth";
import { notificationService } from "@/lib/notifications";
import { firebaseService } from "@/lib/firebase";
import { loginSchema, registerSchema, type LoginRequest, type RegisterRequest } from "@shared/schema";
import { Rocket, Bell, Users, Zap } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loginForm = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterRequest>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      name: "",
    },
  });

  const handleLogin = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      await notificationService.initializeVapid(response.vapidPublicKey);
      
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to NotiFiesta.",
      });
      
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      await notificationService.initializeVapid(response.vapidPublicKey);
      
      toast({
        title: "Welcome to NotiFiesta!",
        description: "Account created successfully.",
      });
      
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check for redirect result on page load
    const checkRedirectResult = async () => {
      console.log("Checking redirect result...");
      const result = await firebaseService.handleRedirectResult();
      console.log("Redirect result:", result);
      if (result) {
        setIsLoading(true);
        try {
          console.log("Calling googleAuth with token:", result.idToken.substring(0, 10) + "...");
          const response = await authService.googleAuth(result.idToken);
          console.log("Google auth response:", response);
          await notificationService.initializeVapid(response.vapidPublicKey);
          
          toast({
            title: "Welcome to NotiFiesta!",
            description: "Successfully signed in with Google.",
          });
          
          console.log("Redirecting to dashboard...");
          // Try direct navigation instead of using wouter's setLocation
          window.location.href = "/dashboard";
        } catch (error: any) {
          console.error("Google auth error:", error);
          toast({
            title: "Authentication failed",
            description: error.message || "Failed to authenticate with Google",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkRedirectResult();
  }, [setLocation, toast]);


  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      console.log("Login: Starting Google auth with popup...");
      const result = await firebaseService.signInWithGoogle();
      console.log("Login: Received popup result:", result ? "Result exists" : "No result");
      
      if (result) {
        console.log("Login: Calling googleAuth with token from popup...");
        const response = await authService.googleAuth(result.idToken);
        console.log("Login: Google auth response received");
        await notificationService.initializeVapid(response.vapidPublicKey);
        
        toast({
          title: "Welcome to NotiFiesta!",
          description: "Successfully signed in with Google.",
        });
        
        console.log("Login: Redirecting to dashboard from popup flow...");
        window.location.href = "/dashboard";
      } else {
        throw new Error("No authentication result received");
      }
    } catch (error: any) {
      console.error("Login: Error in Google auth popup flow:", error);
      toast({
        title: "Authentication failed",
        description: error.message || "Failed to authenticate with Google",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Professional futuristic background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 futuristic-grid opacity-30"></div>
        <div className="absolute inset-0 minimal-pattern"></div>
      </div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          {/* Logo/Brand */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-3">
              <img src="/favicon.svg" alt="NotiFiesta Logo" className="w-10 h-10 mr-3" />
              <h1 className="text-5xl font-bold text-white tracking-wide">
                NotiFiesta
              </h1>
            </div>
            <p className="text-gray-400 font-mono text-sm tracking-wider">Professional Push Notification Platform</p>
            <div className="w-24 h-px gradient-accent mx-auto mt-6 opacity-60"></div>
          </div>

          {/* Auth Card */}
          <Card className="glass-modern border-gray-700 shadow-2xl hover-lift">
            <CardContent className="p-8">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-800 border border-gray-700">
                  <TabsTrigger value="login" className="data-[state=active]:bg-gray-600 data-[state=active]:text-white">Sign In</TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-gray-600 data-[state=active]:text-white">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <div className="space-y-6">
                    <h2 className="text-2xl font-semibold text-center">Welcome Back</h2>
                    
                    {/* Google OAuth Button */}
                    <Button 
                      variant="outline" 
                      className="w-full bg-white hover:bg-gray-50 text-black border-gray-300 hover-lift"
                      onClick={handleGoogleAuth}
                      disabled={isLoading}
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      {isLoading ? "Connecting..." : "Continue with Google"}
                    </Button>

                    <div className="flex items-center">
                      <div className="flex-1 border-t border-gray-700"></div>
                      <span className="px-4 text-gray-500 text-sm">or</span>
                      <div className="flex-1 border-t border-gray-700"></div>
                    </div>

                    {/* Login Form */}
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username or Email</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter username or email" 
                                  className="bg-gray-900 border-gray-600 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Enter password"
                                  className="bg-gray-900 border-gray-600 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full bg-white text-black hover:bg-gray-200 hover-lift font-semibold" 
                          disabled={isLoading}
                        >
                          {isLoading ? "Signing in..." : "Sign In"}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </TabsContent>
                
                <TabsContent value="register">
                  <div className="space-y-6">
                    <h2 className="text-2xl font-semibold text-center">Create Account</h2>
                    
                    {/* Register Form */}
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                        <FormField
                          control={registerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter your full name" 
                                  className="bg-gray-900 border-gray-600 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Choose a username" 
                                  className="bg-gray-900 border-gray-600 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="Enter your email" 
                                  className="bg-gray-900 border-gray-600 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Create a password"
                                  className="bg-gray-900 border-gray-600 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full bg-white text-black hover:bg-gray-200 hover-lift font-semibold" 
                          disabled={isLoading}
                        >
                          {isLoading ? "Creating account..." : "Create Account"}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="mt-12 grid grid-cols-2 gap-4 text-center">
            <div className="glass-modern p-4 rounded-lg border border-gray-700 hover-lift">
              <Rocket className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Instant Delivery</p>
            </div>
            <div className="glass-modern p-4 rounded-lg border border-gray-700 hover-lift">
              <Bell className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Smart Notifications</p>
            </div>
            <div className="glass-modern p-4 rounded-lg border border-gray-700 hover-lift">
              <Users className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Friend Management</p>
            </div>
            <div className="glass-modern p-4 rounded-lg border border-gray-700 hover-lift">
              <Zap className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Lightning Fast</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
