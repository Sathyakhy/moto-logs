import * as React from "react";
import { Camera, Loader2, Save, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { uploadFile } from "@/hooks/useBikes";
import type { Tables } from "@/integrations/supabase/types";

type BikeForm = {
  name: string;
  model: string | null | undefined;
  year: number | null | undefined;
  plate_number: string | null | undefined;
  current_odometer: number;
  purchase_date: string | null | undefined;
};

export function EditBikeDialog({ bike, trigger }: { bike: Tables<"bikes">; trigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [photoPath, setPhotoPath] = React.useState<string | null>(bike.photo_path);
  const [photosPaths, setPhotosPaths] = React.useState<string[]>(bike.photos_paths || []);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const deleteBike = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bikes").delete().eq("id", bike.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bike deleted");
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
      navigate({ to: "/bikes" });
    },
    onError: () => {
      toast.error("Failed to delete bike");
    },
  });

  const updateBike = useMutation({
    mutationFn: async (values: Partial<Tables<"bikes">>) => {
      const { data, error } = await supabase
        .from("bikes")
        .update(values)
        .eq("id", bike.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bike", bike.id] });
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
    },
  });

  const form = useForm<BikeForm>({
    defaultValues: {
      name: bike.name,
      model: bike.model,
      year: bike.year,
      plate_number: bike.plate_number,
      current_odometer: bike.current_odometer,
      purchase_date: bike.purchase_date ? new Date(bike.purchase_date).toISOString().split("T")[0] : null,
    },
  });

  const handlePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !profile?.id) return;

    try {
      setIsUploading(true);
      const newPaths: string[] = [];
      for (const file of Array.from(files).slice(0, 8)) {
        const path = await uploadFile(profile.id, file, "bikes");
        newPaths.push(path);
      }
      setPhotosPaths(newPaths);
      if (newPaths.length > 0) setPhotoPath(newPaths[0] || null);
      toast.success(`${newPaths.length} photos uploaded for 360 view`);
    } catch (error) {
      toast.error("Failed to upload photos");
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: BikeForm) => {
    try {
      await updateBike.mutateAsync({
        photo_path: photoPath,
        photos_paths: photosPaths,
        name: values.name,
        model: values.model ?? null,
        year: values.year ?? null,
        plate_number: values.plate_number ?? null,
        current_odometer: values.current_odometer,
        purchase_date: values.purchase_date ?? null,
      });
      toast.success("Bike updated");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to update bike");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <span>Edit</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Bike</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="flex justify-center">
            <div className="relative group size-32 rounded-xl bg-secondary flex items-center justify-center overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer">
              {isUploading ? (
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              ) : photosPaths.length > 0 ? (
                <div className="text-xs text-center p-2 text-muted-foreground">{photosPaths.length} Photos Ready</div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Camera className="size-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground text-center">Change 360 Photos<br/>(Up to 8)</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handlePhotosUpload}
                disabled={isUploading}
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="name">Nickname</Label>
            <Input id="name" {...form.register("name", { required: true })} placeholder="e.g. My Scooter" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" {...form.register("model")} placeholder="e.g. PCX 160" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="year">Year</Label>
              <Input id="year" type="number" {...form.register("year", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="plate">Plate Number</Label>
              <Input id="plate" {...form.register("plate_number")} placeholder="1AA-0000" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="odometer">Odometer (km)</Label>
              <Input id="odometer" type="number" {...form.register("current_odometer", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="purchase_date">Purchase Date</Label>
            <Input id="purchase_date" type="date" {...form.register("purchase_date")} />
          </div>
          <DialogFooter className="flex-row sm:justify-between items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Motorcycle</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {bike.name}? This action cannot be undone and all maintenance records will be lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteBike.mutate()}
                    disabled={deleteBike.isPending}
                  >
                    {deleteBike.isPending ? "Deleting..." : "Delete Bike"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button type="submit" className="gap-2" disabled={updateBike.isPending}>
              {updateBike.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {updateBike.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
