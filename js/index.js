// scene container element ------------------------------------------------------------------------
var container = document.getElementById('container');

// THREE objects  ---------------------------------------------------------------------------------
var camera, scene, renderer;
var sceneW, sceneH;
var physicsMaterial;
var ball;
var controls;

var config = {
    simulationEnabled: true,
    showControls: false,
    showAxis: true,
    showHitPlane: false,
    showBumperPlanes: false,
    spinBallOnHit: true,
    sceneWidth: 2000,
    sceneDepth: 10000,        
    gravityY: -700,
    gravityZ: 00,
    groundZ: -900,
    groundFriction: 1.5,
    camX: 0,
    camY: 800,
    camZ: 1500,
    camLookY: 500,
    camLookZ: -1000,
    ballSize: 32,
    ballX: 0,
    ballY: 500,
    ballZ: 800,
    ballIdleRotation: Math.PI / 15,
    ballScale: 1,
    speedX: 100,
    speedY: 1000,
    speedZ: -1000
};

var ballState = {
    simulationRunning: false
};

// initialize the physics demo --------------------------------------------------------------------
function init() {
    // store scene dimensions
    sceneW = container.offsetWidth;
    sceneH = container.offsetHeight;

    // build the 3d world
    buildPhysicsScene();
    buildRenderer();
    buildCamera();
    buildLights();
    if (config.showControls) buildControls();  //screws up camera.lookAt
    if (config.showAxis) buildAxis();

    buildGroundPlane();
    if (config.showHitPlane) buildHitPlane();
    buildPokemonChar();

    buildBall();
}

// build the Physijs scene, which takes the place of a THREE scene --------------------------------
var buildPhysicsScene = function() {
    // lean about Physi.js basic setup here: https://github.com/chandlerprall/Physijs/wiki/Basic-Setup
    // set the path of the web worker javascripts
    Physijs.scripts.worker = './js/physijs_worker.js';
    Physijs.scripts.ammo = 'ammo.js'; // must be relative to physijs_worker.js

    // init the scene
    scene = new Physijs.Scene({reportsize: 50, fixedTimeStep: 1 / 60});
    scene.setGravity(new THREE.Vector3( 0, config.gravityY, config.gravityZ ));
};

// build the WebGL renderer -----------------------------------------------------------------------
var buildRenderer = function() {
    renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
    renderer.setSize( sceneW, sceneH );
    //renderer.setClearColor(new THREE.Color(0xCCFFFF,1.0));
    renderer.shadowMap.enabled = true;
    container.appendChild( renderer.domElement );
};

// build the THREE camera -------------------------------------------------------------------------
var buildCamera = function() {
    camera = new THREE.PerspectiveCamera( 45, sceneW / sceneH, 1, 10000 );
    
    // move camera up and back, and point it down at the center of the 3d scene        
    camera.position.x = config.camX;
    camera.position.y = config.camY;
    camera.position.z = config.camZ;

    //camera.rotation.y = Math.PI / 2;
    camera.lookAt(new THREE.Vector3(0,config.camLookY,config.camLookZ));
};

// add an ambient light and a spot light for shadowing --------------------------------------------
var buildLights = function() {
    scene.add( new THREE.AmbientLight( 0x555555) );
    var light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
    scene.add(light);
};

var buildControls = function() {       
    controls = new THREE.OrbitControls( camera, renderer.domElement );				
            controls.enableDamping = true;
            controls.dampingFactor = 0.25;
            controls.enableZoom = false;
}

var buildAxis = function() {
    var axisHelper = new THREE.AxisHelper( 200 );
    scene.add( axisHelper );
}

var buildGroundPlane = function() {

    var NoiseGen = new SimplexNoise;
    var groundGeometry = 
        new THREE.PlaneGeometry(config.sceneWidth, config.sceneDepth);
    
    // for ( var i = 0; i < groundGeometry.vertices.length; i++ ) {
    //   var vertex = groundGeometry.vertices[i];
    //   vertex.z = NoiseGen.noise( vertex.x / 20, vertex.y / 20 ) * 2;
    // }
    // groundGeometry.computeFaceNormals();
    // groundGeometry.computeVertexNormals();
    
    var groundMaterial = Physijs.createMaterial( 
            new THREE.MeshPhongMaterial({  
            color: 0xffffff,
            wireframe: false,
            }),
            config.groundFriction, // high friction
            0.9 // high restitution
        );

    // If your plane is not square as far as face count then the HeightfieldMesh
    // takes two more arguments at the end: # of x faces and # of y faces that were passed to THREE.PlaneMaterial
    ground = new Physijs.PlaneMesh(
        groundGeometry,
        groundMaterial,
        0 // mass                  
    );
    //  ground = new Physijs.HeightfieldMesh(
    //   groundGeometry,
    //   groundMaterial,
    //   0, // mass
    //   config.sceneWidth, config.sceneDepth          
    // );
    ground.name = 'GROUND';
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = config.groundZ;
    ground.receiveShadow = true;

    scene.add( ground );

    var bumperOpacity = config.showBumperPlanes ? 1 : 0;
    var bumperTransparent = bumperOpacity == 1 ? false : true;
    

    //add front plane
    var frontPlaneGeometry = new THREE.PlaneGeometry(config.sceneWidth, 100);
    var frontPlaneMaterial = Physijs.createMaterial(
        new THREE.MeshBasicMaterial(
            {color: 0x007744, 
            transparent: bumperTransparent, 
            opacity: bumperOpacity }),
        0.4, 
        0.9);
    var frontPlane = new Physijs.BoxMesh(frontPlaneGeometry, frontPlaneMaterial, 0);
    frontPlane.name = "FRONT PLANE";
    frontPlane.receiveShadow = true;
    
    // rotate and position the plane
    //endPlane.rotation.x = - Math.PI / 2;
    frontPlane.position.x = 0;
    frontPlane.position.y = 100;
    frontPlane.position.z = -1000;

    // add the plane to the scene
    scene.add(frontPlane);

    //add end plane
    var endPlaneGeometry = new THREE.PlaneGeometry(config.sceneWidth, 100);
    var endPlaneMaterial = Physijs.createMaterial(
        new THREE.MeshBasicMaterial(
            {color: 0x007744, 
            transparent: bumperTransparent, 
            opacity: bumperOpacity }),
        0.4, 
        0.9);
    var endPlane = new Physijs.BoxMesh(endPlaneGeometry, endPlaneMaterial, 0);
    endPlane.name = "END PLANE";
    endPlane.receiveShadow = true;

    // rotate and position the plane
    //endPlane.rotation.x = - Math.PI / 2;
    endPlane.position.x = 0;
    endPlane.position.y = 100;
    endPlane.position.z = -5000;

    // add the plane to the scene
    scene.add(endPlane);
};

var buildHitPlane = function() {
    var planeGeometry = new THREE.PlaneGeometry(300, 300);
    var planeMaterial = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({color: 0xDDA0DD}),
        0.4, 
        0.9);
    var plane = new Physijs.BoxMesh(planeGeometry, planeMaterial, 0);
    plane.name = "HIT PLANE";
    plane.receiveShadow = true;
    plane.castShadow = true;

    // rotate and position the plane
    plane.rotation.x = - Math.PI / 2;
    plane.position.x = 0;
    plane.position.y = 600;
    plane.position.z = -500;

    // add the plane to the scene
    scene.add(plane);
};

var buildPokemonChar = function() {

    var spriteGeometry = new THREE.BoxGeometry(300,300,1);
    
    var loader = new THREE.TextureLoader();
    loader.setCrossOrigin( 'anonymous' );            
    var texture = loader.load("images/bulbasaur.png");
    var spriteMaterial = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({map: texture}),
        0.9, 0.1);

        var sprite = new Physijs.BoxMesh( 
        spriteGeometry, spriteMaterial, 0, { restitution: .2 } );

    // var sprite = new Physijs.PlaneMesh(planeGeometry, planeMaterial, 0);
    sprite.name = "POKEMON";
    sprite.receiveShadow = true;

    // rotate and position the plane
    sprite.position.x = 0;
    sprite.position.y = 750;
    sprite.position.z = -1900;
    //sprite.rotation.y = - Math.PI / 2;

    scene.add(sprite);

    //create green ring
    var ringMaterial = Physijs.createMaterial(
        new THREE.MeshBasicMaterial({color: 0x00FF00}),
        0.4, 
        0.9);
    var ring = new THREE.Mesh( 
        new THREE.TorusGeometry( 200, 5, 64, 64), 
        ringMaterial );
            ring.name = "GRING"; 
    ring.position.y = -50;
    sprite.add(ring);
    // scene.add(sprite);

        //create outter white ring
    ringMaterial = Physijs.createMaterial(
        new THREE.MeshBasicMaterial({color: 0xFFFFFF}),
        0.4, 
        0.9);
    ring = new THREE.Mesh( 
        new THREE.TorusGeometry( 230, 4, 64, 64), 
        ringMaterial );
            ring.name = "WRING"; 
    ring.position.y = -50;
    sprite.add(ring);
    }

    var buildBall = function() {
    // create a canvas to draw the ball's texture
    var ballCanvas = document.createElement('canvas');
    ballCanvas.width = 64;
    ballCanvas.height = 64;
    var ballContext = ballCanvas.getContext('2d');

    // draw 2 red & white halves of the 2d canvas 
    ballContext.fillStyle = "#ff0000";
    ballContext.fillRect(0, 0, ballCanvas.width, ballCanvas.height/2);
    ballContext.fillStyle = "#ffffff";
    ballContext.fillRect(0, ballCanvas.height/2, ballCanvas.width, ballCanvas.height/2);
    //draw black horizontal band
    ballContext.fillStyle = "#000000";
    ballContext.fillRect(0, ballCanvas.height/2-3, ballCanvas.width, 6);

    ballContext.beginPath()
    ballContext.strokeStyle = "#00FF00";
    ballContext.arc(16, 32, 2, 26, 0, 2 * Math.PI, false);
    // ballContext.arc(16, 32, 4, 0, 2 * Math.PI, false);
    ballContext.stroke();

    // create the THREE texture object with our canvas
    var ballTexture = new THREE.Texture( ballCanvas );
    ballTexture.needsUpdate = true;

    // create the physijs-enabled material with some decent friction & bounce properties
    var ballMaterial = Physijs.createMaterial(
        new THREE.MeshPhongMaterial({
        map: ballTexture,
        shininess: 50,
        color: 0xdddddd,
        emissive: 0x111111,
        side: THREE.FrontSide
        }), 
        .6, // mid friction
        .7 // mid restitution
    );
    //ballMaterial.map.wrapS = ballMaterial.map.wrapT = THREE.RepeatWrapping;
    //ballMaterial.map.repeat.set( 1, 1 );

    // create the physics-enabled sphere mesh, and start it up in the air
    ball = new Physijs.SphereMesh(
        new THREE.SphereGeometry( config.ballSize, config.ballSize, config.ballSize ), //new THREE.SphereGeometry( 96, 32, 32 ),
        ballMaterial, 
        100
    );
    
    ball.position.x = config.ballX; //12
    ball.position.y = config.ballY; //12
    ball.position.z = config.ballZ;
    ball.rotation.x = config.ballIdleRotation;
    ball.scale.set(config.ballScale,config.ballScale,config.ballScale);
    
    ball.receiveShadow = true;
    ball.castShadow = true;

    ball.addEventListener( 'collision', function( other_object, linear_velocity, angular_velocity ) {
        // `this` is the mesh with the event listener
        // other_object is the object `this` collided with
        // linear_velocity and angular_velocity are Vector3 objects which represent the velocity of the collision

        console.log('collision',other_object.name);
        // if (!ballSpinning) {
            ball.setAngularVelocity( new THREE.Vector3(2,16,6) );
            //ball.cube.material.color.
            ballSpinning = true;
        //}
    });

    scene.add( ball );
};

// update the physics engine and render every frame -----------------------------------------------
var animate = function() {        
    if (ballState.simulationRunning) {
        scene.simulate(); // run physics
    } else {
        shakeBall();
    }
    if (controls) controls.update();
    renderer.render( scene, camera); // render the scene

    // continue animating
    requestAnimationFrame( animate );
}

    
// shake ball ----------------------------------------------------------
var rotStep = 0.1;
var rotSleep = 3;
var rotSleepCnt = 0;

var posStep = 2;
var pos0;
var disablePos = true;
var shakeBall = function() {
    //if (!shakBall) return;

    if (rotSleep > 0) { 
        if (rotSleepCnt < rotSleep) {   
        rotSleepCnt++;            
        } else {
        if (Math.floor(Math.random() * 2) == 0) { //zero (heads)
            rotSleep = Math.random() * 10;
            rotSleepCnt = 0;
        } else { //1 (tails)
            rotSleep = Math.random() * 10;
            rotSleepCnt = 0;
        }
        }
    } else { //rotate ball

        var maxRot = Math.PI / 6;
        var minRot = -maxRot;
        if (ball.rotation.z < minRot || ball.rotation.z > maxRot) {
        rotStep *= -1;
        } else {
        ball.rotation.z += rotStep;
        }
    }

    if (!pos0) pos0 = ball.position.y;
    var maxPos = pos0 + 10;
    var minPos = pos0 - 10;        
    if (ball.position.y < minPos || ball.position.y > maxPos) 
        posStep *= -1;
    if (!disablePos) {
        ball.position.y += posStep;
    }

    ball.__dirtyPosition = true;

};

// randomly toss the ball on mouse click ----------------------------------------------------------
var tossBall = function(event) {
    if (ballState.simulationRunning) return;

    var xSpeed = config.speedX;
    var ySpeed = config.speedY;
    var zSpeed = config.speedZ;
    ball.setLinearVelocity( new THREE.Vector3(xSpeed,ySpeed,zSpeed) );
    ball.setAngularVelocity( new THREE.Vector3(1,0,0) );

    ballState.simulationRunning = true; 
};
document.addEventListener('click', tossBall, false);

// update THREE objects when window resizes -------------------------------------------------------
var onWindowResize = function() {
    // store scene dimensions
    sceneW = container.offsetWidth;
    sceneH = container.offsetHeight;
    // update camera
    camera.aspect = sceneW / sceneH;
    camera.updateProjectionMatrix();

    // set renderer size
    renderer.setSize( sceneW, sceneH );
}
window.addEventListener( 'resize', onWindowResize, false );

// kick it off ------------------------------------------------------------------------------------
var hasWebGL = (function () { 
    // from Detector.js
    try { 
        return !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' ); 
    } catch( e ) { 
        return false; 
    } 
})();

if( hasWebGL ) {
    init();
    animate();
} else {
    alert('You don\'t seem to have WebGL, which is required for this demo.');
}
