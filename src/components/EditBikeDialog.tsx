import * as React from "react";
import { Camera, Loader2, Save } from "lucide-react";
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

export function EditBikeDialog({ bike }: { bike: Tables<"bikes"> }) {
  const [open, setOpen] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [photoPath, setPhotoPath] = React.useState<string | null>(bike.photo_path);
  const { profile } = useProfile();
  const queryClient = useQueryClient();

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    try {
      setIsUploading(true);
      const path = await uploadFile(profile.id, file, "bikes");
      setPhotoPath(path);
      toast.success("Photo updated");
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: BikeForm) => {
    try {
      await updateBike.mutateAsync({
        photo_path: photoPath,
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
        <Button variant="outline" size="sm">
          <span>Edit</span>
        </Button>
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
              ) : photoPath ? (
                <div className="text-xs text-center p-2 text-muted-foreground">Photo Ready</div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Camera className="size-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Change Photo</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handlePhotoUpload}
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
          <DialogFooter>
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
