import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Eye } from "lucide-react";

export function AdminContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [nftFile, setNftFile] = useState<File | null>(null);
  const [miningFile, setMiningFile] = useState<File | null>(null);

  const { data: nftImages } = useQuery({
    queryKey: ["nft-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nft_images")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: miningImages } = useQuery({
    queryKey: ["mining-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mining_token_images")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: "nft" | "mining" }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload to a placeholder URL (in real implementation, you'd upload to Supabase Storage)
      const imageUrl = `https://placeholder.com/${file.name}`;
      
      const table = type === "nft" ? "nft_images" : "mining_token_images";
      
      const { error } = await supabase
        .from(table)
        .insert([{
          image_url: imageUrl,
          uploaded_by: user.id,
        }]);

      if (error) throw error;
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: [`${type}-images`] });
      toast({
        title: "Image uploaded",
        description: `${type === "nft" ? "NFT" : "Mining token"} image has been uploaded successfully.`,
      });
    },
  });

  const activateImageMutation = useMutation({
    mutationFn: async ({ imageId, type }: { imageId: string; type: "nft" | "mining" }) => {
      const table = type === "nft" ? "nft_images" : "mining_token_images";
      
      // First deactivate all images of this type
      await supabase
        .from(table)
        .update({ is_active: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      // Then activate the selected image
      const { error } = await supabase
        .from(table)
        .update({ is_active: true })
        .eq("id", imageId);

      if (error) throw error;
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: [`${type}-images`] });
      toast({
        title: "Image activated",
        description: `${type === "nft" ? "NFT" : "Mining token"} image is now active and visible to users.`,
      });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async ({ imageId, type }: { imageId: string; type: "nft" | "mining" }) => {
      const table = type === "nft" ? "nft_images" : "mining_token_images";
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", imageId);

      if (error) throw error;
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: [`${type}-images`] });
      toast({
        title: "Image deleted",
        description: `${type === "nft" ? "NFT" : "Mining token"} image has been deleted.`,
      });
    },
  });

  const handleFileUpload = (file: File, type: "nft" | "mining") => {
    uploadImageMutation.mutate({ file, type });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
        <p className="text-muted-foreground">
          Manage NFT and mining token images displayed to users
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NFT Images Section */}
        <Card>
          <CardHeader>
            <CardTitle>NFT Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <Label htmlFor="nft-upload" className="cursor-pointer">
                <span className="text-sm font-medium">Upload NFT Image</span>
                <Input
                  id="nft-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "nft");
                  }}
                />
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, WEBP up to 10MB
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Uploaded Images</h4>
              {nftImages?.map((image) => (
                <div key={image.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">NFT Image</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(image.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {image.is_active && (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => activateImageMutation.mutate({ imageId: image.id, type: "nft" })}
                      disabled={image.is_active}
                    >
                      Activate
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteImageMutation.mutate({ imageId: image.id, type: "nft" })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mining Token Images Section */}
        <Card>
          <CardHeader>
            <CardTitle>Mining Token Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <Label htmlFor="mining-upload" className="cursor-pointer">
                <span className="text-sm font-medium">Upload Mining Token Image</span>
                <Input
                  id="mining-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "mining");
                  }}
                />
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, WEBP up to 10MB
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Uploaded Images</h4>
              {miningImages?.map((image) => (
                <div key={image.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Mining Token</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(image.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {image.is_active && (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => activateImageMutation.mutate({ imageId: image.id, type: "mining" })}
                      disabled={image.is_active}
                    >
                      Activate
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteImageMutation.mutate({ imageId: image.id, type: "mining" })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}