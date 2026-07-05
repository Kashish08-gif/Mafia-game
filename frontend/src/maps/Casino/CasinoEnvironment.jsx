/**
 * CasinoEnvironment.jsx
 * Loads and positions the single, compressed casino scene GLB asset.
 * All other separate environment GLBs are removed for optimal load performance.
 */

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const CASINO_SCENE_PATH = '/models/casino/gameready_casino_scene.glb';

// Preload the new GLB
useGLTF.preload(CASINO_SCENE_PATH);

export default function CasinoEnvironment() {
  const { scene } = useGLTF(CASINO_SCENE_PATH);

  const processedScene = useMemo(() => {
    // Clone scene to avoid shared mutable state if remounted
    const clone = scene.clone();
    
    // Traverse meshes once to apply shadow mapping
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Optimize materials for standard rendering in three.js
        if (child.material) {
          child.material.roughness = Math.max(child.material.roughness || 0, 0.4);
        }
      }
    });

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    console.log('[CasinoEnvironment] Computed bounding box:', {
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z],
      size: [size.x, size.y, size.z],
      center: [center.x, center.y, center.z]
    });
    
    // Centering the mesh footprint (X, Z) and setting the floor (min Y) at Y=0
    clone.position.set(-center.x, -box.min.y, -center.z);
    
    // Create wrapper group
    const wrapper = new THREE.Group();
    wrapper.add(clone);
    
    return wrapper;
  }, [scene]);

  return (
    <primitive
      object={processedScene}
      position={[0, 0, 0]}
      scale={[0.075, 0.075, 0.075]} // Perfect scale to fit room boundaries
    />
  );
}
