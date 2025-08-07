import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { authService, getAuthHeaders } from "@/lib/auth";
import { notificationService } from "@/lib/notifications";
import { apiRequest } from "@/lib/queryClient";
import { messageSchema, type MessageRequest, type Friend, type Message, type User } from "@shared/schema";
import { 
  Bell, 
  Users, 
  Send, 
  Link as LinkIcon, 
  Rocket, 
  Edit, 
  History, 
  BarChart3,
  LogOut,
  UserPlus,
  Copy,
  Trash2,
  Clock
} from "lucide-react";
import { BarChart, Bar, PieChart, Pie, ResponsiveContainer, XAxis, Tooltip } from "recharts";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [showActivityHistory, setShowActivityHistory] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showFriendMessages, setShowFriendMessages] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const messageForm = useForm<MessageRequest>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      friendId: "",
      title: "",
      message: "",
    },
  });

  const addFriendForm = useForm({
    defaultValues: {
      name: "",
      customMessage: "",
    },
  });

  // Check authentication and get user
  useEffect(() => {
    const checkAuth = async () => {
      console.log("Dashboard: Checking authentication...");
      const isAuth = authService.isAuthenticated();
      console.log("Dashboard: Is authenticated:", isAuth);
      
      if (!isAuth) {
        console.log("Dashboard: Not authenticated, redirecting to login");
        setLocation("/login");
        return;
      }

      console.log("Dashboard: Getting current user...");
      const currentUser = await authService.getCurrentUser();
      console.log("Dashboard: Current user:", currentUser ? {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name
      } : "No user");
      
      if (!currentUser) {
        console.log("Dashboard: No current user, redirecting to login");
        setLocation("/login");
        return;
      }

      console.log("Dashboard: Setting user state");
      setUser(currentUser);
    };

    checkAuth();
  }, [setLocation]);

  // Query friends
  const { data: friends = [], isLoading: friendsLoading } = useQuery({
    queryKey: ["/api/friends"],
    queryFn: async () => {
      const token = authService.getToken();
      if (!token) throw new Error("No auth token");
      
      const response = await fetch("/api/friends", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch friends");
      return response.json();
    },
    enabled: !!user,
  });

  // Query messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/messages"],
    queryFn: async () => {
      const token = authService.getToken();
      if (!token) throw new Error("No auth token");
      
      const response = await fetch("/api/messages", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!user,
  });

  // Query statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const token = authService.getToken();
      if (!token) throw new Error("No auth token");
      
      const response = await fetch("/api/stats", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!user,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageRequest) => {
      const response = await apiRequest("POST", "/api/messages", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      // Don't reset the entire form, just clear title and message but keep friendId
      messageForm.setValue("title", "");
      messageForm.setValue("message", "");
      toast({
        title: "Message sent!",
        description: "Your notification has been delivered.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Schedule message mutation
  const scheduleMessageMutation = useMutation({
    mutationFn: async (data: MessageRequest & { scheduledFor: string }) => {
      const response = await apiRequest("POST", "/api/messages/schedule", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      // Don't reset the entire form, just clear title and message but keep friendId
      messageForm.setValue("title", "");
      messageForm.setValue("message", "");
      toast({
        title: "Notification scheduled",
        description: "Your notification has been scheduled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to schedule message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add friend mutation
  const addFriendMutation = useMutation({
    mutationFn: async (data: { name: string; customMessage: string }) => {
      const response = await apiRequest("POST", "/api/friends", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      setGeneratedLink(data.notificationUrl);
      addFriendForm.reset();
      toast({
        title: "Friend added!",
        description: "Notification link generated successfully.",
      });
      
      // Immediately refetch friends to update the dropdown
      queryClient.refetchQueries({ queryKey: ["/api/friends"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add friend",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete friend mutation
  const deleteFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const response = await apiRequest("DELETE", `/api/friends/${friendId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({
        title: "Friend removed",
        description: "Friend has been removed from your list.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove friend",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    authService.logout();
    setLocation("/login");
  };

  const handleSendMessage = (data: MessageRequest) => {
    // Ensure friendId is set before sending
    if (!data.friendId) {
      const selectedFriend = messageForm.getValues("friendId");
      if (selectedFriend) {
        data.friendId = selectedFriend;
      } else {
        toast({
          title: "Friend is required",
          description: "Please select a friend to send the notification to.",
          variant: "destructive",
        });
        return;
      }
    }
    sendMessageMutation.mutate(data);
  };

  const handleAddFriend = (data: { name: string; customMessage: string }) => {
    addFriendMutation.mutate(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard.",
    });
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation Header */}
      <nav className="border-b border-gray-800 sticky top-0 z-40 bg-black">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <img src="/favicon.svg" alt="NotiFiesta Logo" className="w-6 h-6 mr-2" />
                <h1 className="text-xl font-bold text-white tracking-wide">
                  NotiFiesta
                </h1>
              </div>
              <div className="w-px h-6 bg-gray-600"></div>
              <span className="text-gray-400 font-mono text-sm tracking-wide">Professional Notification Platform</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <span className="loading-dots mr-1">•ᴥ•</span>
                <Bell className="w-4 h-4" />
                {stats && <span className="ml-1 bg-gray-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{stats.thisWeek}</span>}
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-800 border border-gray-600 rounded-full flex items-center justify-center text-sm font-bold text-gray-300">
                  {getInitials(user.name)}
                </div>
                <span className="text-sm font-medium">{user.name}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Activity History Dialog */}
      <Dialog open={showActivityHistory} onOpenChange={setShowActivityHistory}>
        <DialogContent className="glass-modern border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <History className="text-cyan-400 mr-3" />
              Activity History
            </DialogTitle>
            <DialogDescription>
              View and manage your notification history
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">All Notifications</h3>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  // This would need a backend API endpoint to implement
                  toast({
                    title: "History cleared",
                    description: "All activity history has been deleted.",
                  });
                  // Would need to invalidate queries here
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear History
              </Button>
            </div>
            
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {messages.map((message: Message) => {
                const friend = friends.find((f: Friend) => f.id === message.friendId);
                return (
                  <div key={message.id} className="flex items-center space-x-4 p-4 bg-gray-900/50 rounded-xl hover:bg-gray-900 transition-colors duration-200 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <Send className="text-white text-sm" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="font-medium">
                          Notification to <span className="text-cyan-400 cursor-pointer hover:underline" onClick={() => {
                            if (friend) {
                              setSelectedFriend(friend);
                              setShowFriendMessages(true);
                            }
                          }}>{friend?.name}</span>
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                          onClick={() => {
                            // This would need a backend API endpoint to implement
                            toast({
                              title: "Notification deleted",
                              description: "The notification has been removed from history.",
                            });
                            // Would need to invalidate queries here
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-400">{message.title}</p>
                      <p className="text-xs text-gray-500 mt-1 font-mono">{formatDate(message.sentAt)}</p>
                    </div>
                  </div>
                );
              })}
              
              {messages.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No messages sent yet. Start by sending your first notification!
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Friend Message Detail Dialog */}
      <Dialog open={showFriendMessages} onOpenChange={setShowFriendMessages}>
        <DialogContent className="glass-modern border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <div className="w-8 h-8 gradient-cyan-purple rounded-full flex items-center justify-center text-xs font-bold mr-3">
                {selectedFriend ? getInitials(selectedFriend.name) : ''}
              </div>
              {selectedFriend?.name}'s Notifications
            </DialogTitle>
            <DialogDescription>
              All notifications sent to this friend
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="chat-ui space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {messages
                .filter((message: Message) => message.friendId === selectedFriend?.id)
                .map((message: Message) => (
                  <div key={message.id} className="flex flex-col p-4 bg-gray-900/50 rounded-xl hover:bg-gray-900 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-cyan-400">{message.title}</h4>
                      <p className="text-xs text-gray-500 font-mono">{formatDate(message.sentAt)}</p>
                    </div>
                    <p className="text-sm text-gray-300">{message.message}</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400">
                        {message.status === 'sent' ? 'Delivered' : message.status}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-300"
                        onClick={() => {
                          // This would need a backend API endpoint to implement
                          toast({
                            title: "Notification deleted",
                            description: "The notification has been removed from history.",
                          });
                          // Would need to invalidate queries here
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              }
              
              {messages.filter((message: Message) => message.friendId === selectedFriend?.id).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No messages sent to this friend yet.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions Card */}
            <Card className="glass-modern border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Rocket className="text-gray-300 mr-3" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Dialog open={isAddFriendOpen} onOpenChange={setIsAddFriendOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="border-gray-600 bg-gray-800/50 hover:bg-gray-700 h-auto p-6 text-left hover-lift group"
                      >
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-3">
                            <LinkIcon className="text-xl text-gray-300 group-hover:text-white transition-colors duration-200" />
                            <div className="text-gray-600 group-hover:text-white transition-colors duration-200">→</div>
                          </div>
                          <h3 className="font-semibold text-lg mb-2">Generate Friend Link</h3>
                          <p className="text-gray-400 text-sm">Create a unique notification link for a friend</p>
                        </div>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-modern border-gray-700">
                      <DialogHeader>
                        <DialogTitle>Add New Friend</DialogTitle>
                      </DialogHeader>
                      <Form {...addFriendForm}>
                        <form onSubmit={addFriendForm.handleSubmit(handleAddFriend)} className="space-y-4">
                          <FormField
                            control={addFriendForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Friend's Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter your friend's name" 
                                    className="bg-gray-900 border-gray-600 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={addFriendForm.control}
                            name="customMessage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Custom Message (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Custom message for the notification consent page"
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
                            disabled={addFriendMutation.isPending}
                          >
                            {addFriendMutation.isPending ? "Generating..." : "Generate Link"}
                          </Button>
                        </form>
                      </Form>
                      
                      {generatedLink && (
                        <div className="mt-4 p-4 bg-gray-900 border border-gray-600 rounded-lg">
                          <p className="text-sm text-gray-400 mb-2">Share this link:</p>
                          <div className="flex items-center space-x-2">
                            <Input 
                              value={generatedLink} 
                              readOnly 
                              className="bg-gray-800 border-gray-600 text-sm"
                            />
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedLink)}>
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    variant="outline" 
                    className="border-gray-600 bg-gray-800/50 hover:bg-gray-700 h-auto p-6 text-left hover-lift group"
                    onClick={() => messageForm.setValue("friendId", friends[0]?.id || "")}
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-3">
                        <Send className="text-xl text-gray-300 group-hover:text-white transition-colors duration-200" />
                        <div className="text-gray-600 group-hover:text-white transition-colors duration-200">→</div>
                      </div>
                      <h3 className="font-semibold text-lg mb-2">Send Notification</h3>
                      <p className="text-gray-400 text-sm">Send instant push notifications to friends</p>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Message Composer */}
            <Card className="glass-card border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Edit className="text-purple-400 mr-3" />
                  Compose Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...messageForm}>
                  <form onSubmit={messageForm.handleSubmit(handleSendMessage)} className="space-y-4">
                    <FormField
                      control={messageForm.control}
                      name="friendId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Friend</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-900 border-gray-700 focus:border-cyan-500">
                                <SelectValue placeholder="Select a friend..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-gray-900 border-gray-700">
                              {friends.filter((f: Friend) => f.isActive).map((friend: Friend) => (
                                <SelectItem key={friend.id} value={friend.id}>
                                  {friend.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={messageForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Notification title" 
                              className="bg-gray-900 border-gray-700 focus:border-cyan-500"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={messageForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              rows={4}
                              placeholder="Type your message here..." 
                              className="bg-gray-900 border-gray-700 focus:border-cyan-500 resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex space-x-3">
                      <Button 
                        type="submit" 
                        className="flex-1 gradient-cyan-purple hover:neon-glow-cyan"
                        disabled={sendMessageMutation.isPending}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {sendMessageMutation.isPending ? "Sending..." : "Send Now"}
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            type="button"
                            variant="outline"
                            className="bg-gray-900 hover:bg-gray-700 border-gray-600"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Schedule
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="glass-modern border-gray-700">
                          <DialogHeader>
                            <DialogTitle>Schedule Notification</DialogTitle>
                            <DialogDescription>
                              Choose when to send this notification.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="flex flex-col space-y-2">
                              <Label htmlFor="schedule-date">Date</Label>
                              <Input 
                                id="schedule-date" 
                                type="date" 
                                className="bg-gray-900 border-gray-700 focus:border-cyan-500"
                                defaultValue={new Date().toISOString().split('T')[0]} // Today's date
                              />
                            </div>
                            <div className="flex flex-col space-y-2">
                              <Label htmlFor="schedule-time">Time</Label>
                              <Input 
                                id="schedule-time" 
                                type="time" 
                                className="bg-gray-900 border-gray-700 focus:border-cyan-500"
                                defaultValue={new Date(Date.now() + 30*60000).toTimeString().slice(0, 5)} // 30 minutes from now
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button 
                              type="button" 
                              className="gradient-cyan-purple hover:neon-glow-cyan w-full"
                              disabled={scheduleMessageMutation.isPending}
                              onClick={() => {
                                const friendId = messageForm.getValues("friendId");
                                const title = messageForm.getValues("title");
                                const message = messageForm.getValues("message");
                                
                                // Get the date and time inputs
                                const dateInput = document.getElementById("schedule-date") as HTMLInputElement;
                                const timeInput = document.getElementById("schedule-time") as HTMLInputElement;
                                
                                if (!friendId) {
                                  toast({
                                    title: "Friend is required",
                                    description: "Please select a friend to send the notification to.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                if (!title || !message) {
                                  toast({
                                    title: "Missing information",
                                    description: "Please provide both title and message for your notification.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                if (!dateInput.value || !timeInput.value) {
                                  toast({
                                    title: "Schedule time required",
                                    description: "Please select both date and time for your scheduled notification.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                // Combine date and time into ISO string
                                const scheduledFor = `${dateInput.value}T${timeInput.value}:00`;
                                
                                // Schedule the notification
                                scheduleMessageMutation.mutate({
                                  friendId,
                                  title,
                                  message,
                                  scheduledFor
                                });
                              }}
                            >
                              {scheduleMessageMutation.isPending ? "Scheduling..." : "Schedule Notification"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Activity Button */}
            <Card className="glass-card border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <History className="text-cyan-400 mr-3" />
                    Activity History
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="border-gray-600 bg-gray-800/50 hover:bg-gray-700 h-auto p-6 text-left hover-lift group w-full"
                  onClick={() => setShowActivityHistory(true)}
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-3">
                      <History className="text-xl text-gray-300 group-hover:text-white transition-colors duration-200" />
                      <div className="text-gray-600 group-hover:text-white transition-colors duration-200">→</div>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">View Activity History</h3>
                    <p className="text-gray-400 text-sm">See all your sent notifications and activity</p>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Friends List */}
            <Card className="glass-card border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Users className="text-purple-400 mr-3" />
                    Friends
                    <span className="ml-2 bg-purple-400/20 text-purple-400 text-xs font-bold px-2 py-1 rounded-full">
                      {friends.length}
                    </span>
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsAddFriendOpen(true)}
                    className="text-cyan-400 hover:text-white"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {friends.map((friend: Friend) => (
                    <div 
                      key={friend.id} 
                      className="flex items-center space-x-3 p-3 bg-gray-900/30 rounded-xl hover:bg-gray-900/60 transition-colors duration-200 group cursor-pointer"
                      onClick={() => {
                        setSelectedFriend(friend);
                        setShowFriendMessages(true);
                      }}
                    >
                      <div className="w-8 h-8 gradient-cyan-purple rounded-full flex items-center justify-center text-xs font-bold">
                        {getInitials(friend.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{friend.name}</p>
                        <p className="text-xs text-gray-400">
                          {friend.isActive ? (
                            friend.lastNotifiedAt ? 
                              `Last notified ${formatDate(friend.lastNotifiedAt)}` : 
                              "Never notified"
                          ) : (
                            "Notifications disabled"
                          )}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-cyan-400 hover:text-white text-xs p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            messageForm.setValue("friendId", friend.id);
                          }}
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-400 hover:text-red-300 text-xs p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFriendMutation.mutate(friend.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {friends.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No friends added yet.</p>
                      <Button 
                        variant="link" 
                        className="text-cyan-400 text-sm"
                        onClick={() => setIsAddFriendOpen(true)}
                      >
                        Add your first friend
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card className="glass-card border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="text-cyan-400 mr-3" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                      <span className="text-sm text-gray-300">Total Sent</span>
                    </div>
                    <span className="font-semibold font-mono">{stats?.totalSent || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-sm text-gray-300">Active Friends</span>
                    </div>
                    <span className="font-semibold font-mono">{stats?.activeFriends || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-300">Success Rate</span>
                    </div>
                    <span className="font-semibold font-mono">{stats?.successRate || "0%"}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-gray-300">This Week</span>
                    </div>
                    <span className="font-semibold font-mono">{stats?.thisWeek || 0}</span>
                  </div>
                  
                  {/* Weekly Activity Chart */}
                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <h4 className="text-sm font-medium mb-4">Weekly Activity</h4>
                    <div className="h-40">
                      {stats && (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { name: 'Mon', value: stats.weeklyData?.monday || 0 },
                              { name: 'Tue', value: stats.weeklyData?.tuesday || 0 },
                              { name: 'Wed', value: stats.weeklyData?.wednesday || 0 },
                              { name: 'Thu', value: stats.weeklyData?.thursday || 0 },
                              { name: 'Fri', value: stats.weeklyData?.friday || 0 },
                              { name: 'Sat', value: stats.weeklyData?.saturday || 0 },
                              { name: 'Sun', value: stats.weeklyData?.sunday || 0 },
                            ]}
                            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                          >
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#9ca3af' }}
                            />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-gray-900 border border-gray-800 p-2 rounded-md shadow-md">
                                      <p className="text-xs text-gray-300">{`${payload[0].payload.name}: ${payload[0].value} messages`}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar 
                              dataKey="value" 
                              fill="url(#colorGradient)" 
                              radius={[4, 4, 0, 0]}
                            />
                            <defs>
                              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8}/>
                                <stop offset="100%" stopColor="#a855f7" stopOpacity={0.8}/>
                              </linearGradient>
                            </defs>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                  
                  {/* Friend Distribution Chart */}
                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <h4 className="text-sm font-medium mb-4">Friend Distribution</h4>
                    <div className="h-40">
                      {stats && (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Active', value: stats.activeFriends || 0, fill: '#a855f7' },
                                { name: 'Inactive', value: (friends.length - (stats.activeFriends || 0)), fill: '#6b7280' },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={60}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-gray-900 border border-gray-800 p-2 rounded-md shadow-md">
                                      <p className="text-xs text-gray-300">{`${payload[0].name}: ${payload[0].value} friends`}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
