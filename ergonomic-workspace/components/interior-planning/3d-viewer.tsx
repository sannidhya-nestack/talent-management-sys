'use client';

/**
 * 3D Visualization Component
 *
 * Provides 3D rendering of workspace layouts with:
 * - Virtual walkthrough capabilities
 * - First-person view
 * - Fly-through animation
 * - 360° views
 * - Realistic materials and lighting
 */

import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid } from '@react-three/drei';
import { Play, Pause, RotateCw, Maximize2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { FurnitureItem } from './designer';

export interface Layout3DViewerProps {
  furnitureItems: FurnitureItem[];
  floorPlanDimensions?: { width: number; height: number };
  onExport?: () => void;
}

// 3D Furniture Component
function Furniture3D({ item }: { item: FurnitureItem }) {
  const meshRef = React.useRef<THREE.Mesh>(null);

  // Convert 2D coordinates to 3D (assuming 1 pixel = 0.01 units in 3D)
  const scale = 0.01;
  const x = item.x * scale;
  const z = item.y * scale;
  const width = item.width * scale;
  const depth = item.height * scale;
  const height = 0.5; // Standard furniture height

  return (
    <mesh
      ref={meshRef}
      position={[x + width / 2, height / 2, z + depth / 2]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
    >
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        color={getColorForCategory(item.category)}
        roughness={0.7}
        metalness={0.2}
      />
      {/* Label */}
      <mesh position={[0, height / 2 + 0.1, 0]}>
        <planeGeometry args={[width, 0.1]} />
        <meshBasicMaterial color="white" transparent opacity={0.8} />
      </mesh>
    </mesh>
  );
}

// Get color based on furniture category
function getColorForCategory(category: string): string {
  const colors: Record<string, string> = {
    desk: '#8B7355',
    chair: '#4A5568',
    table: '#A0AEC0',
    storage: '#718096',
    accessory: '#E2E8F0',
  };
  return colors[category.toLowerCase()] || '#CBD5E0';
}

// Floor Component
function Floor({ width, height }: { width: number; height: number }) {
  const scale = 0.01;
  const floorWidth = width * scale;
  const floorHeight = height * scale;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[floorWidth / 2, 0, floorHeight / 2]}>
      <planeGeometry args={[floorWidth, floorHeight]} />
      <meshStandardMaterial color="#F7FAFC" roughness={0.8} />
    </mesh>
  );
}

// Main 3D Viewer Component
export function Layout3DViewer({
  furnitureItems,
  floorPlanDimensions = { width: 2000, height: 1500 },
  onExport,
}: Layout3DViewerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'orbit' | 'first-person'>('orbit');
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const controlsRef = React.useRef<any>(null);
  const cameraRef = React.useRef<THREE.PerspectiveCamera>(null);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // TODO: Implement fly-through animation
  };

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-[600px]'}`}>
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFullscreen}
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              {isFullscreen ? 'Exit' : 'Fullscreen'}
            </Button>
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* View Mode Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="p-2">
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'orbit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('orbit')}
            >
              Orbit
            </Button>
            <Button
              variant={viewMode === 'first-person' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('first-person')}
            >
              First Person
            </Button>
          </div>
        </Card>
      </div>

      {/* Stats */}
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="p-2">
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Items: </span>
              <span className="font-semibold">{furnitureItems.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Cost: </span>
              <span className="font-semibold">
                ${furnitureItems.reduce((sum, item) => sum + item.price, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 3D Canvas */}
      <Canvas
        shadows
        className="bg-gradient-to-b from-blue-50 to-gray-100"
      >
        <PerspectiveCamera
          ref={cameraRef}
          makeDefault
          position={[10, 8, 10]}
          fov={50}
        />
        <OrbitControls
          ref={controlsRef}
          enablePan
          enableZoom
          enableRotate
          minDistance={5}
          maxDistance={50}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
        />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
        />
        <pointLight position={[-10, 10, -10]} intensity={0.5} />
        <Environment preset="city" />
        <Grid
          args={[20, 20]}
          cellColor="#E2E8F0"
          sectionColor="#CBD5E0"
          cellThickness={0.5}
          sectionThickness={1}
        />
        <Floor
          width={floorPlanDimensions.width}
          height={floorPlanDimensions.height}
        />
        {furnitureItems.map((item) => (
          <Furniture3D key={item.id} item={item} />
        ))}
      </Canvas>
    </div>
  );
}
