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
  model: string | null | undefined;
  year: number | null | undefined;
  plate_number: string | null | undefined;
  current_odometer: number;
  purchase_date: string | null | undefined;
};

export function AddBikeDialog() {
  const [open, setOpen] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [photosPaths, setPhotosPaths] = React.useState<string[]>([]);
  const [previews, setPreviews] = React.useState<string[]>([]);
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

  const handlePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !profile?.id) return;

    try {
      setIsUploading(true);
      
      // Create local previews for instant feedback
      const localPreviews = Array.from(files).slice(0, 8).map(file => URL.createObjectURL(file));
      setPreviews(localPreviews);

      const newPaths: string[] = [];
      for (const file of Array.from(files).slice(0, 8)) {
        const path = await uploadFile(profile.id, file, "bikes");
        newPaths.push(path);
      }
      setPhotosPaths(newPaths);
      toast.success(`${newPaths.length} photos uploaded for 360 view`);
    } catch (error) {
      toast.error("Failed to upload photos");
      setPreviews([]);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: BikeForm) => {
    if (!profile?.id) return;

    try {
      await createBike.mutateAsync({
        user_id: profile.id,
        photo_path: photosPaths[0] || null,
        photos_paths: photosPaths,
        name: values.name,
        model: values.model ?? null,
        year: values.year ?? null,
        plate_number: values.plate_number ?? null,
        current_odometer: values.current_odometer,
        purchase_date: values.purchase_date ?? null,
      });
      toast.success("Bike added to garage");
      setOpen(false);
      form.reset();
      setPhotosPaths([]);
      setPreviews([]);
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
              ) : photosPaths.length > 0 ? (
                <div className="size-full flex flex-wrap gap-1 p-1">
                  {previews.map((src, i) => (
                    <img key={i} src={src} alt="preview" className="size-[calc(50%-4px)] object-cover rounded-md" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Camera className="size-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground text-center">Add 360 Photos<br/>(Up to 8)</span>
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
