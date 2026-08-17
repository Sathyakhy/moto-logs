import * as React from "react";
import { Plus, Camera, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { useCreateBike } from "@/hooks/useCreateBike";
import { useProfile } from "@/hooks/useProfile";
import { uploadFile } from "@/hooks/useBikes";

type BikeForm = {
  name: string;
  model: string | null;
  year: number | null;
  plate_number: string | null;
  current_odometer: number;
  purchase_date: string | null;
};

export function AddBikeDialog() {
  const [open, setOpen] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [photoPath, setPhotoPath] = React.useState<string | null>(null);
  const { profile } = useProfile();
  const createBike = useCreateBike();
  
  const form = useForm<BikeForm>({
    defaultValues: {
      name: "",
      model: null,
      year: new Date().getFullYear(),
      plate_number: null,
      current_odometer: 0,
      purchase_date: new Date().toISOString().split("T")[0],
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    try {
      setIsUploading(true);
      const path = await uploadFile(profile.id, file, "bikes");
      setPhotoPath(path);
      toast.success("Photo uploaded");
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: BikeForm) => {
    if (!profile?.id) return;

    try {
      await createBike.mutateAsync({
        ...values,
        user_id: profile.id,
        photo_path: photoPath,
      });
      toast.success("Bike added to garage");
      setOpen(false);
      form.reset();
      setPhotoPath(null);
    } catch (error) {
      toast.error("Failed to add bike");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" />
          <span>Add Bike</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Bike</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="flex justify-center">
            <div className="relative group size-32 rounded-xl bg-secondary flex items-center justify-center overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer">
              {isUploading ? (
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              ) : photoPath ? (
                <div className="text-xs text-center p-2 text-muted-foreground">Photo ready</div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Camera className="size-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Add Photo</span>
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
            <Button type="submit" disabled={createBike.isPending}>
              {createBike.isPending ? "Adding..." : "Add to Garage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
