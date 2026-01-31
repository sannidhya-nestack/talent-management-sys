'use client';

/**
 * Interactive Layout Designer Component
 *
 * Provides drag-and-drop interface for furniture placement with:
 * - Product catalog integration
 * - Real-time space utilization calculations
 * - Collision detection
 * - Snap-to-grid functionality
 */

import * as React from 'react';
import { Search, Grid, Maximize2, Minimize2, RotateCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { ProductListItem } from '@/lib/services/products';

export interface FurnitureItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  price: number;
}

export interface LayoutDesignerProps {
  layoutId: string;
  floorPlanUrl?: string | null;
  initialItems?: FurnitureItem[];
  onSave?: (items: FurnitureItem[]) => Promise<void>;
}

const GRID_SIZE = 20; // pixels per grid cell
const SNAP_THRESHOLD = 10; // pixels

export function LayoutDesigner({
  layoutId,
  floorPlanUrl,
  initialItems = [],
  onSave,
}: LayoutDesignerProps) {
  const { toast } = useToast();
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [products, setProducts] = React.useState<ProductListItem[]>([]);
  const [filteredProducts, setFilteredProducts] = React.useState<ProductListItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [items, setItems] = React.useState<FurnitureItem[]>(initialItems);
  const [draggedProduct, setDraggedProduct] = React.useState<ProductListItem | null>(null);
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Fetch products
  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products?limit=100&activeOnly=true');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data.products || []);
        setFilteredProducts(data.products || []);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: 'Error',
          description: 'Failed to load products',
          variant: 'destructive',
        });
      }
    };
    fetchProducts();
  }, [toast]);

  // Filter products
  React.useEffect(() => {
    let filtered = products;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.manufacturer?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory]);

  // Get unique categories
  const categories = React.useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return Array.from(cats).sort();
  }, [products]);

  // Calculate space utilization
  const spaceUtilization = React.useMemo(() => {
    if (!canvasRef.current) return { used: 0, total: 0, percentage: 0 };
    const canvas = canvasRef.current;
    const totalArea = canvas.clientWidth * canvas.clientHeight;
    const usedArea = items.reduce((sum, item) => sum + item.width * item.height, 0);
    return {
      used: usedArea,
      total: totalArea,
      percentage: totalArea > 0 ? Math.round((usedArea / totalArea) * 100) : 0,
    };
  }, [items]);

  // Check for collisions
  const checkCollision = (item: FurnitureItem, excludeId?: string): boolean => {
    return items.some((existing) => {
      if (excludeId && existing.id === excludeId) return false;
      return !(
        item.x + item.width < existing.x ||
        item.x > existing.x + existing.width ||
        item.y + item.height < existing.y ||
        item.y > existing.y + existing.height
      );
    });
  };

  // Snap to grid
  const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  // Handle product drag start
  const handleProductDragStart = (e: React.DragEvent, product: ProductListItem) => {
    setDraggedProduct(product);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Handle canvas drop
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedProduct || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = snapToGrid(e.clientX - rect.left);
    const y = snapToGrid(e.clientY - rect.top);

    // Default dimensions (can be enhanced with product specs)
    const width = 120;
    const height = 80;

    const newItem: FurnitureItem = {
      id: `item-${Date.now()}`,
      productId: draggedProduct.id,
      productName: draggedProduct.name,
      category: draggedProduct.category,
      x: Math.max(0, x),
      y: Math.max(0, y),
      width,
      height,
      rotation: 0,
      price: draggedProduct.price,
    };

    // Check boundaries
    if (newItem.x + newItem.width > canvas.clientWidth) {
      newItem.x = canvas.clientWidth - newItem.width;
    }
    if (newItem.y + newItem.height > canvas.clientHeight) {
      newItem.y = canvas.clientHeight - newItem.height;
    }

    // Check for collisions
    if (checkCollision(newItem)) {
      toast({
        title: 'Collision Detected',
        description: 'Cannot place item here. It overlaps with another item.',
        variant: 'destructive',
      });
      return;
    }

    setItems([...items, newItem]);
    setDraggedProduct(null);
  };

  // Handle canvas drag over
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Handle item drag start
  const handleItemDragStart = (e: React.DragEvent, item: FurnitureItem) => {
    setSelectedItem(item.id);
    setIsDragging(true);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle item drop
  const handleItemDrop = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = snapToGrid(e.clientX - rect.left - dragOffset.x);
    const y = snapToGrid(e.clientY - rect.top - dragOffset.y);

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newX = Math.max(0, Math.min(x, canvas.clientWidth - item.width));
          const newY = Math.max(0, Math.min(y, canvas.clientHeight - item.height));

          // Check for collisions
          const movedItem = { ...item, x: newX, y: newY };
          if (checkCollision(movedItem, itemId)) {
            toast({
              title: 'Collision Detected',
              description: 'Cannot move item here. It overlaps with another item.',
              variant: 'destructive',
            });
            return item;
          }

          return movedItem;
        }
        return item;
      })
    );

    setIsDragging(false);
    setSelectedItem(null);
  };

  // Handle item delete
  const handleItemDelete = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    if (selectedItem === itemId) {
      setSelectedItem(null);
    }
  };

  // Handle item rotate
  const handleItemRotate = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return { ...item, rotation: (item.rotation + 90) % 360 };
        }
        return item;
      })
    );
  };

  // Handle save
  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(items);
      toast({
        title: 'Success',
        description: 'Layout saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save layout',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate total cost
  const totalCost = React.useMemo(() => {
    return items.reduce((sum, item) => sum + item.price, 0);
  }, [items]);

  return (
    <div className={`flex h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Product Catalog Sidebar */}
      <div className="w-80 border-r bg-muted/50 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold mb-3">Product Catalog</h3>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {filteredProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No products found
              </p>
            ) : (
              filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-move hover:border-primary transition-colors"
                  draggable
                  onDragStart={(e) => handleProductDragStart(e, product)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{product.name}</h4>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                        <p className="text-xs font-semibold mt-1">${product.price.toLocaleString()}</p>
                      </div>
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
            >
              <Grid className="h-4 w-4 mr-2" />
              {showGrid ? 'Hide Grid' : 'Show Grid'}
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="text-sm">
              <span className="text-muted-foreground">Space Utilization: </span>
              <span className="font-semibold">{spaceUtilization.percentage}%</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Total Cost: </span>
              <span className="font-semibold">${totalCost.toLocaleString()}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Items: </span>
              <span className="font-semibold">{items.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4 mr-2" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Fullscreen
                </>
              )}
            </Button>
            {onSave && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Layout'}
              </Button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-auto bg-muted/20">
          <div
            ref={canvasRef}
            className="relative w-full h-full min-h-[600px]"
            onDrop={handleCanvasDrop}
            onDragOver={handleCanvasDragOver}
            style={{
              backgroundImage: showGrid
                ? `linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                   linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)`
                : 'none',
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            }}
          >
            {/* Floor Plan Background */}
            {floorPlanUrl && (
              <img
                src={floorPlanUrl}
                alt="Floor Plan"
                className="absolute inset-0 w-full h-full object-contain opacity-30"
              />
            )}

            {/* Furniture Items */}
            {items.map((item) => (
              <div
                key={item.id}
                className={`absolute border-2 rounded cursor-move transition-all ${
                  selectedItem === item.id
                    ? 'border-primary shadow-lg z-10'
                    : 'border-border hover:border-primary/50 z-0'
                }`}
                style={{
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  width: `${item.width}px`,
                  height: `${item.height}px`,
                  transform: `rotate(${item.rotation}deg)`,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                }}
                draggable
                onDragStart={(e) => handleItemDragStart(e, item)}
                onDrop={(e) => handleItemDrop(e, item.id)}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => setSelectedItem(item.id === selectedItem ? null : item.id)}
              >
                <div className="p-2 h-full flex flex-col justify-between">
                  <div className="text-xs font-medium truncate">{item.productName}</div>
                  <div className="flex items-center justify-between mt-auto">
                    <Badge variant="secondary" className="text-xs">
                      ${item.price.toLocaleString()}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemRotate(item.id);
                        }}
                      >
                        <RotateCw className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemDelete(item.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
