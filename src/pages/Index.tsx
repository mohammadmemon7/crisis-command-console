import { Sidebar } from "@/components/dashboard/Sidebar";
import { MapArea } from "@/components/dashboard/MapArea";

const Index = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <MapArea />
    </div>
  );
};

export default Index;
