import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js"

// Function to download a GLB model and convert it to STL
export async function convertGlbToStl(glbUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Create a scene to load the GLB into
    const scene = new THREE.Scene()
    const loader = new GLTFLoader()

    // Load the GLB file
    loader.load(
      glbUrl,
      (gltf) => {
        try {
          // Add the model to the scene
          scene.add(gltf.scene)

          // Apply white material to all meshes
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // Create a new white material
              child.material = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.3,
                metalness: 0.1,
              })
            }
          })

          // Create STL exporter
          const exporter = new STLExporter()

          // Export the scene to STL binary format
          const stlData = exporter.parse(scene, { binary: true })

          // Create a blob from the STL data
          const blob = new Blob([stlData], { type: "application/octet-stream" })
          resolve(blob)
        } catch (error) {
          console.error("Error exporting STL:", error)
          reject(error)
        }
      },
      // Progress callback
      (xhr) => {
        console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`)
      },
      // Error callback
      (error) => {
        console.error("Error loading GLB:", error)
        reject(error)
      },
    )
  })
}

