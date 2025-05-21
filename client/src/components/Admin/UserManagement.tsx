import { useState } from "react";
import { User } from "@shared/schema";
import { useLocale } from "@/providers/LocaleProvider";
import { formatFileSize } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  UserPlus, Search, MoreVertical, User as UserIcon,
  UserCheck, UserX, Shield, ShieldOff, BadgePlus, BadgeMinus, Trash 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function UserManagement() {
  const { t } = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isSetQuotaDialogOpen, setIsSetQuotaDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUserData, setNewUserData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    quota: "10737418240" // 10GB in bytes
  });
  const [newQuota, setNewQuota] = useState("10737418240"); // 10GB in bytes
  
  const pageSize = 10;

  // Fetch users
  const { data: userData, isLoading } = useQuery<{
    users: User[];
    total: number;
  }>({
    queryKey: ["/api/admin/users", page, searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users?page=${page}&limit=${pageSize}&search=${encodeURIComponent(searchQuery)}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    }
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      const res = await apiRequest("POST", "/api/admin/users", userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("admin.userCreated"),
        description: t("admin.userCreatedSuccess")
      });
      setIsAddUserDialogOpen(false);
      resetNewUserForm();
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("admin.failedToCreateUser"),
        variant: "destructive"
      });
    }
  });

  // Set user quota mutation
  const setQuotaMutation = useMutation({
    mutationFn: async ({ userId, quota }: { userId: number; quota: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/quota`, { quota });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("admin.quotaUpdated"),
        description: t("admin.quotaUpdatedSuccess")
      });
      setIsSetQuotaDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("admin.failedToUpdateQuota"),
        variant: "destructive"
      });
    }
  });

  // Toggle user block status mutation
  const toggleBlockMutation = useMutation({
    mutationFn: async ({ userId, isBlocked }: { userId: number; isBlocked: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/block`, { isBlocked });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("admin.statusUpdated"),
        description: t("admin.statusUpdatedSuccess")
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("admin.failedToUpdateStatus"),
        variant: "destructive"
      });
    }
  });

  // Toggle user role mutation
  const toggleRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("admin.roleUpdated"),
        description: t("admin.roleUpdatedSuccess")
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("admin.failedToUpdateRole"),
        variant: "destructive"
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("admin.userDeleted"),
        description: t("admin.userDeletedSuccess")
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("admin.failedToDeleteUser"),
        variant: "destructive"
      });
    }
  });

  // Reset new user form
  const resetNewUserForm = () => {
    setNewUserData({
      name: "",
      email: "",
      password: "",
      role: "user",
      quota: "10737418240"
    });
  };

  // Handle add user
  const handleAddUser = () => {
    addUserMutation.mutate(newUserData);
  };

  // Handle set quota
  const handleSetQuota = () => {
    if (selectedUser) {
      setQuotaMutation.mutate({
        userId: selectedUser.id,
        quota: newQuota
      });
    }
  };

  // Handle toggle block
  const handleToggleBlock = (user: User) => {
    toggleBlockMutation.mutate({
      userId: user.id,
      isBlocked: !user.isBlocked
    });
  };

  // Handle toggle role
  const handleToggleRole = (user: User) => {
    toggleRoleMutation.mutate({
      userId: user.id,
      role: user.role === "admin" ? "user" : "admin"
    });
  };

  // Handle delete user
  const handleDeleteUser = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  // Open quota dialog
  const openQuotaDialog = (user: User) => {
    setSelectedUser(user);
    setNewQuota(user.quota.toString());
    setIsSetQuotaDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Calculate total pages
  const totalPages = userData ? Math.ceil(userData.total / pageSize) : 0;

  // Get quotas for dropdown
  const quotaOptions = [
    { label: "1 GB", value: "1073741824" },
    { label: "5 GB", value: "5368709120" },
    { label: "10 GB", value: "10737418240" },
    { label: "20 GB", value: "21474836480" },
    { label: "50 GB", value: "53687091200" },
    { label: "100 GB", value: "107374182400" }
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("admin.userManagement")}</h1>
      
      {/* Search and Actions */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogTrigger asChild>
            <Button className="inline-flex items-center">
              <UserPlus className="mr-2 h-4 w-4" />
              <span>{t("admin.addUser")}</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.addUser")}</DialogTitle>
              <DialogDescription>
                {t("admin.createAccountInfo")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="name" className="text-right">
                  {t("auth.name")}
                </label>
                <Input
                  id="name"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="email" className="text-right">
                  {t("auth.email")}
                </label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="password" className="text-right">
                  {t("auth.password")}
                </label>
                <Input
                  id="password"
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="role" className="text-right">
                  {t("admin.role")}
                </label>
                <Select
                  value={newUserData.role}
                  onValueChange={(value) => setNewUserData({ ...newUserData, role: value })}
                >
                  <SelectTrigger id="role" className="col-span-3">
                    <SelectValue placeholder={t("admin.role")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t("admin.user")}</SelectItem>
                    <SelectItem value="admin">{t("admin.administrator")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="quota" className="text-right">
                  {t("admin.quota")}
                </label>
                <Select
                  value={newUserData.quota}
                  onValueChange={(value) => setNewUserData({ ...newUserData, quota: value })}
                >
                  <SelectTrigger id="quota" className="col-span-3">
                    <SelectValue placeholder={t("admin.quota")} />
                  </SelectTrigger>
                  <SelectContent>
                    {quotaOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button 
                onClick={handleAddUser}
                disabled={addUserMutation.isPending}
              >
                {addUserMutation.isPending ? t("common.loading") : t("common.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div>
          <div className="relative">
            <Input
              type="text"
              placeholder={t("admin.searchUsers")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full md:w-80"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="bg-white dark:bg-gray-700 rounded-lg shadow overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 font-medium">
          <div className="w-12"></div> {/* Avatar column */}
          <div className="flex-grow">{t("admin.username")}</div>
          <div className="w-32 hidden md:block">{t("admin.role")}</div>
          <div className="w-32 text-right hidden md:block">{t("admin.quota")}</div>
          <div className="w-32 text-right hidden md:block">{t("admin.status")}</div>
          <div className="w-20"></div> {/* Actions column */}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {t("common.loading")}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!userData?.users || userData.users.length === 0) && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {searchQuery 
              ? t("admin.noUsersFound") 
              : t("admin.noUsersInSystem")}
          </div>
        )}

        {/* User rows */}
        {!isLoading &&
          userData?.users.map((user) => (
            <div
              key={user.id}
              className="flex items-center p-4 border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <div className="w-12">
                <UserIcon className="text-gray-500" />
              </div>
              <div className="flex-grow">
                <div className="font-medium">{user.email}</div>
                <div className="text-sm text-gray-500">{user.name}</div>
              </div>
              <div className="w-32 hidden md:block">
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    user.role === "admin"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                  }`}
                >
                  {user.role === "admin"
                    ? t("admin.administrator")
                    : t("admin.user")}
                </span>
              </div>
              <div className="w-32 text-right hidden md:block">
                {formatFileSize(user.quota)}
              </div>
              <div className="w-32 text-right hidden md:block">
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    user.isBlocked
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                      : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                  }`}
                >
                  {user.isBlocked ? t("admin.blocked") : t("admin.active")}
                </span>
              </div>
              <div className="w-20 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("admin.actions")}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openQuotaDialog(user)}>
                      <BadgePlus className="mr-2 h-4 w-4" />
                      <span>Set Quota</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleRole(user)}>
                      {user.role === "admin" ? (
                        <>
                          <ShieldOff className="mr-2 h-4 w-4" />
                          <span>Remove Admin</span>
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          <span>Make Admin</span>
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleBlock(user)}>
                      {user.isBlocked ? (
                        <>
                          <UserCheck className="mr-2 h-4 w-4" />
                          <span>Unblock User</span>
                        </>
                      ) : (
                        <>
                          <UserX className="mr-2 h-4 w-4" />
                          <span>Block User</span>
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => openDeleteDialog(user)}
                      className="text-red-500 focus:text-red-500"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      <span>{t("common.delete")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-disabled={page === 1}
              />
            </PaginationItem>
            
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              // Show first, last, and adjacent pages
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= page - 1 && pageNum <= page + 1)
              ) {
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      isActive={pageNum === page}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
              
              // Show ellipsis for gaps
              if (pageNum === 2 || pageNum === totalPages - 1) {
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }
              
              return null;
            })}
            
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-disabled={page === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Set Quota Dialog */}
      <Dialog open={isSetQuotaDialogOpen} onOpenChange={setIsSetQuotaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.quotaManagement")}</DialogTitle>
            <DialogDescription>
              {t("admin.quotaUpdatedSuccess")}
            </DialogDescription>
          </DialogHeader>
          
          <Select
            value={newQuota}
            onValueChange={setNewQuota}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("admin.quota")} />
            </SelectTrigger>
            <SelectContent>
              {quotaOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSetQuotaDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={handleSetQuota}
              disabled={setQuotaMutation.isPending}
            >
              {setQuotaMutation.isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.userDeleted")}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.email}? This will remove all their files and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
