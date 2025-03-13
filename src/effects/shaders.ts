import {
    Scene,
    Effect,
    ShaderMaterial,
    Mesh,
    Vector3,
    Color3,
    Color4,
    Texture,
    StandardMaterial,
    Material,
    Engine
} from '@babylonjs/core';
import { Logger } from '../utils/logger';

/**
 * Manages custom shaders for the game
 */
export class ShaderManager {
    private logger: Logger;
    private scene: Scene;
    private engine: Engine;
    private shaderMaterials: Map<string, ShaderMaterial> = new Map();

    /**
     * Initialize the shader manager
     * @param scene Babylon.js scene
     */
    constructor(scene: Scene) {
        this.logger = new Logger('ShaderManager');
        this.scene = scene;
        this.engine = scene.getEngine();

        // Register custom shaders
        this.registerCustomShaders();

        this.logger.info('Shader manager initialized');
    }

    /**
     * Register all custom shaders
     */
    private registerCustomShaders(): void {
        // Ski trail shader
        this.registerSkiTrailShader();

        // Snow surface shader
        this.registerSnowSurfaceShader();

        // Energy effect shader
        this.registerEnergyEffectShader();

        // Shield effect shader
        this.registerShieldEffectShader();

        // Speed lines shader
        this.registerSpeedLinesShader();

        this.logger.debug('Custom shaders registered');
    }

    /**
     * Register ski trail shader
     */
    private registerSkiTrailShader(): void {
        // Vertex shader
        Effect.ShadersStore["skiTrailVertexShader"] = `
            precision highp float;

            // Attributes
            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;

            // Uniforms
            uniform mat4 world;
            uniform mat4 viewProjection;
            uniform float time;

            // Varying
            varying vec2 vUV;
            varying vec3 vNormal;
            varying vec3 vPosition;

            void main(void) {
                vec4 worldPosition = world * vec4(position, 1.0);
                gl_Position = viewProjection * worldPosition;
                
                vUV = uv;
                vNormal = (world * vec4(normal, 0.0)).xyz;
                vPosition = worldPosition.xyz;
            }
        `;

        // Fragment shader
        Effect.ShadersStore["skiTrailFragmentShader"] = `
            precision highp float;

            // Varying
            varying vec2 vUV;
            varying vec3 vNormal;
            varying vec3 vPosition;

            // Uniforms
            uniform float time;
            uniform vec3 trailColor;
            uniform float fadeStart;
            uniform float fadeEnd;
            uniform float trailAge;

            void main(void) {
                // Calculate fade based on trail age
                float fadeRatio = clamp((trailAge - fadeStart) / (fadeEnd - fadeStart), 0.0, 1.0);
                float alpha = 1.0 - fadeRatio;
                
                // Add some variation based on UV coordinates
                float uVariation = sin(vUV.x * 20.0 + time * 2.0) * 0.1 + 0.9;
                alpha *= uVariation;
                
                // Trail color with alpha fade
                vec4 color = vec4(trailColor, alpha);
                
                // Add a pulsing glow effect
                float pulse = sin(time * 3.0) * 0.2 + 0.8;
                color.rgb *= pulse;
                
                gl_FragColor = color;
            }
        `;
    }

    /**
     * Register snow surface shader
     */
    private registerSnowSurfaceShader(): void {
        // Vertex shader
        Effect.ShadersStore["snowSurfaceVertexShader"] = `
            precision highp float;

            // Attributes
            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;

            // Uniforms
            uniform mat4 world;
            uniform mat4 viewProjection;
            uniform float time;

            // Varying
            varying vec2 vUV;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying float vSlope;

            void main(void) {
                vec4 worldPosition = world * vec4(position, 1.0);
                gl_Position = viewProjection * worldPosition;
                
                vUV = uv;
                vNormal = (world * vec4(normal, 0.0)).xyz;
                vPosition = worldPosition.xyz;
                
                // Calculate slope angle (dot product with up vector)
                vSlope = 1.0 - dot(vNormal, vec3(0.0, 1.0, 0.0));
            }
        `;

        // Fragment shader
        Effect.ShadersStore["snowSurfaceFragmentShader"] = `
            precision highp float;

            // Varying
            varying vec2 vUV;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying float vSlope;

            // Uniforms
            uniform float time;
            uniform sampler2D snowTexture;
            uniform sampler2D iceTexture;
            uniform sampler2D rockTexture;
            uniform float skiableThreshold;
            uniform vec3 highlightColor;

            void main(void) {
                // Base snow texture with UV scaling
                vec2 snowUV = vUV * 20.0;
                vec4 snowColor = texture2D(snowTexture, snowUV);
                
                // Ice texture for steeper areas
                vec2 iceUV = vUV * 15.0;
                vec4 iceColor = texture2D(iceTexture, iceUV);
                
                // Rock texture for very steep areas
                vec2 rockUV = vUV * 10.0;
                vec4 rockColor = texture2D(rockTexture, rockUV);
                
                // Blend textures based on slope
                vec4 baseColor;
                if (vSlope > 0.8) {
                    // Very steep areas (rock)
                    baseColor = rockColor;
                } else if (vSlope > 0.3) {
                    // Medium slope areas (blend snow and rock)
                    float rockBlend = (vSlope - 0.3) / 0.5;
                    baseColor = mix(snowColor, iceColor, rockBlend);
                } else {
                    // Flat or gentle slopes (snow)
                    baseColor = snowColor;
                }
                
                // Add highlight for skiable areas
                if (vSlope > skiableThreshold && vSlope < 0.8) {
                    // Pulsing effect
                    float pulse = sin(time * 2.0) * 0.3 + 0.7;
                    
                    // Add subtle highlight
                    float highlightStrength = 0.15 * pulse;
                    baseColor.rgb = mix(baseColor.rgb, highlightColor, highlightStrength);
                }
                
                // Add some sparkle to the snow
                float sparkle = pow(sin(vUV.x * 100.0 + time) * cos(vUV.y * 100.0 + time * 0.7), 20.0);
                baseColor.rgb += vec3(sparkle * 0.2);
                
                gl_FragColor = baseColor;
            }
        `;
    }

    /**
     * Register energy effect shader
     */
    private registerEnergyEffectShader(): void {
        // Vertex shader
        Effect.ShadersStore["energyEffectVertexShader"] = `
            precision highp float;

            // Attributes
            attribute vec3 position;
            attribute vec2 uv;

            // Uniforms
            uniform mat4 world;
            uniform mat4 viewProjection;
            uniform float time;
            uniform float energyLevel;

            // Varying
            varying vec2 vUV;
            varying float vEnergyLevel;

            void main(void) {
                vec3 pos = position;
                
                // Add subtle wobble based on energy level
                float wobbleAmount = (1.0 - energyLevel) * 0.05;
                pos.x += sin(time * 10.0 + position.y * 5.0) * wobbleAmount;
                pos.y += cos(time * 8.0 + position.x * 5.0) * wobbleAmount;
                
                gl_Position = viewProjection * world * vec4(pos, 1.0);
                
                vUV = uv;
                vEnergyLevel = energyLevel;
            }
        `;

        // Fragment shader
        Effect.ShadersStore["energyEffectFragmentShader"] = `
            precision highp float;

            // Varying
            varying vec2 vUV;
            varying float vEnergyLevel;

            // Uniforms
            uniform float time;
            uniform vec3 energyColor;
            uniform vec3 lowEnergyColor;

            void main(void) {
                // Energy bar effect
                float barCutoff = 1.0 - vEnergyLevel;
                
                // Create energy bar
                float isInBar = step(vUV.x, vEnergyLevel);
                
                // Determine color based on energy level
                vec3 color;
                if (vEnergyLevel < 0.2) {
                    // Pulsing low energy
                    float pulse = sin(time * 10.0) * 0.5 + 0.5;
                    color = mix(lowEnergyColor, lowEnergyColor * 1.5, pulse);
                } else {
                    // Normal energy color
                    color = energyColor;
                }
                
                // Add flowing effect within the bar
                float flowEffect = sin(vUV.x * 20.0 - time * 5.0) * 0.1 + 0.9;
                color *= flowEffect;
                
                // Add glow at the bar edge
                float edgeGlow = smoothstep(vEnergyLevel - 0.05, vEnergyLevel, vUV.x) * 
                                 (1.0 - smoothstep(vEnergyLevel, vEnergyLevel + 0.05, vUV.x));
                color += edgeGlow * energyColor * 2.0;
                
                // Set alpha
                float alpha = isInBar;
                
                // Fade the empty part slightly
                if (alpha < 0.1) {
                    alpha = 0.2;
                    color = vec3(0.3, 0.3, 0.3);
                }
                
                gl_FragColor = vec4(color, alpha);
            }
        `;
    }

    /**
     * Register shield effect shader
     */
    private registerShieldEffectShader(): void {
        // Vertex shader
        Effect.ShadersStore["shieldEffectVertexShader"] = `
            precision highp float;

            // Attributes
            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;

            // Uniforms
            uniform mat4 world;
            uniform mat4 viewProjection;
            uniform float time;
            uniform float impactTime;
            uniform vec3 impactPoint;

            // Varying
            varying vec2 vUV;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying float vImpactEffect;

            void main(void) {
                vec4 worldPosition = world * vec4(position, 1.0);
                gl_Position = viewProjection * worldPosition;
                
                vUV = uv;
                vNormal = (world * vec4(normal, 0.0)).xyz;
                vPosition = worldPosition.xyz;
                
                // Calculate impact effect based on distance to impact point
                float impactDistance = distance(worldPosition.xyz, impactPoint);
                float impactAge = time - impactTime;
                
                // Impact wave effect
                float waveRadius = impactAge * 5.0; // Wave speed
                float waveWidth = 1.0;
                float wave = smoothstep(waveRadius - waveWidth, waveRadius, impactDistance) * 
                             (1.0 - smoothstep(waveRadius, waveRadius + waveWidth, impactDistance));
                
                // Fade the effect over time
                float fadeEffect = max(0.0, 1.0 - impactAge);
                
                vImpactEffect = wave * fadeEffect;
            }
        `;

        // Fragment shader
        Effect.ShadersStore["shieldEffectFragmentShader"] = `
            precision highp float;

            // Varying
            varying vec2 vUV;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying float vImpactEffect;

            // Uniforms
            uniform float time;
            uniform vec3 shieldColor;
            uniform float shieldAlpha;

            void main(void) {
                // Base shield effect
                vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0) - vPosition);
                float fresnel = pow(1.0 - dot(vNormal, viewDir), 2.0);
                
                // Create hexagonal pattern
                vec2 hexUV = vUV * 10.0;
                float hexPattern = 0.0;
                
                // Create flowing pattern
                float flowEffect = sin(vUV.x * 20.0 + time * 2.0) * sin(vUV.y * 20.0 + time * 3.0) * 0.1 + 0.1;
                
                // Combine effects
                vec3 color = shieldColor + vec3(flowEffect);
                
                // Add impact effect
                color += vImpactEffect * vec3(1.0, 1.0, 1.0) * 2.0;
                
                // Final alpha with fresnel
                float alpha = fresnel * shieldAlpha + vImpactEffect;
                
                gl_FragColor = vec4(color, alpha);
            }
        `;
    }

    /**
     * Register speed lines shader
     */
    private registerSpeedLinesShader(): void {
        // Vertex shader
        Effect.ShadersStore["speedLinesVertexShader"] = `
            precision highp float;

            // Attributes
            attribute vec3 position;
            attribute vec2 uv;

            // Uniforms
            uniform mat4 world;
            uniform mat4 viewProjection;
            uniform float time;
            uniform float speed;

            // Varying
            varying vec2 vUV;
            varying float vSpeed;

            void main(void) {
                gl_Position = viewProjection * world * vec4(position, 1.0);
                vUV = uv;
                vSpeed = speed;
            }
        `;

        // Fragment shader
        Effect.ShadersStore["speedLinesFragmentShader"] = `
            precision highp float;

            // Varying
            varying vec2 vUV;
            varying float vSpeed;

            // Uniforms
            uniform float time;
            uniform vec3 lineColor;

            void main(void) {
                // Calculate distance from center
                vec2 center = vec2(0.5, 0.5);
                vec2 toCenter = vUV - center;
                float dist = length(toCenter);
                
                // Direction from center
                vec2 dir = normalize(toCenter);
                
                // Adjust UV based on speed
                float speedFactor = vSpeed * 0.1;
                float angle = atan(dir.y, dir.x);
                
                // Create radial lines
                float lines = sin(angle * 20.0 + time * speedFactor * 5.0);
                lines = smoothstep(0.8, 1.0, lines);
                
                // Fade based on distance from center and speed
                float fade = 1.0 - smoothstep(0.3, 0.5, dist);
                float speedVisibility = smoothstep(0.2, 0.4, vSpeed);
                
                // Final color
                vec3 color = lineColor * lines;
                float alpha = lines * fade * speedVisibility;
                
                // Add motion blur effect
                alpha *= smoothstep(0.0, 0.1, vSpeed);
                
                gl_FragColor = vec4(color, alpha);
            }
        `;
    }

    /**
     * Create ski trail material
     * @param name Material name
     * @param color Trail color
     */
    public createSkiTrailMaterial(name: string, color: Color3): ShaderMaterial {
        const material = new ShaderMaterial(
            name,
            this.scene,
            {
                vertex: "skiTrail",
                fragment: "skiTrail",
            },
            {
                attributes: ["position", "normal", "uv"],
                uniforms: ["world", "viewProjection", "time", "trailColor", "fadeStart", "fadeEnd", "trailAge"],
                needAlphaBlending: true
            }
        );

        // Set initial values
        material.setVector3("trailColor", color);
        material.setFloat("time", 0);
        material.setFloat("fadeStart", 0.5); // When trail starts fading (seconds)
        material.setFloat("fadeEnd", 2.0);   // When trail completely disappears (seconds)
        material.setFloat("trailAge", 0);    // Current age of the trail (seconds)

        // Set some rendering properties
        material.alphaMode = Engine.ALPHA_COMBINE;
        material.backFaceCulling = false;

        // Store for later reference
        this.shaderMaterials.set(name, material);
        return material;
    }

    /**
     * Create snow surface material
     * @param name Material name
     * @param highlightColor Color for skiable areas
     * @param skiableThreshold Slope threshold for skiable surfaces
     */
    public createSnowSurfaceMaterial(
        name: string,
        highlightColor: Color3 = new Color3(0.4, 0.8, 1.0),
        skiableThreshold: number = 0.2
    ): ShaderMaterial {
        const material = new ShaderMaterial(
            name,
            this.scene,
            {
                vertex: "snowSurface",
                fragment: "snowSurface",
            },
            {
                attributes: ["position", "normal", "uv"],
                uniforms: ["world", "viewProjection", "time", "snowTexture", "iceTexture",
                    "rockTexture", "skiableThreshold", "highlightColor"]
            }
        );

        // Set initial values
        material.setVector3("highlightColor", highlightColor);
        material.setFloat("time", 0);
        material.setFloat("skiableThreshold", skiableThreshold);

        // Load textures
        const snowTexture = new Texture("textures/snow.jpg", this.scene);
        const iceTexture = new Texture("textures/ice.jpg", this.scene);
        const rockTexture = new Texture("textures/rock.jpg", this.scene);

        material.setTexture("snowTexture", snowTexture);
        material.setTexture("iceTexture", iceTexture);
        material.setTexture("rockTexture", rockTexture);

        // Store for later reference
        this.shaderMaterials.set(name, material);
        return material;
    }

    /**
     * Create energy effect material
     * @param name Material name
     * @param energyColor Color for normal energy levels
     * @param lowEnergyColor Color for low energy warning
     */
    public createEnergyEffectMaterial(
        name: string,
        energyColor: Color3 = new Color3(0.2, 0.6, 1.0),
        lowEnergyColor: Color3 = new Color3(1.0, 0.3, 0.2)
    ): ShaderMaterial {
        const material = new ShaderMaterial(
            name,
            this.scene,
            {
                vertex: "energyEffect",
                fragment: "energyEffect",
            },
            {
                attributes: ["position", "uv"],
                uniforms: ["world", "viewProjection", "time", "energyLevel", "energyColor", "lowEnergyColor"],
                needAlphaBlending: true
            }
        );

        // Set initial values
        material.setVector3("energyColor", energyColor);
        material.setVector3("lowEnergyColor", lowEnergyColor);
        material.setFloat("time", 0);
        material.setFloat("energyLevel", 1.0);

        // Set rendering properties
        material.alphaMode = Engine.ALPHA_COMBINE;
        material.backFaceCulling = false;

        // Store for later reference
        this.shaderMaterials.set(name, material);
        return material;
    }

    /**
     * Create shield effect material
     * @param name Material name
     * @param shieldColor Base color of the shield
     * @param alpha Shield transparency
     */
    public createShieldEffectMaterial(
        name: string,
        shieldColor: Color3 = new Color3(0.3, 0.7, 1.0),
        alpha: number = 0.3
    ): ShaderMaterial {
        const material = new ShaderMaterial(
            name,
            this.scene,
            {
                vertex: "shieldEffect",
                fragment: "shieldEffect",
            },
            {
                attributes: ["position", "normal", "uv"],
                uniforms: ["world", "viewProjection", "time", "impactTime", "impactPoint",
                    "shieldColor", "shieldAlpha"],
                needAlphaBlending: true
            }
        );

        // Set initial values
        material.setVector3("shieldColor", shieldColor);
        material.setFloat("shieldAlpha", alpha);
        material.setFloat("time", 0);
        material.setFloat("impactTime", -10.0); // Initially no impact
        material.setVector3("impactPoint", new Vector3(0, 0, 0));

        // Set rendering properties
        material.alphaMode = Engine.ALPHA_COMBINE;
        material.backFaceCulling = false;

        // Store for later reference
        this.shaderMaterials.set(name, material);
        return material;
    }

    /**
     * Create speed lines material
     * @param name Material name
     * @param lineColor Color of speed lines
     */
    public createSpeedLinesMaterial(
        name: string,
        lineColor: Color3 = new Color3(0.9, 0.9, 1.0)
    ): ShaderMaterial {
        const material = new ShaderMaterial(
            name,
            this.scene,
            {
                vertex: "speedLines",
                fragment: "speedLines",
            },
            {
                attributes: ["position", "uv"],
                uniforms: ["world", "viewProjection", "time", "speed", "lineColor"],
                needAlphaBlending: true
            }
        );

        // Set initial values
        material.setVector3("lineColor", lineColor);
        material.setFloat("time", 0);
        material.setFloat("speed", 0);

        // Set rendering properties
        material.alphaMode = Engine.ALPHA_COMBINE;
        material.backFaceCulling = false;

        // Store for later reference
        this.shaderMaterials.set(name, material);
        return material;
    }

    /**
     * Update shader time values
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Update global time for all shader materials
        const time = this.scene.getEngine().getTimeToken() / 1000;

        this.shaderMaterials.forEach((material) => {
            if (material.getEffect().isReady()) {
                material.setFloat("time", time);
            }
        });
    }

    /**
     * Update energy level for energy effect material
     * @param name Material name
     * @param energyLevel Current energy level (0-1)
     */
    public updateEnergyLevel(name: string, energyLevel: number): void {
        const material = this.shaderMaterials.get(name);
        if (material && material.getEffect().isReady()) {
            material.setFloat("energyLevel", Math.max(0, Math.min(1, energyLevel)));
        }
    }

    /**
     * Register a shield impact effect
     * @param name Material name
     * @param impactPoint World position of impact
     */
    public registerShieldImpact(name: string, impactPoint: Vector3): void {
        const material = this.shaderMaterials.get(name);
        if (material && material.getEffect().isReady()) {
            const time = this.scene.getEngine().getTimeToken() / 1000;
            material.setFloat("impactTime", time);
            material.setVector3("impactPoint", impactPoint);
        }
    }

    /**
     * Update speed for speed lines material
     * @param name Material name
     * @param speed Current speed value
     */
    public updateSpeed(name: string, speed: number): void {
        const material = this.shaderMaterials.get(name);
        if (material && material.getEffect().isReady()) {
            material.setFloat("speed", speed);
        }
    }

    /**
     * Update trail age for ski trail material
     * @param name Material name
     * @param age Current age of the trail in seconds
     */
    public updateTrailAge(name: string, age: number): void {
        const material = this.shaderMaterials.get(name);
        if (material && material.getEffect().isReady()) {
            material.setFloat("trailAge", age);
        }
    }

    /**
     * Get a shader material by name
     * @param name Material name
     */
    public getMaterial(name: string): ShaderMaterial | undefined {
        return this.shaderMaterials.get(name);
    }

    /**
     * Apply a shader material to a mesh
     * @param mesh Target mesh
     * @param materialName Name of the shader material
     */
    public applyToMesh(mesh: Mesh, materialName: string): void {
        const material = this.shaderMaterials.get(materialName);
        if (material) {
            mesh.material = material;
        } else {
            this.logger.warn(`Shader material ${materialName} not found`);
        }
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Dispose all shader materials
        this.shaderMaterials.forEach((material) => {
            material.dispose();
        });

        this.shaderMaterials.clear();
        this.logger.debug('Shader manager disposed');
    }
}
