// scene container element ------------------------------------------------------------------------
//var container = document.getElementById('container');

// THREE objects  ---------------------------------------------------------------------------------
var camera3, scene, renderer;
var sceneW, sceneH;
var physicsMaterial;
var sprite, ball;
var controls;

var config = {
    showCamera: false,
    playAudio: false,
    playAudioRepeat: true,
    simulationEnabled: true,
    showControls: false,
    showAxis: false,
    rendererAlpha: true, 
    showGroundPlane: false,
    showHitPlane: false,
    showBumperPlanes: false,
    spinBallOnHit: true,
    sceneWidth: 2000,
    sceneDepth: 10000,        
    gravityY: -700,
    gravityZ: 00,
    groundZ: -900,
    groundFriction: 0.6,
    groundRestitution: 0.6,
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
    velocityX: 0,
    velocityY: 1100,  //1000 hit
    velocityZ: -900, //-1000 long, -900 hit
    velocityXRange: [-100,100,this.velocityX],
    velocityYRange: [1000,1300,this.velocityY],
    velocityZRange: [-900,-1200,this.velocityZ],
    angularXRange: [-5,5,0],
    angularYRange: [-5,5,0],
    angularZRange: [-5,5,0]
};

var ballState = {
    simulationRunning: false,
    simulationTicks: 0,
    misses: 0,
    maxMisses: 2
};

// initialize the physics demo --------------------------------------------------------------------
function init() {

    if( !hasWebGL() ) {
        alert('You don\'t seem to have WebGL, which is required for this demo.');
        return;
    }


    // store scene dimensions
    sceneW = window.innerWidth;
    sceneH = window.innerHeight;

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

    document.addEventListener('deviceready', initCordova, false);

    animate();

    showPokemon(true);
    resetBall();
}

var initCordova = function() {
    if (config.showCamera) showCamera();
    if (config.playAudio) playAudio();
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
    renderer = new THREE.WebGLRenderer( { antialias: true, alpha: config.rendererAlpha } );
    renderer.setSize( sceneW, sceneH );
    //renderer.setClearColor(new THREE.Color(0xFFFFFF,0));
    renderer.shadowMap.enabled = true;
    document.body.appendChild( renderer.domElement );
};

// build the THREE camera -------------------------------------------------------------------------
var buildCamera = function() {
    camera3 = new THREE.PerspectiveCamera( 45, sceneW / sceneH, 1, 10000 );
    
    // move camera up and back, and point it down at the center of the 3d scene        
    camera3.position.x = config.camX;
    camera3.position.y = config.camY;
    camera3.position.z = config.camZ;

    //camera3.rotation.y = Math.PI / 2;
    camera3.lookAt(new THREE.Vector3(0,config.camLookY,config.camLookZ));
};

// add an ambient light and a spot light for shadowing --------------------------------------------
var buildLights = function() {
    scene.add( new THREE.AmbientLight( 0x555555) );
    var light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
    scene.add(light);
};

var buildControls = function() {       
    controls = new THREE.OrbitControls( camera3, renderer.domElement );				
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
    var groundOpacity = config.showGroundPlane ? 1 : 0;
    var groundTransparent = groundOpacity == 1 ? false : true;    
    var groundMaterial = Physijs.createMaterial( 
            new THREE.MeshPhongMaterial({  
            color: 0xffffff,
            wireframe: false,
            transparent: groundTransparent, 
            opacity: groundOpacity
            }),
            config.groundFriction, // high friction
            config.groundRestitution // high restitution
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
    var endPlaneGeometry = new THREE.PlaneGeometry(config.sceneWidth, 1000);
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
        new THREE.MeshLambertMaterial(
            { map: texture,
              transparent: true, 
              opacity: 0}),
        0.9, 0.1);

    sprite = new Physijs.BoxMesh( 
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
        new THREE.MeshBasicMaterial(
            {color: 0x00FF00,
             transparent: true, 
             opacity: 0.6 }),
        0.4, 
        0.9);
    var ring = new THREE.Mesh( 
        new THREE.TorusGeometry( 200, 5, 64, 64), 
        ringMaterial );
            ring.name = "GRING"; 
    ring.position.y = -50;
    ring.visible = false;
    sprite.add(ring);
    // scene.add(sprite);

        //create outter white ring
    ringMaterial = Physijs.createMaterial(
        new THREE.MeshBasicMaterial(
            {color: 0xFFFFFF,
             transparent: true, 
             opacity: 0.8}),
        0.4, 
        0.9);
    ring = new THREE.Mesh( 
        new THREE.TorusGeometry( 230, 4, 64, 64), 
        ringMaterial );
            ring.name = "WRING"; 
    ring.position.y = -50;
    ring.visible = false;
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

EventsControls1 = new EventsControls( camera3, renderer.domElement );
EventsControls1.map = ball;
EventsControls1.attachEvent( 'onclick', function () {
		console.log('onclick ', this.focused);
        launchBall();
    });

    // create the physijs-enabled material with some decent friction & bounce properties
    var ballMaterial = Physijs.createMaterial(
        new THREE.MeshPhongMaterial({
        map: ballTexture,
        shininess: 50,
        color: 0xdddddd,
        emissive: 0x111111,
        side: THREE.FrontSide,
        transparent: true, 
        opacity: 0
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
        // if (other_object.name == "END PLANE") {
        //     //resetBall();
        //     return;
        // } else 
        if (other_object.name == "POKEMON") {
            hitPokemon(150);
        } else {
            //showPokemonRings(false);
        }

         ball.setAngularVelocity( new THREE.Vector3(2,16,6) );          
         ballSpinning = true;

    });

    EventsControls1.attach(ball);

    scene.add( ball );
};

// play background audio using Cordova Media plugin -----------------------------------------------
var playAudio = function() {
    if ( !(window.device && window.Media) ) return;

    var mp3URL = "audio/POKEMON GO Theme PEAKWAVE REMIX.mp3";
    if(device.platform.toLowerCase() === "android") mp3URL = "/android_asset/www/" + mp3URL;
    var media = new Media(mp3URL, 
        null, 
        function(err) { alert('Media error\n' + err); },
        function(status) {
            if (status == Media.MEDIA_STOPPED && config.playAudioRepeat) {
                playAudio();
            }
        });
    media.play();
}

var showCamera = function() {
    if (!window.ezar) {
        alert('Unable to detect the ezAR plugin');
        return;
    }

    ezar.initializeVideoOverlay(
        function() {
           ezar.getBackCamera().start();
        },
        function(err) {
            alert('unable to init ezar: ' + err);
        });
}

// update the physics engine and render every frame -----------------------------------------------
var animate = function(time) {       
     // continue animating
    requestAnimationFrame( animate );
    TWEEN.update(time);

    if (ballState.simulationRunning) {
        scene.simulate(); // run physics
        
        if (ballState.simulationTicks > 300) {
            
            var ballVelocity3 = ball.getLinearVelocity();
            var ballVelocity = ballVelocity3.length();
            if (ballVelocity < 50) {
                console.log('ballVelocity', ballVelocity);
                ballState.simulationRunning = false;
                ballState.misses++;
                fadeObject(ball,0,750,resetBall);
                return;
             }
        }
        ballState.simulationTicks++;
    } else {
        //shakeBall();
    }
    if (controls) controls.update();
    renderer.render(scene, camera3); // render the scene  
}

// launch the ball on mouse click ----------------------------------------------------------
var launchBall = function(event) {
    if (ballState.simulationRunning) return;

    var randomizeParams = ballState.misses < ballState.maxMisses;
console.log('randomizeParams',randomizeParams);
    var xSpeed = randomizeParams ? rnd(config.velocityXRange) : config.velocityX;
    var ySpeed = randomizeParams ? rnd(config.velocityYRange) : config.velocityY;
    var zSpeed = randomizeParams ? rnd(config.velocityZRange) : config.velocityZ;
    console.log(xSpeed,ySpeed,zSpeed);
    ball.setLinearVelocity( new THREE.Vector3(xSpeed,ySpeed,zSpeed) );

    var xRot = rnd(config.angularXRange);
    var yRot = rnd(config.angularYRange);
    var zRot = rnd(config.angularZRange);
    ball.setAngularVelocity( new THREE.Vector3(xRot,yRot,zRot) );

    ball.setDamping(0.0,0.6);

    ballState.simulationStartTime = new Date();
    ballState.simulationRunning = true; 
    scene.onSimulationResume();
};
//ball.addEventListener('click', launchBall, false);

var rnd = function(range) {
    var val = range[0] + Math.round((range[1] - range[0]) * Math.random());
    return val;
}

var resetBall = function() {
    ballState.misses = 0;
    
    ball.setLinearVelocity( new THREE.Vector3(0,0,0) );
    ball.setAngularVelocity( new THREE.Vector3(0,0,0) );

    ball.position.x = config.ballX; //12
    ball.position.y = config.ballY; //12
    ball.position.z = config.ballZ;
    ball.rotation.x = config.ballIdleRotation;
    ball.rotation.y = 0;
    ball.rotation.z = 0;

ball.__dirtyPosition = true;
ball.__dirtyRotation = true;
ballState.simulationTicks = 0;
ballState.simulationRunning = false;

    fadeObject(ball,1,750,
        function() {
            bounceBall(240);
            setTimeout(function() { showPokemonRings() }, 1500)
        });

}

// update THREE objects when window resizes -------------------------------------------------------
var onWindowResize = function() {
    // store scene dimensions
    sceneW = window.innerWidth;
    sceneH = window.innerHeight;
    // sceneW = container.offsetWidth;
    // sceneH = container.offsetHeight;
    // update camera3
    camera3.aspect = sceneW / sceneH;
    camera3.updateProjectionMatrix();

    // set renderer size
    renderer.setSize( sceneW, sceneH );
}
window.addEventListener( 'resize', onWindowResize, false );

// kick it off ------------------------------------------------------------------------------------
var hasWebGL = function () { 
    // from Detector.js
    try { 
        return !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' ); 
    } catch( e ) { 
        return false; 
    } 
}


var rotateSprite = function( obj, angles, delay, pause) {

    new TWEEN.Tween(sprite.rotation)
        //.delay(pause)
        .to( {
               // x: obj.rotation._x + angles.x,            
                //y: obj.rotation._y + angles.y,
                //z: obj.rotation._z + angles.z 
                z: [Math.PI/4, Math.PI/2, Math.PI, -Math.PI/2, -Math.PI/4]           
            }, delay )
        // .repeat(Infinity)
        // .yoyo(true)
        .easing(TWEEN.Easing.Bounce.InOut)
        .onComplete(function() {
                //setTimeout( tRotate, pause, obj, angles, delay, pause );
            })
        .start();
}

var bounceSprite = function( obj, heights, delay, pause) {

    new TWEEN.Tween(obj.position)
        //.delay(pause)
        .to( {
                x: obj.position.x + heights.x,            
                y: obj.position.y + heights.y,
                z: obj.position.z + heights.z            
            }, delay )
        .repeat(3)
        .yoyo(true)
        .easing(TWEEN.Easing.Bounce.InOut)
        .onComplete(function() {
                //setTimeout( tRotate, pause, obj, angles, delay, pause );
            })
        .start();
}

var bounceBall = function(duration) {
    var pause = 300;
    var heights = {x:1, y:75, z:1};
    var posTween = new TWEEN.Tween(ball.position)
        //.delay(pause)
        .to( {
                //x: obj.position.x + heights.x,            
                y: ball.position.y + heights.y,
                //z: obj.position.z + heights.z            
            }, duration )
        .repeat(1)
        .yoyo(true)
        //.easing(TWEEN.Easing.Quadratic.Out)
        .start();

    var rotation = {x: 2*Math.PI};
    var rotTween = new TWEEN.Tween(ball.rotation)
        //.delay(pause)
        .to( {            
                x: ball.rotation._x + rotation.x            
            }, duration )
        .repeat(1)
        //.yoyo(true)
        //.easing(TWEEN.Easing.Quadratic.InOut)
        .start();
}

var shakeBall = function(duration) {
    var pause = 300;
    var iterations = 1;

    var heights = {x:10, y:5, z:10};
    var posTween = new TWEEN.Tween(ball.position)
        .to( {
                x: heights.x,            
                y: heights.y,
                z: heights.z            
            }, duration )
        .repeat(iterations)
        .yoyo(true)
        //.easing(TWEEN.Easing.Quadratic.Out)
        .start();

    var rotation = {x: Math.PI/4, z: 0.1};
    var rotTween = new TWEEN.Tween(ball.rotation)
        //.delay(pause)
        .to( {            
                x: rotation.x,
                z: rotation.z         
            }, duration*2 )
        .repeat(iterations/2)
        .yoyo(true)
        //.easing(TWEEN.Easing.Quadratic.InOut)
        .start();
}

var hitPokemon = function(duration) {
    
    showPokemonRings(false);

    var iterations = 1;
    
    var rotation = {z: 2*Math.PI};
    var rotTween = new TWEEN.Tween(sprite.rotation)
        .to( {
                z: sprite.rotation._z + rotation.z         
            }, duration )
        .repeat(1)
        .yoyo(true)
        .start();
}

var showPokemon = function(bool) {
    var opacity = bool ? 1 : 0; 
    if (!opacity) showPokemonRings(false);
    fadeObject(sprite,opacity,750,
        null // function() { 
        //     if (bool)  setTimeout( function(){ showPokemonRings(true) });
        // }
    );
}

var showPokemonRings = function(bool, immediate) {
    var delay = immediate ? 0 : 1000;
    if (bool) {    
        showWhitePokemonRing(bool);
        setTimeout(function(){showGreenPokemonRing(bool)},delay);
    } else {
        showGreenPokemonRing(bool);
        setTimeout(function(){showWhitePokemonRing(bool)},delay);
    }
}

var showGreenPokemonRing = function(bool) {
    sprite.children[0].visible = bool;
}

var showWhitePokemonRing = function(bool) {
    sprite.children[1].visible = bool;
}


var fadeObject = function(obj, targetOpacity, duration, onCompletionFn) {
    console.log('fade ball', targetOpacity);
	var fadeTween = new TWEEN.Tween(obj.material)
        .to( {            
                opacity: targetOpacity         
            }, duration )
        .onComplete(onCompletionFn ? onCompletionFn : null)
        .start();
}
//tRotate(sprite, {x:0,y:-Math.PI/2,z:0}, 1000, 1000 );



init();