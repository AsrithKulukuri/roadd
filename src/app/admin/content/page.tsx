"use client";

import { useEffect, useState } from "react";
import { useContentStore, TrendingLocation } from "@/stores/content-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Edit2, Plus, Trash2 } from "lucide-react";
import Image from "next/image";

export default function ContentAdminPage() {
  const { trendingLocations, isLoading, fetchTrendingLocations, addLocation, updateLocation, deleteLocation } = useContentStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TrendingLocation>>({});
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchTrendingLocations();
  }, [fetchTrendingLocations]);

  const handleEdit = (location: TrendingLocation) => {
    setEditingId(location.id!);
    setFormData(location);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formData.city || !formData.locality || !formData.image) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (isAdding) {
      await addLocation(formData as TrendingLocation);
      setIsAdding(false);
    } else if (editingId) {
      await updateLocation(editingId, formData);
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this trending location?")) {
      await deleteLocation(id);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Content Management</h1>
          <p className="text-text-secondary mt-1">Manage trending locations shown on the home page.</p>
        </div>
        <Button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ properties_count: 0 }); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-text-secondary">Loading content...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isAdding && (
            <div className="bg-bg-card border border-amber-primary/30 rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold mb-4 text-text-primary">Add New Location</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-text-secondary">City</label>
                  <Input 
                    value={formData.city || ""} 
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    placeholder="e.g. Hyderabad"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Locality</label>
                  <Input 
                    value={formData.locality || ""} 
                    onChange={e => setFormData({...formData, locality: e.target.value})}
                    placeholder="e.g. Jubilee Hills"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Image URL</label>
                  <Input 
                    value={formData.image || ""} 
                    onChange={e => setFormData({...formData, image: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Properties Count</label>
                  <Input 
                    type="number"
                    value={formData.properties_count || 0} 
                    onChange={e => setFormData({...formData, properties_count: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} className="flex-1">Save</Button>
                  <Button variant="outline" onClick={() => setIsAdding(false)} className="flex-1">Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {trendingLocations.map(location => (
            <div key={location.id} className="bg-bg-card border border-border-default rounded-xl p-5 shadow-sm flex flex-col sm:flex-row gap-4">
              <div className="relative w-full sm:w-32 h-32 rounded-lg overflow-hidden shrink-0 border border-border-default">
                <Image src={location.image} alt={location.locality} fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                {editingId === location.id ? (
                  <div className="space-y-3">
                    <Input 
                      value={formData.city || ""} 
                      onChange={e => setFormData({...formData, city: e.target.value})}
                      placeholder="City" className="h-8"
                    />
                    <Input 
                      value={formData.locality || ""} 
                      onChange={e => setFormData({...formData, locality: e.target.value})}
                      placeholder="Locality" className="h-8"
                    />
                    <Input 
                      value={formData.image || ""} 
                      onChange={e => setFormData({...formData, image: e.target.value})}
                      placeholder="Image URL" className="h-8"
                    />
                    <Input 
                      type="number"
                      value={formData.properties_count || 0} 
                      onChange={e => setFormData({...formData, properties_count: parseInt(e.target.value) || 0})}
                      placeholder="Count" className="h-8"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave} className="flex-1 h-8">Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="flex-1 h-8">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    <h3 className="font-bold text-lg text-text-primary truncate">{location.locality}</h3>
                    <p className="text-text-secondary text-sm">{location.city}</p>
                    <p className="text-text-secondary text-xs mt-1">{location.properties_count} Properties</p>
                    <div className="mt-auto pt-4 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => handleEdit(location)}>
                        <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDelete(location.id!)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
