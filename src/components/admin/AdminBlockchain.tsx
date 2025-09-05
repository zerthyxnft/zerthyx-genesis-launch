import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit2, Trash2, Plus } from "lucide-react";

interface BlockchainNetwork {
  id: string;
  name: string;
  network_type: string;
  deposit_address: string;
  is_enabled: boolean;
  created_at: string;
}

export function AdminBlockchain() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingNetwork, setEditingNetwork] = useState<BlockchainNetwork | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    network_type: "",
    deposit_address: "",
    is_enabled: true,
  });

  const { data: networks, isLoading } = useQuery({
    queryKey: ["blockchain-networks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blockchain_networks")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as BlockchainNetwork[];
    },
  });

  const updateNetworkMutation = useMutation({
    mutationFn: async (network: Partial<BlockchainNetwork> & { id: string }) => {
      const { error } = await supabase
        .from("blockchain_networks")
        .update(network)
        .eq("id", network.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockchain-networks"] });
      toast({
        title: "Network updated",
        description: "Blockchain network has been updated successfully.",
      });
    },
  });

  const addNetworkMutation = useMutation({
    mutationFn: async (network: Omit<BlockchainNetwork, "id" | "created_at">) => {
      const { error } = await supabase
        .from("blockchain_networks")
        .insert([network]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockchain-networks"] });
      setIsAddingNew(false);
      setFormData({
        name: "",
        network_type: "",
        deposit_address: "",
        is_enabled: true,
      });
      toast({
        title: "Network added",
        description: "New blockchain network has been added successfully.",
      });
    },
  });

  const deleteNetworkMutation = useMutation({
    mutationFn: async (networkId: string) => {
      const { error } = await supabase
        .from("blockchain_networks")
        .delete()
        .eq("id", networkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockchain-networks"] });
      toast({
        title: "Network deleted",
        description: "Blockchain network has been deleted successfully.",
      });
    },
  });

  const handleSave = () => {
    if (editingNetwork) {
      updateNetworkMutation.mutate({
        ...editingNetwork,
        ...formData,
      });
      setEditingNetwork(null);
    } else {
      addNetworkMutation.mutate(formData);
    }
  };

  const startEdit = (network: BlockchainNetwork) => {
    setEditingNetwork(network);
    setFormData({
      name: network.name,
      network_type: network.network_type,
      deposit_address: network.deposit_address,
      is_enabled: network.is_enabled,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-64"></div>
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded w-48"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blockchain Manager</h1>
          <p className="text-muted-foreground">
            Manage blockchain networks and deposit addresses
          </p>
        </div>
        
        <Dialog open={isAddingNew} onOpenChange={setIsAddingNew}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Network
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Blockchain Network</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Blockchain Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., BNB Chain"
                />
              </div>
              <div>
                <Label htmlFor="network_type">Network Type</Label>
                <Input
                  id="network_type"
                  value={formData.network_type}
                  onChange={(e) => setFormData({ ...formData, network_type: e.target.value })}
                  placeholder="e.g., BEP-20"
                />
              </div>
              <div>
                <Label htmlFor="deposit_address">Deposit Address</Label>
                <Input
                  id="deposit_address"
                  value={formData.deposit_address}
                  onChange={(e) => setFormData({ ...formData, deposit_address: e.target.value })}
                  placeholder="Wallet address for deposits"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_enabled"
                  checked={formData.is_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
                />
                <Label htmlFor="is_enabled">Enable Network</Label>
              </div>
              <Button onClick={handleSave} className="w-full">
                Add Network
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blockchain Networks & Addresses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Blockchain Name</TableHead>
                <TableHead>Network Type</TableHead>
                <TableHead>Deposit Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {networks?.map((network) => (
                <TableRow key={network.id}>
                  <TableCell className="font-medium">{network.name}</TableCell>
                  <TableCell>{network.network_type}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {network.deposit_address}
                  </TableCell>
                  <TableCell>
                    <Badge variant={network.is_enabled ? "default" : "secondary"}>
                      {network.is_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(network)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Blockchain Network</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="edit-name">Blockchain Name</Label>
                              <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-network_type">Network Type</Label>
                              <Input
                                id="edit-network_type"
                                value={formData.network_type}
                                onChange={(e) => setFormData({ ...formData, network_type: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-deposit_address">Deposit Address</Label>
                              <Input
                                id="edit-deposit_address"
                                value={formData.deposit_address}
                                onChange={(e) => setFormData({ ...formData, deposit_address: e.target.value })}
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="edit-is_enabled"
                                checked={formData.is_enabled}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
                              />
                              <Label htmlFor="edit-is_enabled">Enable Network</Label>
                            </div>
                            <Button onClick={handleSave} className="w-full">
                              Update Network
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteNetworkMutation.mutate(network.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}