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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
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

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string>("");
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
      if (!authService.isAuthenticated()) {
        setLocation("/login");
        return;
      }

      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        setLocation("/login");
        return;
      }

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
      messageForm.reset();
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
      <nav className="glass-card border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-white tracking-wide">
                NotiFiesta
              </h1>
              <div className="w-px h-6 bg-gray-600"></div>
              <span className="text-gray-400 font-mono text-sm tracking-wide">Professional Notification Platform</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
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
                      <Button 
                        type="button"
                        variant="outline"
                        className="bg-gray-900 hover:bg-gray-700 border-gray-600"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Schedule
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="glass-card border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <History className="text-cyan-400 mr-3" />
                    Recent Activity
                  </CardTitle>
                  <Button variant="link" className="text-cyan-400 hover:text-white text-sm">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.slice(0, 5).map((message: Message) => {
                    const friend = friends.find((f: Friend) => f.id === message.friendId);
                    return (
                      <div key={message.id} className="flex items-center space-x-4 p-4 bg-gray-900/50 rounded-xl hover:bg-gray-900 transition-colors duration-200">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                          <Send className="text-white text-sm" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            Notification sent to <span className="text-cyan-400">{friend?.name}</span>
                          </p>
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
                    <div key={friend.id} className="flex items-center space-x-3 p-3 bg-gray-900/30 rounded-xl hover:bg-gray-900/60 transition-colors duration-200 group">
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
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-cyan-400 hover:text-white text-xs p-1"
                          onClick={() => messageForm.setValue("friendId", friend.id)}
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-400 hover:text-red-300 text-xs p-1"
                          onClick={() => deleteFriendMutation.mutate(friend.id)}
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
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
