<script>
    import "../app.css";
    import { onMount } from "svelte";
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
    import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
    import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
    import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
    import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
    import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
    import { FontLoader } from 'three/addons/loaders/FontLoader.js';
    import { getVisibleStars, getStarTrails } from '$lib/utils.js'
    import { PT_Serif_Regular } from "$lib/PT_Serif_Regular";
    import { Loader } from "@googlemaps/js-api-loader"
    import { PUBLIC_API_KEY } from "$env/static/public"

    const API_KEY = PUBLIC_API_KEY

    Date.prototype.getJulian = function() {
        return this.getTime()/86400000 + 2440587.5
    }

    const magToBrightness = (mag) => {
        return Math.pow(2.5, 2.5-(mag/1.5))
    }

    // const stars = getVisibleStars(46.17700, 106.62840, 2460765.010417)
    // console.log(stars)

    let exposure = $state(60*4);
    let exposureDisplay = $state(60*4);

    let date = new Date()
    let year = $state(date.getFullYear())
    let month = $state(date.getMonth()+1)
    let day = $state(date.getDate())
    let hour = $state(date.getHours())
    let minute = $state(date.getMinutes())
    month = String(date.getMonth()+1).length == 1 ? "0"+String(date.getMonth()+1) : String(date.getMonth()+1)
    day = String(date.getDate()).length == 1 ? "0"+String(date.getDate()) : String(date.getDate())
    hour = String(date.getHours()).length == 1 ? "0"+String(date.getHours()) : String(date.getHours())
    minute = String(date.getMinutes()).length == 1 ? "0"+String(date.getMinutes()) : String(date.getMinutes())

    let lat = $state(0)
    let lon = $state(0)

    const loader = new Loader({
        apiKey: API_KEY,
        version: "weekly"
    });

    async function initMap() {
        const geolocate = await fetch("https://www.googleapis.com/geolocation/v1/geolocate?key="+API_KEY, {
            method: "POST"
        })
        const position = (await geolocate.json()).location
        lat = position.lat
        lon = position.lng

        await loader.load()
        // Request needed libraries.
        const { ColorScheme } = await google.maps.importLibrary("core")
        const { Map } = await google.maps.importLibrary("maps");
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
        const { Place } =  await google.maps.importLibrary("places");
        const geocoder = new google.maps.Geocoder;
        const map = new Map(document.getElementById("map"), {
            center: { lat: lat, lng: lon },
            zoom: 7,
            mapId: "3d30e228f851881a",
            disableDefaultUI: true,
            colorScheme: ColorScheme.DARK
        });
        
        const draggableMarker = new AdvancedMarkerElement({
            map,
            position: { lat: lat, lng: lon },
            gmpDraggable: true,
            title: "This marker is draggable.",
        });

        async function getPlaceDetails(place_id) {
            // Use place ID to create a new Place instance.
            const place = new google.maps.places.Place({
                id: place_id,
                requestedLanguage: "en", // optional
            });

            // Call fetchFields, passing the needed data fields.
            await place.fetchFields({
                fields: ["addressComponents"],
            });

            // Log the result.
            console.log(place.addressComponents);
        }

        draggableMarker.addListener("dragend", (event) => {
            const position = draggableMarker.position;
            lat = position.lat
            lon = position.lng

            document.getElementById("reload").disabled = false

            geocoder.geocode({'location': position}, function(results, status) {
                if (status === google.maps.GeocoderStatus.OK) {
                    if (results[1]) {

                        console.log(results[1].place_id);
                        getPlaceDetails(results[1].place_id)

                    } else {
                        window.alert('No results found');
                    }
                } else {
                    window.alert('Geocoder failed due to: ' + status);
                }
            });
            // const service = new PlacesService(map);
            // let request = {
            //     location: {'lat': position.lat, 'lon': position.lon},
            //     fields: ['place_id']
            // };
            // const place_id = service.getDetails(request, (results) => {
            //     request = {
            //         placeId: results[0].place_id,
            //         fields: ['address_components']
            //     };
            //     service.getDetails(request, (results) => {
            //         console.log(results)
            //         console.log(position)
            //     })
            // });
        });
    }

    
    onMount(() => {
        initMap();

        let output = getStarTrails(lat, lon, date.getJulian())
        let stars = output.stars
        const maxBrightness = magToBrightness(output.minMag)
        const minBrightness = 2.25

        const scene = new THREE.Scene();

        const renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById("canvas"),
            antialias: false
        });
        renderer.setSize( renderer.domElement.innerWidth, renderer.domElement.innerHeight );

        function resizeRendererToDisplaySize(renderer) {
            const canvas = renderer.domElement;
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            const needResize = canvas.width !== width || canvas.height !== height;
            if (needResize) {
                renderer.setPixelRatio( window.devicePixelRatio*1.5 );
                renderer.setSize(width, height, false);
            }
            return needResize;
        }

        //

        const camera = new THREE.PerspectiveCamera(100, renderer.domElement.clientWidth / renderer.domElement.clientHeight, 0.1, 1000 );
        camera.fov = (Math.atan(Math.tan(((camera.fov / 2) * Math.PI) / 180) / camera.aspect) * 2 * 180) / Math.PI
        camera.far = 5010
        const controls = new OrbitControls( camera, renderer.domElement );
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        controls.enablePan = false;

        //

        const loader = new FontLoader();

        const font = loader.parse(PT_Serif_Regular)

        const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        const material = new THREE.MeshBasicMaterial( { color: 0x333333, side: THREE.DoubleSide } );

        const north = new THREE.Mesh( new TextGeometry( 'N', {
            font: font,
            size: 0.75,
            depth: 0.1,
            curveSegments: 8,
            bevelEnabled: true,
            bevelThickness: 0.125,
            bevelSize: 0.025,
            bevelOffset: 0,
            bevelSegments: 4
        } ), material );
        north.geometry.computeBoundingBox()
        north.position.set(5, 0.5, -north.geometry.boundingBox.max.z/2)
        north.rotateY(-Math.PI/2)
        scene.add( north );

        const south = new THREE.Mesh( new TextGeometry( 'S', {
            font: font,
            size: 0.75,
            depth: 0.1,
            curveSegments: 8,
            bevelEnabled: true,
            bevelThickness: 0.125,
            bevelSize: 0.025,
            bevelOffset: 0,
            bevelSegments: 4
        } ), material );
        south.geometry.computeBoundingBox()
        south.position.set(-5, 0.5, south.geometry.boundingBox.max.z/2)
        south.rotateY(Math.PI/2)
        scene.add( south );

        const east = new THREE.Mesh( new TextGeometry( 'E', {
            font: font,
            size: 0.75,
            depth: 0.1,
            curveSegments: 8,
            bevelEnabled: true,
            bevelThickness: 0.125,
            bevelSize: 0.025,
            bevelOffset: 0,
            bevelSegments: 4
        } ), material );
        east.geometry.computeBoundingBox()
        east.position.set(east.geometry.boundingBox.max.x/2, 0.5, 5)
        east.rotateY(Math.PI)
        scene.add( east );

        const west = new THREE.Mesh( new TextGeometry( 'W', {
            font: font,
            size: 0.75,
            depth: 0.1,
            curveSegments: 8,
            bevelEnabled: true,
            bevelThickness: 0.125,
            bevelSize: 0.025,
            bevelOffset: 0,
            bevelSegments: 4
        } ), material );
        west.geometry.computeBoundingBox()
        west.position.set(-west.geometry.boundingBox.max.x/2, 0.5, -5)
        scene.add( west );

        const plane = new THREE.Mesh(
            new THREE.CircleGeometry(5000),
            new THREE.MeshBasicMaterial( { color: 0x999999, side: THREE.DoubleSide } )
        )
        plane.rotation.x = 90*(3.1415/180)
        scene.add(plane)

        //

        const composer = new EffectComposer( renderer );

        const renderPass = new RenderPass(scene, camera)
        composer.addPass(renderPass)

        const outlinePass = new OutlinePass(new THREE.Vector2(256, 256), scene, camera, [north, south, east, west])
        composer.addPass(outlinePass)

        const bloomPass = new UnrealBloomPass(new THREE.Vector2(renderer.domElement.clientWidth, renderer.domElement.clientHeight), 0.25, 0.25, 2)
        composer.addPass(bloomPass)

        const smaaPass = new SMAAPass();
        composer.addPass( smaaPass );

        const outputPass = new OutputPass();
        composer.addPass( outputPass );

        //

        const color = 0xFFFFFF;
        const intensity = 1;
        const light = new THREE.AmbientLight(color, intensity);
        scene.add(light);

        const starObjects = new THREE.Group();
        const recomputeStarTrails = (lat, lon, jd_ut, exposure) => {
            output = getStarTrails(lat, lon, jd_ut)
            stars = output.stars
            loadStarTrails(exposure)
            document.getElementById("reload").disabled = true
        }
        const loadStarTrails = (exposure) => {
            // const output = getStarTrails(-6.17700, 106.62840, 2460766.309769, 60*6)
            scene.remove(starObjects)
            starObjects.clear()
            for(let i = 0; i < stars.length; i++) {
                const brightness = magToBrightness(stars[i].mag/1.5)
                if(brightness > minBrightness) {
                    let coords = []
                    for(let j = 0; j < exposure; j++) {
                        coords.push(new THREE.Vector3(stars[i].coords[j][0], stars[i].coords[j][1], stars[i].coords[j][2]))
                    }
                    const curve = new THREE.CatmullRomCurve3(coords);

                    // const brightness = Math.pow(2.512, 5-stars[i].mag)

                    const geometry = new THREE.TubeGeometry(curve, 50, brightness, 6, false)

                    const maxColor = 1
                    const minColor = 0
                    const color = (((brightness-minBrightness)/(maxBrightness-minBrightness))*(maxColor-minColor))+minColor
                    // if(color > maxColor || color < minColor) {
                    //     console.log(color)
                    // }
                    const material = new THREE.MeshStandardMaterial( { color: new THREE.Color(color, color, color), emissive: new THREE.Color(color, color, color), emissiveIntensity: color+1 } );

                    // Create the final object to add to the scene
                    starObjects.add(new THREE.Mesh( geometry, material ));

                    const startcap = new THREE.Mesh(new THREE.SphereGeometry(brightness*0.915), material)
                    startcap.position.set(coords[0].x, coords[0].y, coords[0].z)
                    starObjects.add(startcap)

                    const endcap = new THREE.Mesh(new THREE.SphereGeometry(brightness*0.925), material)
                    endcap.position.set(coords[coords.length-1].x, coords[coords.length-1].y, coords[coords.length-1].z)
                    starObjects.add(endcap)
                }
            }
            scene.add(starObjects)
        }

        const updateDate = () => {
            year = date.getFullYear()
            month = String(date.getMonth()+1).length == 1 ? "0"+String(date.getMonth()+1) : String(date.getMonth()+1)
            day = String(date.getDate()).length == 1 ? "0"+String(date.getDate()) : String(date.getDate())
            hour = String(date.getHours()).length == 1 ? "0"+String(date.getHours()) : String(date.getHours())
            minute = String(date.getMinutes()).length == 1 ? "0"+String(date.getMinutes()) : String(date.getMinutes())
            document.getElementById("reload").disabled = false
            console.log(date)
            console.log(date.getJulian())
        }

        document.getElementById("exposure").onchange = (e) => {
            exposure = e.target.value
        }
        document.getElementById("year_plus").onclick = (e) => {
            date.setFullYear(date.getFullYear()+1, date.getMonth(), date.getDate())
            updateDate()
        }
        document.getElementById("year_min").onclick = (e) => {
            date.setFullYear(date.getFullYear()-1, date.getMonth(), date.getDate())
            updateDate()
        }
        document.getElementById("month_plus").onclick = (e) => {
            date.setMonth(date.getMonth()+1, date.getDate())
            updateDate()
        }
        document.getElementById("month_min").onclick = (e) => {
            date.setMonth(date.getMonth()-1, date.getDate())
            updateDate()
        }
        document.getElementById("day_plus").onclick = (e) => {
            date.setDate(date.getDate()+1)
            updateDate()
        }
        document.getElementById("day_min").onclick = (e) => {
            date.setDate(date.getDate()-1)
            updateDate()
        }
        document.getElementById("hour_plus").onclick = (e) => {
            date.setHours(date.getHours()+1, date.getMinutes(), 0, 0)
            updateDate()
        }
        document.getElementById("hour_min").onclick = (e) => {
            date.setHours(date.getHours()-1, date.getMinutes(), 0, 0)
            updateDate()
        }
        document.getElementById("minute_plus").onclick = (e) => {
            date.setMinutes(date.getMinutes()+1, 0, 0)
            updateDate()
        }
        document.getElementById("minute_min").onclick = (e) => {
            date.setMinutes(date.getMinutes()-1, 0, 0)
            updateDate()
        }
        document.getElementById("reload").onclick = (e) => {
            recomputeStarTrails(lat, lon, date.getJulian(), exposure)
        }

        $effect(() => {
            loadStarTrails(exposure)
        })

        // camera.position.y = 1;
        // camera.position.z = 5;
        camera.position.set(0, 1, 0)
        controls.update()
        controls.target.set(0, 1, 0.01)

        let then = 0;
        function render(now) {
            now *= 0.001;  // convert time to seconds
            const deltaTime = now - then;
            then = now;

            if (resizeRendererToDisplaySize(renderer)) {
                const canvas = renderer.domElement;
                camera.aspect = canvas.clientWidth / canvas.clientHeight;
                camera.updateProjectionMatrix();
                composer.setSize(canvas.width, canvas.height);
            }
            
            controls.update()
            composer.render(deltaTime);

            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);

        window.addEventListener("resize", () => {
            if (resizeRendererToDisplaySize(renderer)) {
                const canvas = renderer.domElement;
                camera.aspect = canvas.clientWidth / canvas.clientHeight;
                camera.updateProjectionMatrix();
            }
        })

        document.getElementById("loading").classList.add("scale-0")
        document.getElementById("canvas").classList.remove("scale-0")
        document.getElementById("canvas").classList.add("border-white")
    })
</script>

<div class="flex flex-col py-4 px-8 w-screen h-screen bg-black">
    <h1 class="text-white pt-serif-regular text-4xl">Star Trail Simulation</h1>
    <hr class="text-white my-4">
    <div class="flex flex-row h-full">
        <div id="canvas-container" class="w-full h-full flex justify-center items-center">
            <canvas id="canvas" class="w-full h-full scale-0 rounded-xl border duration-500"></canvas>
            <h1 id="loading" class="text-white pt-serif-regular text-4xl duration-200 absolute">Loading</h1>
        </div>
        <div class="border border-white h-full mx-4"></div>
        <div class="flex flex-col w-1/4 gap-6">
            <div>
                <label class="text-white pt-serif-regular text-nowrap mb-1" for="exposure">Exposure Time ({(exposureDisplay/60).toFixed(1)} hours)</label>
                <input id="exposure" type="range" max=1440 min=10 class="w-full range" bind:value={exposureDisplay}>
            </div>

            <div class="flex flex-row text-white text-xl pt-serif-regular justify-around w-full select-none">
                <div class="flex flex-row items-center gap-1">
                    <div class="flex flex-col text-center">
                        <i id="year_plus" class="fa-solid fa-caret-up text-xl hover:scale-125 hover:cursor-pointer active:scale-100 duration-200"></i>
                        <span>{year}</span>
                        <i id="year_min" class="fa-solid fa-caret-down text-xl hover:scale-125 hover:cursor-pointer active:scale-100 duration-200"></i>
                    </div>
                    <span>-</span>
                    <div class="flex flex-col text-center">
                        <i id="month_plus" class="fa-solid fa-caret-up text-xl hover:scale-125 hover:cursor-pointer active:scale-100 duration-200"></i>
                        <span>{month}</span>
                        <i id="month_min" class="fa-solid fa-caret-down text-xl hover:scale-125 hover:cursor-pointer active:scale-100 duration-200"></i>
                    </div>
                    <span>-</span>
                    <div class="flex flex-col text-center">
                        <i id="day_plus" class="fa-solid fa-caret-up text-xl hover:scale-125 hover:cursor-pointer active:scale-100 duration-200"></i>
                        <span>{day}</span>
                        <i id="day_min" class="fa-solid fa-caret-down text-xl hover:scale-125 hover:cursor-pointer active:scale-100 duration-200"></i>
                    </div>
                </div>
                <div class="flex flex-row items-center gap-1">
                    <div class="flex flex-col text-center">
                        <i id="hour_plus" class="fa-solid fa-caret-up text-xl hover:scale-125 hover:cursor-pointer active:scale-100 duration-200"></i>
                        <span>{hour}</span>
                        <i id="hour_min" class="fa-solid fa-caret-down text-xl hover:scale-125 hover:cursor-pointer active:scale-100 duration-200"></i>
                    </div>
                    <span>:</span>
                    <div class="flex flex-col text-center">
                        <i id="minute_plus" class="fa-solid fa-caret-up text-xl hover:scale-125 hover:cursor-pointer active:scale-100 duration-200"></i>
                        <span>{minute}</span>
                        <i id="minute_min" class="fa-solid fa-caret-down text-xl hover:scale-125 hover:cursor-pointer active:scale-100 duration-200"></i>
                    </div>
                </div>
            </div>

            <div id="map" class="w-full h-full rounded-xl border border-white"></div>

            <button id="reload" class="border border-white rounded-full bg-black w-fit not-disabled:hover:cursor-pointer not-disabled:hover:invert-100 group active:cursor-default duration-200" disabled><p class="mx-4 my-2 pt-serif-regular text-white group-active:text-black group-disabled:text-white! group-disabled:opacity-50 duration-200">Reload</p></button>
        </div>
    </div>
</div>