import { useRef, useEffect, useState } from 'react';
import Toolbar from '@/components/Toolbar';
import ComponentPanel from '@/components/ComponentPanel';
import GearCanvas from '@/components/GearCanvas';
import PropertyPanel from '@/components/PropertyPanel';
import CurveChart from '@/components/CurveChart';
import { useAnimation } from '@/hooks/useAnimation';
import { useGearStore } from '@/store/useGearStore';
import type { GearType } from '@/types';

export default function Home() {
  useAnimation();

  const addGear = useGearStore((s) => s.addGear);
  const addShaft = useGearStore((s) => s.addShaft);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasCenter, setCanvasCenter] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateCenter = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        setCanvasCenter({ x: rect.width / 2, y: rect.height / 2 });
      }
    };
    updateCenter();
    window.addEventListener('resize', updateCenter);
    return () => window.removeEventListener('resize', updateCenter);
  }, []);

  const handleAddGear = (type: GearType, x: number, y: number) => {
    addGear(type, x, y);
  };

  const handleAddShaft = (x: number, y: number) => {
    addShaft(x, y);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <ComponentPanel onAddGear={handleAddGear} onAddShaft={handleAddShaft} canvasCenter={canvasCenter} />

        <div ref={canvasContainerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <GearCanvas />
          </div>
          <CurveChart />
        </div>

        <PropertyPanel />
      </div>
    </div>
  );
}
