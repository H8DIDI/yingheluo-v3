 import * as THREE from 'three';
        import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
        import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
        import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
        import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
// --- DEEP BASS AUDIO ENGINE ---
        const AudioSys = {
            ctx: null,
            enabled: false,
            volume: 0.6,
            limiter: null,

            init: function() {
                if (!this.ctx) {
                    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                    this.limiter = this.ctx.createDynamicsCompressor();
                    this.limiter.threshold.value = -10;
                    this.limiter.knee.value = 40;
                    this.limiter.ratio.value = 12;
                    this.limiter.connect(this.ctx.destination);
                    this.enabled = true;
                }
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
            },

            playDeepExplosion: function() {
                if (!this.enabled || !this.ctx) return;
                const t = this.ctx.currentTime;
                
                // --- 1. SUB-BASS KICK ---
                const osc = this.ctx.createOscillator();
                const oscGain = this.ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(50, t);
                osc.frequency.exponentialRampToValueAtTime(20, t + 2.5);
                
                oscGain.gain.setValueAtTime(this.volume * 1.5, t);
                oscGain.gain.exponentialRampToValueAtTime(0.01, t + 5.0); 

                osc.connect(oscGain);
                oscGain.connect(this.limiter);
                osc.start(t);
                
         
                osc.stop(t + 5.0); 

         
                const bufferSize = this.ctx.sampleRate * 5.0; 
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const noiseFilter = this.ctx.createBiquadFilter();
                noiseFilter.type = 'lowpass';
                noiseFilter.frequency.setValueAtTime(150, t);
                noiseFilter.frequency.exponentialRampToValueAtTime(30, t + 4.0);

                const noiseGain = this.ctx.createGain();
                noiseGain.gain.setValueAtTime(this.volume * 1.0, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 4.5);

                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(this.limiter);
                noise.start(t);

               
                const crack = this.ctx.createOscillator();
                crack.type = 'triangle';
                const crackGain = this.ctx.createGain();
                crack.frequency.setValueAtTime(200, t);
                crack.frequency.exponentialRampToValueAtTime(50, t + 0.1);
                crackGain.gain.setValueAtTime(this.volume * 0.3, t);
                crackGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                crack.connect(crackGain);
                crackGain.connect(this.limiter);
                crack.start(t);
                crack.stop(t + 0.1);
            }
        };

        // --- SPRITE GENERATOR ---
        function getSprite() {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const context = canvas.getContext('2d');
            const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(0.3, 'rgba(255,255,255,0.9)');
            gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            context.fillStyle = gradient;
            context.fillRect(0, 0, 32, 32);
            return new THREE.CanvasTexture(canvas);
        }
        const particleSprite = getSprite();

        // --- CONFIG ---
        const CONFIG = {
            particleCount: 23000,
            particleSize: 0.8,
            fadeSpeed: 0.00482,
            explosionForce: 3.3975,
            hoverDuration: 1.5,
            gravity: 0.00265,
            friction: 0.95494,
            spreadFall: 0,
            rocketSpeed: 1.0,
            rocketSize: 2.0,
            bloomStrength: 1.495,
            bloomRadius: 0.5,
            trailOpacity: 0.39707,
            autoLaunch: true,
            launchInterval: 3856.5,
            soundEnabled: true,
            volume: 0.5
        };

        // --- SCENE ---
        const container = document.getElementById('canvas-container');
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.002); 

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 4000);
        camera.position.set(0, 0, 150);

        const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.autoClearColor = false;
        container.appendChild(renderer.domElement);

        // --- POST-PROCESSING ---
        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            CONFIG.bloomStrength, CONFIG.bloomRadius, 0.0
        );
        const composer = new EffectComposer(renderer);
        composer.addPass(renderScene);
        composer.addPass(bloomPass);

        // --- BACKGROUND ---
        const starsGeo = new THREE.BufferGeometry();
        const starsCnt = 3000;
        const sPos = new Float32Array(starsCnt * 3);
        for(let i=0; i<starsCnt*3; i++) sPos[i] = (Math.random() - 0.5) * 1200;
        starsGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
        const starsMat = new THREE.PointsMaterial({ 
            size: 1.5, color: 0x888888, map: particleSprite,
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
        });
        scene.add(new THREE.Points(starsGeo, starsMat));

        const fadeMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000, transparent: true, opacity: CONFIG.trailOpacity
        });
        const fullScreenQuad = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), fadeMaterial);
        fullScreenQuad.position.z = camera.position.z - 50;
        fullScreenQuad.lookAt(camera.position);
        scene.add(fullScreenQuad);

        // --- GUI ---
        const gui = new GUI({ title: 'Settings' });
        const fParticles = gui.addFolder('Particles');
        fParticles.add(CONFIG, 'particleCount', 1000, 30000, 100);
        fParticles.add(CONFIG, 'particleSize', 0.1, 2.0);
        fParticles.add(CONFIG, 'fadeSpeed', 0.001, 0.02);
        const fPhysics = gui.addFolder('Physics');
        fPhysics.add(CONFIG, 'explosionForce', 0.5, 5.0);
        fPhysics.add(CONFIG, 'hoverDuration', 0.0, 5.0);
        fPhysics.add(CONFIG, 'gravity', 0.0, 0.02);
        const fAudio = gui.addFolder('Deep Audio');
        fAudio.add(CONFIG, 'soundEnabled');
        fAudio.add(CONFIG, 'volume', 0.0, 1.0).onChange(v => AudioSys.volume = v);

        // --- FIREWORK CLASS ---
        class Firework {
            constructor(startX) {
                this.isDead = false;
                this.phase = 'rocket';
                this.timer = 0;
                
                // --- COLOR LOGIC (Mono, Bi, Tri) ---
                const rand = Math.random();
                const baseHue = Math.random();
                this.colors = [];

                if (rand < 0.33) {
                    // MONO (1 Color)
                    this.colors.push(new THREE.Color().setHSL(baseHue, 1.0, 0.6));
                } else if (rand < 0.66) {
                    // DUAL (2 Colors - Complementary)
                    this.colors.push(new THREE.Color().setHSL(baseHue, 1.0, 0.6));
                    this.colors.push(new THREE.Color().setHSL((baseHue + 0.5) % 1.0, 1.0, 0.5));
                } else {
                    // TRI (3 Colors - Triad)
                    this.colors.push(new THREE.Color().setHSL(baseHue, 1.0, 0.6));
                    this.colors.push(new THREE.Color().setHSL((baseHue + 0.33) % 1.0, 1.0, 0.6));
                    this.colors.push(new THREE.Color().setHSL((baseHue + 0.66) % 1.0, 1.0, 0.6));
                }

                this.pos = new THREE.Vector3(startX, -80, (Math.random()-0.5)*50);
                this.vel = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5, 
                    CONFIG.rocketSpeed * (0.9 + Math.random() * 0.3),
                    (Math.random() - 0.5) * 0.5
                );
                this.targetY = -10 + Math.random() * 30;

                const geo = new THREE.BufferGeometry();
                geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos.toArray(), 3));
                this.rocketMesh = new THREE.Points(geo, new THREE.PointsMaterial({
                    size: CONFIG.rocketSize, 
                    color: this.colors[0], // Use first color for rocket
                    map: particleSprite,
                    transparent: true,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending
                }));
                scene.add(this.rocketMesh);
            }

            update(dt) {
                if (this.sparkSystem) this.sparkSystem.material.size = CONFIG.particleSize;
                if (this.rocketMesh) this.rocketMesh.material.size = CONFIG.rocketSize;

                if (this.phase === 'rocket') {
                    this.pos.add(this.vel);
                    this.vel.y *= 0.99;
                    this.rocketMesh.geometry.attributes.position.setXYZ(0, this.pos.x, this.pos.y, this.pos.z);
                    this.rocketMesh.geometry.attributes.position.needsUpdate = true;
                    if (this.vel.y < 0.2 || this.pos.y >= this.targetY) this.explode();
                } 
                else {
                    this.timer += dt;
                    const positions = this.sparkSystem.geometry.attributes.position.array;
                    const colors = this.sparkSystem.geometry.attributes.color.array;
                    let aliveCount = 0;
                    const isHovering = this.timer < CONFIG.hoverDuration;
                    const gravityFactor = THREE.MathUtils.smoothstep(this.timer, CONFIG.hoverDuration, CONFIG.hoverDuration + 0.5);

                    for(let i=0; i < this.currentParticleCount; i++) {
                        if (this.lifetimes[i] > 0) {
                            aliveCount++;
                            const i3 = i*3;
                            positions[i3]   += this.velocities[i3];
                            positions[i3+1] += this.velocities[i3+1];
                            positions[i3+2] += this.velocities[i3+2];

                            if (isHovering) {
                                this.velocities[i3]   *= CONFIG.friction;
                                this.velocities[i3+1] *= CONFIG.friction;
                                this.velocities[i3+2] *= CONFIG.friction;
                            } else {
                                this.velocities[i3+1] -= CONFIG.gravity * gravityFactor;
                                this.velocities[i3]   *= 0.98;
                                this.velocities[i3+1] *= 0.98;
                                this.velocities[i3+2] *= 0.98;
                                this.lifetimes[i] -= CONFIG.fadeSpeed; 
                            }
                            
                            const alpha = Math.max(0, this.lifetimes[i]);
                            colors[i3]   = this.baseColors[i3] * alpha * 1.5;
                            colors[i3+1] = this.baseColors[i3+1] * alpha * 1.5;
                            colors[i3+2] = this.baseColors[i3+2] * alpha * 1.5;
                        }
                    }
                    this.sparkSystem.geometry.attributes.position.needsUpdate = true;
                    this.sparkSystem.geometry.attributes.color.needsUpdate = true;
                    if (aliveCount === 0) this.cleanup();
                }
            }

            explode() {
                if (CONFIG.soundEnabled) AudioSys.playDeepExplosion();
                scene.remove(this.rocketMesh);
                this.phase = 'explode';
                this.timer = 0;
                this.currentParticleCount = CONFIG.particleCount;

                const geo = new THREE.BufferGeometry();
                const positions = new Float32Array(this.currentParticleCount * 3);
                const colors = new Float32Array(this.currentParticleCount * 3);
                this.baseColors = new Float32Array(this.currentParticleCount * 3);
                this.velocities = new Float32Array(this.currentParticleCount * 3);
                this.lifetimes = new Float32Array(this.currentParticleCount);

                const baseSpeed = CONFIG.explosionForce * (0.8 + Math.random() * 0.4);

                for(let i=0; i<this.currentParticleCount; i++) {
                    const i3 = i*3;
                    positions[i3] = this.pos.x; positions[i3+1] = this.pos.y; positions[i3+2] = this.pos.z;

                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    const speed = baseSpeed * (0.8 + Math.random() * 0.4);

                    this.velocities[i3]   = speed * Math.sin(phi) * Math.cos(theta);
                    this.velocities[i3+1] = speed * Math.sin(phi) * Math.sin(theta);
                    this.velocities[i3+2] = speed * Math.cos(phi);

                    // --- COLOR SELECTION & BRIGHTNESS VARIATION ---
                    // Pick one of the generated colors for this particle
                    const targetColor = this.colors[Math.floor(Math.random() * this.colors.length)];
                    
                    // Vary brightness (0.5 to 1.3) to create depth
                    const brightness = 0.5 + Math.random() * 0.8; 

                    this.baseColors[i3]   = targetColor.r * brightness;
                    this.baseColors[i3+1] = targetColor.g * brightness;
                    this.baseColors[i3+2] = targetColor.b * brightness;
                    
                    colors[i3] = this.baseColors[i3]; 
                    colors[i3+1] = this.baseColors[i3+1]; 
                    colors[i3+2] = this.baseColors[i3+2];
                    
                    this.lifetimes[i] = 1.0;
                }

                geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

                this.sparkSystem = new THREE.Points(geo, new THREE.PointsMaterial({
                    size: CONFIG.particleSize, 
                    map: particleSprite,
                    transparent: true,
                    depthWrite: false,
                    vertexColors: true, 
                    blending: THREE.AdditiveBlending
                }));
                scene.add(this.sparkSystem);
            }

            cleanup() {
                this.isDead = true;
                if(this.sparkSystem) {
                    scene.remove(this.sparkSystem);
                    this.sparkSystem.geometry.dispose();
                    this.sparkSystem.material.dispose();
                }
                if(this.rocketMesh) { 
                    scene.remove(this.rocketMesh);
                    this.rocketMesh.geometry.dispose();
                    this.rocketMesh.material.dispose();
                }
            }
        }

        // --- LOOP ---
        const fireworks = [];
        let lastLaunchTime = 0;
        let nextLaunchDelay = 0;

        function launchFirework() {
            const x = (Math.random() - 0.5) * 150;
            fireworks.push(new Firework(x));
        }

        function updateQueue(time) {
            if (!CONFIG.autoLaunch) return;
            if (time - lastLaunchTime > nextLaunchDelay) {
                lastLaunchTime = time;
                nextLaunchDelay = CONFIG.launchInterval + (Math.random() * 1000);
                launchFirework();
            }
        }

        const clock = new THREE.Clock();

        function animate() {
            requestAnimationFrame(animate);
            const dt = clock.getDelta();
            updateQueue(performance.now());
            for (let i = fireworks.length - 1; i >= 0; i--) {
                const fw = fireworks[i];
                fw.update(dt);
                if (fw.isDead) fireworks.splice(i, 1);
            }
            composer.render();
        }

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            bloomPass.resolution.set(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        });

        // Overlay & Audio Init
        const overlay = document.getElementById('overlay');
        overlay.addEventListener('click', () => {
            AudioSys.init();
            overlay.style.display = 'none';
            launchFirework();
        });

        animate();