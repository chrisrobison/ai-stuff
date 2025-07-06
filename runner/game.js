import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

let scene, camera, renderer;
let player, ground;
let obstacles = [];
let speed = 0.1;
let isJumping = false;
let velocity = 0;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Player (Cube)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    player = new THREE.Mesh(geometry, material);
    player.position.set(0, 1, 0);
    scene.add(player);

    // Ground
    const groundGeometry = new THREE.BoxGeometry(10, 1, 100);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.set(0, -0.5, -50);
    scene.add(ground);

    camera.position.set(0, 2, 5);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', onWindowResize);

    spawnObstacles();
    animate();
}

function handleKeyDown(event) {
    if (event.code === 'Space' && !isJumping) {
        isJumping = true;
        velocity = 0.2;
    }
}

function spawnObstacles() {
    for (let i = 0; i < 10; i++) {
        let obstacleGeo = new THREE.BoxGeometry(1, 1, 1);
        let obstacleMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        let obstacle = new THREE.Mesh(obstacleGeo, obstacleMat);
        obstacle.position.set((Math.random() > 0.5 ? 1.5 : -1.5), 0.5, -10 - i * 10);
        scene.add(obstacle);
        obstacles.push(obstacle);
    }
}

function checkCollisions() {
    for (let obs of obstacles) {
        if (
            Math.abs(player.position.x - obs.position.x) < 1 &&
            Math.abs(player.position.z - obs.position.z) < 1 &&
            player.position.y < 1.5
        ) {
            alert('Game Over!');
            window.location.reload();
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    // Move obstacles & reset if out of bounds
    obstacles.forEach(obs => {
        obs.position.z += speed;
        if (obs.position.z > 5) {
            obs.position.z = -50;
            obs.position.x = (Math.random() > 0.5 ? 1.5 : -1.5);
        }
    });

    // Handle jumping physics
    if (isJumping) {
        player.position.y += velocity;
        velocity -= 0.01;
        if (player.position.y <= 1) {
            player.position.y = 1;
            isJumping = false;
        }
    }

    checkCollisions();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
